// Character definitions for Bolt and Boulder

export const CHARACTERS = {
    bolt: {
        name: 'Bolt',
        type: 'bolt',
        maxHP: 80,
        moveSpeed: 250,
        hitboxRadius: 20,
        weaponCooldownMultiplier: 0.85,
        specialAbility: {
            type: 'dash',
            cooldown: 8000,
            dashDistance: 150
        },
        // Visual properties
        color: '#4CAF50',
        radius: 20
    },
    boulder: {
        name: 'Boulder',
        type: 'boulder',
        maxHP: 140,
        moveSpeed: 180,
        hitboxRadius: 28,
        weaponCooldownMultiplier: 1.2,
        specialAbility: {
            type: 'groundSlam',
            cooldown: 12000,
            baseDamage: 40
        },
        // Visual properties
        color: '#795548',
        radius: 28
    }
};