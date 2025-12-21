/**
 * AIBehaviorSystem.js - AI Decision-Making and Behavior Execution
 *
 * Implements the AI state machine and behavior execution logic. Makes decisions
 * based on perception data and executes behaviors like combat, loot seeking,
 * fleeing, patrolling, and moving to safe zone.
 *
 * Key Responsibilities:
 * - Make behavioral decisions based on game state and perception
 * - Execute patrol, combat, flee, seek loot, and safe zone behaviors
 * - Handle weapon firing with skill-based accuracy
 * - Use character abilities appropriately (dash, slam)
 * - Apply strafe movement during combat
 *
 * Architecture Notes:
 * - State machine with priority-based decision tree
 * - Uses AINavigationSystem for pathfinding
 * - Uses AIPerceptionSystem for target/loot detection
 * - Skill profiles control difficulty (aim, reaction time, aggression)
 *
 * Performance Considerations:
 * - Uses scratch vectors to avoid allocations in hot loops
 * - Decision cooldowns prevent excessive recalculation
 *
 * @module systems/ai/AIBehaviorSystem
 */

import { Vector2D } from '../../utils/Vector2D.js';

export class AIBehaviorSystem {
    constructor(navigationSystem, perceptionSystem) {
        this.navigationSystem = navigationSystem;
        this.perceptionSystem = perceptionSystem;
        
        // Reusable scratch vectors to avoid allocations in hot loops
        this._scratchVector1 = new Vector2D(0, 0);
        this._scratchVector2 = new Vector2D(0, 0);
        this._scratchVector3 = new Vector2D(0, 0);
    }
    
    /**
     * Make a decision for this AI based on current state
     * @param {AICharacter} ai - The AI character
     * @param {Object} gameState - Current game state
     * @returns {string} Chosen behavior state
     */
    makeDecision(ai, gameState) {
        const safeZoneSystem = gameState.safeZoneSystem;
        const hasSafeZone = !!safeZoneSystem;
        const isOutsideSafeZone = hasSafeZone && safeZoneSystem.isOutsideZone(ai.position.x, ai.position.y);

        // Priority 0: Avoid safe zone BEFORE taking damage, but not at all costs.
        // If we're close to the edge and the zone is shrinking or a phase is imminent, bias toward moving inward.
        let shouldPreemptSafeZone = false;
        if (hasSafeZone) {
            const info = safeZoneSystem.getSafeZoneInfo();
            const dx = ai.position.x - info.centerX;
            const dy = ai.position.y - info.centerY;
            const distToCenter = Math.sqrt(dx * dx + dy * dy);
            const distanceFromEdge = info.currentRadius - distToCenter;
            const timeUntilNextMs = typeof safeZoneSystem.getTimeUntilNextPhase === 'function' ? safeZoneSystem.getTimeUntilNextPhase() : 0;

            const buffer = Math.max(90, Math.min(180, info.currentRadius * 0.09));
            const phaseSoon = timeUntilNextMs > 0 && timeUntilNextMs < 9000;
            const riskRising = info.isShrinking || phaseSoon || info.currentDamage > 0;

            if (distanceFromEdge < buffer && riskRising) {
                shouldPreemptSafeZone = true;

                // Not at all costs: if we're already engaged in close combat and healthy, keep fighting.
                if (ai.targetEnemy && ai.weapons.length > 0) {
                    const dEnemy = ai.position.distanceTo(ai.targetEnemy.position);
                    const engagedClose = dEnemy < ai.combatRange * 0.75;
                    if (engagedClose && ai.getHealthPercentage() > ai.fleeHealthThreshold + 0.15) {
                        shouldPreemptSafeZone = false;
                    }
                }
            }
        }

        if (isOutsideSafeZone || shouldPreemptSafeZone) {
            ai.setState('moveToSafeZone');
            return 'moveToSafeZone';
        }

        // Priority 1: If unarmed, aggressively loot until we have at least 1 weapon.
        if (ai.weapons.length === 0) {
            if (ai.targetWeapon && ai.targetWeapon.active) {
                ai.setState('seekLoot');
                return 'seekLoot';
            }
            // Fall back to patrol if no weapons exist (should be rare)
            ai.setState('patrol');
            return 'patrol';
        }
        
        // Priority 2: Flee if low health
        if (ai.shouldFlee()) {
            ai.setState('flee');
            return 'flee';
        }
        
        // Priority 3: Seek health kit if damaged and found one
        const needsHealing = ai.currentHP < ai.maxHP * 0.5; // Below 50% health
        const hasRoomForHealthKit = ai.healthKits < ai.maxHealthKits;
        if (needsHealing && hasRoomForHealthKit && ai.targetConsumable) {
            ai.setState('seekLoot');
            return 'seekLoot';
        }
        
        // Priority 4: Combat if enemy detected and has weapon
        if (ai.targetEnemy && ai.weapons.length > 0) {
            ai.setState('combat');
            return 'combat';
        }
        
        // Priority 5: Seek weapon if don't have max weapons and found a target
        if (ai.weapons.length < ai.maxWeapons && ai.targetWeapon && ai.targetWeapon.active) {
            ai.setState('seekLoot');
            return 'seekLoot';
        }
        
        // Default: Patrol
        ai.setState('patrol');
        return 'patrol';
    }
    
    /**
     * Execute patrol behavior
     * @param {AICharacter} ai - The AI character
     * @param {number} deltaTime - Time delta
     * @param {number} aiSpeedMultiplier - AI speed multiplier from game config
     */
    executePatrol(ai, deltaTime, aiSpeedMultiplier) {
        // Check if AI is stuck on obstacle
        this.navigationSystem.checkIfStuck(ai, deltaTime, aiSpeedMultiplier);
        
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
        const avoidDirection = this.navigationSystem.getAvoidBoundaryDirection(ai);
        
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

        // Lightweight local avoidance to reduce obstacle buzzing
        this.navigationSystem.steerAroundObstacles(ai, wanderDirection);
        
        // Set velocity for wandering with variation
        const patrolSpeed = ai.moveSpeed * aiSpeedMultiplier * 0.5 * ai.moveSpeedMultiplier;
        ai.velocity.x = wanderDirection.x * patrolSpeed;
        ai.velocity.y = wanderDirection.y * patrolSpeed;
        
        // Update facing angle
        if (ai.velocity.magnitude() > 0.1) {
            ai.facingAngle = ai.velocity.angle();
        }
    }
    
    /**
     * Execute seek loot behavior
     * @param {AICharacter} ai - The AI character
     * @param {number} deltaTime - Time delta
     * @param {number} aiSpeedMultiplier - AI speed multiplier from game config
     * @param {Object} gameState - Current game state
     * @param {Function} pickupWeaponCallback - Callback to pick up weapon
     */
    executeSeekLoot(ai, deltaTime, aiSpeedMultiplier, gameState, pickupWeaponCallback) {
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
        this._scratchVector1.set(
            targetItem.position.x - ai.position.x,
            targetItem.position.y - ai.position.y
        );
        const direction = this._scratchVector1;
        
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
                    const index = gameState.consumables.indexOf(consumable);
                    if (index > -1) {
                        gameState.consumables.splice(index, 1);
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
                    const success = pickupWeaponCallback(ai, ai.targetWeapon);
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

            // Lightweight local avoidance to reduce obstacle buzzing
            this.navigationSystem.steerAroundObstacles(ai, direction);

            const unarmedSprint = ai.weapons.length === 0 ? 1.25 : 1.0;
            const moveSpeed = ai.moveSpeed * aiSpeedMultiplier * unarmedSprint;
            ai.velocity.x = direction.x * moveSpeed;
            ai.velocity.y = direction.y * moveSpeed;
            ai.facingAngle = direction.angle();
        } else {
            // Stop moving when close enough to pickup
            ai.velocity.x = 0;
            ai.velocity.y = 0;
        }
    }
    
    /**
     * Execute combat behavior
     * @param {AICharacter} ai - The AI character
     * @param {number} deltaTime - Time delta
     * @param {number} aiSpeedMultiplier - AI speed multiplier from game config
     * @param {Object} abilitySystem - Ability system for special abilities
     */
    executeCombat(ai, deltaTime, aiSpeedMultiplier, abilitySystem) {
        // Check if AI is stuck on obstacle
        this.navigationSystem.checkIfStuck(ai, deltaTime, aiSpeedMultiplier);
        if (!ai.targetEnemy || ai.targetEnemy.isDead) {
            ai.setState('patrol');
            return;
        }
        
        const distanceToEnemy = ai.position.distanceTo(ai.targetEnemy.position);
        
        // Move towards enemy if too far
        if (distanceToEnemy > ai.combatRange * 0.7) {
            this._scratchVector1.set(
                ai.targetEnemy.position.x - ai.position.x,
                ai.targetEnemy.position.y - ai.position.y
            );
            const direction = this._scratchVector1;
            direction.normalize();
            
            // Add unstuck vector if AI is stuck (more aggressive)
            if (ai.isStuck && ai.unstuckDirection) {
                direction.add(ai.unstuckDirection.multiply(2.5));
                direction.normalize();
            }

            // Lightweight local avoidance to reduce obstacle buzzing
            this.navigationSystem.steerAroundObstacles(ai, direction);
            
            ai.velocity.x = direction.x * ai.moveSpeed * aiSpeedMultiplier * 0.8;
            ai.velocity.y = direction.y * ai.moveSpeed * aiSpeedMultiplier * 0.8;
            ai.facingAngle = direction.angle();
        }
        // Keep distance if too close
        else if (distanceToEnemy < ai.combatRange * 0.4) {
            this._scratchVector1.set(
                ai.position.x - ai.targetEnemy.position.x,
                ai.position.y - ai.targetEnemy.position.y
            );
            const direction = this._scratchVector1;
            direction.normalize();

            // Lightweight local avoidance to reduce obstacle buzzing
            this.navigationSystem.steerAroundObstacles(ai, direction);
            
            ai.velocity.x = direction.x * ai.moveSpeed * aiSpeedMultiplier * 0.6;
            ai.velocity.y = direction.y * ai.moveSpeed * aiSpeedMultiplier * 0.6;
            ai.facingAngle = Math.atan2(
                ai.targetEnemy.position.y - ai.position.y,
                ai.targetEnemy.position.x - ai.position.x
            );
        }
        // Stay in optimal range and strafe
        else {
            // Strafe movement
            this._scratchVector2.set(
                ai.targetEnemy.position.y - ai.position.y,
                -(ai.targetEnemy.position.x - ai.position.x)
            );
            const perpendicular = this._scratchVector2;
            perpendicular.normalize();

            // Prefer a consistent strafe side per bot (reduces hive-mind feel)
            const strafeSide = typeof ai.strafeSide === 'number' ? ai.strafeSide : 1;
            perpendicular.multiply(strafeSide);

            // Skill-based strafe strength
            const strafeStrength = typeof ai.strafeStrength === 'number' ? ai.strafeStrength : 0.4;
            perpendicular.multiply(strafeStrength / 0.4);

            // Lightweight local avoidance to reduce obstacle buzzing
            this.navigationSystem.steerAroundObstacles(ai, perpendicular);
            
            ai.velocity.x = perpendicular.x * ai.moveSpeed * aiSpeedMultiplier * 0.4;
            ai.velocity.y = perpendicular.y * ai.moveSpeed * aiSpeedMultiplier * 0.4;
            ai.facingAngle = Math.atan2(
                ai.targetEnemy.position.y - ai.position.y,
                ai.targetEnemy.position.x - ai.position.x
            );
        }

        // Try to use special ability (dash/slam) sometimes during combat
        this.tryUseAbility(ai, deltaTime, ai.targetEnemy, distanceToEnemy, 'combat', abilitySystem);
    }
    
    /**
     * Execute move to safe zone behavior
     * @param {AICharacter} ai - The AI character
     * @param {number} deltaTime - Time delta
     * @param {number} aiSpeedMultiplier - AI speed multiplier from game config
     * @param {Object} gameState - Current game state
     */
    executeMoveToSafeZone(ai, deltaTime, aiSpeedMultiplier, gameState) {
        // Check if AI is stuck on obstacle
        this.navigationSystem.checkIfStuck(ai, deltaTime, aiSpeedMultiplier);
        if (!gameState.safeZoneSystem) {
            ai.setState('patrol');
            return;
        }
        
        const safeZoneInfo = gameState.safeZoneSystem.getSafeZoneInfo();
        
        // Calculate direction to safe zone center (move to center, not just to edge)
        this._scratchVector1.set(
            safeZoneInfo.centerX - ai.position.x,
            safeZoneInfo.centerY - ai.position.y
        );
        const directionToCenter = this._scratchVector1;
        
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

        // Lightweight local avoidance to reduce obstacle buzzing
        this.navigationSystem.steerAroundObstacles(ai, directionToCenter);
        
        // Add urgency based on distance from safe zone edge
        const distanceFromEdge = safeZoneInfo.currentRadius - distanceToCenter;
        const urgencyMultiplier = distanceFromEdge < 0 ?
            Math.min(2.0, 1.2 + Math.abs(distanceFromEdge) / safeZoneInfo.currentRadius) : 1.2;
        
        ai.velocity.x = directionToCenter.x * ai.moveSpeed * aiSpeedMultiplier * urgencyMultiplier;
        ai.velocity.y = directionToCenter.y * ai.moveSpeed * aiSpeedMultiplier * urgencyMultiplier;
        ai.facingAngle = directionToCenter.angle();
    }
    
    /**
     * Execute flee behavior
     * @param {AICharacter} ai - The AI character
     * @param {number} deltaTime - Time delta
     * @param {number} aiSpeedMultiplier - AI speed multiplier from game config
     * @param {Object} gameState - Current game state
     * @param {Object} abilitySystem - Ability system for special abilities
     */
    executeFlee(ai, deltaTime, aiSpeedMultiplier, gameState, abilitySystem) {
        // Check if AI is stuck on obstacle
        this.navigationSystem.checkIfStuck(ai, deltaTime, aiSpeedMultiplier);
        if (!ai.targetEnemy) {
            ai.setState('patrol');
            return;
        }
        
        // Run away from enemy
        this._scratchVector1.set(
            ai.position.x - ai.targetEnemy.position.x,
            ai.position.y - ai.targetEnemy.position.y
        );
        let fleeDirection = this._scratchVector1;
        
        // Check if near boundary and adjust flee direction
        const avoidDirection = this.navigationSystem.getAvoidBoundaryDirection(ai);
        if (avoidDirection) {
            // Blend flee direction with boundary avoidance
            fleeDirection.add(avoidDirection.multiply(2)); // Weight boundary avoidance more
        }
        
        // Also check if fleeing towards safe zone if outside
        if (gameState.safeZoneSystem) {
            const isOutside = gameState.safeZoneSystem.isOutsideZone(ai.position.x, ai.position.y);
            if (isOutside) {
                const safeZoneInfo = gameState.safeZoneSystem.getSafeZoneInfo();
                this._scratchVector2.set(
                    safeZoneInfo.centerX - ai.position.x,
                    safeZoneInfo.centerY - ai.position.y
                );
                const toSafeZone = this._scratchVector2;
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

        // Lightweight local avoidance to reduce obstacle buzzing
        this.navigationSystem.steerAroundObstacles(ai, fleeDirection);
        
        ai.velocity.x = fleeDirection.x * ai.moveSpeed * aiSpeedMultiplier; // Full speed when fleeing
        ai.velocity.y = fleeDirection.y * ai.moveSpeed * aiSpeedMultiplier;
        
        // Face the enemy while fleeing (to shoot back)
        ai.facingAngle = Math.atan2(
            ai.targetEnemy.position.y - ai.position.y,
            ai.targetEnemy.position.x - ai.position.x
        );

        // Bolt can dash to disengage; Boulder may slam if cornered.
        const distanceToEnemy = ai.position.distanceTo(ai.targetEnemy.position);
        this.tryUseAbility(ai, deltaTime, ai.targetEnemy, distanceToEnemy, 'flee', abilitySystem);
        
        // If health recovered enough, return to combat
        if (ai.getHealthPercentage() > ai.fleeHealthThreshold + 0.2) {
            ai.setState('combat');
        }
    }
    
    /**
     * Try to fire weapon at target
     * @param {AICharacter} ai - The AI character
     * @param {Object} combatSystem - Combat system for firing weapons
     */
    tryFireWeapon(ai, combatSystem) {
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
        combatSystem.fireWeapon(ai, weapon, aimAngle);
    }
    
    /**
     * Try to use special ability (dash/slam)
     * @param {AICharacter} ai - The AI character
     * @param {number} deltaTime - Time delta
     * @param {Character} targetEnemy - Target enemy
     * @param {number} distanceToEnemy - Distance to enemy
     * @param {string} context - Context ('combat' or 'flee')
     * @param {Object} abilitySystem - Ability system for activating abilities
     */
    tryUseAbility(ai, deltaTime, targetEnemy, distanceToEnemy, context, abilitySystem) {
        if (!abilitySystem) return;
        if (!ai || !ai.specialAbility || ai.specialAbilityCooldown > 0) return;
        if (!targetEnemy || targetEnemy.isDead) return;

        const chancePerSecond = typeof ai.abilityUseChancePerSecond === 'number' ? ai.abilityUseChancePerSecond : 0;
        const rollChance = Math.max(0, chancePerSecond) * deltaTime;
        if (rollChance <= 0) return;
        if (Math.random() > rollChance) return;

        const abilityType = ai.specialAbility.type;

        if (abilityType === 'dash') {
            const shouldDashToChase = context === 'combat' && distanceToEnemy > ai.combatRange * 0.85;
            const shouldDashToEscape = context === 'flee' && distanceToEnemy < ai.combatRange * 0.55;
            const shouldDashToUnstick = !!ai.isStuck;

            if (shouldDashToChase || shouldDashToEscape || shouldDashToUnstick) {
                abilitySystem.activateAbility(ai);
            }
            return;
        }

        if (abilityType === 'groundSlam') {
            const slamRadius = 120;

            // Use slam intentionally: only when target is within the effect radius.
            if (distanceToEnemy <= slamRadius) {
                abilitySystem.activateAbility(ai);
            }
        }
    }
}
