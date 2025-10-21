// Minimap renderer for Battle-2D-eath Phase 5

import { MAP_CONFIG } from '../config/map.js';

export class MinimapRenderer {
    constructor(ctx) {
        this.ctx = ctx;
        
        // Minimap configuration
        this.minimapSize = 150; // Size of minimap
        this.minimapX = 0; // Will be set to top-right
        this.minimapY = 20; // Top of screen with padding
        this.minimapPadding = 10;
        this.cornerRadius = 15; // Rounded corners for minimap
    }

    render(gameState, canvasWidth) {
        // Position minimap at top-right corner
        this.minimapX = canvasWidth - this.minimapSize - 20;
        
        // Draw minimap background
        this.drawMinimapBackground();
        
        // Draw map boundary
        this.drawMinimapBoundary();
        
        // Draw terrain features (Phase 6)
        this.drawMinimapTerrain();
        
        // Draw safe zone (for Phase 6)
        this.drawMinimapSafeZone(gameState);
        
        // Draw characters (player and AI)
        this.drawMinimapCharacters(gameState);
        
        // Draw minimap border
        this.drawMinimapBorder();
    }

    drawMinimapBackground() {
        // Semi-transparent dark background with rounded corners
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.roundRect(
            this.ctx,
            this.minimapX,
            this.minimapY,
            this.minimapSize,
            this.minimapSize,
            this.cornerRadius
        );
        this.ctx.fill();
        this.ctx.restore();
    }

    drawMinimapBoundary() {
        // Draw the circular map boundary on minimap
        const centerX = this.minimapX + this.minimapSize / 2;
        const centerY = this.minimapY + this.minimapSize / 2;
        const radius = (this.minimapSize / 2) - this.minimapPadding;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawMinimapSafeZone(gameState) {
        // Get current safe zone info from SafeZoneSystem (Phase 6)
        const centerX = this.minimapX + this.minimapSize / 2;
        const centerY = this.minimapY + this.minimapSize / 2;
        
        // Calculate scale: minimap represents the full map radius
        const minimapRadius = (this.minimapSize / 2) - this.minimapPadding;
        const mapScale = minimapRadius / MAP_CONFIG.radius;
        
        // Use dynamic safe zone radius if available, otherwise use initial
        let safeZoneRadius = MAP_CONFIG.safeZone.initialRadius * mapScale;
        if (gameState.safeZoneSystem) {
            const safeZoneInfo = gameState.safeZoneSystem.getSafeZoneInfo();
            safeZoneRadius = safeZoneInfo.currentRadius * mapScale;
        }
        
        // Draw safe zone with fill for better visibility
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, safeZoneRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw safe zone outline (pulsing if shrinking)
        let alpha = 0.6;
        if (gameState.safeZoneSystem) {
            const safeZoneInfo = gameState.safeZoneSystem.getSafeZoneInfo();
            if (safeZoneInfo.isShrinking) {
                // Pulse during shrink
                alpha = 0.4 + Math.sin(Date.now() / 200) * 0.2;
            }
        }
        this.ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawMinimapCharacters(gameState) {
        const centerX = this.minimapX + this.minimapSize / 2;
        const centerY = this.minimapY + this.minimapSize / 2;
        const mapScale = (this.minimapSize - this.minimapPadding * 2) / (MAP_CONFIG.radius * 2);
        
        gameState.characters.forEach(character => {
            if (character.isDead) return;
            
            // Check if character is in a bush (for stealth)
            const isInBush = this.isCharacterInBush(character);
            
            // Don't show AI characters on minimap if they're in bushes (stealth)
            if (!character.isPlayer && isInBush) {
                return;
            }
            
            // Convert world position to minimap position
            const dx = character.position.x - MAP_CONFIG.centerX;
            const dy = character.position.y - MAP_CONFIG.centerY;
            const minimapX = centerX + dx * mapScale;
            const minimapY = centerY + dy * mapScale;
            
            // Draw character dot
            if (character.isPlayer) {
                // Player is bright blue
                this.ctx.fillStyle = '#3b82f6';
                this.ctx.beginPath();
                this.ctx.arc(minimapX, minimapY, 4, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add white outline for player
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            } else {
                // AI characters are red
                this.ctx.fillStyle = '#ef4444';
                this.ctx.beginPath();
                this.ctx.arc(minimapX, minimapY, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    drawMinimapTerrain() {
        const centerX = this.minimapX + this.minimapSize / 2;
        const centerY = this.minimapY + this.minimapSize / 2;
        const mapScale = (this.minimapSize - this.minimapPadding * 2) / (MAP_CONFIG.radius * 2);
        
        // Draw water areas
        this.ctx.fillStyle = 'rgba(30, 58, 138, 0.6)'; // Blue water
        MAP_CONFIG.waterAreas.forEach(water => {
            const dx = water.position.x - MAP_CONFIG.centerX;
            const dy = water.position.y - MAP_CONFIG.centerY;
            const minimapX = centerX + dx * mapScale;
            const minimapY = centerY + dy * mapScale;
            const width = water.width * mapScale;
            const height = water.height * mapScale;
            
            this.ctx.fillRect(
                minimapX - width / 2,
                minimapY - height / 2,
                width,
                height
            );
        });
        
        // Draw obstacles
        this.ctx.fillStyle = 'rgba(107, 114, 128, 0.7)'; // Gray rocks
        MAP_CONFIG.obstacles.forEach(obstacle => {
            const dx = obstacle.position.x - MAP_CONFIG.centerX;
            const dy = obstacle.position.y - MAP_CONFIG.centerY;
            const minimapX = centerX + dx * mapScale;
            const minimapY = centerY + dy * mapScale;
            const width = obstacle.width * mapScale;
            const height = obstacle.height * mapScale;
            
            this.ctx.fillRect(
                minimapX - width / 2,
                minimapY - height / 2,
                width,
                height
            );
        });
        
        // Draw bushes
        this.ctx.fillStyle = 'rgba(22, 163, 74, 0.5)'; // Green bushes
        MAP_CONFIG.bushes.forEach(bush => {
            const dx = bush.position.x - MAP_CONFIG.centerX;
            const dy = bush.position.y - MAP_CONFIG.centerY;
            const minimapX = centerX + dx * mapScale;
            const minimapY = centerY + dy * mapScale;
            const radius = bush.radius * mapScale;
            
            this.ctx.beginPath();
            this.ctx.arc(minimapX, minimapY, radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawMinimapBorder() {
        // Draw border around minimap with rounded corners
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.roundRect(
            this.ctx,
            this.minimapX,
            this.minimapY,
            this.minimapSize,
            this.minimapSize,
            this.cornerRadius
        );
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    // Helper to draw rounded rectangle
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // Helper to check if character is in a bush
    isCharacterInBush(character) {
        for (const bush of MAP_CONFIG.bushes) {
            const dx = character.position.x - bush.position.x;
            const dy = character.position.y - bush.position.y;
            const distanceSquared = dx * dx + dy * dy;
            
            if (distanceSquared <= bush.radius * bush.radius) {
                return true;
            }
        }
        return false;
    }
}