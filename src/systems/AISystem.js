// AI System for managing AI character behavior

import { Vector2D } from '../utils/Vector2D.js';
import { Weapon, WeaponPickup } from '../entities/Weapon.js';
import { createWeapon } from '../config/weapons.js';
import { MAP_CONFIG } from '../config/map.js';

export class AISystem {
    constructor(gameState, eventBus, combatSystem) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.combatSystem = combatSystem;
        
        // Available weapons for AI to pick up
        this.availableWeapons = [];
        
        // Max weapons allowed on map for performance
        this.maxWeapons = 15;
        
        // Listen for character death events
        this.eventBus.on('characterDamaged', (data) => this.onCharacterDamaged(data));
    }
    
    // Update all AI characters
    update(deltaTime) {
        // Get all AI characters
        const aiCharacters = this.gameState.characters.filter(char => 
            !char.isPlayer && !char.isDead && char.aiState !== undefined
        );
        
        // Update each AI
        aiCharacters.forEach(ai => {
            this.updateAI(ai, deltaTime);
        });
    }
    
    // Update individual AI character
    updateAI(ai, deltaTime) {
        // Perception - detect player and threats
        this.updatePerception(ai);
        
        // Decision making
        if (ai.canMakeDecision()) {
            this.makeDecision(ai);
            ai.resetDecisionCooldown();
        }
        
        // Execute current state behavior
        switch (ai.getState()) {
            case 'moveToSafeZone':
                this.executeMoveToSafeZone(ai, deltaTime);
                break;
            case 'patrol':
                this.executePatrol(ai, deltaTime);
                break;
            case 'seekLoot':
                this.executeSeekLoot(ai, deltaTime);
                break;
            case 'combat':
                this.executeCombat(ai, deltaTime);
                break;
            case 'flee':
                this.executeFlee(ai, deltaTime);
                break;
        }
    }
    
    // Update AI perception
    updatePerception(ai) {
        // Find nearest enemy (player or other AI)
        let nearestEnemy = null;
        let nearestDistance = ai.perceptionRange;
        
        this.gameState.characters.forEach(character => {
            if (character === ai || character.isDead) return;
            
            const distance = ai.position.distanceTo(character.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = character;
            }
        });
        
        // Set target enemy if found, otherwise clear
        if (nearestEnemy) {
            ai.setTargetEnemy(nearestEnemy);
        } else if (ai.targetEnemy && ai.targetEnemy.isDead) {
            ai.setTargetEnemy(null);
        } else if (ai.targetEnemy) {
            // Check if current enemy is still in range
            const distanceToEnemy = ai.position.distanceTo(ai.targetEnemy.position);
            if (distanceToEnemy > ai.perceptionRange * 1.5) {
                ai.setTargetEnemy(null);
            }
        }
        
        // Look for nearby weapons if AI doesn't have max weapons and not currently targeting one
        if (ai.weapons.length < ai.maxWeapons && !ai.targetWeapon) {
            this.findNearestWeapon(ai);
        }
    }
    
    // Make decision about what to do
    makeDecision(ai) {
        // Check if outside safe zone
        const isOutsideSafeZone = this.gameState.safeZoneSystem &&
            this.gameState.safeZoneSystem.isOutsideZone(ai.position.x, ai.position.y);
        
        // Priority 0: Get to safe zone if outside (highest priority!)
        if (isOutsideSafeZone) {
            ai.setState('moveToSafeZone');
            return;
        }
        
        // Priority 1: Flee if low health
        if (ai.shouldFlee()) {
            ai.setState('flee');
            return;
        }
        
        // Priority 2: Combat if enemy detected and has weapon
        if (ai.targetEnemy && ai.weapons.length > 0) {
            ai.setState('combat');
            return;
        }
        
        // Priority 3: Seek weapon if don't have max weapons and found a target
        if (ai.weapons.length < ai.maxWeapons && ai.targetWeapon && ai.targetWeapon.active) {
            ai.setState('seekLoot');
            return;
        }
        
        // Default: Patrol
        ai.setState('patrol');
    }
    
    // Execute patrol behavior
    executePatrol(ai, deltaTime) {
        // Check if near boundary and need to turn away
        const avoidDirection = this.getAvoidBoundaryDirection(ai);
        
        let wanderDirection;
        if (avoidDirection) {
            // Turn away from boundary
            wanderDirection = avoidDirection;
            ai.wanderAngle = avoidDirection.angle();
        } else {
            // Normal wandering
            wanderDirection = ai.getWanderDirection();
        }
        
        // Set velocity for wandering
        ai.velocity.x = wanderDirection.x * ai.moveSpeed * 0.5; // Slower when patrolling
        ai.velocity.y = wanderDirection.y * ai.moveSpeed * 0.5;
        
        // Update facing angle
        if (ai.velocity.magnitude() > 0.1) {
            ai.facingAngle = ai.velocity.angle();
        }
    }
    
    // Execute seek loot behavior
    executeSeekLoot(ai, deltaTime) {
        if (!ai.targetWeapon || !ai.targetWeapon.active) {
            ai.setState('patrol');
            return;
        }
        
        // Move towards weapon
        const direction = new Vector2D(
            ai.targetWeapon.position.x - ai.position.x,
            ai.targetWeapon.position.y - ai.position.y
        );
        
        const distance = direction.magnitude();
        
        // Try to pick up weapon (with timer) - only if in range
        if (ai.targetWeapon.isInRange(ai)) {
            const pickupComplete = ai.targetWeapon.updatePickup(ai, deltaTime);
            if (pickupComplete) {
                const success = this.pickupWeapon(ai, ai.targetWeapon);
                ai.setTargetWeapon(null);
                ai.setState('patrol');
                return;
            }
        }
        
        // Move towards weapon if not in range yet
        if (distance > 25) {
            direction.normalize();
            ai.velocity.x = direction.x * ai.moveSpeed;
            ai.velocity.y = direction.y * ai.moveSpeed;
            ai.facingAngle = direction.angle();
        } else {
            // Stop moving when close enough to pickup
            ai.velocity.x = 0;
            ai.velocity.y = 0;
        }
    }
    
    // Execute combat behavior
    executeCombat(ai, deltaTime) {
        if (!ai.targetEnemy || ai.targetEnemy.isDead) {
            ai.setState('patrol');
            return;
        }
        
        const distanceToEnemy = ai.position.distanceTo(ai.targetEnemy.position);
        
        // Move towards enemy if too far
        if (distanceToEnemy > ai.combatRange * 0.7) {
            const direction = new Vector2D(
                ai.targetEnemy.position.x - ai.position.x,
                ai.targetEnemy.position.y - ai.position.y
            );
            direction.normalize();
            
            ai.velocity.x = direction.x * ai.moveSpeed * 0.8;
            ai.velocity.y = direction.y * ai.moveSpeed * 0.8;
            ai.facingAngle = direction.angle();
        }
        // Keep distance if too close
        else if (distanceToEnemy < ai.combatRange * 0.4) {
            const direction = new Vector2D(
                ai.position.x - ai.targetEnemy.position.x,
                ai.position.y - ai.targetEnemy.position.y
            );
            direction.normalize();
            
            ai.velocity.x = direction.x * ai.moveSpeed * 0.6;
            ai.velocity.y = direction.y * ai.moveSpeed * 0.6;
            ai.facingAngle = Math.atan2(
                ai.targetEnemy.position.y - ai.position.y,
                ai.targetEnemy.position.x - ai.position.x
            );
        }
        // Stay in optimal range and strafe
        else {
            // Strafe movement
            const perpendicular = new Vector2D(
                ai.targetEnemy.position.y - ai.position.y,
                -(ai.targetEnemy.position.x - ai.position.x)
            );
            perpendicular.normalize();
            
            ai.velocity.x = perpendicular.x * ai.moveSpeed * 0.4;
            ai.velocity.y = perpendicular.y * ai.moveSpeed * 0.4;
            ai.facingAngle = Math.atan2(
                ai.targetEnemy.position.y - ai.position.y,
                ai.targetEnemy.position.x - ai.position.x
            );
        }
        
        // Try to fire weapon
        this.tryFireWeapon(ai);
    }
    
    // Execute move to safe zone behavior (Phase 6)
    executeMoveToSafeZone(ai, deltaTime) {
        if (!this.gameState.safeZoneSystem) {
            ai.setState('patrol');
            return;
        }
        
        const safeZoneInfo = this.gameState.safeZoneSystem.getSafeZoneInfo();
        
        // Calculate direction to safe zone center
        const directionToCenter = new Vector2D(
            safeZoneInfo.centerX - ai.position.x,
            safeZoneInfo.centerY - ai.position.y
        );
        
        const distanceToCenter = directionToCenter.magnitude();
        
        // If we're now inside safe zone, switch back to normal behavior
        if (distanceToCenter <= safeZoneInfo.currentRadius) {
            ai.setState('patrol');
            return;
        }
        
        // Move at full speed towards safe zone
        directionToCenter.normalize();
        ai.velocity.x = directionToCenter.x * ai.moveSpeed * 1.2; // 20% faster when escaping zone
        ai.velocity.y = directionToCenter.y * ai.moveSpeed * 1.2;
        ai.facingAngle = directionToCenter.angle();
        
        // Still fire at enemies if they're in the way
        if (ai.targetEnemy && ai.weapons.length > 0) {
            this.tryFireWeapon(ai);
        }
    }
    
    // Execute flee behavior
    executeFlee(ai, deltaTime) {
        if (!ai.targetEnemy) {
            ai.setState('patrol');
            return;
        }
        
        // Run away from enemy
        let fleeDirection = new Vector2D(
            ai.position.x - ai.targetEnemy.position.x,
            ai.position.y - ai.targetEnemy.position.y
        );
        
        // Check if near boundary and adjust flee direction
        const avoidDirection = this.getAvoidBoundaryDirection(ai);
        if (avoidDirection) {
            // Blend flee direction with boundary avoidance
            fleeDirection.add(avoidDirection.scale(2)); // Weight boundary avoidance more
        }
        
        // Also check if fleeing towards safe zone if outside
        if (this.gameState.safeZoneSystem) {
            const isOutside = this.gameState.safeZoneSystem.isOutsideZone(ai.position.x, ai.position.y);
            if (isOutside) {
                const safeZoneInfo = this.gameState.safeZoneSystem.getSafeZoneInfo();
                const toSafeZone = new Vector2D(
                    safeZoneInfo.centerX - ai.position.x,
                    safeZoneInfo.centerY - ai.position.y
                );
                toSafeZone.normalize();
                // Blend flee with moving to safe zone
                fleeDirection.add(toSafeZone.scale(1.5));
            }
        }
        
        fleeDirection.normalize();
        
        ai.velocity.x = fleeDirection.x * ai.moveSpeed; // Full speed when fleeing
        ai.velocity.y = fleeDirection.y * ai.moveSpeed;
        
        // Face the enemy while fleeing (to shoot back)
        ai.facingAngle = Math.atan2(
            ai.targetEnemy.position.y - ai.position.y,
            ai.targetEnemy.position.x - ai.position.x
        );
        
        // Try to fire weapon while fleeing (fight back)
        this.tryFireWeapon(ai);
        
        // If health recovered enough, return to combat
        if (ai.getHealthPercentage() > ai.fleeHealthThreshold + 0.2) {
            ai.setState('combat');
        }
    }
    
    // Try to fire weapon at target
    tryFireWeapon(ai) {
        if (!ai.targetEnemy || ai.weapons.length === 0) {
            return;
        }
        
        // Get active weapon
        const weapon = ai.getActiveWeapon();
        if (!weapon || !weapon.isReady()) {
            // Try switching to a ready weapon
            for (let i = 0; i < ai.weapons.length; i++) {
                if (ai.weapons[i].isReady()) {
                    ai.switchToWeapon(i);
                    return; // Wait for next frame to fire
                }
            }
            return;
        }
        
        // Calculate aim angle with accuracy modifier
        let aimAngle = Math.atan2(
            ai.targetEnemy.position.y - ai.position.y,
            ai.targetEnemy.position.x - ai.position.x
        );
        
        // Add inaccuracy based on skill level
        const inaccuracy = (1 - ai.aimAccuracy) * (Math.random() - 0.5) * 0.5;
        aimAngle += inaccuracy;
        
        // Fire weapon through combat system
        this.combatSystem.fireWeapon(ai, weapon, aimAngle);
    }
    
    // Find nearest weapon for AI
    findNearestWeapon(ai) {
        if (this.availableWeapons.length === 0) {
            ai.setTargetWeapon(null);
            return;
        }
        
        let nearestWeapon = null;
        let nearestDistance = Infinity;
        
        this.availableWeapons.forEach(weapon => {
            if (!weapon.active) return;
            
            const config = weapon.getWeaponConfig();
            
            // Skip if AI already has this exact weapon
            if (ai.hasWeapon(config.type, config.tier)) {
                return;
            }
            
            // Skip if AI has same type with higher tier
            const sameTypeIndex = ai.findSameWeaponTypeIndex(config.type);
            if (sameTypeIndex !== -1 && ai.weapons[sameTypeIndex].tier >= config.tier) {
                return;
            }
            
            const distance = ai.position.distanceTo(weapon.position);
            if (distance < nearestDistance && distance < ai.perceptionRange) {
                nearestDistance = distance;
                nearestWeapon = weapon;
            }
        });
        
        if (nearestWeapon) {
            ai.setTargetWeapon(nearestWeapon);
        } else {
            ai.setTargetWeapon(null);
        }
    }
    
    // Pick up weapon
    pickupWeapon(ai, weaponPickup) {
        const config = weaponPickup.getWeaponConfig();
        
        // Try to pickup weapon using AI's method
        const success = ai.tryPickupWeapon(config);
        
        if (success) {
            // Remove weapon from available list
            weaponPickup.active = false;
            const index = this.availableWeapons.indexOf(weaponPickup);
            if (index > -1) {
                this.availableWeapons.splice(index, 1);
            }
            
            // Emit event
            this.eventBus.emit('weaponPickedUp', {
                character: ai,
                weaponType: config.type,
                tier: config.tier
            });
            
            console.log(`AI picked up ${config.name} (Tier ${config.tier})`);
            return true;
        } else {
            // Couldn't pickup (e.g., duplicate or lower tier), reset and look for another
            weaponPickup.resetPickup();
            ai.setTargetWeapon(null);
            return false;
        }
    }
    
    // Spawn a weapon on the ground
    spawnWeapon(position, weaponType = 'blaster', tier = 1) {
        // Limit total weapons for performance
        if (this.availableWeapons.filter(w => w.active).length >= this.maxWeapons) {
            return null;
        }
        
        const weaponConfig = createWeapon(weaponType, tier);
        const weaponPickup = new WeaponPickup(position, weaponConfig);
        
        this.availableWeapons.push(weaponPickup);
        return weaponPickup;
    }
    
    // Handle character damaged event
    onCharacterDamaged(data) {
        const target = data.target;
        
        // If AI was damaged, make it more aggressive
        if (!target.isPlayer && target.aiState !== undefined) {
            // React to being hit
            if (target.getHealthPercentage() > target.fleeHealthThreshold) {
                target.setState('combat');
            }
        }
    }
    
    // Handle character death
    handleCharacterDeath(character) {
        if (character.isDead && character.weapons.length > 0) {
            // Only drop 1 random weapon to prevent weapon spam
            const randomWeapon = character.weapons[Math.floor(Math.random() * character.weapons.length)];
            this.spawnWeapon(character.position.clone(), randomWeapon.weaponType, randomWeapon.tier);
        }
    }
    
    // Get available weapons for rendering
    getAvailableWeapons() {
        return this.availableWeapons.filter(w => w.active);
    }
    
    // Get direction to avoid circular map boundaries
    getAvoidBoundaryDirection(ai) {
        const pos = ai.position;
        const checkDistance = 200; // Start avoiding when within 200px of edge
        
        // Calculate distance from map center
        const dx = pos.x - MAP_CONFIG.centerX;
        const dy = pos.y - MAP_CONFIG.centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        
        // Check if close to boundary
        if (distanceFromCenter > MAP_CONFIG.radius - checkDistance) {
            // Push towards center
            const avoidDirection = new Vector2D(-dx, -dy);
            avoidDirection.normalize();
            return avoidDirection;
        }
        
        return null;
    }
    
    // Clear all AI data
    clear() {
        this.availableWeapons = [];
    }
}