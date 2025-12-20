// Centralized game state management

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config/constants.js';
import { MAP_CONFIG } from '../config/map.js';

export class GameState {
    constructor() {
        // Game phase
        this.phase = 'playing'; // 'menu', 'playing', 'gameOver', 'victory'
        this.matchTime = 0;
        
        // Player reference
        this.player = null;
        
        // Safe zone system reference (Phase 6)
        this.safeZoneSystem = null;
        
        // Match end info
        this.matchEndReason = null; // 'playerDied', 'playerWon', 'timeout'
        this.matchRewards = null; // { xpEarned: number, coinsEarned: number }
        this.matchStats = {
            kills: 0,
            damageDealt: 0,
            damageTaken: 0,
            healsConsumed: 0,
            shieldsUsed: 0,
            abilityUsedCount: 0,
            friendlyRevives: 0,
            weaponFiredCount: 0,
            survivalTime: 0,
            finalPlacement: 0
        };
        
        // All entities in the game
        this.characters = [];
        this.projectiles = [];
        this.items = [];
        this.effects = [];
        
        // Canvas dimensions
        this.canvasWidth = CANVAS_WIDTH;
        this.canvasHeight = CANVAS_HEIGHT;
        
        // Map configuration
        this.map = MAP_CONFIG;
        
        // Camera (will be updated by CameraSystem)
        this.camera = {
            x: 0,
            y: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT
        };
        
        // Input state (will be updated by InputSystem)
        this.input = {
            movement: { x: 0, y: 0 },
            actions: []
        };
        
        // Performance tracking
        this.deltaTime = 0;
    }

    // Update game time
    updateTime(deltaTime) {
        this.deltaTime = deltaTime;
        this.matchTime += deltaTime;
    }

    // Add a character to the game
    addCharacter(character) {
        this.characters.push(character);
        if (character.isPlayer) {
            this.player = character;
        }
    }

    // Remove a character from the game
    removeCharacter(character) {
        const index = this.characters.indexOf(character);
        if (index > -1) {
            this.characters.splice(index, 1);
        }
    }

    // Get all active characters
    getActiveCharacters() {
        return this.characters.filter(char => char.active && !char.isDead);
    }
    
    // Get alive character count (excluding player)
    getAliveAICount() {
        return this.characters.filter(char => !char.isPlayer && !char.isDead).length;
    }
    
    // Check match end conditions (Phase 6)
    checkMatchEnd() {
        if (this.phase !== 'playing') return;
        
        // Check if player is dead
        if (this.player && this.player.isDead) {
            this.endMatch('playerDied');
            return;
        }
        
        // Check if player is the last one standing
        const aliveAI = this.getAliveAICount();
        if (aliveAI === 0 && this.player && !this.player.isDead) {
            this.endMatch('playerWon');
            return;
        }
    }
    
    // End the match
    endMatch(reason) {
        if (this.phase !== 'playing') return;
        
        this.matchEndReason = reason;
        this.phase = (reason === 'playerWon') ? 'victory' : 'gameOver';
        
        // Calculate final stats
        this.matchStats.survivalTime = this.matchTime;
        this.matchStats.finalPlacement = (reason === 'playerWon') ? 1 : (this.getAliveAICount() + 2);
        
        console.log('=== MATCH END ===');
        console.log(`Reason: ${reason}`);
        console.log(`Survival Time: ${Math.floor(this.matchStats.survivalTime)}s`);
        console.log(`Kills: ${this.matchStats.kills}`);
        console.log(`Damage Dealt: ${Math.round(this.matchStats.damageDealt)}`);
        console.log(`Final Placement: ${this.matchStats.finalPlacement}`);
    }
    
    // Add a kill to player stats
    addKill() {
        this.matchStats.kills++;
    }
    
    // Add damage to player stats
    addDamage(amount) {
        this.matchStats.damageDealt += amount;
    }

    addDamageTaken(amount) {
        this.matchStats.damageTaken += amount;
    }

    addHealConsumed() {
        this.matchStats.healsConsumed++;
    }

    addShieldUsed() {
        this.matchStats.shieldsUsed++;
    }

    addAbilityUsed() {
        this.matchStats.abilityUsedCount++;
    }

    addFriendlyRevive() {
        this.matchStats.friendlyRevives++;
    }

    addWeaponFired() {
        this.matchStats.weaponFiredCount++;
    }

    /**
     * Reset the game state to initial values
     */
    reset() {
        this.phase = 'playing';
        this.matchTime = 0;
        this.player = null;
        this.characters = [];
        this.projectiles = [];
        this.items = [];
        this.effects = [];
    }
}