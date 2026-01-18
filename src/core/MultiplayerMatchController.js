/**
 * MultiplayerMatchController.js - Multiplayer Match Coordinator
 *
 * Manages multiplayer matches using deterministic lockstep simulation.
 * Coordinates input synchronization, applies networked actions, tracks
 * statistics, and handles match lifecycle for 2-player games.
 *
 * Key Responsibilities:
 * - Initialize multiplayer session and systems
 * - Synchronize player inputs via LockstepSession2P
 * - Apply deterministic actions to maintain sync across peers
 * - Track match statistics (same as solo)
 * - Handle match end and rewards
 *
 * Architecture Notes:
 * - Uses lockstep simulation (inputs synced, then applied)
 * - Deterministic: same inputs + seed = same outcomes on both clients
 * - EventBus listeners track stats for progression
 * - No loot or AI in multiplayer v0 (fixed loadout)
 *
 * Performance Considerations:
 * - Network latency handled by lockstep buffering
 * - Must maintain determinism: no Math.random() or Date.now() in sim
 *
 * @module core/MultiplayerMatchController
 */

import { MatchInitializer } from './MatchInitializer.js';
import { GameOrchestrator } from './GameOrchestrator.js';
import { LockstepSession2P } from '../net/LockstepSession2P.js';
import { computeMatchRewards, recordMatchToProfile, saveProfile } from './ProfileStore.js';

export class MultiplayerMatchController {
    constructor(game, canvas, gameState, assetLoader, profile) {
        this.game = game;
        this.canvas = canvas;
        this.gameState = gameState;
        this.assetLoader = assetLoader;
        this.profile = profile;
        this.session = null;
        this.matchInitializer = null;
        this.orchestrator = null;
        this.mpLockstep = null;
        this.mpPlayers = null;
        this.rewardsAwarded = false;
    }

    setupEventListeners(eventBus) {
        // Track damage dealt by local player
        eventBus.on('characterDamaged', (data) => {
            if (data.attacker && data.attacker === this.mpPlayers?.local) {
                this.gameState.addDamage(data.damage);
            }

            // Track damage taken by the local player
            if (data.target && data.target === this.mpPlayers?.local) {
                this.gameState.addDamageTaken(data.damage);
            }
        });

        // Track kills by local player
        eventBus.on('characterKilled', (data) => {
            if (data.attacker && data.attacker === this.mpPlayers?.local && data.target && data.target !== this.mpPlayers?.local) {
                this.gameState.addKill();
            }
        });

        // Track health kits used
        eventBus.on('healthKitUsed', (data) => {
            if (data.character && data.character === this.mpPlayers?.local) {
                this.gameState.addHealConsumed();
            }
        });

        // Track consumables picked up (shield potions consumed immediately)
        eventBus.on('consumablePickedUp', (data) => {
            if (data.character && data.character === this.mpPlayers?.local && data.consumableType === 'shieldPotion') {
                // Shield potions are consumed immediately on pickup
                this.gameState.addShieldUsed();
            }
        });

        // Track abilities used
        eventBus.on('abilityUsed', (data) => {
            if (data.character && data.character === this.mpPlayers?.local) {
                this.gameState.addAbilityUsed();
            }
        });

        // Track weapons fired
        eventBus.on('weaponFired', (data) => {
            if (data.character && data.character === this.mpPlayers?.local) {
                this.gameState.addWeaponFired();
            }
        });

        // Track safe zone damage
        eventBus.on('zoneDamage', (data) => {
            if (data.character && data.character === this.mpPlayers?.local) {
                this.gameState.addDamageTaken(data.damage);
            }
        });
    }

    /**
     * Start a multiplayer match
     * @param {Object} session - Multiplayer session
     * @param {string} playerCharacterType - Type of player character
     * @param {Object} selectedMap - Map configuration
     * @param {boolean} isHost - Whether this player is host
     * @returns {Promise<void>}
     */
    async startMatch(session, playerCharacterType, selectedMap, isHost, audioManager) {
        this.session = session;
        console.log('Starting multiplayer match:', session?.role);

        // Detach lobby message handler; game owns transport now.
        if (session.connection) {
            session.connection.onMessage = null;
            session.connection.onStatus = null;
        }

        // Initialize match
        this.matchInitializer = new MatchInitializer(this.canvas, this.gameState, this.assetLoader);
        const { systems, spawnManager, playerCharacter } = await this.matchInitializer.initializeMultiplayerMatch(session, playerCharacterType, selectedMap, this.profile, audioManager);

        // Create orchestrator
        this.orchestrator = new GameOrchestrator(this.gameState, systems, systems.renderer, spawnManager, playerCharacter, this.profile);

        // Setup multiplayer lockstep
        this.mpLockstep = new LockstepSession2P({
            transport: session.connection,
            localPlayerIndex: isHost ? 0 : 1,
            inputDelayTicks: 2
        });

        this.mpPlayers = {
            local: isHost ? this.gameState.characters[0] : this.gameState.characters[1],
            remote: isHost ? this.gameState.characters[1] : this.gameState.characters[0]
        };

        // Setup event listeners for stats tracking (after mpPlayers is set)
        this.setupEventListeners(systems.eventBus);

        // Start the lockstep session to begin syncing inputs
        this.mpLockstep.start();

        console.log('Multiplayer match started!');
        return { systems, spawnManager, playerCharacter };
    }

    /**
     * Update multiplayer match state
     * @param {number} deltaTime - Time elapsed in seconds
     */
    update(deltaTime) {
        const localPlayer = this.mpPlayers?.local;
        const remotePlayer = this.mpPlayers?.remote;
        if (!localPlayer || !remotePlayer || !this.mpLockstep) return;

        // Update local input system (UI + capture)
        this.orchestrator.systems.inputSystem.update(localPlayer);

        const getLocalInput = () => {
            const move = this.orchestrator.systems.inputSystem.getMovementInput();
            const weaponInput = this.orchestrator.systems.inputSystem.checkWeaponFired();
            const fired = !!weaponInput.fired;

            return {
                moveX: move.x,
                moveY: move.y,
                fire: fired,
                aimAngle: fired ? weaponInput.angle : 0,
                ability: this.orchestrator.systems.inputSystem.checkAbilityActivated(),
                heal: this.orchestrator.systems.inputSystem.checkHealthKitUsed()
            };
        };

        // Feed the lockstep layer (sends inputs ahead)
        this.mpLockstep.tick(getLocalInput);

        // Advance simulation only when we have both players' inputs for the next tick.
        // Deterministic lockstep may stall (visible stutter) under high latency.
        if (this.mpLockstep.canSimulateNextTick()) {
            const step = this.mpLockstep.popNextTickInputs();
            if (!step) return;

            // Apply per-tick time
            this.gameState.updateTime(deltaTime);

            // Safe zone and camera
            this.orchestrator.systems.safeZoneSystem.update(deltaTime);
            this.orchestrator.systems.cameraSystem.update(localPlayer);
            this.gameState.camera = this.orchestrator.systems.cameraSystem.getBounds();

            const frames = step.frames;
            const localFrame = this.mpLockstep.localPlayerIndex === 0 ? frames[0] : frames[1];
            const remoteFrame = this.mpLockstep.localPlayerIndex === 0 ? frames[1] : frames[0];

            // Update player movement inputs
            localPlayer.update(deltaTime, { x: localFrame.moveX, y: localFrame.moveY });
            remotePlayer.update(deltaTime, { x: remoteFrame.moveX, y: remoteFrame.moveY });

            // Process actions (fire/heal/ability)
            this.applyMultiplayerActions(localPlayer, localFrame);
            this.applyMultiplayerActions(remotePlayer, remoteFrame);

            // Physics + combat + abilities
            this.orchestrator.systems.physicsSystem.update(deltaTime);
            this.orchestrator.systems.combatSystem.update(deltaTime);
            this.orchestrator.systems.abilitySystem.update(deltaTime);

            // Match end (1v1)
            if (localPlayer.isDead && !remotePlayer.isDead) {
                this.endMultiplayerMatch('playerDied');
            } else if (!localPlayer.isDead && remotePlayer.isDead) {
                this.endMultiplayerMatch('playerWon');
            }
        }

        // Award meta rewards exactly once when the match ends.
        if (!this.rewardsAwarded && (this.gameState.phase === 'gameOver' || this.gameState.phase === 'victory')) {
            this.awardMultiplayerRewards();
        }
    }

    applyMultiplayerActions(player, frame) {
        if (!player || player.isDead) return;

        if (frame.fire) {
            player.switchToWeapon(0);
            const weapon = player.getActiveWeapon();
            if (weapon) {
                this.orchestrator.systems.combatSystem.fireWeapon(player, weapon, frame.aimAngle);
            }
        }

        if (frame.heal) {
            if (player.useHealthKit()) {
                this.orchestrator.systems.eventBus.emit('healthKitUsed', { character: player });
            }
        }

        if (frame.ability) {
            this.orchestrator.systems.abilitySystem.activateAbility(player);
        }
    }

    endMultiplayerMatch(reason) {
        if (!this.gameState || this.gameState.phase !== 'playing') return;

        this.gameState.matchEndReason = reason;
        this.gameState.phase = (reason === 'playerWon') ? 'victory' : 'gameOver';

        this.gameState.matchStats.survivalTime = this.gameState.matchTime;
        this.gameState.matchStats.finalPlacement = (reason === 'playerWon') ? 1 : 2;

        console.log('=== MULTIPLAYER MATCH END ===');
        console.log(`Reason: ${reason}`);
        console.log(`Survival Time: ${Math.floor(this.gameState.matchStats.survivalTime)}s`);
        console.log(`Kills: ${this.gameState.matchStats.kills}`);
        console.log(`Damage Dealt: ${Math.round(this.gameState.matchStats.damageDealt)}`);
        console.log(`Final Placement: ${this.gameState.matchStats.finalPlacement}`);
    }

    awardMultiplayerRewards() {
        this.rewardsAwarded = true;

        const rewards = computeMatchRewards(this.gameState.matchStats);
        this.gameState.matchRewards = {
            xpEarned: rewards.xpEarned,
            coinsEarned: rewards.coinsEarned
        };
        this.profile.xp += rewards.xpEarned;
        this.profile.coins += rewards.coinsEarned;

        recordMatchToProfile(this.profile, this.gameState.matchStats, {
            character: 'bolt',
            map: this.session?.mapFile || 'multiplayer'
        });

        saveProfile(this.profile);
    }

    /**
     * Teardown multiplayer match and cleanup
     */
    teardown() {
        // Cleanup multiplayer resources
        if (this.mpLockstep) {
            this.mpLockstep = null;
        }
        if (this.session?.connection) {
            this.session.connection.close();
        }
        this.session = null;
        this.mpPlayers = null;
        this.matchInitializer = null;
        this.orchestrator = null;
        this.rewardsAwarded = false;
    }
}