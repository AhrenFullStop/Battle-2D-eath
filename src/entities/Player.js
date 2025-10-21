// Player-specific character class

import { Character } from './Character.js';
import { Weapon } from './Weapon.js';

export class Player extends Character {
    constructor(config) {
        // Mark as player
        config.isPlayer = true;
        super(config);
        
        // Player-specific properties
        this.inputVector = { x: 0, y: 0 };
    }

    // Update player with input
    update(deltaTime, inputVector) {
        // Store input for physics system to process
        this.inputVector = inputVector;
        
        // Call parent update
        super.update(deltaTime);
    }

    // Get input vector for movement
    getInputVector() {
        return this.inputVector;
    }

    // Equip a weapon (Phase 4: uses inventory system from Character)
    equipWeapon(weapon) {
        this.addWeapon(weapon);
    }

    // Fire active weapon
    fireWeapon(aimAngle) {
        const weapon = this.getActiveWeapon();
        if (weapon && weapon.isReady()) {
            return weapon.fire(this.position, aimAngle, this.weaponCooldownMultiplier || 1.0);
        }
        return null;
    }

    // Try to pickup a weapon
    tryPickupWeapon(weaponConfig) {
        // Check if already has this exact weapon (type and tier)
        if (this.hasWeapon(weaponConfig.type, weaponConfig.tier)) {
            return false; // Can't pickup exact duplicate
        }

        // Create weapon instance and try to add to inventory
        const weapon = new Weapon(weaponConfig);
        const success = this.addWeapon(weapon);
        return success;
    }
}