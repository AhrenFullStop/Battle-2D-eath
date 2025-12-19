// Player-specific character class

import { Character } from './Character.js';

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
}