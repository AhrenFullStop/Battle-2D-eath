import { EventBus } from './EventBus.js';
import { computeMatchRewards, recordMatchToProfile, saveProfile } from './ProfileStore.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config/constants.js';

export class GameOrchestrator {
    constructor(gameState, systems, renderer, spawnManager, playerCharacter, profile) {
        this.gameState = gameState;
        this.systems = systems;
        this.renderer = renderer;
        this.spawnManager = spawnManager;
        this.playerCharacter = playerCharacter;
        this.profile = profile;
        this.rewardsAwarded = false;

        // Initialize camera to player position
        if (this.playerCharacter && this.systems.cameraSystem) {
            this.systems.cameraSystem.x = this.playerCharacter.position.x - CANVAS_WIDTH / 2;
            this.systems.cameraSystem.y = this.playerCharacter.position.y - CANVAS_HEIGHT / 2;
            this.systems.cameraSystem.targetX = this.systems.cameraSystem.x;
            this.systems.cameraSystem.targetY = this.systems.cameraSystem.y;
            this.gameState.camera = this.systems.cameraSystem.getBounds();
        }

        // Setup event listeners for stats tracking
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Track damage dealt by player
        this.systems.eventBus.on('characterDamaged', (data) => {
            if (data.attacker && data.attacker.isPlayer) {
                this.gameState.addDamage(data.damage);
            }

            // Track damage taken by the player
            if (data.target && data.target.isPlayer) {
                this.gameState.addDamageTaken(data.damage);
            }
        });

        // Track kills by player
        this.systems.eventBus.on('characterKilled', (data) => {
            if (data.attacker && data.attacker.isPlayer && data.target && !data.target.isPlayer) {
                this.gameState.addKill();
            }
        });

        // Track health kits used
        this.systems.eventBus.on('healthKitUsed', (data) => {
            if (data.character && data.character.isPlayer) {
                this.gameState.addHealConsumed();
            }
        });

        // Track consumables picked up (shield potions consumed immediately)
        this.systems.eventBus.on('consumablePickedUp', (data) => {
            if (data.character && data.character.isPlayer && data.consumableType === 'shieldPotion') {
                // Shield potions are consumed immediately on pickup
                this.gameState.addShieldUsed();
            }
        });

        // Track abilities used
        this.systems.eventBus.on('abilityUsed', (data) => {
            if (data.character && data.character.isPlayer) {
                this.gameState.addAbilityUsed();
            }
        });

        // Track weapons fired
        this.systems.eventBus.on('weaponFired', (data) => {
            if (data.character && data.character.isPlayer) {
                this.gameState.addWeaponFired();
            }
        });

        // Track safe zone damage
        this.systems.eventBus.on('zoneDamage', (data) => {
            if (data.character && data.character.isPlayer) {
                this.gameState.addDamageTaken(data.damage);
            }
        });
    }

    update(deltaTime) {
        // Only update if game is initialized and playing
        if (this.gameState.phase !== 'playing') {
            return;
        }

        // Update game time
        this.gameState.updateTime(deltaTime);

        // Update safe zone system
        this.systems.safeZoneSystem.update(deltaTime);

        // Update camera to follow player
        if (this.playerCharacter) {
            this.systems.cameraSystem.update(this.playerCharacter);
            this.gameState.camera = this.systems.cameraSystem.getBounds();
        }

        // Update input system
        this.systems.inputSystem.update(this.playerCharacter);

        // Get player input
        const movementInput = this.systems.inputSystem.getMovementInput();

        // Update player with input
        if (this.playerCharacter) {
            this.playerCharacter.update(deltaTime, movementInput);

            // Check if weapon was fired
            const weaponInput = this.systems.inputSystem.checkWeaponFired();
            if (weaponInput.fired && weaponInput.weaponSlot >= 0) {
                // Switch to the weapon slot that was pressed
                this.playerCharacter.switchToWeapon(weaponInput.weaponSlot);

                // Fire the weapon
                const weapon = this.playerCharacter.getActiveWeapon();
                if (weapon) {
                    this.systems.combatSystem.fireWeapon(
                        this.playerCharacter,
                        weapon,
                        weaponInput.angle
                    );
                }
            }

            // Check if health kit was used
            if (this.systems.inputSystem.checkHealthKitUsed()) {
                if (this.playerCharacter.useHealthKit()) {
                    console.log('Used health kit!');
                    this.systems.eventBus.emit('healthKitUsed', {
                        character: this.playerCharacter
                    });
                }
            }

            // Update ability preview (for Ground Slam)
            const isChargingAbility = this.systems.inputSystem.isAbilityCharging();
            this.systems.abilitySystem.updateGroundSlamPreview(this.playerCharacter, isChargingAbility);

            // Check if ability was activated
            if (this.systems.inputSystem.checkAbilityActivated()) {
                if (this.systems.abilitySystem.activateAbility(this.playerCharacter)) {
                    console.log('Activated special ability!');
                }
            }

            // Check for weapon pickups
            this.checkWeaponPickups(this.playerCharacter);

            // Check for consumable pickups
            this.checkConsumablePickups(this.playerCharacter);
        }

        // Update all non-player characters
        this.gameState.characters.forEach(character => {
            if (!character.isPlayer) {
                character.update(deltaTime);
            }
        });

        // Update AI system
        if (this.systems.aiSystem) {
            this.systems.aiSystem.update(deltaTime);
        }

        // Update physics (movement and collision)
        this.systems.physicsSystem.update(deltaTime);

        // Update combat system
        this.systems.combatSystem.update(deltaTime);

        // Update ability system
        this.systems.abilitySystem.update(deltaTime);

        // Handle character deaths and loot dropping
        this.gameState.characters.forEach(character => {
            if (character.isDead && !character.isPlayer && this.systems.aiSystem) {
                this.systems.aiSystem.handleCharacterDeath(character);
            }
        });

        // Remove dead characters after a delay
        this.gameState.characters = this.gameState.characters.filter(char => {
            if (char.isDead && !char.isPlayer) {
                // Keep dead characters for a short time for visual feedback
                return false;
            }
            return true;
        });

        // Check match end conditions
        this.gameState.checkMatchEnd();

        // Award meta rewards exactly once when the match ends.
        if (!this.rewardsAwarded && (this.gameState.phase === 'gameOver' || this.gameState.phase === 'victory')) {
            this.awardRewards();
        }
    }

    checkWinCondition() {
        // Check if player won (last character standing)
        const aliveCharacters = this.gameState.characters.filter(char => !char.isDead);
        if (aliveCharacters.length === 1 && aliveCharacters[0] === this.playerCharacter) {
            this.handleVictory();
        }
    }

    handlePlayerDeath() {
        if (this.playerCharacter && this.playerCharacter.isDead) {
            this.gameState.phase = 'gameOver';
            this.gameState.matchStats.finalPlacement = this.gameState.characters.filter(char => !char.isDead).length + 1;
        }
    }

    handleVictory() {
        this.gameState.phase = 'victory';
        this.gameState.matchStats.finalPlacement = 1;
    }

    // Check if player can pickup weapons (with timer)
    checkWeaponPickups(player) {
        if (!this.systems.aiSystem) return;

        const availableWeapons = this.systems.aiSystem.getAvailableWeapons();
        const deltaTime = 1/60; // Approximate frame time

        availableWeapons.forEach(pickup => {
            if (!pickup.active) return;

            // Only update pickup for weapons player is near
            if (pickup.isInRange(player)) {
                const config = pickup.getWeaponConfig();
                const eligibility = player.getWeaponPickupResult(config);

                // Never start/continue pickup progress for invalid pickups
                if (!eligibility.ok) {
                    pickup.playerPickupBlockedReason = eligibility.reason;
                    pickup.resetPickup();
                    return;
                }

                pickup.playerPickupBlockedReason = null;

                // Update pickup progress
                if (pickup.updatePickup(player, deltaTime)) {
                    // Try to pickup weapon
                    const result = player.tryPickupWeapon(config);
                    if (result.ok) {
                        // Successfully picked up
                        pickup.active = false;
                        
                        // Emit event
                        this.systems.eventBus.emit('weaponPickedUp', {
                            character: player,
                            weaponType: config.type,
                            tier: config.tier
                        });
                        
                        console.log(`Player picked up ${config.name} (Tier ${config.tier})`);
                    } else {
                        // If anything changed mid-pickup, stop the loader
                        pickup.playerPickupBlockedReason = result.reason;
                        pickup.resetPickup();
                    }
                }
            } else {
                pickup.playerPickupBlockedReason = null;
            }
        });
    }

    // Check for consumable pickups
    checkConsumablePickups(player) {
        const deltaTime = 1/60; // Approximate frame time
        
        this.spawnManager.consumables.forEach(consumable => {
            if (!consumable.active) return;
            
            // Only update pickup for consumables player is near
            if (consumable.isInRange(player)) {
                const config = consumable.getConfig();

                // Block pickup progress if the player can't actually take the item
                if (config.type === 'healthKit' && !player.canCarryHealthKit()) {
                    consumable.playerPickupBlockedReason = 'health_kits_full';
                    consumable.resetPickup();
                    return;
                }
                if (config.type === 'shieldPotion' && player.shield >= 100) {
                    consumable.playerPickupBlockedReason = 'shield_full';
                    consumable.resetPickup();
                    return;
                }

                consumable.playerPickupBlockedReason = null;

                // Update pickup progress
                if (consumable.updatePickup(player, deltaTime)) {
                    // Try to pickup consumable
                    let success = false;
                    if (config.type === 'healthKit') {
                        success = player.addHealthKit();
                        if (success) {
                            console.log('Picked up health kit!');
                        }
                    } else if (config.type === 'shieldPotion') {
                        player.addShield(50);
                        success = true;
                        console.log('Picked up shield potion!');
                    }

                    if (success) {
                        // Successfully picked up
                        consumable.active = false;

                        this.systems.eventBus.emit('consumablePickedUp', {
                            character: player,
                            consumableType: config.type
                        });
                    }
                }
            } else {
                consumable.playerPickupBlockedReason = null;
            }
        });
    }

    awardRewards() {
        this.rewardsAwarded = true;

        const rewards = computeMatchRewards(this.gameState.matchStats);
        this.gameState.matchRewards = {
            xpEarned: rewards.xpEarned,
            coinsEarned: rewards.coinsEarned
        };
        this.profile.xp += rewards.xpEarned;
        this.profile.coins += rewards.coinsEarned;

        recordMatchToProfile(this.profile, this.gameState.matchStats, {
            character: this.playerCharacter?.constructor.name.toLowerCase() || null,
            map: 'solo' // This would need to be passed in
        });

        saveProfile(this.profile);

        console.log('=== META REWARDS ===');
        console.log(`XP +${rewards.xpEarned}, Coins +${rewards.coinsEarned}`);
    }
}