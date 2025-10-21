// Combat system for handling weapon firing, damage calculation, and hit detection

import { WeaponEffect, Projectile, DamageNumber } from '../entities/Weapon.js';
import { Vector2D } from '../utils/Vector2D.js';
import { MAP_CONFIG } from '../config/map.js';

export class CombatSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        
        // Track active effects and projectiles
        this.weaponEffects = [];
        this.projectiles = [];
        this.damageNumbers = [];
    }
    
    // Update combat system
    update(deltaTime) {
        // Update all weapon effects
        this.weaponEffects = this.weaponEffects.filter(effect => {
            effect.update(deltaTime);
            return effect.isActive();
        });
        
        // Update all projectiles
        this.projectiles = this.projectiles.filter(projectile => {
            projectile.update(deltaTime);
            
            // Check for hits if still active
            if (projectile.active) {
                // Check obstacle collisions first
                if (this.checkProjectileObstacleCollision(projectile)) {
                    projectile.hit();
                    return false;
                }
                
                // Then check character collisions
                this.checkProjectileCollisions(projectile);
            }
            
            return projectile.active;
        });
        
        // Update damage numbers
        this.damageNumbers = this.damageNumbers.filter(number => {
            number.update(deltaTime);
            return number.active;
        });
        
        // Update weapon cooldowns for all characters
        this.gameState.characters.forEach(character => {
            if (character.weapons && character.weapons.length > 0) {
                character.weapons.forEach(weapon => {
                    if (weapon) {
                        weapon.update(deltaTime);
                    }
                });
            }
        });
    }
    
    // Fire a weapon
    fireWeapon(character, weapon, aimAngle) {
        if (!weapon || !weapon.isReady()) {
            return false;
        }
        
        // Get character's weapon cooldown modifier
        const cooldownModifier = character.weaponCooldownMultiplier || 1.0;
        
        // Fire the weapon and get attack data
        const attackData = weapon.fire(character.position, aimAngle, cooldownModifier);
        
        if (!attackData) {
            return false;
        }
        
        // Handle different attack types
        switch (attackData.attackType) {
            case 'cone':
                this.handleConeAttack(attackData);
                break;
            case 'projectile':
                this.handleProjectileAttack(attackData);
                break;
            case 'aoe':
                this.handleAoeAttack(attackData);
                break;
            case 'burst':
                this.handleBurstAttack(attackData);
                break;
        }
        
        // Emit weapon fired event
        this.eventBus.emit('weaponFired', {
            character: character,
            weapon: weapon,
            attackData: attackData
        });
        
        return true;
    }
    
    // Handle cone attack (Blaster)
    handleConeAttack(attackData) {
        // Create visual effect
        const effect = new WeaponEffect(attackData);
        this.weaponEffects.push(effect);
        
        // Check for hits immediately (instant hit)
        this.checkConeHits(attackData);
    }
    
    // Check for hits in cone area
    checkConeHits(attackData) {
        const coneAngleRad = attackData.coneAngle * Math.PI / 180;
        const startAngle = attackData.angle - coneAngleRad / 2;
        const endAngle = attackData.angle + coneAngleRad / 2;
        
        // Check all characters
        this.gameState.characters.forEach(target => {
            if (target === attackData.owner || target.isDead) return;
            
            // Calculate angle to target
            const dx = target.position.x - attackData.position.x;
            const dy = target.position.y - attackData.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if in range
            if (distance > attackData.range) return;
            
            // Calculate angle to target
            let angleToTarget = Math.atan2(dy, dx);
            
            // Normalize angles to be between -PI and PI
            const normalizeAngle = (angle) => {
                while (angle > Math.PI) angle -= Math.PI * 2;
                while (angle < -Math.PI) angle += Math.PI * 2;
                return angle;
            };
            
            angleToTarget = normalizeAngle(angleToTarget);
            const normalizedStartAngle = normalizeAngle(startAngle);
            const normalizedEndAngle = normalizeAngle(endAngle);
            
            // Check if angle is within cone
            let inCone = false;
            if (normalizedStartAngle <= normalizedEndAngle) {
                inCone = angleToTarget >= normalizedStartAngle && angleToTarget <= normalizedEndAngle;
            } else {
                inCone = angleToTarget >= normalizedStartAngle || angleToTarget <= normalizedEndAngle;
            }
            
            if (inCone) {
                this.applyDamage(target, attackData.damage, attackData.position, attackData.owner);
            }
        });
    }
    
    // Handle projectile attack (Spear)
    handleProjectileAttack(attackData) {
        const projectile = new Projectile(attackData);
        this.projectiles.push(projectile);
    }
    
    // Handle AoE attack (Bomb)
    handleAoeAttack(attackData) {
        // Create projectile that travels to target location
        const projectile = new Projectile(attackData);
        projectile.isAoe = true;
        projectile.explosionRadius = attackData.explosionRadius;
        this.projectiles.push(projectile);
    }
    
    // Handle burst attack (Gun)
    handleBurstAttack(attackData) {
        // Fire multiple projectiles with slight delay
        const burstCount = attackData.burstCount || 3;
        const burstDelay = attackData.burstDelay || 100;
        
        for (let i = 0; i < burstCount; i++) {
            setTimeout(() => {
                const projectile = new Projectile(attackData);
                // Add slight spread to burst
                const spread = (Math.random() - 0.5) * 0.1;
                projectile.velocity.rotate(spread);
                this.projectiles.push(projectile);
            }, i * burstDelay);
        }
    }
    
    // Check if projectile hits an obstacle
    checkProjectileObstacleCollision(projectile) {
        for (const obstacle of MAP_CONFIG.obstacles) {
            const rectX = obstacle.position.x - obstacle.width / 2;
            const rectY = obstacle.position.y - obstacle.height / 2;
            
            if (this.circleRectCollision(
                projectile.position.x,
                projectile.position.y,
                projectile.radius,
                rectX,
                rectY,
                obstacle.width,
                obstacle.height
            )) {
                return true;
            }
        }
        return false;
    }

    // Circle-rectangle collision detection
    circleRectCollision(circleX, circleY, radius, rectX, rectY, rectWidth, rectHeight) {
        const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
        const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));
        
        const dx = circleX - closestX;
        const dy = circleY - closestY;
        
        return (dx * dx + dy * dy) < (radius * radius);
    }

    // Check projectile collisions with characters
    checkProjectileCollisions(projectile) {
        this.gameState.characters.forEach(target => {
            if (target === projectile.owner || target.isDead) return;
            
            // Check if projectile hits target
            const dx = target.position.x - projectile.position.x;
            const dy = target.position.y - projectile.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= target.hitboxRadius + projectile.radius) {
                // Hit detected
                this.applyDamage(target, projectile.damage, projectile.position, projectile.owner);
                projectile.hit();
                
                // If AoE, create explosion
                if (projectile.isAoe) {
                    this.createExplosion(projectile.position, projectile.explosionRadius, projectile.damage, projectile.owner);
                }
            }
        });
    }
    
    // Create explosion for AoE attacks
    createExplosion(position, radius, damage, owner) {
        this.gameState.characters.forEach(target => {
            if (target === owner || target.isDead) return;
            
            const distance = position.distanceTo(target.position);
            if (distance <= radius) {
                // Apply damage with falloff
                const falloff = 1 - (distance / radius);
                const explosionDamage = damage * falloff;
                this.applyDamage(target, explosionDamage, position, owner);
            }
        });
    }
    
    // Apply damage to a target
    applyDamage(target, damage, sourcePosition, attacker = null) {
        // Apply damage to character
        target.takeDamage(damage);
        
        // Create damage number
        const damageNumber = new DamageNumber(
            target.position.clone(),
            damage,
            false
        );
        this.damageNumbers.push(damageNumber);
        
        // Emit damage event
        this.eventBus.emit('characterDamaged', {
            target: target,
            damage: damage,
            sourcePosition: sourcePosition,
            attacker: attacker
        });
    }
    
    // Get all weapon effects for rendering
    getWeaponEffects() {
        return this.weaponEffects;
    }
    
    // Get all projectiles for rendering
    getProjectiles() {
        return this.projectiles;
    }
    
    // Get all damage numbers for rendering
    getDamageNumbers() {
        return this.damageNumbers;
    }
    
    // Clear all combat entities
    clear() {
        this.weaponEffects = [];
        this.projectiles = [];
        this.damageNumbers = [];
    }
}