// Consumable definitions for health kits and shield potions

export const CONSUMABLE_TYPES = {
    healthKit: {
        name: 'Health Kit',
        type: 'healthKit',
        color: '#ff4444',
        radius: 15,
        healAmount: 0.3, // 30% of max HP
        maxInventory: 2 // Can carry 2 health kits
    },
    shieldPotion: {
        name: 'Shield Potion',
        type: 'shieldPotion',
        color: '#4444ff',
        radius: 15,
        shieldAmount: 50,
        maxShield: 100
    }
};

// Create consumable config
export function createConsumable(type) {
    const config = CONSUMABLE_TYPES[type];
    if (!config) {
        throw new Error(`Unknown consumable type: ${type}`);
    }
    return { ...config };
}