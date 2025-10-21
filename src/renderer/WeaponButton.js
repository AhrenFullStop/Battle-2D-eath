// Weapon button for firing weapons with tap or hold+drag aiming

import { Vector2D } from '../utils/Vector2D.js';

export class WeaponButton {
    constructor(x, y, radius, weaponIndex) {
        // Button position (fixed in bottom-right area)
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.weaponIndex = weaponIndex;
        
        // Button state
        this.active = false;
        this.touchId = null;
        this.pressed = false;
        
        // Aiming state
        this.isAiming = false;
        this.aimStartX = 0;
        this.aimStartY = 0;
        this.aimCurrentX = 0;
        this.aimCurrentY = 0;
        this.aimVector = new Vector2D(0, 0);
        this.aimAngle = 0;
        
        // Cooldown display
        this.cooldownProgress = 0; // 0 to 1
        
        // Visual properties
        this.color = '#ffffff';
        this.glowColor = '#ffaa00';
        this.weaponIcon = null; // Will be set when weapon is equipped
    }
    
    // Check if a touch point is within the button
    isTouchInside(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        const distSquared = dx * dx + dy * dy;
        return distSquared <= this.radius * this.radius;
    }
    
    // Handle touch start
    onTouchStart(touchId, x, y) {
        if (this.isTouchInside(x, y)) {
            this.active = true;
            this.touchId = touchId;
            this.pressed = true;
            this.isAiming = true;
            this.aimStartX = x;
            this.aimStartY = y;
            this.aimCurrentX = x;
            this.aimCurrentY = y;
            this.updateAimVector();
            return true;
        }
        return false;
    }
    
    // Handle touch move
    onTouchMove(touchId, x, y) {
        if (this.active && this.touchId === touchId) {
            this.aimCurrentX = x;
            this.aimCurrentY = y;
            this.updateAimVector();
            return true;
        }
        return false;
    }
    
    // Handle touch end - returns true if should fire
    onTouchEnd(touchId) {
        if (this.active && this.touchId === touchId) {
            const shouldFire = this.pressed;
            this.reset();
            return shouldFire;
        }
        return false;
    }
    
    // Update aim vector based on drag
    updateAimVector() {
        const dx = this.aimCurrentX - this.aimStartX;
        const dy = this.aimCurrentY - this.aimStartY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If dragged more than 20 pixels, use drag direction
        // Otherwise, use character's facing direction (will be set externally)
        if (distance > 20) {
            this.aimVector.x = dx;
            this.aimVector.y = dy;
            this.aimVector.normalize();
            this.aimAngle = Math.atan2(dy, dx);
        }
    }
    
    // Set aim direction (from character facing)
    setAimDirection(angle) {
        this.aimAngle = angle;
        this.aimVector.x = Math.cos(angle);
        this.aimVector.y = Math.sin(angle);
    }
    
    // Get aim vector
    getAimVector() {
        return this.aimVector.clone();
    }
    
    // Get aim angle
    getAimAngle() {
        return this.aimAngle;
    }
    
    // Reset button state
    reset() {
        this.active = false;
        this.touchId = null;
        this.pressed = false;
        this.isAiming = false;
    }
    
    // Set weapon for this button
    setWeapon(weapon) {
        if (weapon) {
            this.color = weapon.color || '#ffffff';
            this.glowColor = weapon.glowColor || '#ffaa00';
            this.weaponIcon = weapon.type;
        } else {
            this.color = '#666666';
            this.glowColor = '#888888';
            this.weaponIcon = null;
        }
    }
    
    // Update cooldown progress (0 = ready, 1 = on cooldown)
    setCooldownProgress(progress) {
        this.cooldownProgress = Math.max(0, Math.min(1, progress));
    }
    
    // Check if button is ready to fire
    isReady() {
        return this.cooldownProgress === 0;
    }
    
    // Render the button
    render(ctx, weapon, playerPosition, camera) {
        ctx.save();
        
        // Draw cooldown overlay (arc showing remaining cooldown)
        if (this.cooldownProgress > 0) {
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.arc(
                this.x,
                this.y,
                this.radius,
                -Math.PI / 2,
                -Math.PI / 2 + (Math.PI * 2 * this.cooldownProgress)
            );
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw button base
        ctx.globalAlpha = this.pressed ? 0.8 : 0.5;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw button outline
        ctx.globalAlpha = 1;
        ctx.strokeStyle = this.isReady() ? this.glowColor : '#666666';
        ctx.lineWidth = this.pressed ? 4 : 3;
        ctx.stroke();
        
        // Draw weapon icon (simple text for now)
        if (weapon) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(weapon.name.charAt(0), this.x, this.y);
        }
        
        // Draw aim preview line when aiming
        if (this.isAiming && this.isReady() && playerPosition && camera) {
            this.renderAimPreview(ctx, weapon, playerPosition, camera);
        }
        
        ctx.restore();
    }
    
    // Render aim preview from player position
    renderAimPreview(ctx, weapon, playerPosition, camera) {
        if (!weapon || !playerPosition || !camera) return;
        
        ctx.save();
        ctx.globalAlpha = 0.4;
        
        // Convert world coordinates to screen coordinates
        // Manual conversion: screen = world - camera
        const playerX = playerPosition.x - camera.x;
        const playerY = playerPosition.y - camera.y;
        
        // Get aim direction
        const angle = this.aimAngle;
        const range = weapon.range || 150;
        
        if (weapon.attackType === 'cone') {
            // Draw cone preview for blaster from player position
            const coneAngle = (weapon.coneAngle || 45) * Math.PI / 180;
            const startAngle = angle - coneAngle / 2;
            const endAngle = angle + coneAngle / 2;
            
            ctx.fillStyle = weapon.color || '#ff6600';
            ctx.beginPath();
            ctx.moveTo(playerX, playerY);
            ctx.arc(playerX, playerY, range, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
            
            // Draw outline
            ctx.strokeStyle = weapon.glowColor || '#ff9944';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Draw line preview for other weapons from player position
            const endX = playerX + Math.cos(angle) * range;
            const endY = playerY + Math.sin(angle) * range;
            
            ctx.strokeStyle = weapon.color || '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(playerX, playerY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Draw arrowhead
            const arrowSize = 10;
            ctx.fillStyle = weapon.color || '#ffffff';
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX - arrowSize * Math.cos(angle - Math.PI / 6),
                endY - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                endX - arrowSize * Math.cos(angle + Math.PI / 6),
                endY - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
}