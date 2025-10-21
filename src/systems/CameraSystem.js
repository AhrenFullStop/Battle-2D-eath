// Camera system for Battle-2D-eath Phase 5

import { MAP_CONFIG } from '../config/map.js';

export class CameraSystem {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Camera position (top-left corner of viewport)
        this.x = 0;
        this.y = 0;
        
        // Camera smoothing
        this.smoothing = 0.15; // Higher = more responsive, lower = smoother
        
        // Target position (what the camera is following)
        this.targetX = 0;
        this.targetY = 0;
    }

    // Update camera to follow a target (usually the player)
    update(target) {
        if (!target) return;
        
        // Calculate desired camera position (center target on screen)
        this.targetX = target.position.x - this.canvasWidth / 2;
        this.targetY = target.position.y - this.canvasHeight / 2;
        
        // Clamp camera to map bounds
        this.clampToMapBounds();
        
        // Smooth camera movement (lerp)
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;
    }

    // Clamp camera so it doesn't show area outside the circular map
    clampToMapBounds() {
        const mapLeft = MAP_CONFIG.centerX - MAP_CONFIG.radius;
        const mapRight = MAP_CONFIG.centerX + MAP_CONFIG.radius;
        const mapTop = MAP_CONFIG.centerY - MAP_CONFIG.radius;
        const mapBottom = MAP_CONFIG.centerY + MAP_CONFIG.radius;
        
        // Clamp camera position
        this.targetX = Math.max(mapLeft, Math.min(this.targetX, mapRight - this.canvasWidth));
        this.targetY = Math.max(mapTop, Math.min(this.targetY, mapBottom - this.canvasHeight));
    }

    // Get camera bounds for rendering
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.canvasWidth,
            height: this.canvasHeight
        };
    }

    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.x,
            y: screenY + this.y
        };
    }

    // Check if a world position is visible on screen
    isVisible(worldX, worldY, margin = 0) {
        return worldX >= this.x - margin &&
               worldX <= this.x + this.canvasWidth + margin &&
               worldY >= this.y - margin &&
               worldY <= this.y + this.canvasHeight + margin;
    }
}