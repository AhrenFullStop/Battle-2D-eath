// Weapon type definitions and configurations

export const WEAPON_TYPES = {
    blaster: {
        name: 'Blaster',
        type: 'blaster',
        attackType: 'cone',
        baseDamage: 15,
        baseRange: 150,
        baseCooldown: 1500, // milliseconds
        coneAngle: 45, // degrees
        tierMultipliers: {
            damage: [1.0, 1.4, 1.8],
            range: [1.0, 1.3, 1.6]
        },
        // Visual properties
        color: '#ff6600',
        glowColor: '#ff9944'
    },
    spear: {
        name: 'Spear',
        type: 'spear',
        attackType: 'projectile',
        baseDamage: 25,
        baseRange: 300,
        baseCooldown: 2000,
        projectileSpeed: 500,
        coneAngle: 15, 
        tierMultipliers: {
            damage: [1.0, 1.4, 1.8],
            range: [1.0, 1.3, 1.6]
        },
        // Visual properties
        color: '#cccccc',
        glowColor: '#ffffff'
    },
    bomb: {
        name: 'Bomb',
        type: 'bomb',
        attackType: 'aoe',
        baseDamage: 35,
        baseRange: 250,
        baseCooldown: 3000,
        explosionRadius: 80,
        arcHeight: 100,
        tierMultipliers: {
            damage: [1.0, 1.4, 1.8],
            range: [1.0, 1.3, 1.6]
        },
        // Visual properties
        color: '#ff0000',
        glowColor: '#ff4444'
    },
    gun: {
        name: 'Gun',
        type: 'gun',
        attackType: 'burst',
        baseDamage: 5,
        baseRange: 280,
        baseCooldown: 1800,
        burstCount: 3,
        burstDelay: 100,
        projectileSpeed: 600,
        coneAngle: 5, 
        tierMultipliers: {
            damage: [1.0, 1.4, 1.8],
            range: [1.0, 1.3, 1.6]
        },
        // Visual properties
        color: '#4444ff',
        glowColor: '#6666ff'
    }
};

// Weapon tier colors for visual distinction
export const TIER_COLORS = {
    1: '#cccccc', // Common - gray/white
    2: '#4488ff', // Rare - blue
    3: '#ffaa00'  // Epic - gold
};

// Create a weapon instance with tier
export function createWeapon(weaponType, tier = 1) {
    const config = WEAPON_TYPES[weaponType];
    if (!config) {
        throw new Error(`Unknown weapon type: ${weaponType}`);
    }
    
    const tierIndex = tier - 1;
    
    return {
        ...config,
        tier,
        damage: config.baseDamage * config.tierMultipliers.damage[tierIndex],
        range: config.baseRange * config.tierMultipliers.range[tierIndex],
        cooldown: config.baseCooldown,
        currentCooldown: 0,
        tierColor: TIER_COLORS[tier]
    };
}