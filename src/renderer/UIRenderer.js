// UI renderer for HUD elements and virtual controls

import { DEBUG_MODE } from '../config/constants.js';

export class UIRenderer {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;

        // Cached UI bounds for match-end interactions
        this.matchEndUI = {
            returnToMenuButton: null
        };
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
        
        // Render health kit button (single consolidated button)
        if (healthKitButtons && healthKitButtons.length > 0 && gameState.player) {
            const healthKitCount = gameState.player.healthKits;
            const maxHealthKits = 2;
            const hasHealthKit = healthKitCount > 0;
            
            // Render only the first (and only) health kit button
            healthKitButtons[0].render(this.ctx, hasHealthKit, healthKitCount, maxHealthKits);
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

    // Render HUD (health, game info, special pickups)
    renderHUD(gameState) {
        if (!gameState.player) return;
        
        // Render game info panel (top-left)
        this.renderGameInfoPanel(gameState);
        
        // Render vertical health bar (top-right, below minimap)
        this.renderVerticalHealthBar(gameState);
        
        // Render special pickups slots (right side, below health bar)
        this.renderSpecialPickups(gameState);
    }
    
    // Render game info panel at top-left
    renderGameInfoPanel(gameState) {
        const ctx = this.ctx;
        ctx.save();
        
        const panelX = 20;
        const panelY = 30;
        const lineHeight = 28;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        
        // Safe zone timer
        if (gameState.safeZoneSystem) {
            const phaseInfo = gameState.safeZoneSystem.getCurrentPhaseInfo();
            const timeUntilNext = phaseInfo.timeUntilNext;
            
            if (timeUntilNext > 0) {
                const minutes = Math.floor(timeUntilNext / 60000);
                const seconds = Math.floor((timeUntilNext % 60000) / 1000);
                const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                ctx.fillText(`⏱️ Zone: ${timeString}`, panelX, panelY);
            } else {
                ctx.fillText(`⏱️ Zone: Final`, panelX, panelY);
            }
        }
        
        // Remaining players
        const aliveCount = gameState.characters.filter(c => !c.isDead).length;
        ctx.fillText(`👥 Alive: ${aliveCount}`, panelX, panelY + lineHeight);
        
        // Kill count
        const kills = gameState.matchStats.kills;
        ctx.fillText(`⚔️ Kills: ${kills}`, panelX, panelY + lineHeight * 2);
        
        ctx.restore();
    }
    
    // Render vertical health bar at top-right (below minimap)
    renderVerticalHealthBar(gameState) {
        const ctx = this.ctx;
        const player = gameState.player;
        
        ctx.save();
        
        // Position below minimap on right side
        const healthBarX = this.canvas.width - 50;
        const barY = 190; // Below minimap
        const healthBarWidth = 20;
        const shieldBarWidth = 15;
        const barHeight = 250;
        
        // Shield bar (left side, thinner)
        if (player.shield > 0) {
            const shieldX = healthBarX - shieldBarWidth - 5;
            
            // Background (dark)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(shieldX, barY, shieldBarWidth, barHeight);
            
            // Shield (blue, fills from bottom)
            const shieldPercentage = Math.min(player.shield / 100, 1); // Max shield is 100
            const shieldHeight = barHeight * shieldPercentage;
            ctx.fillStyle = '#0096ff';
            ctx.fillRect(shieldX, barY + barHeight - shieldHeight, shieldBarWidth, shieldHeight);
            
            // Border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(shieldX, barY, shieldBarWidth, barHeight);
        }
        
        // Health bar (main bar)
        // Background (dark)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(healthBarX, barY, healthBarWidth, barHeight);
        
        // Health (red, fills from bottom)
        const healthPercentage = player.getHealthPercentage();
        const healthHeight = barHeight * healthPercentage;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(healthBarX, barY + barHeight - healthHeight, healthBarWidth, healthHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(healthBarX, barY, healthBarWidth, barHeight);
        
        // Health text (underneath bar, no rotation)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${Math.ceil(player.currentHP)}/${player.maxHP}`, healthBarX + healthBarWidth / 2, barY + barHeight + 8);
        
        // Shield text (if has shield, underneath shield bar - 4 units lower to avoid collision)
        if (player.shield > 0) {
            const shieldX = healthBarX - shieldBarWidth - 5;
            ctx.fillStyle = '#00aaff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.ceil(player.shield)}`, shieldX + shieldBarWidth / 2, barY + barHeight + 12);
        }
        
        ctx.restore();
    }
    
    // Render special pickups slots (2 circular icons above weapon slots)
    renderSpecialPickups(gameState) {
        const ctx = this.ctx;
        
        ctx.save();
        
        // Position above weapon slots on right side (within thumb's reach)
        const iconRadius = 30;
        const iconX = this.canvas.width - 60; // Aligned with health bar
        const iconY1 = this.canvas.height - 480; // First slot (above weapons)
        const iconY2 = this.canvas.height - 400; // Second slot
        
        // Slot 1
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.arc(iconX, iconY1, iconRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Slot 2
        ctx.beginPath();
        ctx.arc(iconX, iconY2, iconRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Placeholder text
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', iconX, iconY1);
        ctx.fillText('?', iconX, iconY2);
        
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

    // Render safe zone phase timer (now integrated in game info panel)
    renderSafeZoneTimer(gameState) {
        // Timer is now part of the game info panel at top-left
        // This method is kept for compatibility but does nothing
    }

    // Render match end screen (game over or victory)
    renderMatchEndScreen(gameState) {
        const ctx = this.ctx;
        ctx.save();

        // Reset cached bounds each render
        this.matchEndUI.returnToMenuButton = null;
        
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
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Match Statistics', centerX, centerY - 10 * scale);

        // Stats (left-aligned inside the box)
        const stats = gameState.matchStats;
        ctx.font = `${statsTextSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        const statsX = statsBoxX + 28 * scale;
        const statsY = centerY + 30 * scale;

        // Placement with color coding
        ctx.fillStyle = stats.finalPlacement === 1 ? '#fbbf24' : '#ffffff';
        ctx.fillText(`🏅 Placement: #${stats.finalPlacement}`, statsX, statsY);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(`⚔️ Kills: ${stats.kills}`, statsX, statsY + lineHeight);
        ctx.fillText(`💥 Damage: ${Math.round(stats.damageDealt)}`, statsX, statsY + lineHeight * 2);
        ctx.fillText(`⏱️ Survival: ${Math.floor(stats.survivalTime)}s`, statsX, statsY + lineHeight * 3);

        // Rewards earned (meta progression)
        if (gameState.matchRewards) {
            const r = gameState.matchRewards;
            const rewardsText = `🎁 Rewards: +${r.xpEarned} XP  •  +${r.coinsEarned} Coins`;
            ctx.font = `${Math.max(14, 16 * scale)}px Arial`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillText(rewardsText, statsX, statsY + lineHeight * 4);
        }

        // Return to Menu button
        const buttonWidth = Math.min(340 * scale, this.canvas.width * 0.75);
        const buttonHeight = Math.max(56 * scale, 44);
        const buttonX = centerX - buttonWidth / 2;
        const buttonExtraOffset = gameState.matchRewards ? (18 * scale) : 0;
        const buttonY = statsBoxY + statsBoxHeight + 30 * scale + buttonExtraOffset;
        const buttonRadius = 14;

        this.matchEndUI.returnToMenuButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };

        // Button background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        this.roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, buttonRadius);
        ctx.fill();
        ctx.stroke();

        // Button label
        ctx.font = `bold ${instructionSize}px Arial`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Return to Menu', centerX, buttonY + buttonHeight / 2);
        
        ctx.restore();
    }

    isReturnToMenuHit(screenX, screenY) {
        const rect = this.matchEndUI.returnToMenuButton;
        if (!rect) return false;
        return (
            screenX >= rect.x &&
            screenX <= rect.x + rect.width &&
            screenY >= rect.y &&
            screenY <= rect.y + rect.height
        );
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