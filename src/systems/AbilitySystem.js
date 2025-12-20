// Special ability system for character abilities

import { Vector2D } from '../utils/Vector2D.js';

export class AbilitySystem {
    constructor(gameState, eventBus, combatSystem) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.combatSystem = combatSystem;
        
        // Active ability effects
        this.activeEffects = [];
        
        // Ground slam preview state
        this.groundSlamPreview = null;
    }
    
    // Activate character's special ability
    activateAbility(character) {
        if (!character || !character.specialAbility) return false;
        
        // Check cooldown
        if (character.specialAbilityCooldown > 0) return false;
        
        const ability = character.specialAbility;
        let success = false;
        
        // Execute ability based on type
        if (ability.type === 'dash') {
            success = this.executeDash(character, ability);
        } else if (ability.type === 'groundSlam') {
            success = this.executeGroundSlam(character, ability);
        }
        
        // Set cooldown if successful
        if (success) {
            character.specialAbilityCooldown = ability.cooldown;
            
            // Emit ability used event
            this.eventBus.emit('abilityUsed', {
                character: character,
                abilityType: ability.type
            });
        }
        
        return success;
    }
    
    // Execute dash ability (Bolt)
    executeDash(character, ability) {
        // Apply speed boost for 3 seconds instead of teleporting
        const speedMultiplier = 2; // 2x speed boost
        const duration = 2000; // 2 seconds
        
        // Store original move speed if not already boosted
        if (!character.dashSpeedBoostActive) {
            character.originalMoveSpeed = character.moveSpeed;
        }
        
        // Apply speed boost
        character.moveSpeed = character.originalMoveSpeed * speedMultiplier;
        character.dashSpeedBoostActive = true;
        character.dashSpeedBoostRemainingMs = duration;
        
        // Create visual effect
        this.activeEffects.push({
            type: 'dash',
            character: character,
            remainingMs: duration
        });
        
        console.log(`Bolt dash activated! Speed boosted to ${character.moveSpeed} for 3 seconds`);
        
        return true;
    }
    
    // Execute ground slam ability (Boulder)
    executeGroundSlam(character, ability) {
        const slamRadius = 120;
        const baseDamage = ability.baseDamage || 40;
        const stunDuration = 1000; // 1 second stun
        
        // Clear preview
        this.groundSlamPreview = null;
        
        // Find all characters in range
        const hitCharacters = [];
        this.gameState.characters.forEach(target => {
            if (target === character || target.isDead) return;
            
            const dx = target.position.x - character.position.x;
            const dy = target.position.y - character.position.y;
            const distSquared = dx * dx + dy * dy;
            const radiusSquared = slamRadius * slamRadius;
            
            if (distSquared <= radiusSquared) {
                hitCharacters.push(target);
            }
        });
        
        // Apply damage and stun to all hit characters
        hitCharacters.forEach(target => {
            // Apply damage
            this.combatSystem.applyDamage(target, baseDamage, character.position, character);
            
            // Apply stun (reduce movement temporarily)
            target.stunned = true;
            target.stunRemainingMs = stunDuration;
        });
        
        // Create visual effect
        this.activeEffects.push({
            type: 'groundSlam',
            position: character.position.clone(),
            radius: slamRadius,
            remainingMs: 500
        });
        
        return true;
    }
    
    // Update ground slam preview (called when button is held)
    updateGroundSlamPreview(character, isCharging) {
        if (isCharging && character.specialAbility && character.specialAbility.type === 'groundSlam') {
            const slamRadius = 120;
            this.groundSlamPreview = {
                position: character.position.clone(),
                radius: slamRadius
            };
        } else {
            this.groundSlamPreview = null;
        }
    }
    
    // Get ground slam preview for rendering
    getGroundSlamPreview() {
        return this.groundSlamPreview;
    }

    /**
     * Update ability effects
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        const dtMs = deltaTime * 1000;

        // Update and remove expired effects
        this.activeEffects = this.activeEffects.filter(effect => {
            effect.remainingMs -= dtMs;
            return effect.remainingMs > 0;
        });
        
        // Update stunned characters
        this.gameState.characters.forEach(character => {
            if (character.stunned) {
                character.stunRemainingMs = (character.stunRemainingMs || 0) - dtMs;
                if (character.stunRemainingMs <= 0) {
                    character.stunned = false;
                    character.stunRemainingMs = 0;
                }
            }
            
            // Update dash speed boost
            if (character.dashSpeedBoostActive) {
                character.dashSpeedBoostRemainingMs = (character.dashSpeedBoostRemainingMs || 0) - dtMs;
                if (character.dashSpeedBoostRemainingMs <= 0) {
                    character.moveSpeed = character.originalMoveSpeed;
                    character.dashSpeedBoostActive = false;
                    character.dashSpeedBoostRemainingMs = 0;
                    console.log(`Bolt dash ended! Speed restored to ${character.moveSpeed}`);
                }
            }
        });
    }
    
    // Get active effects for rendering
    getActiveEffects() {
        return this.activeEffects;
    }
}