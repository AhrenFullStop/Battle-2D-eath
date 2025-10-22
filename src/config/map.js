// Map configuration for Battle-2D-eath Phase 5 & Phase 10

import { Vector2D } from '../utils/Vector2D.js';
import { getDefaultGameConfig, validateGameConfig } from './gameConfig.js';

// Current selected map
let currentMapConfig = null;

// Map dimensions
export const MAP_WIDTH = 3000;
export const MAP_HEIGHT = 3000;
export const MAP_CENTER_X = MAP_WIDTH / 2;
export const MAP_CENTER_Y = MAP_HEIGHT / 2;
export const MAP_RADIUS = 1400; // Circular map boundary

// Generate spawn points around the edge of the circular map
function generateSpawnPoints(count, radius, centerX, centerY) {
    const points = [];
    const angleStep = (Math.PI * 2) / count;
    const spawnRadius = radius - 100; // Spawn slightly inside the boundary
    
    for (let i = 0; i < count; i++) {
        const angle = i * angleStep;
        const x = centerX + Math.cos(angle) * spawnRadius;
        const y = centerY + Math.sin(angle) * spawnRadius;
        points.push(new Vector2D(x, y));
    }
    
    return points;
}

// Generate bushes scattered across the map
function generateBushes(count, centerX, centerY, radius) {
    const bushes = [];
    const innerRadius = radius * 0.3; // Don't spawn too close to center
    const outerRadius = radius * 0.85; // Don't spawn too close to edge
    
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        const bushRadius = 40 + Math.random() * 30; // Random size 40-70
        
        bushes.push({
            position: new Vector2D(x, y),
            radius: bushRadius
        });
    }
    
    return bushes;
}

// Generate obstacles (rocks) scattered across the map
function generateObstacles(count, centerX, centerY, radius) {
    const obstacles = [];
    const innerRadius = radius * 0.2;
    const outerRadius = radius * 0.9;
    
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        const width = 60 + Math.random() * 60; // Random width 60-120
        const height = 60 + Math.random() * 60; // Random height 60-120
        
        obstacles.push({
            position: new Vector2D(x, y),
            width: width,
            height: height
        });
    }
    
    return obstacles;
}

// Generate water areas
function generateWaterAreas(count, centerX, centerY, radius) {
    const waterAreas = [];
    const innerRadius = radius * 0.4;
    const outerRadius = radius * 0.8;
    
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        const width = 100 + Math.random() * 100; // Random width 100-200
        const height = 80 + Math.random() * 80; // Random height 80-160
        
        waterAreas.push({
            position: new Vector2D(x, y),
            width: width,
            height: height
        });
    }
    
    return waterAreas;
}

// Load map from JSON data
export function loadMapFromJSON(mapData) {
    const bushes = mapData.bushes.map(b => ({
        position: new Vector2D(b.x, b.y),
        radius: b.radius
    }));
    
    const obstacles = mapData.obstacles.map(o => ({
        position: new Vector2D(o.x, o.y),
        width: o.width,
        height: o.height
    }));
    
    const waterAreas = mapData.waterAreas.map(w => ({
        position: new Vector2D(w.x, w.y),
        radius: w.radius
    }));
    
    // Load and validate game config (with fallback to defaults for backward compatibility)
    const gameConfig = validateGameConfig(mapData.gameConfig);
    
    currentMapConfig = {
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        centerX: MAP_CENTER_X,
        centerY: MAP_CENTER_Y,
        radius: mapData.radius || MAP_RADIUS,
        name: mapData.name || "Custom Map",
        background: mapData.background || { type: 'color', value: '#2d5016' },
        
        characterSpawns: generateSpawnPoints(24, mapData.radius || MAP_RADIUS, MAP_CENTER_X, MAP_CENTER_Y),
        
        bushes: bushes,
        obstacles: obstacles,
        waterAreas: waterAreas,
        
        // Game configuration (new in Phase 11+)
        gameConfig: gameConfig,
        
        // Safe zone configuration (kept for backward compatibility, but now derived from gameConfig)
        safeZone: {
            centerX: MAP_CENTER_X,
            centerY: MAP_CENTER_Y,
            initialRadius: mapData.radius || MAP_RADIUS,
            phases: gameConfig.safeZone.phases.map((phase, index) => ({
                time: phase.startTime,
                radius: calculatePhaseRadius(mapData.radius || MAP_RADIUS, index, gameConfig.safeZone.phases.length),
                damage: phase.damage
            }))
        }
    };
    
    console.log('Map loaded with game config:', currentMapConfig.gameConfig);
    
    return currentMapConfig;
}

// Calculate radius for each safe zone phase
function calculatePhaseRadius(mapRadius, phaseIndex, totalPhases) {
    if (phaseIndex === 0) return mapRadius;
    
    // Default shrink pattern: exponentially smaller zones
    const shrinkRatios = [1.0, 0.71, 0.43, 0.21, 0.11]; // ~71%, 43%, 21%, 11% of map radius
    
    if (phaseIndex < shrinkRatios.length) {
        return Math.round(mapRadius * shrinkRatios[phaseIndex]);
    }
    
    // Fallback for additional phases
    const ratio = Math.max(0.05, 1 - (phaseIndex / totalPhases));
    return Math.round(mapRadius * ratio);
}

// Get current map config (or default)
export function getCurrentMapConfig() {
    return currentMapConfig || MAP_CONFIG;
}

// Get game config from current map (with fallback to defaults)
export function getGameConfig() {
    const mapConfig = getCurrentMapConfig();
    return mapConfig.gameConfig || getDefaultGameConfig();
}

// Map configuration (default/procedural)
// Initialize with default game config
const defaultGameConfig = getDefaultGameConfig();

export const MAP_CONFIG = {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    centerX: MAP_CENTER_X,
    centerY: MAP_CENTER_Y,
    radius: MAP_RADIUS,
    background: { type: 'color', value: '#2d5016' }, // Default green grass
    
    // Character spawn points (24 total for full game, using subset for Phase 5)
    characterSpawns: generateSpawnPoints(24, MAP_RADIUS, MAP_CENTER_X, MAP_CENTER_Y),
    
    // Terrain features
    bushes: generateBushes(25, MAP_CENTER_X, MAP_CENTER_Y, MAP_RADIUS),
    obstacles: generateObstacles(20, MAP_CENTER_X, MAP_CENTER_Y, MAP_RADIUS),
    waterAreas: generateWaterAreas(5, MAP_CENTER_X, MAP_CENTER_Y, MAP_RADIUS),
    
    // Game configuration
    gameConfig: defaultGameConfig,
    
    // Safe zone configuration (for backward compatibility, derived from gameConfig)
    safeZone: {
        centerX: MAP_CENTER_X,
        centerY: MAP_CENTER_Y,
        initialRadius: MAP_RADIUS,
        phases: defaultGameConfig.safeZone.phases.map((phase, index) => ({
            time: phase.startTime,
            radius: calculatePhaseRadius(MAP_RADIUS, index, defaultGameConfig.safeZone.phases.length),
            damage: phase.damage
        }))
    }
};

// Helper function to check if a point is within the circular map boundary
export function isWithinMapBounds(x, y) {
    const dx = x - MAP_CENTER_X;
    const dy = y - MAP_CENTER_Y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared <= MAP_RADIUS * MAP_RADIUS;
}

// Helper function to clamp a position to within map bounds
export function clampToMapBounds(position) {
    const dx = position.x - MAP_CENTER_X;
    const dy = position.y - MAP_CENTER_Y;
    const distanceSquared = dx * dx + dy * dy;
    
    if (distanceSquared > MAP_RADIUS * MAP_RADIUS) {
        const distance = Math.sqrt(distanceSquared);
        const scale = MAP_RADIUS / distance;
        position.x = MAP_CENTER_X + dx * scale;
        position.y = MAP_CENTER_Y + dy * scale;
    }
    
    return position;
}