// Default game configuration for Battle-2D-eath
// These values match the current hardcoded game behavior to ensure backward compatibility

/**
 * Get default game configuration
 * This configuration can be overridden per-map in the map JSON files
 * @returns {Object} Default game configuration object
 */
export function getDefaultGameConfig() {
    return {
        // Movement tuning
        movement: {
            // Multiplier applied to player input velocity (kept as 2.5 by default)
            inputSpeedMultiplier: 2.5,
            // Multiplier applied to the player's base movement speed
            playerSpeedMultiplier: 1.0,
            // Multiplier applied to AI intent velocity so bots aren't dramatically slower than the player
            aiSpeedMultiplier: 2.2
        },

        // Match settings
        match: {
            aiCount: 7,              // Number of AI opponents (current default)
            targetDuration: 600      // Target match duration in seconds (10 minutes)
        },
        
        // Safe zone settings (timings in milliseconds for backward compatibility with map.js)
        safeZone: {
            phases: [
                { startTime: 0, damage: 0 },          // Phase 0: No damage initially
                { startTime: 30000, damage: 2 },      // Phase 1: 30 seconds, 2 dmg/tick
                { startTime: 120000, damage: 5 },     // Phase 2: 2 minutes, 5 dmg/tick
                { startTime: 210000, damage: 10 },    // Phase 3: 3.5 minutes, 10 dmg/tick
                { startTime: 300000, damage: 20 }     // Phase 4: 5 minutes, 20 dmg/tick
            ],
            shrinkDuration: 10,      // Seconds to shrink to new zone size
            damageTickRate: 0.5      // Apply damage every 0.5 seconds when outside zone
        },
        
        // Loot spawn settings
        loot: {
            initialWeapons: 8,           // Number of weapons spawned at match start
            initialConsumables: 6,       // Number of consumables spawned at match start
            weaponRespawnTime: 30,       // Seconds until weapon respawns (not currently implemented)
            consumableRespawnTime: 20,   // Seconds until consumable respawns (not currently implemented)
            
            // Weapon tier distribution (common/rare/epic)
            // These ratios determine the probability of spawning each tier
            weaponTierRatios: {
                common: 0.6,   // 60% chance for Tier 1 (common)
                rare: 0.2,     // 20% chance for Tier 2 (rare)
                epic: 0.2      // 20% chance for Tier 3 (epic)
            },
            
            maxWeaponsOnMap: 15  // Maximum weapons allowed on map for performance
        },
        
        // AI behavior settings
        ai: {
            // Skill level distribution for AI opponents
            // These ratios determine how many AI of each skill level spawn
            skillDistribution: {
                novice: 0.57,        // ~57% novice (4 out of 7)
                intermediate: 0.29,  // ~29% intermediate (2 out of 7)
                expert: 0.14         // ~14% expert (1 out of 7)
            },
            
            // Character type distribution (Bolt vs Boulder)
            characterDistribution: {
                bolt: 0.5,     // 50% Bolt (fast, low HP)
                boulder: 0.5   // 50% Boulder (slow, high HP)
            },

            // Skill profiles (tuning knobs) used by AI.
            // Values are intentionally conservative to avoid dramatic difficulty swings.
            // Units:
            // - reactionTimeSeconds: seconds between AI decision updates
            // - perceptionRange: world units
            // - aimAccuracy: 0..1 (used as a dispersion scalar)
            // - aggression: 0..1 (higher = more willing to fight / less likely to flee)
            // - abilityUseChancePerSecond: 0..1 (roll each second while in combat)
            skillProfiles: {
                novice: {
                    reactionTimeSeconds: 0.8,
                    perceptionRange: 250,
                    aimAccuracy: 0.6,
                    aggression: 0.35,
                    strafeStrength: 0.35,
                    abilityUseChancePerSecond: 0.08
                },
                intermediate: {
                    reactionTimeSeconds: 0.45,
                    perceptionRange: 350,
                    aimAccuracy: 0.8,
                    aggression: 0.6,
                    strafeStrength: 0.45,
                    abilityUseChancePerSecond: 0.14
                },
                expert: {
                    reactionTimeSeconds: 0.25,
                    perceptionRange: 450,
                    aimAccuracy: 0.95,
                    aggression: 0.8,
                    strafeStrength: 0.55,
                    abilityUseChancePerSecond: 0.22
                }
            }
        }
    };
}

/**
 * Validate game configuration
 * Ensures all required fields are present and values are valid
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validated configuration with defaults for missing fields
 */
export function validateGameConfig(config) {
    const defaultConfig = getDefaultGameConfig();
    
    if (!config) {
        console.warn('No game config provided, using defaults');
        return defaultConfig;
    }
    
    // Deep merge with defaults
    const validated = {
        movement: {
            inputSpeedMultiplier: Math.max(0.5, Math.min(5, config.movement?.inputSpeedMultiplier ?? defaultConfig.movement.inputSpeedMultiplier)),
            playerSpeedMultiplier: Math.max(0.5, Math.min(5, config.movement?.playerSpeedMultiplier ?? defaultConfig.movement.playerSpeedMultiplier)),
            aiSpeedMultiplier: Math.max(0.5, Math.min(5, config.movement?.aiSpeedMultiplier ?? defaultConfig.movement.aiSpeedMultiplier))
        },
        match: {
            aiCount: Math.max(1, Math.min(50, config.match?.aiCount ?? defaultConfig.match.aiCount)),
            targetDuration: Math.max(60, config.match?.targetDuration ?? defaultConfig.match.targetDuration)
        },
        safeZone: {
            phases: config.safeZone?.phases ?? defaultConfig.safeZone.phases,
            shrinkDuration: Math.max(1, config.safeZone?.shrinkDuration ?? defaultConfig.safeZone.shrinkDuration),
            damageTickRate: Math.max(0.1, config.safeZone?.damageTickRate ?? defaultConfig.safeZone.damageTickRate)
        },
        loot: {
            initialWeapons: Math.max(0, config.loot?.initialWeapons ?? defaultConfig.loot.initialWeapons),
            initialConsumables: Math.max(0, config.loot?.initialConsumables ?? defaultConfig.loot.initialConsumables),
            weaponRespawnTime: Math.max(0, config.loot?.weaponRespawnTime ?? defaultConfig.loot.weaponRespawnTime),
            consumableRespawnTime: Math.max(0, config.loot?.consumableRespawnTime ?? defaultConfig.loot.consumableRespawnTime),
            weaponTierRatios: config.loot?.weaponTierRatios ?? defaultConfig.loot.weaponTierRatios,
            maxWeaponsOnMap: Math.max(1, config.loot?.maxWeaponsOnMap ?? defaultConfig.loot.maxWeaponsOnMap)
        },
        ai: {
            skillDistribution: config.ai?.skillDistribution ?? defaultConfig.ai.skillDistribution,
            characterDistribution: config.ai?.characterDistribution ?? defaultConfig.ai.characterDistribution,
            skillProfiles: config.ai?.skillProfiles ?? defaultConfig.ai.skillProfiles
        }
    };
    
    // Validate safe zone phases are in chronological order
    if (validated.safeZone.phases && validated.safeZone.phases.length > 1) {
        for (let i = 1; i < validated.safeZone.phases.length; i++) {
            if (validated.safeZone.phases[i].startTime <= validated.safeZone.phases[i-1].startTime) {
                console.warn(`Safe zone phase ${i} start time must be greater than phase ${i-1}`);
            }
        }
    }
    
    return validated;
}

/**
 * Generate AI skill levels based on distribution config
 * @param {Object} skillDistribution - Skill distribution ratios
 * @param {number} count - Number of AI to generate skills for
 * @returns {Array<string>} Array of skill levels
 */
export function generateAISkills(skillDistribution, count) {
    const skills = [];
    const noviceCount = Math.round(count * skillDistribution.novice);
    const intermediateCount = Math.round(count * skillDistribution.intermediate);
    const expertCount = count - noviceCount - intermediateCount;
    
    for (let i = 0; i < noviceCount; i++) skills.push('novice');
    for (let i = 0; i < intermediateCount; i++) skills.push('intermediate');
    for (let i = 0; i < expertCount; i++) skills.push('expert');
    
    // Shuffle array
    for (let i = skills.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [skills[i], skills[j]] = [skills[j], skills[i]];
    }
    
    return skills;
}

/**
 * Generate AI character types based on distribution config
 * @param {Object} characterDistribution - Character distribution ratios
 * @param {number} count - Number of AI to generate types for
 * @returns {Array<string>} Array of character types
 */
export function generateAICharacterTypes(characterDistribution, count) {
    const types = [];
    const boltCount = Math.round(count * characterDistribution.bolt);
    const boulderCount = count - boltCount;
    
    for (let i = 0; i < boltCount; i++) types.push('bolt');
    for (let i = 0; i < boulderCount; i++) types.push('boulder');
    
    // Shuffle array
    for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
    }
    
    return types;
}

/**
 * Generate weapon tier based on distribution config
 * @param {Object} tierRatios - Tier distribution ratios
 * @returns {number} Weapon tier (1, 2, or 3)
 */
export function generateWeaponTier(tierRatios) {
    const rand = Math.random();
    
    if (rand < tierRatios.common) {
        return 1; // Common
    } else if (rand < tierRatios.common + tierRatios.rare) {
        return 2; // Rare
    } else {
        return 3; // Epic
    }
}