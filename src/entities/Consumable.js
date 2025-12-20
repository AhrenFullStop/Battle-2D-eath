// Consumable entity class for health kits and shield potions

import { Entity } from './Entity.js';

export class Consumable extends Entity {
    constructor(config) {
        super();
        
        this.type = 'consumable';
        this.consumableType = config.type; // 'healthKit' or 'shieldPotion'
        this.name = config.name;
        this.color = config.color;
        this.radius = config.radius || 15;
        
        // Pickup properties
        this.pickupRadius = 50;
        this.pickupProgress = 0;
        this.pickupTime = 0.5; // 0.5 seconds to pickup
        this.isBeingPickedUp = false;
        this.pickupCharacter = null;

        // UI hint (optional; set externally by pickup logic)
        this.playerPickupBlockedReason = null;
    }
    
    // Check if character is in range
    isInRange(character) {
        const dx = character.position.x - this.position.x;
        const dy = character.position.y - this.position.y;
        const distSquared = dx * dx + dy * dy;
        return distSquared <= this.pickupRadius * this.pickupRadius;
    }
    
    // Update pickup progress
    updatePickup(character, deltaTime) {
        if (!this.isInRange(character)) {
            this.resetPickup();
            return false;
        }
        
        this.isBeingPickedUp = true;
        this.pickupCharacter = character;
        this.pickupProgress += deltaTime;
        
        // Complete pickup
        if (this.pickupProgress >= this.pickupTime) {
            return true;
        }
        
        return false;
    }
    
    // Reset pickup state
    resetPickup() {
        this.pickupProgress = 0;
        this.isBeingPickedUp = false;
        this.pickupCharacter = null;
    }
    
    // Get pickup progress (0 to 1)
    getPickupProgress() {
        return Math.min(this.pickupProgress / this.pickupTime, 1);
    }
    
    // Get consumable config for pickup
    getConfig() {
        return {
            type: this.consumableType,
            name: this.name,
            color: this.color
        };
    }
}