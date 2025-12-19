// AI System for managing AI character behavior

import { Vector2D } from '../utils/Vector2D.js';
import { Weapon, WeaponPickup } from '../entities/Weapon.js';
import { Consumable } from '../entities/Consumable.js';
import { createWeapon } from '../config/weapons.js';
import { createConsumable } from '../config/consumables.js';
import { MAP_CONFIG, getCurrentMapConfig, getGameConfig } from '../config/map.js';

export class AISystem {
    constructor(gameState, eventBus, combatSystem) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.combatSystem = combatSystem;
        
        // Available weapons for AI to pick up
        this.availableWeapons = [];
        
        // Max weapons allowed on map (from game config)
        const gameConfig = getGameConfig();
        this.maxWeapons = gameConfig.loot.maxWeaponsOnMap;
        
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
            // Check health kit usage every update
            this.useHealthKitIfNeeded(ai);
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
        
        // Look for nearby health kits if damaged and has room
        const needsHealing = ai.currentHP < ai.maxHP * 0.7; // Below 70% health
        const hasRoomForHealthKit = ai.healthKits < ai.maxHealthKits;
        
        if (needsHealing && hasRoomForHealthKit && !ai.targetConsumable) {
            this.findNearestHealthKit(ai);
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
        
        // Priority 2: Seek health kit if damaged and found one
        const needsHealing = ai.currentHP < ai.maxHP * 0.5; // Below 50% health
        const hasRoomForHealthKit = ai.healthKits < ai.maxHealthKits;
        if (needsHealing && hasRoomForHealthKit && ai.targetConsumable) {
            ai.setState('seekLoot');
            return;
        }
        
        // Priority 3: Combat if enemy detected and has weapon
        if (ai.targetEnemy && ai.weapons.length > 0) {
            ai.setState('combat');
            return;
        }
        
        // Priority 4: Seek weapon if don't have max weapons and found a target
        if (ai.weapons.length < ai.maxWeapons && ai.targetWeapon && ai.targetWeapon.active) {
            ai.setState('seekLoot');
            return;
        }
        
        // Default: Patrol
        ai.setState('patrol');
    }
    
    // Execute patrol behavior
    executePatrol(ai, deltaTime) {
        // Check if AI is stuck on obstacle
        this.checkIfStuck(ai, deltaTime);
        
        // Add movement variation - 10% chance per second to change speed/direction
        if (!ai.moveSpeedMultiplier) ai.moveSpeedMultiplier = 1.0;
        if (!ai.lastVariationChange) ai.lastVariationChange = 0;
        
        ai.lastVariationChange += deltaTime;
        if (ai.lastVariationChange > 1.0 && Math.random() < 0.1) {
            // Random speed variation (70-130%)
            ai.moveSpeedMultiplier = 0.7 + Math.random() * 0.6;
            ai.lastVariationChange = 0;
        }
        
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
        
        // Add unstuck vector if AI is stuck (more aggressive)
        if (ai.isStuck && ai.unstuckDirection) {
            wanderDirection.add(ai.unstuckDirection.multiply(3));
            wanderDirection.normalize();
        }
        
        // Set velocity for wandering with variation
        const patrolSpeed = ai.moveSpeed * 0.5 * ai.moveSpeedMultiplier;
        ai.velocity.x = wanderDirection.x * patrolSpeed;
        ai.velocity.y = wanderDirection.y * patrolSpeed;
        
        // Update facing angle
        if (ai.velocity.magnitude() > 0.1) {
            ai.facingAngle = ai.velocity.angle();
        }
    }
    
    // Execute seek loot behavior
    executeSeekLoot(ai, deltaTime) {
        // Determine what we're seeking - health kit or weapon
        const targetItem = ai.targetConsumable || ai.targetWeapon;
        
        if (!targetItem || (ai.targetWeapon && !ai.targetWeapon.active)) {
            ai.setState('patrol');
            ai.pickupAttemptStart = null;
            ai.targetConsumable = null;
            return;
        }
        
        // Track pickup timeout to prevent getting stuck
        if (!ai.pickupAttemptStart) {
            ai.pickupAttemptStart = Date.now();
        } else if (Date.now() - ai.pickupAttemptStart > 3000) {
            // Been trying to pickup for 3+ seconds, give up
            console.log(`AI ${ai.name} gave up on ${ai.targetConsumable ? 'consumable' : 'weapon'} pickup (timeout)`);
            ai.setTargetWeapon(null);
            ai.targetConsumable = null;
            ai.pickupAttemptStart = null;
            ai.setState('patrol');
            return;
        }
        
        // Move towards target item
        const direction = new Vector2D(
            targetItem.position.x - ai.position.x,
            targetItem.position.y - ai.position.y
        );
        
        const distance = direction.magnitude();
        
        // Try to pick up item if in range
        if (distance < 30) {
            if (ai.targetConsumable) {
                // Try to pick up consumable
                const consumable = ai.targetConsumable;
                if (consumable.consumableType === 'healthKit' && ai.canCarryHealthKit()) {
                    ai.addHealthKit();
                    consumable.active = false;
                    // Remove from game state
                    const index = this.gameState.consumables.indexOf(consumable);
                    if (index > -1) {
                        this.gameState.consumables.splice(index, 1);
                    }
                    console.log(`AI ${ai.name} picked up health kit (now has ${ai.healthKits})`);
                }
                ai.targetConsumable = null;
                ai.pickupAttemptStart = null;
                ai.setState('patrol');
                return;
            } else if (ai.targetWeapon && ai.targetWeapon.isInRange(ai)) {
                // Try to pick up weapon (with timer)
                const pickupComplete = ai.targetWeapon.updatePickup(ai, deltaTime);
                if (pickupComplete) {
                    const success = this.pickupWeapon(ai, ai.targetWeapon);
                    ai.setTargetWeapon(null);
                    ai.pickupAttemptStart = null;
                    ai.setState('patrol');
                    return;
                }
            }
        }
        
        // Move towards item if not in range yet
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
    
    // Check if AI is stuck and add unstuck behavior
    checkIfStuck(ai, deltaTime) {
        // Initialize stuck tracking if not present
        if (!ai.lastPosition) {
            ai.lastPosition = ai.position.clone();
            ai.stuckTimer = 0;
            ai.isStuck = false;
            ai.unstuckDirection = null;
            ai.unstuckTimer = 0;
            ai.unstuckAttempts = 0;
            return;
        }
        
        // Check if AI has moved significantly
        const distanceMoved = ai.position.distanceTo(ai.lastPosition);
        const expectedMovement = ai.moveSpeed * deltaTime * 0.15; // More sensitive - expect at least 15% of speed
        
        if (distanceMoved < expectedMovement && ai.velocity.magnitude() > 0.5) {
            // AI is trying to move but not moving much - likely stuck
            ai.stuckTimer += deltaTime;
            
            if (ai.stuckTimer > 0.3 && !ai.isStuck) {
                // Stuck for more than 0.3 seconds (reduced from 0.5)
                ai.isStuck = true;
                ai.unstuckTimer = 2.0; // Try to unstuck for 2 seconds (increased)
                ai.unstuckAttempts++;
                
                // Generate a more aggressive unstuck direction
                // Try moving perpendicular or opposite to current velocity
                let unstuckAngle;
                if (ai.unstuckAttempts % 3 === 0) {
                    // Every 3rd attempt, try moving backward
                    unstuckAngle = ai.velocity.angle() + Math.PI;
                } else {
                    // Otherwise try perpendicular with some randomness
                    const perpOffset = (Math.random() - 0.5) * Math.PI * 0.5;
                    unstuckAngle = ai.velocity.angle() + Math.PI / 2 + perpOffset;
                }
                
                ai.unstuckDirection = new Vector2D(
                    Math.cos(unstuckAngle),
                    Math.sin(unstuckAngle)
                );
                
                console.log(`AI ${ai.name} is stuck (attempt ${ai.unstuckAttempts}), trying to unstuck at angle ${(unstuckAngle * 180 / Math.PI).toFixed(0)}°`);
            }
        } else {
            // AI is moving normally - reset stuck timer
            if (ai.stuckTimer > 0) {
                ai.stuckTimer = Math.max(0, ai.stuckTimer - deltaTime * 2); // Decay faster when moving
            }
        }
        
        // Update unstuck timer
        if (ai.isStuck) {
            ai.unstuckTimer -= deltaTime;
            if (ai.unstuckTimer <= 0) {
                ai.isStuck = false;
                ai.unstuckDirection = null;
                ai.stuckTimer = 0;
                console.log(`AI ${ai.name} unstuck attempt ended`);
            }
        }
        
        // Update last position
        ai.lastPosition = ai.position.clone();
    }
    
    // Execute combat behavior
    executeCombat(ai, deltaTime) {
        // Check if AI is stuck on obstacle
        this.checkIfStuck(ai, deltaTime);
        if (!ai.targetEnemy || ai.targetEnemy.isDead) {
            ai.setState('patrol');
            return;
        }
        
        const distanceToEnemy = ai.position.distanceTo(ai.targetEnemy.position);
        
        // Move towards enemy if too far
        if (distanceToEnemy > ai.combatRange * 0.7) {
            let direction = new Vector2D(
                ai.targetEnemy.position.x - ai.position.x,
                ai.targetEnemy.position.y - ai.position.y
            );
            direction.normalize();
            
            // Add unstuck vector if AI is stuck (more aggressive)
            if (ai.isStuck && ai.unstuckDirection) {
                direction.add(ai.unstuckDirection.multiply(2.5));
                direction.normalize();
            }
            
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
        // Check if AI is stuck on obstacle
        this.checkIfStuck(ai, deltaTime);
        if (!this.gameState.safeZoneSystem) {
            ai.setState('patrol');
            return;
        }
        
        const safeZoneInfo = this.gameState.safeZoneSystem.getSafeZoneInfo();
        
        // Calculate direction to safe zone center (move to center, not just to edge)
        const directionToCenter = new Vector2D(
            safeZoneInfo.centerX - ai.position.x,
            safeZoneInfo.centerY - ai.position.y
        );
        
        const distanceToCenter = directionToCenter.magnitude();
        
        // Only switch back to patrol when near center (30% of radius from center)
        // This ensures NPCs move to center, not just to edge
        if (distanceToCenter <= safeZoneInfo.currentRadius * 0.3) {
            ai.setState('patrol');
            return;
        }
        
        // Move at full speed towards safe zone center
        directionToCenter.normalize();
        
        // Add unstuck vector if AI is stuck (more aggressive)
        if (ai.isStuck && ai.unstuckDirection) {
            directionToCenter.add(ai.unstuckDirection.multiply(2.5));
            directionToCenter.normalize();
        }
        
        // Add urgency based on distance from safe zone edge
        const distanceFromEdge = safeZoneInfo.currentRadius - distanceToCenter;
        const urgencyMultiplier = distanceFromEdge < 0 ?
            Math.min(2.0, 1.2 + Math.abs(distanceFromEdge) / safeZoneInfo.currentRadius) : 1.2;
        
        ai.velocity.x = directionToCenter.x * ai.moveSpeed * urgencyMultiplier;
        ai.velocity.y = directionToCenter.y * ai.moveSpeed * urgencyMultiplier;
        ai.facingAngle = directionToCenter.angle();
        
        // Still fire at enemies if they're in the way
        if (ai.targetEnemy && ai.weapons.length > 0) {
            this.tryFireWeapon(ai);
        }
    }
    
    // Execute flee behavior
    executeFlee(ai, deltaTime) {
        // Check if AI is stuck on obstacle
        this.checkIfStuck(ai, deltaTime);
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
            fleeDirection.add(avoidDirection.multiply(2)); // Weight boundary avoidance more
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
                fleeDirection.add(toSafeZone.multiply(1.5));
            }
        }
        
        fleeDirection.normalize();
        
        // Add unstuck vector if AI is stuck (more aggressive)
        if (ai.isStuck && ai.unstuckDirection) {
            fleeDirection.add(ai.unstuckDirection.multiply(2.5));
            fleeDirection.normalize();
        }
        
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
            
            // Check if AI can actually pick up this weapon
            if (!this.canPickupWeapon(ai, weapon)) {
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
    
    // Find nearest health kit for AI
    findNearestHealthKit(ai) {
        if (!this.gameState.consumables || this.gameState.consumables.length === 0) {
            ai.targetConsumable = null;
            return;
        }
        
        let nearestHealthKit = null;
        let nearestDistance = Infinity;
        
        this.gameState.consumables.forEach(consumable => {
            if (!consumable.active || consumable.consumableType !== 'healthKit') return;
            
            const distance = ai.position.distanceTo(consumable.position);
            if (distance < nearestDistance && distance < ai.perceptionRange) {
                nearestDistance = distance;
                nearestHealthKit = consumable;
            }
        });
        
        if (nearestHealthKit) {
            ai.targetConsumable = nearestHealthKit;
        } else {
            ai.targetConsumable = null;
        }
    }
    
    // Use health kit if needed based on skill level
    useHealthKitIfNeeded(ai) {
        if (ai.healthKits <= 0 || ai.isDead) return;
        
        const healthPercent = ai.currentHP / ai.maxHP;
        let shouldUse = false;
        
        // Skill-based thresholds
        switch(ai.aiSkillLevel) {
            case 'novice':
                shouldUse = healthPercent < 0.3; // Use when very low (30%)
                break;
            case 'intermediate':
                shouldUse = healthPercent < 0.5; // Use when moderate (50%)
                break;
            case 'expert':
                // Use strategically - during/after combat or when low
                const inCombat = ai.aiState === 'combat' || ai.aiState === 'flee';
                shouldUse = healthPercent < 0.6 || (inCombat && healthPercent < 0.8);
                break;
            default:
                shouldUse = healthPercent < 0.3;
        }
        
        if (shouldUse) {
            const success = ai.useHealthKit();
            if (success) {
                console.log(`AI ${ai.name} (${ai.aiSkillLevel}) used health kit, health now: ${ai.currentHP}/${ai.maxHP}`);
            }
        }
    }
    
    // Check if AI can pickup a weapon (eligibility check)
    canPickupWeapon(ai, weaponPickup) {
        const config = weaponPickup.getWeaponConfig();
        const result = ai.getWeaponPickupResult(config);
        return result.ok;
    }
    
    // Pick up weapon
    pickupWeapon(ai, weaponPickup) {
        const config = weaponPickup.getWeaponConfig();
        
        // Try to pickup weapon using AI's method
        const result = ai.tryPickupWeapon(config);
        
        if (result.ok) {
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
        if (character.isDead) {
            // Drop consumables randomly: 70% health kit, 25% shield potion, 5% nothing
            const dropChance = Math.random();
            
            if (dropChance < 0.70) {
                // 70% chance to drop health kit
                this.spawnConsumableNearPosition(character.position.clone(), 'healthKit');
            } else if (dropChance < 0.95) {
                // 25% chance to drop shield potion
                this.spawnConsumableNearPosition(character.position.clone(), 'shieldPotion');
            }
            // 5% chance to drop nothing (dropChance >= 0.95)
        }
    }
    
    // Spawn a consumable near a position (avoid obstacles)
    spawnConsumableNearPosition(position, consumableType) {
        const mapConfig = getCurrentMapConfig();
        const clearanceRadius = 30;
        
        // Try to find valid position near death location
        let validPos = this.findValidSpawnPosition(position.x, position.y, mapConfig, clearanceRadius);
        
        if (!validPos) {
            // If can't find valid position nearby, skip spawn
            console.warn(`Could not spawn ${consumableType} near (${Math.round(position.x)}, ${Math.round(position.y)})`);
            return null;
        }
        
        const consumable = new Consumable(createConsumable(consumableType));
        consumable.setPosition(validPos.x, validPos.y);
        
        // Add to game state consumables array
        if (this.gameState.consumables) {
            this.gameState.consumables.push(consumable);
        }
        
        return consumable;
    }
    
    // Find valid spawn position not on obstacles (similar to main.js version)
    findValidSpawnPosition(x, y, mapConfig, clearanceRadius = 30, maxAttempts = 5) {
        const checkPosition = (checkX, checkY) => {
            for (const obstacle of mapConfig.obstacles) {
                const obstacleLeft = obstacle.position.x - obstacle.width / 2;
                const obstacleRight = obstacle.position.x + obstacle.width / 2;
                const obstacleTop = obstacle.position.y - obstacle.height / 2;
                const obstacleBottom = obstacle.position.y + obstacle.height / 2;
                
                if (checkX + clearanceRadius > obstacleLeft &&
                    checkX - clearanceRadius < obstacleRight &&
                    checkY + clearanceRadius > obstacleTop &&
                    checkY - clearanceRadius < obstacleBottom) {
                    return false;
                }
            }
            return true;
        };
        
        // Try original position first
        if (checkPosition(x, y)) {
            return { x, y };
        }
        
        // Try nearby positions in a spiral pattern
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const radius = attempt * 40;
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const testX = x + Math.cos(angle) * radius;
                const testY = y + Math.sin(angle) * radius;
                
                const distFromCenter = Math.sqrt(
                    Math.pow(testX - mapConfig.centerX, 2) +
                    Math.pow(testY - mapConfig.centerY, 2)
                );
                
                if (distFromCenter < mapConfig.radius - 100 && checkPosition(testX, testY)) {
                    return { x: testX, y: testY };
                }
            }
        }
        
        return null;
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