// Map renderer for Battle-2D-eath Phase 5

import { getCurrentMapConfig } from '../config/map.js';
import { resolveMapBackgroundUrl, warnMissingAsset } from '../utils/assetUrl.js';

export class MapRenderer {
    constructor(ctx, assetLoader = null) {
        this.ctx = ctx;
        this.assetLoader = assetLoader;
        this.backgroundImage = null;
        this.backgroundImageLoaded = false;
        this.lastBackgroundPath = null;
    }
    
    // Load background image if needed
    ensureBackgroundImage() {
        const mapConfig = getCurrentMapConfig();
        
        // Check if map has background image
        if (mapConfig.background && mapConfig.background.type === 'image') {
            const imagePath = resolveMapBackgroundUrl(mapConfig.background.value);
            
            // Only load if it's a different image
            if (this.lastBackgroundPath !== imagePath) {
                this.lastBackgroundPath = imagePath;
                this.backgroundImageLoaded = false;
                this.backgroundImage = new Image();
                this.backgroundImage.onload = () => {
                    this.backgroundImageLoaded = true;
                    console.log('Background image loaded:', imagePath);
                };
                this.backgroundImage.onerror = () => {
                    console.error('Failed to load background image:', imagePath);
                    warnMissingAsset('map background image', imagePath, 'MapRenderer');
                    this.backgroundImageLoaded = false;
                    this.backgroundImage = null;
                };
                this.backgroundImage.src = imagePath;
            }
        } else {
            // Reset if not using image background
            if (this.lastBackgroundPath !== null) {
                this.lastBackgroundPath = null;
                this.backgroundImage = null;
                this.backgroundImageLoaded = false;
            }
        }
    }

    render(camera, gameState, consumables) {
        // Ensure background image is loaded if needed
        this.ensureBackgroundImage();
        
        // Draw map background
        this.drawBackground(camera);
        
        // Draw safe zone boundary (for Phase 6, but set up now)
        this.drawSafeZone(camera, gameState);
        
        // Set terrain opacity to 20% so background shows through
        this.ctx.globalAlpha = 0.2;
        
        // Draw water areas
        this.drawWaterAreas(camera);
        
        // Draw obstacles (rocks)
        this.drawObstacles(camera);
        
        // Draw bushes
        this.drawBushes(camera);
        
        // Reset opacity to full for other elements
        this.ctx.globalAlpha = 1.0;
        
        // Draw consumables (Phase 7)
        if (consumables) {
            this.drawConsumables(consumables, camera);
        }
        
        // Draw map boundary
        this.drawMapBoundary(camera);
    }

    drawBackground(camera) {
        const mapConfig = getCurrentMapConfig();
        
        // Check if we have a background configuration
        if (mapConfig.background) {
            if (mapConfig.background.type === 'image' && this.backgroundImageLoaded && this.backgroundImage) {
                // Draw background image scaled to map size
                const mapRadius = mapConfig.radius;
                const mapCenterX = mapConfig.centerX;
                const mapCenterY = mapConfig.centerY;
                
                // Draw image to cover the entire map circle
                this.ctx.save();
                
                // Create circular clipping path for the map
                this.ctx.beginPath();
                this.ctx.arc(mapCenterX, mapCenterY, mapRadius, 0, Math.PI * 2);
                this.ctx.clip();
                
                // Draw the background image scaled to fit the map
                const size = mapRadius * 2;
                this.ctx.drawImage(
                    this.backgroundImage,
                    mapCenterX - mapRadius,
                    mapCenterY - mapRadius,
                    size,
                    size
                );
                
                this.ctx.restore();
                
                // Fill outside the map circle with a darker version of the background color
                this.ctx.fillStyle = mapConfig.background.value || '#1a1a2e';
                this.ctx.fillRect(camera.x, camera.y, camera.width, camera.height);
                
                // Redraw the map circle on top to cover the outside
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(mapCenterX, mapCenterY, mapRadius, 0, Math.PI * 2);
                this.ctx.clip();
                this.ctx.drawImage(
                    this.backgroundImage,
                    mapCenterX - mapRadius,
                    mapCenterY - mapRadius,
                    size,
                    size
                );
                this.ctx.restore();
            } else if (mapConfig.background.type === 'color') {
                // Draw solid color background
                this.ctx.fillStyle = mapConfig.background.value;
                this.ctx.fillRect(camera.x, camera.y, camera.width, camera.height);
            } else {
                // Fallback to default green
                this.ctx.fillStyle = '#2d5016';
                this.ctx.fillRect(camera.x, camera.y, camera.width, camera.height);
            }
        } else {
            // Default background (dark green grass)
            this.ctx.fillStyle = '#2d5016';
            this.ctx.fillRect(camera.x, camera.y, camera.width, camera.height);
        }
    }

    drawSafeZone(camera, gameState) {
        const mapConfig = getCurrentMapConfig();
        
        // Get current safe zone info from SafeZoneSystem (Phase 6)
        let currentRadius = mapConfig.safeZone.initialRadius;
        let isShrinking = false;
        
        if (gameState.safeZoneSystem) {
            const safeZoneInfo = gameState.safeZoneSystem.getSafeZoneInfo();
            currentRadius = safeZoneInfo.currentRadius;
            isShrinking = safeZoneInfo.isShrinking;
        }
        
        // Use world coordinates directly (canvas is already in world space)
        const worldX = mapConfig.safeZone.centerX;
        const worldY = mapConfig.safeZone.centerY;
        
        // Draw safe zone circle (green outline, pulsing when shrinking)
        let alpha = 0.3;
        if (isShrinking) {
            alpha = 0.2 + Math.sin(Date.now() / 200) * 0.1;
        }
        this.ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(worldX, worldY, currentRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw inner glow
        this.ctx.strokeStyle = `rgba(0, 255, 0, ${alpha * 0.5})`;
        this.ctx.lineWidth = 8;
        this.ctx.stroke();
    }

    drawWaterAreas(camera) {
        const mapConfig = getCurrentMapConfig();
        
        this.ctx.fillStyle = '#1e3a8a'; // Dark blue water
        
        mapConfig.waterAreas.forEach((water, idx) => {
            // Use world coordinates directly (canvas is already in world space)
            const worldX = water.position.x;
            const worldY = water.position.y;
            
            // Check if water has radius (circle) or width/height (rectangle)
            if (water.radius !== undefined) {
                // Circle-based water area
                const size = water.radius * 2;
                if (this.isVisible(worldX, worldY, size, size, camera)) {
                    this.ctx.beginPath();
                    this.ctx.arc(worldX, worldY, water.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            } else {
                // Rectangle-based water area
                if (this.isVisible(worldX, worldY, water.width, water.height, camera)) {
                    this.ctx.fillRect(
                        worldX - water.width / 2,
                        worldY - water.height / 2,
                        water.width,
                        water.height
                    );
                }
            }
        });
    }

    drawObstacles(camera) {
        const mapConfig = getCurrentMapConfig();
        
        this.ctx.fillStyle = '#6b7280'; // Gray rocks
        this.ctx.strokeStyle = '#4b5563'; // Darker gray outline
        this.ctx.lineWidth = 2;
        
        mapConfig.obstacles.forEach((obstacle, idx) => {
            // Use world coordinates directly (canvas is already in world space)
            const worldX = obstacle.position.x;
            const worldY = obstacle.position.y;
            
            // Only draw if visible (with larger margin)
            if (this.isVisible(worldX, worldY, obstacle.width, obstacle.height, camera)) {
                this.ctx.fillRect(
                    worldX - obstacle.width / 2,
                    worldY - obstacle.height / 2,
                    obstacle.width,
                    obstacle.height
                );
                this.ctx.strokeRect(
                    worldX - obstacle.width / 2,
                    worldY - obstacle.height / 2,
                    obstacle.width,
                    obstacle.height
                );
            }
        });
    }

    drawBushes(camera) {
        const mapConfig = getCurrentMapConfig();
        
        mapConfig.bushes.forEach((bush, idx) => {
            // Use world coordinates directly (canvas is already in world space)
            const worldX = bush.position.x;
            const worldY = bush.position.y;
            
            // Only draw if visible (with larger margin)
            if (this.isVisible(worldX, worldY, bush.radius * 2, bush.radius * 2, camera)) {
                // Draw bush as organic shape (slightly irregular circles)
                this.ctx.fillStyle = '#16a34a'; // Bright green
                this.ctx.beginPath();
                
                // Create more organic bush shape with multiple overlapping circles
                const numCircles = 5;
                for (let i = 0; i < numCircles; i++) {
                    const angle = (i / numCircles) * Math.PI * 2;
                    const offset = bush.radius * 0.3;
                    const cx = worldX + Math.cos(angle) * offset;
                    const cy = worldY + Math.sin(angle) * offset;
                    const r = bush.radius * 0.7;
                    
                    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
                }
                
                this.ctx.fill();
                
                // Add darker outline
                this.ctx.strokeStyle = '#15803d'; // Darker green
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });
    }
    
    // Draw consumables (Phase 7)
    drawConsumables(consumables, camera) {
        consumables.forEach(consumable => {
            if (!consumable.active) return;
            
            const worldX = consumable.position.x;
            const worldY = consumable.position.y;
            
            // Only draw if visible
            if (this.isVisible(worldX, worldY, consumable.radius * 3, consumable.radius * 3, camera)) {
                this.ctx.save();
                
                // Draw glow effect (always visible)
                const glowSize = consumable.radius * 1.5;
                const gradient = this.ctx.createRadialGradient(
                    worldX, worldY, 0,
                    worldX, worldY, glowSize
                );
                gradient.addColorStop(0, consumable.color);
                gradient.addColorStop(0.5, consumable.color + '88');
                gradient.addColorStop(1, consumable.color + '00');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(worldX, worldY, glowSize, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Try to render as PNG, otherwise use circle
                const rendered = this.drawConsumableImage(consumable, worldX, worldY);
                
                if (!rendered) {
                    // Fallback to circle rendering
                    this.drawConsumableCircle(consumable, worldX, worldY);
                }
                
                // Draw pickup progress if being picked up
                if (consumable.isBeingPickedUp) {
                    const progress = consumable.getPickupProgress();
                    this.ctx.strokeStyle = '#00ff00';
                    this.ctx.lineWidth = 4;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        worldX,
                        worldY,
                        consumable.radius + 5,
                        -Math.PI / 2,
                        -Math.PI / 2 + (Math.PI * 2 * progress)
                    );
                    this.ctx.stroke();
                }
                
                this.ctx.restore();
            }
        });
    }

    // Draw consumable as PNG image
    drawConsumableImage(consumable, worldX, worldY) {
        if (!this.assetLoader) {
            return false;
        }

        const img = this.assetLoader.getConsumableImage(consumable.consumableType);
        if (!img) {
            return false;
        }

        const size = consumable.radius * 2;
        
        // Draw consumable image
        this.ctx.drawImage(img, worldX - size / 2, worldY - size / 2, size, size);
        
        return true;
    }

    // Draw consumable as circle (fallback)
    drawConsumableCircle(consumable, worldX, worldY) {
        // Draw consumable body
        this.ctx.fillStyle = consumable.color;
        this.ctx.beginPath();
        this.ctx.arc(worldX, worldY, consumable.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw outline
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawMapBoundary(camera) {
        const mapConfig = getCurrentMapConfig();
        
        // Use world coordinates directly (canvas is already in world space)
        const worldX = mapConfig.centerX;
        const worldY = mapConfig.centerY;
        
        // Check if boundary is visible (distance from camera center to map center)
        const cameraCenterX = camera.x + camera.width / 2;
        const cameraCenterY = camera.y + camera.height / 2;
        const distFromCenter = Math.sqrt(
            Math.pow(worldX - cameraCenterX, 2) +
            Math.pow(worldY - cameraCenterY, 2)
        );
        
        if (distFromCenter < mapConfig.radius + 500) {
            // Draw boundary circle (solid line for performance)
            this.ctx.strokeStyle = 'rgba(220, 38, 38, 0.6)'; // Semi-transparent red
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.arc(worldX, worldY, mapConfig.radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    // Helper to check if an object is visible on screen
    // Now takes world coordinates and checks against camera bounds
    isVisible(worldX, worldY, width, height, camera) {
        const margin = 200; // Larger margin to prevent pop-in/pop-out
        return worldX + width / 2 > camera.x - margin &&
               worldX - width / 2 < camera.x + camera.width + margin &&
               worldY + height / 2 > camera.y - margin &&
               worldY - height / 2 < camera.y + camera.height + margin;
    }
}