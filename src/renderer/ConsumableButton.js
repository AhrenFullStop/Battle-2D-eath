// Button for using health kits

export class ConsumableButton {
    constructor(x, y, radius, slotIndex, assetLoader = null) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.slotIndex = slotIndex;
        this.assetLoader = assetLoader;
        
        // Button state
        this.active = false;
        this.touchId = null;
        this.pressed = false;
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
    
    // Handle touch end - returns true if should use
    onTouchEnd(touchId) {
        if (this.active && this.touchId === touchId) {
            const shouldUse = this.pressed;
            this.reset();
            return shouldUse;
        }
        return false;
    }
    
    // Reset button state
    reset() {
        this.active = false;
        this.touchId = null;
        this.pressed = false;
    }
    
    // Render the button with health kit count
    render(ctx, hasHealthKit, healthKitCount = 0, maxHealthKits = 2) {
        ctx.save();
        
        // Draw button base
        ctx.globalAlpha = hasHealthKit ? 0.7 : 0.3;
        ctx.fillStyle = hasHealthKit ? '#ff4444' : '#666666';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw button outline
        ctx.globalAlpha = 1;
        ctx.strokeStyle = hasHealthKit ? '#ff6666' : '#444444';
        ctx.lineWidth = this.pressed ? 4 : 3;
        ctx.stroke();
        
        // Draw health kit icon - try PNG first, fallback to cross symbol
        if (hasHealthKit) {
            const rendered = this.drawHealthKitImage(ctx);
            
            if (!rendered) {
                // Fallback to cross symbol
                ctx.fillStyle = '#ffffff';
                ctx.lineWidth = 4;
                const crossSize = this.radius * 0.5;
                
                // Vertical line
                ctx.fillRect(this.x - 2, this.y - crossSize, 4, crossSize * 2);
                // Horizontal line
                ctx.fillRect(this.x - crossSize, this.y - 2, crossSize * 2, 4);
            }
        }
        
        // Draw health kit count label (e.g., "1/2")
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${healthKitCount}/${maxHealthKits}`, this.x, this.y + this.radius + 20);
        
        ctx.restore();
    }
    
    // Draw health kit PNG image
    drawHealthKitImage(ctx) {
        if (!this.assetLoader) {
            return false;
        }

        const img = this.assetLoader.getConsumableImage('healthKit');
        if (!img) {
            return false;
        }

        const size = this.radius * 1.3;
        
        // Draw health kit image
        ctx.globalAlpha = 1;
        ctx.drawImage(img, this.x - size / 2, this.y - size / 2, size, size);
        
        return true;
    }
}