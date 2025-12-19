// Character definitions for Bolt and Boulder

export const CHARACTERS = {
    bolt: {
        name: 'Bolt',
        type: 'bolt',
        menuPreviewImage: 'assets/utils/bolt_preview.png',
        maxHP: 60,
        moveSpeed: 100,
        hitboxRadius: 20,
        weaponCooldownMultiplier: 0.85,
        specialAbility: {
            type: 'dash',
            cooldown: 8000,
            dashDistance: 150,
            description: 'Burst forward instantly to dodge shots or close distance.'
        },
        // Visual properties
        color: '#eef047',
        radius: 20
    },
    boulder: {
        name: 'Boulder',
        type: 'boulder',
        menuPreviewImage: 'assets/utils/boulder_preview.png',
        maxHP: 100,
        moveSpeed: 60,
        hitboxRadius: 28,
        weaponCooldownMultiplier: 1.2,
        specialAbility: {
            type: 'groundSlam',
            cooldown: 12000,
            baseDamage: 40,
            description: 'Slam the ground to damage nearby enemies and control space.'
        },
        // Visual properties
        color: '#795548',
        radius: 28
    }
};