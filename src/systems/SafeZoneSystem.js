// Safe Zone System for managing shrinking zone mechanics and damage

import { getCurrentMapConfig, getGameConfig } from '../config/map.js';

export class SafeZoneSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        
        // Get current map and game configuration
        const mapConfig = getCurrentMapConfig();
        const gameConfig = getGameConfig();
        
        // Safe zone configuration from map
        this.phases = mapConfig.safeZone.phases;
        this.centerX = mapConfig.safeZone.centerX;
        this.centerY = mapConfig.safeZone.centerY;
        
        // Current state
        this.currentPhaseIndex = 0;
        this.currentRadius = this.phases[0].radius;
        this.currentDamage = this.phases[0].damage;
        this.targetRadius = this.currentRadius;
        
        // Shrinking animation (from game config)
        this.isShrinking = false;
        this.shrinkDuration = gameConfig.safeZone.shrinkDuration; // Seconds to shrink to new size
        this.shrinkProgress = 0;
        this.shrinkStartRadius = this.currentRadius;
        
        // Damage tick timer (from game config)
        this.damageTickTimer = 0;
        this.damageTickInterval = gameConfig.safeZone.damageTickRate; // Damage interval in seconds
        
        // Track characters outside zone
        this.charactersOutsideZone = new Set();
        
        console.log('SafeZoneSystem initialized with game config');
        console.log(`Initial phase: ${this.currentPhaseIndex}, radius: ${this.currentRadius}`);
        console.log(`Shrink duration: ${this.shrinkDuration}s, Damage tick rate: ${this.damageTickInterval}s`);
        console.log(`Safe zone phases:`, this.phases);
    }
    
    /**
     * Update safe zone shrinking and damage application
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        const matchTime = this.gameState.matchTime; // matchTime is already in seconds
        
        // Check if we should transition to next phase
        this.checkPhaseTransition(matchTime);
        
        // Update shrinking animation if active
        if (this.isShrinking) {
            this.updateShrinking(deltaTime);
        }
        
        // Update damage tick timer (deltaTime is in seconds)
        this.damageTickTimer += deltaTime;
        
        // Apply damage to characters outside zone
        if (this.damageTickTimer >= this.damageTickInterval) {
            this.applyZoneDamage();
            this.damageTickTimer = 0;
        }
        
        // Track which characters are outside zone for visual feedback
        this.updateCharactersOutsideZone();
    }
    
    // Check if we should transition to next phase
    checkPhaseTransition(matchTime) {
        // Check if there's a next phase
        if (this.currentPhaseIndex < this.phases.length - 1) {
            const nextPhase = this.phases[this.currentPhaseIndex + 1];
            
            // Convert matchTime (seconds) to milliseconds for comparison with phase times
            const matchTimeMs = matchTime * 1000;
            
            // Check if it's time for next phase
            if (matchTimeMs >= nextPhase.time && !this.isShrinking) {
                this.startPhaseTransition(this.currentPhaseIndex + 1);
            }
        }
    }
    
    // Start transition to new phase
    startPhaseTransition(newPhaseIndex) {
        if (newPhaseIndex >= this.phases.length) return;
        
        const newPhase = this.phases[newPhaseIndex];
        
        console.log(`Safe Zone: Starting phase ${newPhaseIndex}`);
        console.log(`  New radius: ${newPhase.radius}`);
        console.log(`  New damage: ${newPhase.damage}/tick`);
        
        this.currentPhaseIndex = newPhaseIndex;
        this.shrinkStartRadius = this.currentRadius;
        this.targetRadius = newPhase.radius;
        this.currentDamage = newPhase.damage;
        this.isShrinking = true;
        this.shrinkProgress = 0;
        
        // Emit phase change event
        this.eventBus.emit('safeZonePhaseChange', {
            phase: newPhaseIndex,
            radius: newPhase.radius,
            damage: newPhase.damage
        });
    }
    
    // Update shrinking animation
    updateShrinking(deltaTime) {
        this.shrinkProgress += deltaTime / this.shrinkDuration;
        
        if (this.shrinkProgress >= 1.0) {
            // Shrinking complete
            this.shrinkProgress = 1.0;
            this.currentRadius = this.targetRadius;
            this.isShrinking = false;
            console.log(`Safe Zone: Shrink complete. New radius: ${this.currentRadius}`);
        } else {
            // Interpolate radius
            this.currentRadius = this.shrinkStartRadius + 
                (this.targetRadius - this.shrinkStartRadius) * this.shrinkProgress;
        }
    }
    
    // Apply damage to characters outside safe zone
    applyZoneDamage() {
        if (this.currentDamage <= 0) return;
        
        this.gameState.characters.forEach(character => {
            if (character.isDead) return;
            
            // Check if character is outside safe zone
            if (this.isOutsideZone(character.position.x, character.position.y)) {
                // Apply damage directly to health (ignores shield per GDD)
                const previousHP = character.currentHP;
                character.currentHP -= this.currentDamage;
                
                // Check if character died from zone damage
                if (character.currentHP <= 0) {
                    character.currentHP = 0;
                    character.die();
                    
                    // Emit death event
                    this.eventBus.emit('characterDiedToZone', {
                        character: character
                    });
                    
                    console.log(`${character.name} died to safe zone damage`);
                }
                
                // Emit zone damage event for visual feedback
                this.eventBus.emit('zoneDamage', {
                    character: character,
                    damage: this.currentDamage
                });
            }
        });
    }
    
    // Update set of characters outside zone (for visual feedback)
    updateCharactersOutsideZone() {
        this.charactersOutsideZone.clear();
        
        this.gameState.characters.forEach(character => {
            if (!character.isDead && this.isOutsideZone(character.position.x, character.position.y)) {
                this.charactersOutsideZone.add(character);
            }
        });
    }
    
    /**
     * Check if position is outside safe zone
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if position is outside safe zone
     */
    isOutsideZone(x, y) {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        return distanceFromCenter > this.currentRadius;
    }

    /**
     * Check if position is in safe zone
     * @param {Vector2D|Object} position - Position to check with x,y properties
     * @returns {boolean} True if position is in safe zone
     */
    isInSafeZone(position) {
        return !this.isOutsideZone(position.x, position.y);
    }

    /**
     * Check if character is outside zone (convenience method)
     * @param {Character} character - Character to check
     * @returns {boolean} True if character is outside safe zone
     */
    isCharacterOutsideZone(character) {
        return this.charactersOutsideZone.has(character);
    }

    /**
     * Get current safe zone bounds and state
     * @returns {Object} Safe zone information for rendering
     */
    getSafeZoneInfo() {
        return {
            centerX: this.centerX,
            centerY: this.centerY,
            currentRadius: this.currentRadius,
            targetRadius: this.targetRadius,
            isShrinking: this.isShrinking,
            currentPhase: this.currentPhaseIndex,
            currentDamage: this.currentDamage
        };
    }
    
    /**
     * Get time until next safe zone phase in milliseconds
     * @returns {number} Time remaining until next phase, or 0 if no more phases
     */
    getTimeUntilNextPhase() {
        const matchTimeMs = this.gameState.matchTime * 1000;
        
        if (this.currentPhaseIndex < this.phases.length - 1) {
            const nextPhase = this.phases[this.currentPhaseIndex + 1];
            const timeRemaining = nextPhase.time - matchTimeMs;
            return Math.max(0, timeRemaining);
        }
        
        return 0; // No more phases
    }
    
    /**
     * Get current safe zone phase information
     * @returns {Object} Current phase details including radius, damage, and time until next phase
     */
    getCurrentPhaseInfo() {
        return {
            phase: this.currentPhaseIndex,
            radius: this.currentRadius,
            damage: this.currentDamage,
            timeUntilNext: this.getTimeUntilNextPhase()
        };
    }

    /**
     * Reset safe zone system to initial state
     */
    reset() {
        this.currentPhaseIndex = 0;
        this.currentRadius = this.phases[0].radius;
        this.currentDamage = this.phases[0].damage;
        this.targetRadius = this.currentRadius;
        this.isShrinking = false;
        this.shrinkProgress = 0;
        this.damageTickTimer = 0;
        this.charactersOutsideZone.clear();
    }
}