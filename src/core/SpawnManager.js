/**
 * SpawnManager.js - Entity Spawning System
 *
 * Manages all entity spawning logic including weapons, consumables, and
 * character placement. Ensures valid spawn positions that avoid obstacles
 * and maintains proper distribution across the map.
 *
 * Key Responsibilities:
 * - Spawn weapons with randomized tiers
 * - Spawn consumables (health kits, shield potions)
 * - Generate character spawn positions avoiding obstacles
 * - Ensure minimum distance between spawns
 * - Handle initial weapon/consumable distribution
 *
 * Architecture Notes:
 * - Used by MatchInitializer and GameOrchestrator/AISystem
 * - Validates spawn positions against map obstacles
 * - Weapons spawn with probability-based tier distribution
 *
 * @module core/SpawnManager
 */

import { WeaponPickup } from '../entities/Weapon.js';
import { Consumable } from '../entities/Consumable.js';
import { Vector2D } from '../utils/Vector2D.js';
import { createWeapon } from '../config/weapons.js';
import { createConsumable } from '../config/consumables.js';
import { MAP_WIDTH, MAP_HEIGHT } from '../config/map.js';

export class SpawnManager {
    constructor(gameState, mapObstacles, aiSystem) {
        this.gameState = gameState;
        this.mapObstacles = mapObstacles;
        this.aiSystem = aiSystem;
        this.consumables = [];
        this.localWeapons = []; // Fallback for multiplayer/no-AI
    }

    /**
     * Spawn a weapon pickup at the specified position
     * @param {Vector2D} position - World position to spawn weapon
     * @param {string} weaponType - Type of weapon ('blaster', 'gun', 'spear', 'bomb')
     * @param {number} tier - Weapon tier (1, 2, or 3)
     * @returns {Weapon} The spawned weapon entity
     */
    spawnWeapon(position, weaponType = 'blaster', tier = 1) {
        if (this.aiSystem) {
            return this.aiSystem.spawnWeapon(position, weaponType, tier);
        } else {
            // Multiplayer/No-AI fallback
            const weaponConfig = createWeapon(weaponType, tier);
            const weaponPickup = new WeaponPickup(position, weaponConfig);
            this.localWeapons.push(weaponPickup);
            return weaponPickup;
        }
    }

    /**
     * Get available weapons from AI system or local storage
     * @returns {Array<WeaponPickup>}
     */
    getAvailableWeapons() {
        if (this.aiSystem) {
            return this.aiSystem.getAvailableWeapons();
        }
        return this.localWeapons.filter(w => w.active);
    }

    /**
     * Spawn a consumable at the specified position
     * @param {Vector2D} position - World position
     * @param {string} type - Consumable type ('health' or 'shield')
     * @returns {Consumable} The spawned consumable entity
     */
    spawnConsumable(position, type) {
        const consumable = new Consumable(createConsumable(type));
        consumable.setPosition(position.x, position.y);
        this.consumables.push(consumable);
        return consumable;
    }

    /**
     * Spawn initial weapons across the map
     * @param {Object} mapConfig - Map configuration
     * @param {number} weaponCount - Number of weapons to spawn
     * @param {Object} gameConfig - Game configuration
     * @returns {Array} Array of weapon spawn data
     */
    spawnInitialWeapons(mapConfig, weaponCount, gameConfig) {
        const weaponTypes = ['blaster', 'spear', 'bomb', 'gun'];
        const weaponSpawns = [];

        for (let i = 0; i < weaponCount; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 400 + Math.random() * 500;
            let x = mapConfig.centerX + Math.cos(angle) * distance;
            let y = mapConfig.centerY + Math.sin(angle) * distance;

            // Find valid spawn position (not on obstacles)
            const validPos = this.findValidSpawnPosition(x, y, mapConfig, 30);
            if (validPos) {
                x = validPos.x;
                y = validPos.y;

                const type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
                const tier = this.generateWeaponTier(gameConfig.loot.weaponTierRatios);

                weaponSpawns.push({ pos: new Vector2D(x, y), type, tier });
                this.spawnWeapon(new Vector2D(x, y), type, tier);
            }
        }

        return weaponSpawns;
    }

    /**
     * Spawn initial consumables across the map
     * @param {Object} mapConfig - Map configuration
     * @param {number} consumableCount - Number of consumables to spawn
     * @returns {number} Number of consumables spawned
     */
    spawnInitialConsumables(mapConfig, consumableCount) {
        const consumableTypes = ['healthKit', 'shieldPotion'];

        for (let i = 0; i < consumableCount; i++) {
            const angle = (i / 6) * Math.PI * 2 + Math.PI / 12;
            const distance = 300 + Math.random() * 600;
            let x = mapConfig.centerX + Math.cos(angle) * distance;
            let y = mapConfig.centerY + Math.sin(angle) * distance;

            // Find valid spawn position (not on obstacles)
            const validPos = this.findValidSpawnPosition(x, y, mapConfig, 30);
            if (validPos) {
                x = validPos.x;
                y = validPos.y;

                const type = consumableTypes[Math.floor(Math.random() * consumableTypes.length)];
                this.spawnConsumable(new Vector2D(x, y), type);
            }
        }

        return this.consumables.length;
    }

    /**
     * Find valid spawn position not on obstacles
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {Object} mapConfig - Map configuration
     * @param {number} [clearanceRadius=30] - Minimum distance from obstacles
     * @param {number} [maxAttempts=10] - Maximum attempts to find valid position
     * @returns {Object|null} Valid position with x,y properties or null if not found
     */
    findValidSpawnPosition(x, y, mapConfig, clearanceRadius = 30, maxAttempts = 10) {
        // Check if position overlaps with any obstacle
        const checkPosition = (checkX, checkY) => {
            for (const obstacle of mapConfig.obstacles) {
                // Calculate obstacle bounds
                const obstacleLeft = obstacle.position.x - obstacle.width / 2;
                const obstacleRight = obstacle.position.x + obstacle.width / 2;
                const obstacleTop = obstacle.position.y - obstacle.height / 2;
                const obstacleBottom = obstacle.position.y + obstacle.height / 2;

                // Check if spawn position is too close to obstacle (with clearance)
                if (checkX + clearanceRadius > obstacleLeft &&
                    checkX - clearanceRadius < obstacleRight &&
                    checkY + clearanceRadius > obstacleTop &&
                    checkY - clearanceRadius < obstacleBottom) {
                    return false; // Overlaps with obstacle
                }
            }
            return true; // Valid position
        };

        // Try original position first
        if (checkPosition(x, y)) {
            return { x, y };
        }

        // Try nearby positions in a spiral pattern
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const radius = attempt * 50; // Expand search radius
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const testX = x + Math.cos(angle) * radius;
                const testY = y + Math.sin(angle) * radius;

                // Make sure it's still within map bounds
                const distFromCenter = Math.sqrt(
                    Math.pow(testX - mapConfig.centerX, 2) +
                    Math.pow(testY - mapConfig.centerY, 2)
                );

                if (distFromCenter < mapConfig.radius - 100 && checkPosition(testX, testY)) {
                    return { x: testX, y: testY };
                }
            }
        }

        // If all attempts fail, return null (skip this spawn)
        console.warn(`Could not find valid spawn position near (${Math.round(x)}, ${Math.round(y)})`);
        return null;
    }

    /**
     * Generate character spawn positions for all players and AI
     * @param {Object} mapConfig - Map configuration
     * @param {number} count - Number of spawns to generate
     * @param {Object} [options={}] - Spawn options
     * @param {Function} [randomFn=Math.random] - Random function for deterministic spawning
     * @returns {Array<Vector2D>} Array of spawn positions
     */
    generateCharacterSpawns(mapConfig, count, options = {}, randomFn = Math.random) {
        const clearanceRadius = options.clearanceRadius ?? 60;
        const minSpacing = options.minSpacing ?? 220;
        const marginFromEdge = options.marginFromEdge ?? 140;
        const maxAttemptsPerSpawn = options.maxAttemptsPerSpawn ?? 200;

        const spawns = [];

        const isFarEnoughFromOthers = (candidate) => {
            const minSpacingSq = minSpacing * minSpacing;
            for (let i = 0; i < spawns.length; i++) {
                const dx = candidate.x - spawns[i].x;
                const dy = candidate.y - spawns[i].y;
                if (dx * dx + dy * dy < minSpacingSq) return false;
            }
            return true;
        };

        for (let i = 0; i < count; i++) {
            let chosen = null;

            for (let attempt = 0; attempt < maxAttemptsPerSpawn; attempt++) {
                const angle = randomFn() * Math.PI * 2;
                const maxR = Math.max(50, mapConfig.radius - marginFromEdge);
                const r = Math.sqrt(randomFn()) * maxR;
                const x = mapConfig.centerX + Math.cos(angle) * r;
                const y = mapConfig.centerY + Math.sin(angle) * r;

                const validPos = this.findValidSpawnPosition(x, y, mapConfig, clearanceRadius, 6);
                if (!validPos) continue;
                if (!isFarEnoughFromOthers(validPos)) continue;

                chosen = validPos;
                break;
            }

            if (!chosen) {
                console.warn(`Could not find safe random spawn for character ${i + 1}; falling back to map spawn list if available.`);
                if (mapConfig.characterSpawns && mapConfig.characterSpawns.length > 0) {
                    const fallback = mapConfig.characterSpawns[i % mapConfig.characterSpawns.length];
                    const validFallback = this.findValidSpawnPosition(
                        fallback.x,
                        fallback.y,
                        mapConfig,
                        clearanceRadius,
                        10
                    );
                    chosen = validFallback || { x: mapConfig.centerX, y: mapConfig.centerY };
                } else {
                    chosen = { x: mapConfig.centerX, y: mapConfig.centerY };
                }
            }

            spawns.push(chosen);
        }

        return spawns;
    }

    /**
     * Generate weapon tier based on rarity ratios
     * @param {Object} tierRatios - Tier probability ratios with common, rare, epic properties
     * @returns {number} Weapon tier (1, 2, or 3)
     */
    generateWeaponTier(tierRatios) {
        const rand = Math.random();

        if (rand < tierRatios.common) {
            return 1; // Common
        } else if (rand < tierRatios.common + tierRatios.rare) {
            return 2; // Rare
        } else {
            return 3; // Epic
        }
    }
}