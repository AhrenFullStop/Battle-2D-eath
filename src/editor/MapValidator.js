// Map Validator - Validates map data for correctness and performance
// Checks required fields, bounds, sizes, and game configuration

/**
 * Validates map data and returns structured validation result
 * @param {Object} mapData - Map data to validate
 * @returns {Object} Validation result with errors and warnings
 */
export class MapValidator {
    constructor() {
        this.mapCenterX = 1500;
        this.mapCenterY = 1500;
    }
    
    /**
     * Validate complete map data
     * @param {Object} mapData - Map data to validate
     * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
     */
    validate(mapData) {
        const errors = [];
        const warnings = [];
        
        // Validate required fields
        this.validateRequiredFields(mapData, errors);
        
        // Validate background
        this.validateBackground(mapData, errors);
        
        // Validate object bounds
        this.validateObjectBounds(mapData, errors);
        
        // Validate object sizes
        this.validateObjectSizes(mapData, errors);
        
        // Validate game config
        this.validateGameConfig(mapData, errors);
        
        // Performance warnings
        this.checkPerformanceWarnings(mapData, warnings);
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Validate required fields
     */
    validateRequiredFields(mapData, errors) {
        // Name validation
        if (!mapData.name || typeof mapData.name !== 'string' || mapData.name.trim() === '') {
            errors.push('Map name is required and must be a non-empty string');
        }
        
        // Radius validation
        if (typeof mapData.radius !== 'number') {
            errors.push('Map radius must be a number');
        } else if (mapData.radius < 500 || mapData.radius > 3000) {
            errors.push('Map radius must be between 500 and 3000');
        }
    }
    
    /**
     * Validate background configuration
     */
    validateBackground(mapData, errors) {
        if (!mapData.background) {
            errors.push('Background configuration is required');
            return;
        }
        
        const bg = mapData.background;
        
        // Type validation
        if (bg.type !== 'color' && bg.type !== 'image') {
            errors.push('Background type must be either "color" or "image"');
        }
        
        // Value validation
        if (!bg.value || typeof bg.value !== 'string') {
            errors.push('Background value is required and must be a string');
        } else if (bg.type === 'image') {
            // Validate image extension
            const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
            const hasValidExtension = validExtensions.some(ext => 
                bg.value.toLowerCase().endsWith(ext)
            );
            if (!hasValidExtension) {
                errors.push('Background image must end with .png, .jpg, .jpeg, or .webp');
            }
        }
    }
    
    /**
     * Validate that all objects are within map bounds
     */
    validateObjectBounds(mapData, errors) {
        const radius = mapData.radius || 1400;
        
        // Validate bushes
        if (mapData.bushes && Array.isArray(mapData.bushes)) {
            mapData.bushes.forEach((bush, index) => {
                const dist = this.getDistanceFromCenter(bush.x, bush.y);
                if (dist > radius) {
                    errors.push(`Bush at index ${index} (${bush.x}, ${bush.y}) is outside map bounds (distance: ${Math.round(dist)}, max: ${radius})`);
                }
            });
        }
        
        // Validate obstacles
        if (mapData.obstacles && Array.isArray(mapData.obstacles)) {
            mapData.obstacles.forEach((obstacle, index) => {
                const dist = this.getDistanceFromCenter(obstacle.x, obstacle.y);
                if (dist > radius) {
                    errors.push(`Obstacle at index ${index} (${obstacle.x}, ${obstacle.y}) is outside map bounds (distance: ${Math.round(dist)}, max: ${radius})`);
                }
            });
        }
        
        // Validate water areas
        if (mapData.waterAreas && Array.isArray(mapData.waterAreas)) {
            mapData.waterAreas.forEach((water, index) => {
                const dist = this.getDistanceFromCenter(water.x, water.y);
                if (dist > radius) {
                    errors.push(`Water area at index ${index} (${water.x}, ${water.y}) is outside map bounds (distance: ${Math.round(dist)}, max: ${radius})`);
                }
            });
        }
    }
    
    /**
     * Validate object sizes
     */
    validateObjectSizes(mapData, errors) {
        // Validate bush sizes
        if (mapData.bushes && Array.isArray(mapData.bushes)) {
            mapData.bushes.forEach((bush, index) => {
                if (typeof bush.radius !== 'number' || bush.radius < 10 || bush.radius > 200) {
                    errors.push(`Bush at index ${index} has invalid radius (${bush.radius}). Must be between 10 and 200 pixels`);
                }
            });
        }
        
        // Validate obstacle sizes
        if (mapData.obstacles && Array.isArray(mapData.obstacles)) {
            mapData.obstacles.forEach((obstacle, index) => {
                if (typeof obstacle.width !== 'number' || obstacle.width < 20) {
                    errors.push(`Obstacle at index ${index} has invalid width (${obstacle.width}). Must be at least 20 pixels`);
                }
                if (typeof obstacle.height !== 'number' || obstacle.height < 20) {
                    errors.push(`Obstacle at index ${index} has invalid height (${obstacle.height}). Must be at least 20 pixels`);
                }
            });
        }
        
        // Validate water area sizes
        if (mapData.waterAreas && Array.isArray(mapData.waterAreas)) {
            mapData.waterAreas.forEach((water, index) => {
                if (typeof water.radius !== 'number' || water.radius < 10 || water.radius > 500) {
                    errors.push(`Water area at index ${index} has invalid radius (${water.radius}). Must be between 10 and 500 pixels`);
                }
            });
        }
    }
    
    /**
     * Validate game configuration
     */
    validateGameConfig(mapData, errors) {
        if (!mapData.gameConfig) {
            errors.push('Game configuration is required');
            return;
        }
        
        const config = mapData.gameConfig;
        
        // Validate weapon tier ratios
        if (config.loot && config.loot.weaponTierRatios) {
            const ratios = config.loot.weaponTierRatios;
            const sum = (ratios.common || 0) + (ratios.rare || 0) + (ratios.epic || 0);
            
            if (Math.abs(sum - 1.0) > 0.01) {
                errors.push(`Weapon tier ratios must sum to ~1.0 (current sum: ${sum.toFixed(3)})`);
            }
            
            // Check individual ratios
            if (ratios.common < 0 || ratios.common > 1) {
                errors.push('Common weapon ratio must be between 0 and 1');
            }
            if (ratios.rare < 0 || ratios.rare > 1) {
                errors.push('Rare weapon ratio must be between 0 and 1');
            }
            if (ratios.epic < 0 || ratios.epic > 1) {
                errors.push('Epic weapon ratio must be between 0 and 1');
            }
        }
        
        // Validate AI skill distribution
        if (config.ai && config.ai.skillDistribution) {
            const skills = config.ai.skillDistribution;
            const sum = (skills.novice || 0) + (skills.intermediate || 0) + (skills.expert || 0);
            
            if (Math.abs(sum - 1.0) > 0.01) {
                errors.push(`AI skill distribution must sum to ~1.0 (current sum: ${sum.toFixed(3)})`);
            }
            
            // Check individual skills
            if (skills.novice < 0 || skills.novice > 1) {
                errors.push('Novice AI ratio must be between 0 and 1');
            }
            if (skills.intermediate < 0 || skills.intermediate > 1) {
                errors.push('Intermediate AI ratio must be between 0 and 1');
            }
            if (skills.expert < 0 || skills.expert > 1) {
                errors.push('Expert AI ratio must be between 0 and 1');
            }
        }
        
        // Validate AI character distribution
        if (config.ai && config.ai.characterDistribution) {
            const chars = config.ai.characterDistribution;
            const sum = (chars.bolt || 0) + (chars.boulder || 0);
            
            if (Math.abs(sum - 1.0) > 0.01) {
                errors.push(`AI character distribution must sum to ~1.0 (current sum: ${sum.toFixed(3)})`);
            }
            
            // Check individual characters
            if (chars.bolt < 0 || chars.bolt > 1) {
                errors.push('Bolt character ratio must be between 0 and 1');
            }
            if (chars.boulder < 0 || chars.boulder > 1) {
                errors.push('Boulder character ratio must be between 0 and 1');
            }
        }
    }
    
    /**
     * Check for performance warnings
     */
    checkPerformanceWarnings(mapData, warnings) {
        // Count total objects
        const bushCount = (mapData.bushes || []).length;
        const obstacleCount = (mapData.obstacles || []).length;
        const waterCount = (mapData.waterAreas || []).length;
        const totalObjects = bushCount + obstacleCount + waterCount;
        
        if (totalObjects > 200) {
            warnings.push(`High object count (${totalObjects}). Maps with >200 objects may impact performance`);
        }
        
        // Check map radius
        if (mapData.radius && mapData.radius > 2500) {
            warnings.push(`Large map radius (${mapData.radius}). Maps with radius >2500 may impact performance`);
        }
        
        // Check for too many water areas (expensive to render)
        if (waterCount > 50) {
            warnings.push(`High water area count (${waterCount}). Consider reducing for better performance`);
        }
        
        // Check for very dense object placement
        if (totalObjects > 100 && mapData.radius && mapData.radius < 1000) {
            const density = totalObjects / (Math.PI * mapData.radius * mapData.radius / 1000000);
            if (density > 0.05) {
                warnings.push(`Very dense object placement. Consider spreading objects out more`);
            }
        }
    }
    
    /**
     * Calculate distance from map center
     */
    getDistanceFromCenter(x, y) {
        const dx = x - this.mapCenterX;
        const dy = y - this.mapCenterY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Quick validation - just check critical errors
     * @param {Object} mapData - Map data to validate
     * @returns {boolean} True if basic validation passes
     */
    quickValidate(mapData) {
        if (!mapData) return false;
        if (!mapData.name || mapData.name.trim() === '') return false;
        if (typeof mapData.radius !== 'number') return false;
        if (mapData.radius < 500 || mapData.radius > 3000) return false;
        return true;
    }
}
