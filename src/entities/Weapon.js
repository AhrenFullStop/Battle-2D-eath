// Weapon entity class for handling weapon instances and attacks

import { Entity } from './Entity.js';
import { Vector2D } from '../utils/Vector2D.js';

export const PROJECTILE_STATES = {
    FLYING: 'flying',
    LANDED: 'landed',
    DETONATED: 'detonated'
};

export class Weapon extends Entity {
    constructor(config) {
        super();
        
        // Weapon properties from config
        this.name = config.name;
        this.weaponType = config.type;
        this.attackType = config.attackType;
        this.tier = config.tier || 1;
        
        // Combat stats
        this.damage = config.damage;
        this.range = config.range;
        this.cooldown = config.cooldown;
        this.currentCooldown = 0;
        
        // Type-specific properties
        this.coneAngle = config.coneAngle || 0;
        this.projectileSpeed = config.projectileSpeed || 0;
        this.explosionRadius = config.explosionRadius || 0;
        this.arcHeight = config.arcHeight || 0;
        this.fuseTime = config.fuseTime || 0;
        this.burstCount = config.burstCount || 1;
        this.burstDelay = config.burstDelay || 0;
        
        // Visual properties
        this.color = config.color || '#ffffff';
        this.glowColor = config.glowColor || '#ffaa00';
        this.tierColor = config.tierColor || '#cccccc';
        
        // Owner reference
        this.owner = null;
    }
    
    // Update weapon state (cooldown)
    // deltaTime is in seconds
    update(deltaTime) {
        if (this.currentCooldown > 0) {
            // Convert deltaTime from seconds to milliseconds
            this.currentCooldown -= deltaTime * 1000;
            if (this.currentCooldown < 0) {
                this.currentCooldown = 0;
            }
        }
    }
    
    // Check if weapon is ready to fire
    isReady() {
        return this.currentCooldown <= 0;
    }
    
    // Get cooldown progress (0 = ready, 1 = just fired)
    getCooldownProgress() {
        if (this.cooldown === 0) return 0;
        return this.currentCooldown / this.cooldown;
    }
    
    // Fire the weapon
    fire(position, angle, characterModifier = 1.0) {
        if (!this.isReady()) {
            return null;
        }
        
        // Start cooldown (apply character modifier)
        this.currentCooldown = this.cooldown * characterModifier;
        
        // Create attack data based on weapon type
        const attackData = {
            weaponType: this.weaponType,
            attackType: this.attackType,
            damage: this.damage,
            range: this.range,
            position: position.clone(),
            angle: angle,
            color: this.color,
            glowColor: this.glowColor,
            owner: this.owner
        };
        
        // Add type-specific data
        switch (this.attackType) {
            case 'cone':
                attackData.coneAngle = this.coneAngle;
                break;
            case 'projectile':
                attackData.projectileSpeed = this.projectileSpeed;
                break;
            case 'aoe':
                attackData.explosionRadius = this.explosionRadius;
                attackData.arcHeight = this.arcHeight;
                attackData.fuseTime = this.fuseTime;
                attackData.projectileSpeed = this.projectileSpeed;
                break;
            case 'burst':
                attackData.burstCount = this.burstCount;
                attackData.burstDelay = this.burstDelay;
                attackData.projectileSpeed = this.projectileSpeed;
                break;
        }
        
        return attackData;
    }
    
    // Set weapon owner
    setOwner(owner) {
        this.owner = owner;
    }
    
    // Apply character modifier to cooldown
    getModifiedCooldown(characterModifier) {
        return this.cooldown * characterModifier;
    }
}

// Weapon effect entity for visual representation
export class WeaponEffect extends Entity {
    constructor(attackData) {
        super();
        
        this.attackType = attackData.attackType;
        this.position = attackData.position.clone();
        this.angle = attackData.angle;
        this.range = attackData.range;
        this.damage = attackData.damage;
        this.color = attackData.color;
        this.glowColor = attackData.glowColor;
        this.owner = attackData.owner;
        
        // Type-specific properties
        this.coneAngle = attackData.coneAngle || 0;
        this.explosionRadius = attackData.explosionRadius || 0;
        
        // Animation properties
        this.lifetime = 0.3; // seconds
        this.maxLifetime = 0.3;
        this.alpha = 1.0;
    }
    
    // Update effect animation
    update(deltaTime) {
        this.lifetime -= deltaTime;
        
        // Fade out
        this.alpha = Math.max(0, this.lifetime / this.maxLifetime);
        
        // Deactivate when lifetime expires
        if (this.lifetime <= 0) {
            this.active = false;
        }
    }
    
    // Check if effect is still active
    isActive() {
        return this.active && this.lifetime > 0;
    }
}

// Projectile entity for projectile-based weapons
export class Projectile extends Entity {
    constructor(attackData) {
        super();
        
        this.weaponType = attackData.weaponType;
        this.attackType = attackData.attackType;
        this.position = attackData.position.clone();
        this.damage = attackData.damage;
        this.range = attackData.range;
        this.color = attackData.color;
        this.owner = attackData.owner;
        
        // Movement/State
        this.state = PROJECTILE_STATES.FLYING;
        const speed = attackData.projectileSpeed || 500;
        this.velocity = new Vector2D(
            Math.cos(attackData.angle) * speed,
            Math.sin(attackData.angle) * speed
        );
        
        // Tracking
        this.startPosition = attackData.position.clone();
        this.distanceTraveled = 0;
        
        // AoE / Arcing
        this.isAoe = attackData.attackType === 'aoe';
        this.explosionRadius = attackData.explosionRadius || 0;
        this.arcHeight = attackData.arcHeight || 0;
        this.height = 0; // Visual height offset
        this.fuseTime = (attackData.fuseTime || 0) / 1000; // Convert to seconds
        this.fuseElapsed = 0;

        if (this.isAoe) {
            this.targetPosition = new Vector2D(
                this.startPosition.x + Math.cos(attackData.angle) * this.range,
                this.startPosition.y + Math.sin(attackData.angle) * this.range
            );
            this.totalFlightTime = this.range / speed;
            this.elapsedFlightTime = 0;
        }

        // Visual
        this.radius = 5;
        this.hasHit = false;
    }
    
    // Update projectile movement and logic
    update(deltaTime) {
        if (this.state === PROJECTILE_STATES.DETONATED || !this.active) {
            this.active = false;
            return;
        }
        
        if (this.state === PROJECTILE_STATES.FLYING) {
            if (this.isAoe) {
                this.updateArcingFlight(deltaTime);
            } else {
                this.updateLinearFlight(deltaTime);
            }
        } else if (this.state === PROJECTILE_STATES.LANDED) {
            this.updateLanded(deltaTime);
        }
    }

    updateLinearFlight(deltaTime) {
        // Move projectile
        const movement = this.velocity.clone().multiply(deltaTime);
        this.position.add(movement);
        
        // Track distance
        this.distanceTraveled = this.position.distanceTo(this.startPosition);
        
        // Deactivate if out of range
        if (this.distanceTraveled >= this.range) {
            this.active = false;
        }
    }
    
    updateArcingFlight(deltaTime) {
        this.elapsedFlightTime += deltaTime;
        const t = Math.min(1, this.elapsedFlightTime / this.totalFlightTime);

        // Update ground position
        this.position.x = this.startPosition.x + (this.targetPosition.x - this.startPosition.x) * t;
        this.position.y = this.startPosition.y + (this.targetPosition.y - this.startPosition.y) * t;

        // Update height (parabolic arc: h = 4 * arcHeight * t * (1-t))
        this.height = 4 * this.arcHeight * t * (1 - t);

        // Check if landed
        if (t >= 1) {
            this.state = PROJECTILE_STATES.LANDED;
            this.height = 0;
            // If no fuse, detonate immediately
            if (this.fuseTime <= 0) {
                this.detonate();
            }
        }
    }

    updateLanded(deltaTime) {
        this.fuseElapsed += deltaTime;
        if (this.fuseElapsed >= this.fuseTime) {
            this.detonate();
        }
    }

    // Trigger detonation
    detonate() {
        this.state = PROJECTILE_STATES.DETONATED;
    }

    // Mark projectile as having hit something (for linear projectiles)
    hit() {
        if (!this.isAoe) {
            this.hasHit = true;
            this.active = false;
        }
    }
}

// Damage number visual effect
export class DamageNumber extends Entity {
    constructor(position, damage, isCritical = false) {
        super();
        
        this.position = position.clone();
        this.damage = Math.ceil(damage);
        this.isCritical = isCritical;
        
        // Animation properties
        this.lifetime = 1.0; // seconds
        this.maxLifetime = 1.0;
        this.velocityX = 0;
        this.velocityY = -50; // Float upward
        this.alpha = 1.0;
        
        // Visual properties
        this.color = isCritical ? '#ffff00' : '#ffffff';
        this.fontSize = isCritical ? 24 : 18;
    }
    
    // Update damage number animation
    update(deltaTime) {
        this.lifetime -= deltaTime;
        
        // Move upward
        this.position.x += this.velocityX * deltaTime;
        this.position.y += this.velocityY * deltaTime;
        
        // Fade out
        this.alpha = Math.max(0, this.lifetime / this.maxLifetime);
        
        // Deactivate when lifetime expires
        if (this.lifetime <= 0) {
            this.active = false;
        }
    }
}

// Weapon pickup entity for world items
export class WeaponPickup extends Entity {
    constructor(position, weaponConfig) {
        super();
        
        this.position = position.clone();
        this.weaponConfig = weaponConfig;
        this.type = 'weaponPickup';
        
        // Visual properties
        this.radius = 20;
        this.color = weaponConfig.color || '#ffffff';
        this.glowColor = weaponConfig.glowColor || '#ffaa00';
        this.tierColor = weaponConfig.tierColor || '#cccccc';
        
        // Animation
        this.bobOffset = 0;
        this.bobSpeed = 2;
        this.bobAmount = 5;
        this.rotationAngle = 0;
        this.rotationSpeed = 1;
        
        // Glow animation
        this.glowIntensity = 0.5;
        this.glowDirection = 1;
        this.glowSpeed = 2;
        
        // Pickup timer
        this.pickupTime = 1.0; // 1 second to pickup
        this.currentPickupProgress = 0;
        this.isBeingPickedUp = false;
        this.pickupCharacter = null;

        // UI hint (set externally by pickup logic; used by renderer)
        this.playerPickupBlockedReason = null;
    }
    
    // Update pickup animation
    update(deltaTime) {
        // Bob up and down
        this.bobOffset = Math.sin(this.bobSpeed * Date.now() / 1000) * this.bobAmount;
        
        // Rotate
        this.rotationAngle += this.rotationSpeed * deltaTime;
        
        // Pulse glow
        this.glowIntensity += this.glowDirection * this.glowSpeed * deltaTime;
        if (this.glowIntensity >= 1.0) {
            this.glowIntensity = 1.0;
            this.glowDirection = -1;
        } else if (this.glowIntensity <= 0.3) {
            this.glowIntensity = 0.3;
            this.glowDirection = 1;
        }
    }
    
    // Check if character is in range to start pickup
    isInRange(character) {
        const distance = this.position.distanceTo(character.position);
        const pickupRange = this.radius + (character.hitboxRadius || 30); // Default 30 if no hitbox
        return distance <= pickupRange;
    }
    
    // Update pickup progress
    updatePickup(character, deltaTime) {
        // If someone is already picking this up, don't allow other characters to
        // reset/steal progress. Release the claim only if the claimant becomes
        // invalid (dead/inactive) or leaves range.
        if (this.isBeingPickedUp && this.pickupCharacter) {
            const claimant = this.pickupCharacter;
            const claimantInvalid = !claimant.active || claimant.isDead;
            const claimantOutOfRange = !this.isInRange(claimant);
            if (claimantInvalid || claimantOutOfRange) {
                this.resetPickup();
            }
        }

        // If still claimed by someone else, do nothing (prevents thrashing when
        // multiple bots/players overlap the same pickup).
        if (this.isBeingPickedUp && this.pickupCharacter && this.pickupCharacter !== character) {
            return false;
        }

        // If this character isn't in range, only reset if they are the claimant
        // (otherwise just ignore).
        if (!this.isInRange(character)) {
            if (this.pickupCharacter === character) {
                this.resetPickup();
            }
            return false;
        }

        // Claim if unclaimed
        if (!this.isBeingPickedUp) {
            this.isBeingPickedUp = true;
            this.pickupCharacter = character;
            this.currentPickupProgress = 0;
        }

        // Increase progress
        this.currentPickupProgress += deltaTime;

        // Check if pickup complete
        if (this.currentPickupProgress >= this.pickupTime) {
            return true; // Ready to pickup
        }

        return false; // Still picking up
    }
    
    // Reset pickup progress
    resetPickup() {
        this.isBeingPickedUp = false;
        this.pickupCharacter = null;
        this.currentPickupProgress = 0;
    }
    
    // Get pickup progress (0 to 1)
    getPickupProgress() {
        return Math.min(1, this.currentPickupProgress / this.pickupTime);
    }
    
    // Get weapon config for pickup
    getWeaponConfig() {
        return this.weaponConfig;
    }
}