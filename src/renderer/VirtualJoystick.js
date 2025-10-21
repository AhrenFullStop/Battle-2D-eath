// Virtual joystick for touch-based movement control

import { Vector2D } from '../utils/Vector2D.js';
import {
    JOYSTICK_RADIUS,
    JOYSTICK_KNOB_RADIUS,
    JOYSTICK_POSITION_X,
    JOYSTICK_POSITION_Y,
    JOYSTICK_MAX_DISTANCE
} from '../config/constants.js';

export class VirtualJoystick {
    constructor() {
        // Joystick position (fixed in bottom-left corner)
        this.baseX = JOYSTICK_POSITION_X;
        this.baseY = JOYSTICK_POSITION_Y;
        this.baseRadius = JOYSTICK_RADIUS;
        
        // Knob position (moves within the base)
        this.knobX = this.baseX;
        this.knobY = this.baseY;
        this.knobRadius = JOYSTICK_KNOB_RADIUS;
        
        // Maximum distance knob can move from center
        this.maxDistance = JOYSTICK_MAX_DISTANCE;
        
        // Current state
        this.active = false;
        this.touchId = null;
        
        // Output vector (normalized direction)
        this.vector = new Vector2D(0, 0);
    }

    // Check if a touch point is within the joystick base
    isTouchInside(x, y) {
        const dx = x - this.baseX;
        const dy = y - this.baseY;
        const distSquared = dx * dx + dy * dy;
        return distSquared <= this.baseRadius * this.baseRadius;
    }

    // Handle touch start
    onTouchStart(touchId, x, y) {
        if (this.isTouchInside(x, y)) {
            this.active = true;
            this.touchId = touchId;
            this.updateKnobPosition(x, y);
            return true;
        }
        return false;
    }

    // Handle touch move
    onTouchMove(touchId, x, y) {
        if (this.active && this.touchId === touchId) {
            this.updateKnobPosition(x, y);
            return true;
        }
        return false;
    }

    // Handle touch end
    onTouchEnd(touchId) {
        if (this.active && this.touchId === touchId) {
            this.reset();
            return true;
        }
        return false;
    }

    // Update knob position based on touch coordinates
    updateKnobPosition(x, y) {
        // Calculate offset from center
        let dx = x - this.baseX;
        let dy = y - this.baseY;
        
        // Calculate distance from center
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Limit knob to max distance
        if (distance > this.maxDistance) {
            const ratio = this.maxDistance / distance;
            dx *= ratio;
            dy *= ratio;
        }
        
        // Update knob position
        this.knobX = this.baseX + dx;
        this.knobY = this.baseY + dy;
        
        // Calculate normalized vector for movement
        if (distance > 0) {
            const actualDistance = Math.min(distance, this.maxDistance);
            this.vector.x = (dx / this.maxDistance);
            this.vector.y = (dy / this.maxDistance);
        } else {
            this.vector.x = 0;
            this.vector.y = 0;
        }
    }

    // Reset joystick to center
    reset() {
        this.active = false;
        this.touchId = null;
        this.knobX = this.baseX;
        this.knobY = this.baseY;
        this.vector.x = 0;
        this.vector.y = 0;
    }

    // Get the current movement vector
    getVector() {
        return this.vector.clone();
    }

    // Render the joystick
    render(ctx) {
        // Draw base circle (outer ring)
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.baseRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Fill base with semi-transparent color
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.2;
        ctx.fill();
        
        // Draw knob (inner circle)
        ctx.globalAlpha = this.active ? 0.7 : 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.knobX, this.knobY, this.knobRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw knob outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;
        ctx.stroke();
        
        ctx.restore();
    }
}