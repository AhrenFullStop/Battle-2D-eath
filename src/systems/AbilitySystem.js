// Special ability system for character abilities

import { Vector2D } from '../utils/Vector2D.js';

export class AbilitySystem {
    constructor(gameState, eventBus, combatSystem) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.combatSystem = combatSystem;
        
        // Active ability effects
        this.activeEffects = [];
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
        // Dash forward in facing direction
        const dashDistance = ability.dashDistance || 150;
        const dashDirection = new Vector2D(
            Math.cos(character.facingAngle),
            Math.sin(character.facingAngle)
        );
        
        // Calculate target position
        const targetX = character.position.x + dashDirection.x * dashDistance;
        const targetY = character.position.y + dashDirection.y * dashDistance;
        
        // Keep within map bounds
        const mapRadius = 1500;
        const distance = Math.sqrt(targetX * targetX + targetY * targetY);
        
        if (distance > mapRadius) {
            // Adjust to map edge
            const scale = mapRadius / distance;
            character.position.x = targetX * scale;
            character.position.y = targetY * scale;
        } else {
            character.position.x = targetX;
            character.position.y = targetY;
        }
        
        // Create visual effect
        this.activeEffects.push({
            type: 'dash',
            character: character,
            startTime: Date.now(),
            duration: 200
        });
        
        return true;
    }
    
    // Execute ground slam ability (Boulder)
    executeGroundSlam(character, ability) {
        const slamRadius = 120;
        const baseDamage = ability.baseDamage || 40;
        const stunDuration = 1000; // 1 second stun
        
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
            target.stunnedUntil = Date.now() + stunDuration;
        });
        
        // Create visual effect
        this.activeEffects.push({
            type: 'groundSlam',
            position: character.position.clone(),
            radius: slamRadius,
            startTime: Date.now(),
            duration: 500
        });
        
        return true;
    }
    
    // Update ability effects
    update(deltaTime) {
        const now = Date.now();
        
        // Remove expired effects
        this.activeEffects = this.activeEffects.filter(effect => {
            return now - effect.startTime < effect.duration;
        });
        
        // Update stunned characters
        this.gameState.characters.forEach(character => {
            if (character.stunned && character.stunnedUntil <= now) {
                character.stunned = false;
                character.stunnedUntil = 0;
            }
        });
    }
    
    // Get active effects for rendering
    getActiveEffects() {
        return this.activeEffects;
    }
}