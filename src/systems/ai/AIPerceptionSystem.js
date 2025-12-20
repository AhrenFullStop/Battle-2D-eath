// AI Perception System - handles target detection, threat assessment, and loot finding

export class AIPerceptionSystem {
    /**
     * Update AI perception - detect enemies, health kits, and weapons
     * @param {AICharacter} ai - The AI character
     * @param {Array<Character>} allCharacters - All characters in the game
     * @param {Array<Consumable>} consumables - All consumables in the game
     * @param {Array<WeaponPickup>} availableWeapons - All available weapon pickups
     */
    updatePerception(ai, allCharacters, consumables, availableWeapons) {
        // Find nearest enemy (player or other AI)
        this.findNearestEnemy(ai, allCharacters);
        
        // Look for nearby health kits if damaged and has room
        const needsHealing = ai.currentHP < ai.maxHP * 0.7; // Below 70% health
        const hasRoomForHealthKit = ai.healthKits < ai.maxHealthKits;
        
        if (needsHealing && hasRoomForHealthKit && !ai.targetConsumable) {
            this.findNearestHealthKit(ai, consumables);
        }
        
        // Weapon seeking:
        // - If unarmed: aggressively seek the nearest weapon anywhere on the map.
        // - If armed: only consider nearby upgrades (keeps priorities sane).
        if (!ai.targetWeapon) {
            if (ai.weapons.length === 0) {
                this.findNearestWeapon(ai, availableWeapons, { ignoreRange: true });
            } else if (ai.weapons.length < ai.maxWeapons) {
                this.findNearestWeapon(ai, availableWeapons, { ignoreRange: false });
            }
        }
    }
    
    /**
     * Find the nearest enemy to this AI
     * @param {AICharacter} ai - The AI character
     * @param {Array<Character>} allCharacters - All characters in the game
     */
    findNearestEnemy(ai, allCharacters) {
        let nearestEnemy = null;
        let nearestDistance = ai.perceptionRange;
        
        allCharacters.forEach(character => {
            if (character === ai || character.isDead) return;
            
            const distance = ai.position.distanceTo(character.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = character;
            }
        });
        
        // Set target enemy if found, otherwise clear
        if (nearestEnemy) {
            ai.setTargetEnemy(nearestEnemy);
        } else if (ai.targetEnemy && ai.targetEnemy.isDead) {
            ai.setTargetEnemy(null);
        } else if (ai.targetEnemy) {
            // Check if current enemy is still in range
            const distanceToEnemy = ai.position.distanceTo(ai.targetEnemy.position);
            if (distanceToEnemy > ai.perceptionRange * 1.5) {
                ai.setTargetEnemy(null);
            }
        }
    }
    
    /**
     * Find nearest weapon pickup for AI
     * @param {AICharacter} ai - The AI character
     * @param {Array<WeaponPickup>} availableWeapons - All available weapon pickups
     * @param {Object} options - Options for weapon search
     * @param {boolean} options.ignoreRange - If true, search entire map
     */
    findNearestWeapon(ai, availableWeapons, options = {}) {
        const ignoreRange = !!options.ignoreRange;
        if (availableWeapons.length === 0) {
            ai.setTargetWeapon(null);
            return;
        }
        
        let nearestWeapon = null;
        let nearestDistance = Infinity;

        const maxDistance = ignoreRange ? Infinity : ai.perceptionRange;
        
        availableWeapons.forEach(weapon => {
            if (!weapon.active) return;
            
            const config = weapon.getWeaponConfig();
            
            // Check if AI can actually pick up this weapon
            if (!this.canPickupWeapon(ai, weapon)) {
                return;
            }
            
            const distance = ai.position.distanceTo(weapon.position);
            if (distance < nearestDistance && distance < maxDistance) {
                nearestDistance = distance;
                nearestWeapon = weapon;
            }
        });
        
        if (nearestWeapon) {
            ai.setTargetWeapon(nearestWeapon);
        } else {
            ai.setTargetWeapon(null);
        }
    }
    
    /**
     * Find nearest health kit for AI
     * @param {AICharacter} ai - The AI character
     * @param {Array<Consumable>} consumables - All consumables in the game
     */
    findNearestHealthKit(ai, consumables) {
        if (!consumables || consumables.length === 0) {
            ai.targetConsumable = null;
            return;
        }
        
        let nearestHealthKit = null;
        let nearestDistance = Infinity;
        
        consumables.forEach(consumable => {
            if (!consumable.active || consumable.consumableType !== 'healthKit') return;
            
            const distance = ai.position.distanceTo(consumable.position);
            if (distance < nearestDistance && distance < ai.perceptionRange) {
                nearestDistance = distance;
                nearestHealthKit = consumable;
            }
        });
        
        if (nearestHealthKit) {
            ai.targetConsumable = nearestHealthKit;
        } else {
            ai.targetConsumable = null;
        }
    }
    
    /**
     * Check if AI can pickup a weapon (eligibility check)
     * @param {AICharacter} ai - The AI character
     * @param {WeaponPickup} weaponPickup - The weapon pickup to check
     * @returns {boolean} True if AI can pick up the weapon
     */
    canPickupWeapon(ai, weaponPickup) {
        const config = weaponPickup.getWeaponConfig();
        const result = ai.getWeaponPickupResult(config);
        return result.ok;
    }
}
