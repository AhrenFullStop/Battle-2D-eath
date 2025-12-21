// Map Editor - Core logic for editing maps

import { Vector2D } from '../utils/Vector2D.js';
import { getDefaultGameConfig } from '../config/gameConfig.js';
import { resolveMapBackgroundUrl, warnMissingAsset } from '../utils/assetUrl.js';

export class MapEditor {
    constructor() {
        this.mapData = {
            name: "New Map",
            radius: 1400,
            background: { type: 'color', value: '#2d3748' },
            bushes: [],
            obstacles: [],
            waterAreas: [],
            gameConfig: getDefaultGameConfig()
        };
        
        this.currentTool = 'pan'; // 'pan', 'bush', 'obstacle', 'water', 'erase'
        this.isDragging = false;
        this.lastMousePos = null;
        
        // Undo/Redo system
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        // Push initial state
        this.pushHistory();
        
        // Map constants
        this.mapCenterX = 1500;
        this.mapCenterY = 1500;
        this.mapRadius = 1400;
        
        // Default sizes for objects
        this.defaultBushRadius = 50;
        this.defaultObstacleWidth = 80;
        this.defaultObstacleHeight = 80;
        this.defaultWaterRadius = 120;
        
        // Background image
        this.backgroundImage = null;
        this.backgroundImageLoaded = false;
        this.lastBackgroundPath = null;
    }
    
    setTool(tool) {
        this.currentTool = tool;
    }
    
    getCurrentTool() {
        return this.currentTool;
    }
    
    setMapName(name) {
        this.mapData.name = name;
    }
    
    setBackground(background) {
        this.mapData.background = background;
        this.loadBackgroundImage();
        this.pushHistory();
    }
    
    loadBackgroundImage() {
        // Only load if background is an image type
        if (this.mapData.background?.type === 'image') {
            const imagePath = resolveMapBackgroundUrl(this.mapData.background.value);
            
            // Only load if it's a different image
            if (this.lastBackgroundPath !== imagePath) {
                this.lastBackgroundPath = imagePath;
                this.backgroundImageLoaded = false;
                this.backgroundImage = new Image();
                this.backgroundImage.onload = () => {
                    this.backgroundImageLoaded = true;
                    console.log('Editor background image loaded:', imagePath);
                };
                this.backgroundImage.onerror = () => {
                    console.error('Failed to load editor background image:', imagePath);
                    warnMissingAsset('map editor background image', imagePath, 'MapEditor');
                    this.backgroundImageLoaded = false;
                    this.backgroundImage = null;
                };
                this.backgroundImage.src = imagePath;
            }
        } else {
            // Reset if not using image background
            this.lastBackgroundPath = null;
            this.backgroundImage = null;
            this.backgroundImageLoaded = false;
        }
    }
    
    getBackgroundImage() {
        return {
            image: this.backgroundImage,
            loaded: this.backgroundImageLoaded
        };
    }
    
    getMapData() {
        return this.mapData;
    }
    
    loadMapData(data) {
        this.mapData = {
            name: data.name || "Loaded Map",
            radius: data.radius || 1400,
            background: data.background || { type: 'color', value: '#2d3748' },
            bushes: data.bushes || [],
            obstacles: data.obstacles || [],
            waterAreas: data.waterAreas || [],
            gameConfig: data.gameConfig || getDefaultGameConfig()
        };
        this.mapRadius = this.mapData.radius;
        this.loadBackgroundImage();
    }
    
    setGameConfig(gameConfig) {
        this.mapData.gameConfig = gameConfig;
    }
    
    getGameConfig() {
        return this.mapData.gameConfig || getDefaultGameConfig();
    }
    
    /**
     * Push current state to history
     */
    pushHistory() {
        // Remove any states after current index (branching)
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Deep clone current state
        const state = JSON.parse(JSON.stringify(this.mapData));
        
        // Add to history
        this.history.push(state);
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }
    
    /**
     * Undo last action
     */
    undo() {
        if (!this.canUndo()) return false;
        
        this.historyIndex--;
        this.restoreState(this.history[this.historyIndex]);
        return true;
    }
    
    /**
     * Redo last undone action
     */
    redo() {
        if (!this.canRedo()) return false;
        
        this.historyIndex++;
        this.restoreState(this.history[this.historyIndex]);
        return true;
    }
    
    /**
     * Check if undo is available
     */
    canUndo() {
        return this.historyIndex > 0;
    }
    
    /**
     * Check if redo is available
     */
    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }
    
    /**
     * Restore state from history
     */
    restoreState(state) {
        this.mapData = JSON.parse(JSON.stringify(state));
        this.mapRadius = this.mapData.radius;
        this.loadBackgroundImage();
    }
    
    clearMap() {
        this.mapData.bushes = [];
        this.mapData.obstacles = [];
        this.mapData.waterAreas = [];
        this.pushHistory();
    }
    
    handleClick(worldX, worldY) {
        // Check if click is within map bounds
        const dx = worldX - this.mapCenterX;
        const dy = worldY - this.mapCenterY;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
        
        if (distFromCenter > this.mapRadius) {
            return; // Outside map bounds
        }
        
        if (this.currentTool === 'erase') {
            this.eraseAtPosition(worldX, worldY);
        } else {
            this.placeObject(worldX, worldY);
        }
    }
    
    placeObject(x, y) {
        switch (this.currentTool) {
            case 'bush':
                this.mapData.bushes.push({
                    x: Math.round(x),
                    y: Math.round(y),
                    radius: this.defaultBushRadius
                });
                break;
                
            case 'obstacle':
                this.mapData.obstacles.push({
                    x: Math.round(x),
                    y: Math.round(y),
                    width: this.defaultObstacleWidth,
                    height: this.defaultObstacleHeight
                });
                break;
                
            case 'water':
                this.mapData.waterAreas.push({
                    x: Math.round(x),
                    y: Math.round(y),
                    radius: this.defaultWaterRadius
                });
                break;
        }
        this.pushHistory();
    }
    
    eraseAtPosition(x, y) {
        const eraseRadius = 50; // Erase anything within 50 units
        
        const initialCount = this.mapData.bushes.length +
                           this.mapData.obstacles.length +
                           this.mapData.waterAreas.length;
        
        // Check bushes
        this.mapData.bushes = this.mapData.bushes.filter(bush => {
            const dx = bush.x - x;
            const dy = bush.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist > eraseRadius;
        });
        
        // Check obstacles
        this.mapData.obstacles = this.mapData.obstacles.filter(obstacle => {
            const dx = obstacle.x - x;
            const dy = obstacle.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist > eraseRadius;
        });
        
        // Check water areas
        this.mapData.waterAreas = this.mapData.waterAreas.filter(water => {
            const dx = water.x - x;
            const dy = water.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist > eraseRadius;
        });
        
        const finalCount = this.mapData.bushes.length +
                         this.mapData.obstacles.length +
                         this.mapData.waterAreas.length;
        
        // Only push to history if something was actually erased
        if (initialCount !== finalCount) {
            this.pushHistory();
        }
    }
    
    exportToJSON() {
        return JSON.stringify(this.mapData, null, 2);
    }
    
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this.loadMapData(data);
            return true;
        } catch (error) {
            console.error('Error parsing JSON:', error);
            return false;
        }
    }
    
    getObjectCount() {
        return {
            bushes: this.mapData.bushes.length,
            obstacles: this.mapData.obstacles.length,
            waterAreas: this.mapData.waterAreas.length,
            total: this.mapData.bushes.length + this.mapData.obstacles.length + this.mapData.waterAreas.length
        };
    }
    
    // Helper to check if position is near an object
    isNearObject(x, y, threshold = 30) {
        // Check bushes
        for (const bush of this.mapData.bushes) {
            const dx = bush.x - x;
            const dy = bush.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < threshold + bush.radius) {
                return { type: 'bush', object: bush };
            }
        }
        
        // Check obstacles
        for (const obstacle of this.mapData.obstacles) {
            const dx = obstacle.x - x;
            const dy = obstacle.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < threshold) {
                return { type: 'obstacle', object: obstacle };
            }
        }
        
        // Check water areas
        for (const water of this.mapData.waterAreas) {
            const dx = water.x - x;
            const dy = water.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < threshold + water.radius) {
                return { type: 'water', object: water };
            }
        }
        
        return null;
    }
}