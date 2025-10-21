// UI renderer for HUD elements and virtual controls

import { DEBUG_MODE } from '../config/constants.js';

export class UIRenderer {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
    }

    // Render all UI elements
    render(gameState, joystick, weaponButtons, abilityButton, healthKitButtons, gameLoop) {
        // Show game over or victory screen if match ended
        if (gameState.phase === 'gameOver' || gameState.phase === 'victory') {
            this.renderMatchEndScreen(gameState);
            return;
        }
        
        // Render red screen pulse if player is outside safe zone (Phase 6)
        this.renderSafeZoneWarning(gameState);
        
        // Render virtual joystick
        joystick.render(this.ctx);
        
        // Render weapon buttons with player position for aim preview
        if (weaponButtons && gameState.player) {
            const weapons = gameState.player.getAllWeapons();
            const playerPosition = gameState.player.position;
            const activeIndex = gameState.player.activeWeaponIndex;
            const camera = gameState.camera;
            
            weaponButtons.forEach((button, index) => {
                const weapon = index < weapons.length ? weapons[index] : null;
                button.render(this.ctx, weapon, playerPosition, camera);
                
                // Draw active indicator
                if (index === activeIndex && weapon) {
                    this.renderActiveWeaponIndicator(button);
                }
            });
        }
        
        // Render ability button (Phase 7)
        if (abilityButton && gameState.player && gameState.player.specialAbility) {
            abilityButton.render(this.ctx, gameState.player.specialAbility.type);
        }
        
        // Render health kit buttons (Phase 7)
        if (healthKitButtons && gameState.player) {
            healthKitButtons.forEach((button, index) => {
                const hasHealthKit = index < gameState.player.healthKits;
                button.render(this.ctx, hasHealthKit);
            });
        }
        
        // Render HUD
        this.renderHUD(gameState);
        
        // Render safe zone timer (Phase 6)
        this.renderSafeZoneTimer(gameState);
        
        // Render debug info if enabled
        if (DEBUG_MODE) {
            this.renderDebugInfo(gameState, gameLoop);
        }
    }

    // Render active weapon indicator
    renderActiveWeaponIndicator(button) {
        const ctx = this.ctx;
        ctx.save();
        
        // Draw glowing ring around active weapon
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(button.x, button.y, button.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    // Render HUD (health, etc.)
    renderHUD(gameState) {
        if (!gameState.player) return;
        
        const ctx = this.ctx;
        const player = gameState.player;
        
        ctx.save();
        
        // Draw player health in top-left corner
        const hudX = 20;
        const hudY = 30;
        
        // Health label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('HP:', hudX, hudY);
        
        // Health bar
        const barWidth = 150;
        const barHeight = 20;
        const barX = hudX + 40;
        const barY = hudY - 15;
        
        // Background (red)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health (green)
        const healthWidth = barWidth * player.getHealthPercentage();
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(barX, barY, healthWidth, barHeight);
        
        // Shield (blue overlay) - if player has shield
        if (player.shield > 0) {
            const shieldPercentage = player.shield / 100; // Max shield is 100
            const shieldWidth = barWidth * shieldPercentage;
            ctx.fillStyle = 'rgba(0, 150, 255, 0.7)';
            ctx.fillRect(barX, barY, shieldWidth, barHeight);
        }
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Health text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${Math.ceil(player.currentHP)} / ${player.maxHP}`,
            barX + barWidth / 2,
            barY + 14
        );
        
        // Shield text (if has shield)
        if (player.shield > 0) {
            ctx.fillStyle = '#00aaff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`+${Math.ceil(player.shield)}`, barX + barWidth + 5, barY + 14);
        }
        
        ctx.restore();
    }

    // Render red screen pulse when outside safe zone
    renderSafeZoneWarning(gameState) {
        if (!gameState.player || !gameState.safeZoneSystem) return;
        
        // Check if player is outside safe zone
        const isOutside = gameState.safeZoneSystem.isCharacterOutsideZone(gameState.player);
        
        if (isOutside) {
            const ctx = this.ctx;
            ctx.save();
            
            // Create pulsing red overlay at screen edges
            const pulseIntensity = 0.15 + Math.sin(Date.now() / 300) * 0.1;
            
            // Create radial gradient from center to edges
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const maxRadius = Math.max(this.canvas.width, this.canvas.height);
            
            const gradient = ctx.createRadialGradient(
                centerX, centerY, maxRadius * 0.3,
                centerX, centerY, maxRadius * 0.8
            );
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(255, 0, 0, ${pulseIntensity})`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Add warning text
            ctx.fillStyle = `rgba(255, 0, 0, ${pulseIntensity * 3})`;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('OUTSIDE SAFE ZONE', centerX, 60);
            
            ctx.restore();
        }
    }

    // Render safe zone phase timer
    renderSafeZoneTimer(gameState) {
        if (!gameState.safeZoneSystem) return;
        
        const phaseInfo = gameState.safeZoneSystem.getCurrentPhaseInfo();
        const timeUntilNext = phaseInfo.timeUntilNext;
        
        // Only show timer if there's a next phase
        if (timeUntilNext <= 0) return;
        
        const ctx = this.ctx;
        ctx.save();
        
        // Position below minimap (centered at top)
        const timerX = this.canvas.width / 2;
        const timerY = 190; // Below minimap
        
        // Format time as MM:SS
        const minutes = Math.floor(timeUntilNext / 60000);
        const seconds = Math.floor((timeUntilNext % 60000) / 1000);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(timerX - 80, timerY - 25, 160, 35);
        
        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(timerX - 80, timerY - 25, 160, 35);
        
        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Next Zone:', timerX, timerY - 8);
        
        ctx.font = 'bold 16px monospace';
        ctx.fillText(timeString, timerX, timerY + 10);
        
        ctx.restore();
    }

    // Render match end screen (game over or victory)
    renderMatchEndScreen(gameState) {
        const ctx = this.ctx;
        ctx.save();
        
        // Calculate scale based on canvas size
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        
        // Semi-transparent overlay with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        gradient.addColorStop(1, 'rgba(10, 10, 30, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Calculate responsive sizes
        const titleSize = Math.max(40, 64 * scale);
        const titleOffsetY = 120 * scale;
        const statsBoxWidth = Math.min(400, this.canvas.width * 0.8) * scale;
        const statsBoxHeight = 220 * scale;
        const statsTitleSize = Math.max(22, 28 * scale);
        const statsTextSize = Math.max(18, 22 * scale);
        const lineHeight = 35 * scale;
        const instructionSize = Math.max(16, 20 * scale);
        
        // Title with glow effect
        const isVictory = gameState.phase === 'victory';
        ctx.font = `bold ${titleSize}px Arial`;
        ctx.textAlign = 'center';
        
        // Glow effect
        ctx.shadowColor = isVictory ? '#4ade80' : '#ef4444';
        ctx.shadowBlur = 20;
        ctx.fillStyle = isVictory ? '#4ade80' : '#ef4444';
        ctx.fillText(isVictory ? '🏆 VICTORY! 🏆' : '💀 GAME OVER 💀', centerX, centerY - titleOffsetY);
        
        ctx.shadowBlur = 0;
        
        // Stats container background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        const statsBoxX = centerX - statsBoxWidth / 2;
        const statsBoxY = centerY - 40 * scale;
        
        // Rounded rectangle for stats
        this.roundRect(ctx, statsBoxX, statsBoxY, statsBoxWidth, statsBoxHeight, 15);
        ctx.fill();
        ctx.stroke();
        
        // Match stats title
        ctx.font = `bold ${statsTitleSize}px Arial`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Match Statistics', centerX, centerY - 10 * scale);
        
        // Stats
        const stats = gameState.matchStats;
        ctx.font = `${statsTextSize}px Arial`;
        const statsY = centerY + 30 * scale;
        
        // Placement with color coding
        ctx.fillStyle = stats.finalPlacement === 1 ? '#fbbf24' : '#ffffff';
        ctx.fillText(`🏅 Placement: #${stats.finalPlacement}`, centerX, statsY);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`⚔️ Kills: ${stats.kills}`, centerX, statsY + lineHeight);
        ctx.fillText(`💥 Damage: ${Math.round(stats.damageDealt)}`, centerX, statsY + lineHeight * 2);
        ctx.fillText(`⏱️ Survival: ${Math.floor(stats.survivalTime)}s`, centerX, statsY + lineHeight * 3);
        
        // Instruction to reload with animation
        ctx.font = `bold ${instructionSize}px Arial`;
        const alpha = 0.5 + Math.sin(Date.now() / 500) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillText('↻ Refresh page to play again', centerX, centerY + 210 * scale);
        
        ctx.restore();
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

    // Render debug information
    renderDebugInfo(gameState, gameLoop) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.fillStyle = '#ffff00';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        
        let y = this.canvas.height - 80;
        
        // FPS
        ctx.fillText(`FPS: ${gameLoop.getFPS()}`, 10, y);
        y += 20;
        
        // Player position
        if (gameState.player) {
            const pos = gameState.player.position;
            ctx.fillText(
                `Pos: (${Math.round(pos.x)}, ${Math.round(pos.y)})`,
                10,
                y
            );
            y += 20;
            
            // Player velocity
            const vel = gameState.player.velocity;
            ctx.fillText(
                `Vel: (${vel.x.toFixed(1)}, ${vel.y.toFixed(1)})`,
                10,
                y
            );
        }
        
        ctx.restore();
    }
}