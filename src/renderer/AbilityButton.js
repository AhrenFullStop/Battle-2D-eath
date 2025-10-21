// Special ability button for character abilities

export class AbilityButton {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        
        // Button state
        this.active = false;
        this.touchId = null;
        this.pressed = false;
        
        // Cooldown display
        this.cooldownProgress = 0; // 0 = ready, 1 = on cooldown
    }
    
    // Check if touch is inside button
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
            return true;
        }
        return false;
    }
    
    // Handle touch end - returns true if should activate
    onTouchEnd(touchId) {
        if (this.active && this.touchId === touchId) {
            const shouldActivate = this.pressed && this.cooldownProgress === 0;
            this.reset();
            return shouldActivate;
        }
        return false;
    }
    
    // Reset button state
    reset() {
        this.active = false;
        this.touchId = null;
        this.pressed = false;
    }
    
    // Update cooldown progress (0 = ready, 1 = on cooldown)
    setCooldownProgress(progress) {
        this.cooldownProgress = Math.max(0, Math.min(1, progress));
    }
    
    // Check if ability is ready
    isReady() {
        return this.cooldownProgress === 0;
    }
    
    // Render the button
    render(ctx, abilityType) {
        ctx.save();
        
        // Draw cooldown overlay
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
        ctx.globalAlpha = this.pressed ? 0.9 : 0.6;
        
        // Color based on ability type
        if (abilityType === 'dash') {
            ctx.fillStyle = '#4CAF50'; // Green for Bolt
        } else if (abilityType === 'groundSlam') {
            ctx.fillStyle = '#795548'; // Brown for Boulder
        } else {
            ctx.fillStyle = '#888888';
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw button outline with glow effect
        ctx.globalAlpha = 1;
        ctx.strokeStyle = this.isReady() ? '#ffff00' : '#666666';
        ctx.lineWidth = this.pressed ? 5 : 4;
        ctx.stroke();
        
        // Draw ability icon
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (abilityType === 'dash') {
            // Lightning bolt symbol for dash
            ctx.fillText('⚡', this.x, this.y);
        } else if (abilityType === 'groundSlam') {
            // Fist symbol for ground slam
            ctx.fillText('👊', this.x, this.y);
        }
        
        // Draw cooldown percentage if on cooldown
        if (this.cooldownProgress > 0) {
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#ffffff';
            const percent = Math.ceil((1 - this.cooldownProgress) * 100);
            ctx.fillText(`${percent}%`, this.x, this.y + this.radius + 20);
        }
        
        ctx.restore();
    }
}