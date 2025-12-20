// Meta progression configuration (XP, levels, coins, upgrades/items)
// Intentionally data-driven so economy can be tuned without touching gameplay systems.

export const META_PROGRESSION_VERSION = 1;

export const META_CONFIG = {
    storage: {
        profileKey: 'battle2death.profile',
        profileVersion: META_PROGRESSION_VERSION
    },

    levels: {
        // Levels are cosmetic; total XP is source of truth.
        // sqrt curve makes early levels fast and later levels slower without exploding requirements.
        curve: 'sqrt',
        k: 50
    },

    rewards: {
        // No survival-time rewards (easy to exploit). Rewards are based on skillful actions + placement.
        xp: {
            perKill: 50,
            perDamageDealt: 0.35,
            perFriendlyRevive: 100
        },
        coins: {
            // Placement-only coin rewards.
            // Index is placement (1-based). Values beyond the array use `default`.
            byPlacement: {
                1: 50,
                2: 35,
                3: 25,
                default: 0
            }
        }
    },

    // Upgrades and items share a common requirements model.
    // Requirements are checked against lifetime profile stats.
    catalog: {
        upgrades: {
            toughness: {
                id: 'toughness',
                displayName: 'Toughness',
                description: 'Increase max HP',
                levels: [
                    {
                        index: 1,
                        displayName: 'Level 1',
                        cost: 10,
                        requirements: { xp: 10 },
                        buff: { type: 'MAX_HP_PERCENT', percentage: 5 }
                    },
                    {
                        index: 2,
                        displayName: 'Level 2',
                        cost: 20,
                        requirements: { xp: 20 },
                        buff: { type: 'MAX_HP_PERCENT', percentage: 4 }
                    },
                    {
                        index: 3,
                        displayName: 'Level 3',
                        cost: 35,
                        requirements: { xp: 30 },
                        buff: { type: 'MAX_HP_PERCENT', percentage: 3 }
                    }
                ]
            }
        },

        // Not implemented yet (Milestone 6 provision only): purchasable items with special effects.
        items: {}
    },

    history: {
        maxEntries: 25
    }
};
