// Map Editor - Core logic for editing maps

import { Vector2D } from '../utils/Vector2D.js';

export class MapEditor {
    constructor() {
        this.mapData = {
            name: "New Map",
            radius: 1400,
            background: { type: 'color', value: '#2d3748' },
            bushes: [],
            obstacles: [],
            waterAreas: []
        };
        
        this.currentTool = 'pan'; // 'pan', 'bush', 'obstacle', 'water', 'erase'
        this.isDragging = false;
        this.lastMousePos = null;
        
        // Map constants
        this.mapCenterX = 1500;
        this.mapCenterY = 1500;
        this.mapRadius = 1400;
        
        // Default sizes for objects
        this.defaultBushRadius = 50;
        this.defaultObstacleWidth = 80;
        this.defaultObstacleHeight = 80;
        this.defaultWaterRadius = 120;
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
            waterAreas: data.waterAreas || []
        };
        this.mapRadius = this.mapData.radius;
    }
    
    clearMap() {
        this.mapData.bushes = [];
        this.mapData.obstacles = [];
        this.mapData.waterAreas = [];
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
    }
    
    eraseAtPosition(x, y) {
        const eraseRadius = 50; // Erase anything within 50 units
        
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