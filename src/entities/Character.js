// Character entity class for players and AI

import { Entity } from './Entity.js';
import { Vector2D } from '../utils/Vector2D.js';

export class Character extends Entity {
    constructor(config) {
        super();
        
        // Character type
        this.type = 'character';
        this.characterType = config.type; // 'bolt' or 'boulder'
        this.name = config.name;
        this.isPlayer = config.isPlayer || false;
        
        // Stats
        this.maxHP = config.maxHP;
        this.currentHP = config.maxHP;
        this.shield = 0;
        this.moveSpeed = config.moveSpeed;
        this.hitboxRadius = config.hitboxRadius;
        this.weaponCooldownMultiplier = config.weaponCooldownMultiplier || 1.0;
        
        // Movement
        this.velocity = new Vector2D(0, 0);
        this.facingAngle = 0;
        
        // Visual properties
        this.color = config.color;
        this.radius = config.radius;
        
        // State
        this.isDead = false;
        this.isInBush = false;
        
        // Combat - Phase 4: Multiple weapons
        this.weapons = [];
        this.maxWeapons = 3; // Can carry up to 3 weapons
        this.activeWeaponIndex = 0;
        this.specialAbilityCooldown = 0;
        this.specialAbility = config.specialAbility;
        
        // Inventory - Phase 7
        this.healthKits = 0; // Count of health kits (max 2)
        this.maxHealthKits = 2;
    }

    // Update character state
    update(deltaTime) {
        if (this.isDead) return;
        
        // Update cooldowns
        if (this.specialAbilityCooldown > 0) {
            this.specialAbilityCooldown -= deltaTime;
        }
        
        // Update facing angle based on velocity
        if (this.velocity.magnitude() > 0.1) {
            this.facingAngle = this.velocity.angle();
        }
    }

    // Take damage
    takeDamage(amount) {
        if (this.isDead) return;
        
        // Shield absorbs damage first
        if (this.shield > 0) {
            const shieldDamage = Math.min(this.shield, amount);
            this.shield -= shieldDamage;
            amount -= shieldDamage;
        }
        
        // Apply remaining damage to HP
        this.currentHP -= amount;
        
        // Check if dead
        if (this.currentHP <= 0) {
            this.currentHP = 0;
            this.die();
        }
    }

    // Heal character
    heal(amount) {
        if (this.isDead) return;
        
        this.currentHP = Math.min(this.currentHP + amount, this.maxHP);
    }
    
    // Use health kit
    useHealthKit() {
        if (this.isDead || this.healthKits <= 0) return false;
        
        // Can't use if at full health
        if (this.currentHP >= this.maxHP) return false;
        
        // Restore 30% of max HP
        const healAmount = this.maxHP * 0.3;
        this.heal(healAmount);
        this.healthKits--;
        
        return true;
    }
    
    // Add health kit
    addHealthKit() {
        if (this.healthKits < this.maxHealthKits) {
            this.healthKits++;
            return true;
        }
        return false;
    }
    
    // Check if can carry more health kits
    canCarryHealthKit() {
        return this.healthKits < this.maxHealthKits;
    }

    // Add shield
    addShield(amount) {
        if (this.isDead) return;
        
        this.shield = Math.min(this.shield + amount, 100);
    }

    // Die
    die() {
        this.isDead = true;
        this.velocity.set(0, 0);
    }

    // Respawn
    respawn() {
        this.isDead = false;
        this.currentHP = this.maxHP;
        this.shield = 0;
        this.velocity.set(0, 0);
    }

    // Get health percentage
    getHealthPercentage() {
        return this.currentHP / this.maxHP;
    }

    // Check if character is alive
    isAlive() {
        return !this.isDead && this.active;
    }

    // Add weapon to inventory
    addWeapon(weapon) {
        weapon.setOwner(this);
        
        // If inventory is full, decide what to replace
        if (this.weapons.length >= this.maxWeapons) {
            // First, check if we have the same weapon type with lower tier
            const sameTypeIndex = this.findSameWeaponTypeIndex(weapon.weaponType);
            
            if (sameTypeIndex !== -1) {
                // Replace same type if new weapon is higher tier
                if (weapon.tier > this.weapons[sameTypeIndex].tier) {
                    this.weapons[sameTypeIndex] = weapon;
                    return true;
                } else {
                    return false; // Can't replace with lower or same tier
                }
            }
            
            // Otherwise, replace lowest tier weapon
            const lowestTierIndex = this.findLowestTierWeaponIndex();
            this.weapons[lowestTierIndex] = weapon;
            
            // Keep active weapon index valid
            if (this.activeWeaponIndex >= this.weapons.length) {
                this.activeWeaponIndex = 0;
            }
        } else {
            this.weapons.push(weapon);
        }
        
        return true;
    }

    // Find index of lowest tier weapon
    findLowestTierWeaponIndex() {
        let lowestTier = Infinity;
        let lowestIndex = 0;
        
        for (let i = 0; i < this.weapons.length; i++) {
            if (this.weapons[i].tier < lowestTier) {
                lowestTier = this.weapons[i].tier;
                lowestIndex = i;
            }
        }
        
        return lowestIndex;
    }

    // Check if already has weapon of same type and tier
    hasWeapon(weaponType, tier) {
        return this.weapons.some(w => w.weaponType === weaponType && w.tier === tier);
    }

    // Find index of same weapon type (any tier)
    findSameWeaponTypeIndex(weaponType) {
        for (let i = 0; i < this.weapons.length; i++) {
            if (this.weapons[i].weaponType === weaponType) {
                return i;
            }
        }
        return -1;
    }

    // Get active weapon
    getActiveWeapon() {
        if (this.weapons.length > 0 && this.activeWeaponIndex < this.weapons.length) {
            return this.weapons[this.activeWeaponIndex];
        }
        return null;
    }

    // Switch to next weapon
    nextWeapon() {
        if (this.weapons.length > 0) {
            this.activeWeaponIndex = (this.activeWeaponIndex + 1) % this.weapons.length;
        }
    }

    // Switch to previous weapon
    previousWeapon() {
        if (this.weapons.length > 0) {
            this.activeWeaponIndex = (this.activeWeaponIndex - 1 + this.weapons.length) % this.weapons.length;
        }
    }

    // Switch to specific weapon slot
    switchToWeapon(index) {
        if (index >= 0 && index < this.weapons.length) {
            this.activeWeaponIndex = index;
        }
    }

    // Get all weapons
    getAllWeapons() {
        return this.weapons;
    }

    // Get weapon count
    getWeaponCount() {
        return this.weapons.length;
    }
}