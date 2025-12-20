// AI System for managing AI character behavior

import { Vector2D } from '../utils/Vector2D.js';
import { Weapon, WeaponPickup } from '../entities/Weapon.js';
import { Consumable } from '../entities/Consumable.js';
import { createWeapon } from '../config/weapons.js';
import { createConsumable } from '../config/consumables.js';
import { getCurrentMapConfig, getGameConfig } from '../config/map.js';
import { AINavigationSystem } from './ai/AINavigationSystem.js';
import { AIPerceptionSystem } from './ai/AIPerceptionSystem.js';
import { AIBehaviorSystem } from './ai/AIBehaviorSystem.js';

export class AISystem {
    constructor(gameState, eventBus, combatSystem, abilitySystem = null) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.combatSystem = combatSystem;
        this.abilitySystem = abilitySystem;
        const gameConfig = getGameConfig();
        this.aiSpeedMultiplier = gameConfig.movement?.aiSpeedMultiplier ?? 2.2;
        
        // Initialize specialized subsystems
        this.navigationSystem = new AINavigationSystem();
        this.perceptionSystem = new AIPerceptionSystem();
        this.behaviorSystem = new AIBehaviorSystem(
            this.navigationSystem,
            this.perceptionSystem
        );
        
        // Available weapons for AI to pick up
        this.availableWeapons = [];
        
        // Max weapons allowed on map (from game config)
        this.maxWeapons = gameConfig.loot.maxWeaponsOnMap;
        
        // Listen for character death events
        this.eventBus.on('characterDamaged', (data) => this.onCharacterDamaged(data));

        // Reusable scratch vectors to avoid allocations in hot loops
        this._scratchVector1 = new Vector2D(0, 0);
        this._scratchVector2 = new Vector2D(0, 0);
        this._scratchVector3 = new Vector2D(0, 0);
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
        this.perceptionSystem.updatePerception(
            ai,
            this.gameState.characters,
            this.gameState.consumables,
            this.availableWeapons
        );
        
        // Decision making
        if (ai.canMakeDecision()) {
            this.behaviorSystem.makeDecision(ai, this.gameState);
            ai.resetDecisionCooldown();
        }
        
        // Execute current state behavior
        switch (ai.getState()) {
            case 'moveToSafeZone':
                this.behaviorSystem.executeMoveToSafeZone(
                    ai,
                    deltaTime,
                    this.aiSpeedMultiplier,
                    this.gameState
                );
                // Still fire at enemies if they're in the way
                if (ai.targetEnemy && ai.weapons.length > 0) {
                    this.behaviorSystem.tryFireWeapon(ai, this.combatSystem);
                }
                break;
            case 'patrol':
                this.behaviorSystem.executePatrol(ai, deltaTime, this.aiSpeedMultiplier);
                break;
            case 'seekLoot':
                this.behaviorSystem.executeSeekLoot(
                    ai,
                    deltaTime,
                    this.aiSpeedMultiplier,
                    this.gameState,
                    (aiChar, weaponPickup) => this.pickupWeapon(aiChar, weaponPickup)
                );
                break;
            case 'combat':
                this.behaviorSystem.executeCombat(
                    ai,
                    deltaTime,
                    this.aiSpeedMultiplier,
                    this.abilitySystem
                );
                // Try to fire weapon
                this.behaviorSystem.tryFireWeapon(ai, this.combatSystem);
                break;
            case 'flee':
                this.behaviorSystem.executeFlee(
                    ai,
                    deltaTime,
                    this.aiSpeedMultiplier,
                    this.gameState,
                    this.abilitySystem
                );
                // Try to fire weapon while fleeing (fight back)
                this.behaviorSystem.tryFireWeapon(ai, this.combatSystem);
                break;
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
    
    // Clear all AI data
    clear() {
        this.availableWeapons = [];
    }
}
