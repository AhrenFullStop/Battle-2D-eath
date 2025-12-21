// Player-specific character class

import { Character } from './Character.js';

export class Player extends Character {
    /**
     * Create a new player character
     * @param {Object} config - Player configuration
     */
    constructor(config) {
        // Mark as player
        config.isPlayer = true;
        super(config);
        
        // Player-specific properties
        this.inputVector = { x: 0, y: 0 };
    }

    /**
     * Update player with input
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Object} inputVector - Input vector with x,y properties
     */
    update(deltaTime, inputVector) {
        // Store input for physics system to process
        this.inputVector = inputVector;
        
        // Call parent update
        super.update(deltaTime);
    }

    /**
     * Get input vector for movement
     * @returns {Object} Input vector with x,y properties
     */
    getInputVector() {
        return this.inputVector;
    }

    /**
     * Equip a weapon
     * @param {Weapon} weapon - Weapon to equip
     */
    equipWeapon(weapon) {
        this.addWeapon(weapon);
    }

    /**
     * Fire active weapon
     * @param {number} aimAngle - Angle to fire weapon in radians
     * @returns {Projectile|null} Fired projectile or null if unable to fire
     */
    fireWeapon(aimAngle) {
        const weapon = this.getActiveWeapon();
        if (weapon && weapon.isReady()) {
            return weapon.fire(this.position, aimAngle, this.weaponCooldownMultiplier || 1.0);
        }
        return null;
    }
}