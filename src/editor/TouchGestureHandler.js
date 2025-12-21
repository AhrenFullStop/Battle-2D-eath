// Touch Gesture Handler - Recognizes and handles mobile touch gestures for the map editor
// Implements: two-finger pan, pinch-to-zoom, tap, long-press, double-tap

/**
 * Handles touch gestures for the map editor
 * Provides gesture recognition for mobile devices
 */
export class TouchGestureHandler {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Gesture state
        this.touches = new Map(); // Track all active touches
        this.gestureState = null; // null, 'pan', 'pinch', 'tap', 'long-press', 'double-tap'
        
        // Gesture thresholds
        this.TAP_DURATION_MS = 300;
        this.TAP_MOVEMENT_THRESHOLD = 10; // pixels
        this.LONG_PRESS_DURATION_MS = 500;
        this.LONG_PRESS_MOVEMENT_THRESHOLD = 10; // pixels
        this.DOUBLE_TAP_DELAY_MS = 300;
        
        // Tap tracking
        this.tapStartTime = 0;
        this.tapStartX = 0;
        this.tapStartY = 0;
        this.lastTapTime = 0;
        this.lastTapX = 0;
        this.lastTapY = 0;
        
        // Long press tracking
        this.longPressTimer = null;
        this.longPressStartX = 0;
        this.longPressStartY = 0;
        
        // Pinch tracking
        this.lastPinchDistance = 0;
        this.initialPinchDistance = 0;
        
        // Pan tracking
        this.lastPanCenterX = 0;
        this.lastPanCenterY = 0;
        
        // Visual feedback elements
        this.feedbackElement = null;
        this.createFeedbackElements();
        
        // Callbacks
        this.onTap = null;
        this.onLongPress = null;
        this.onDoubleTap = null;
        this.onPinchStart = null;
        this.onPinch = null;
        this.onPinchEnd = null;
        this.onPanStart = null;
        this.onPan = null;
        this.onPanEnd = null;
    }
    
    /**
     * Create visual feedback elements for gestures
     */
    createFeedbackElements() {
        // Create ripple effect container
        this.feedbackElement = document.createElement('div');
        this.feedbackElement.id = 'gesture-feedback';
        this.feedbackElement.style.position = 'fixed';
        this.feedbackElement.style.pointerEvents = 'none';
        this.feedbackElement.style.zIndex = '9999';
        this.feedbackElement.style.top = '0';
        this.feedbackElement.style.left = '0';
        this.feedbackElement.style.width = '100%';
        this.feedbackElement.style.height = '100%';
        document.body.appendChild(this.feedbackElement);
    }
    
    /**
     * Show visual feedback at position
     */
    showFeedback(x, y, type = 'tap') {
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.style.width = '20px';
        ripple.style.height = '20px';
        ripple.style.marginLeft = '-10px';
        ripple.style.marginTop = '-10px';
        ripple.style.borderRadius = '50%';
        ripple.style.pointerEvents = 'none';
        
        if (type === 'tap') {
            ripple.style.backgroundColor = 'rgba(59, 130, 246, 0.6)';
        } else if (type === 'long-press') {
            ripple.style.backgroundColor = 'rgba(239, 68, 68, 0.6)';
        } else if (type === 'double-tap') {
            ripple.style.backgroundColor = 'rgba(34, 197, 94, 0.6)';
        }
        
        ripple.style.animation = 'ripple-effect 0.6s ease-out';
        this.feedbackElement.appendChild(ripple);
        
        // Remove after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }
    
    /**
     * Get canvas coordinates from client coordinates
     */
    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    /**
     * Calculate distance between two touches
     */
    getTouchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Calculate center point between two touches
     */
    getTouchCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }
    
    /**
     * Handle touch start event
     */
    handleTouchStart(event) {
        event.preventDefault();
        
        // Update touches map
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            this.touches.set(touch.identifier, {
                id: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: Date.now()
            });
        }
        
        const touchCount = this.touches.size;
        
        if (touchCount === 1) {
            // Single touch - could be tap, long-press, or start of pan
            const touch = Array.from(this.touches.values())[0];
            const coords = this.getCanvasCoordinates(touch.currentX, touch.currentY);
            
            this.tapStartTime = Date.now();
            this.tapStartX = coords.x;
            this.tapStartY = coords.y;
            
            // Start long-press timer
            this.longPressStartX = coords.x;
            this.longPressStartY = coords.y;
            this.longPressTimer = setTimeout(() => {
                this.handleLongPress(coords.x, coords.y);
            }, this.LONG_PRESS_DURATION_MS);
            
        } else if (touchCount === 2) {
            // Two touches - pinch or two-finger pan
            this.cancelLongPress();
            this.gestureState = 'detecting';
            
            const touchArray = Array.from(this.touches.values());
            const distance = this.getTouchDistance(
                { clientX: touchArray[0].currentX, clientY: touchArray[0].currentY },
                { clientX: touchArray[1].currentX, clientY: touchArray[1].currentY }
            );
            
            this.initialPinchDistance = distance;
            this.lastPinchDistance = distance;
            
            const center = this.getTouchCenter(
                { clientX: touchArray[0].currentX, clientY: touchArray[0].currentY },
                { clientX: touchArray[1].currentX, clientY: touchArray[1].currentY }
            );
            const coords = this.getCanvasCoordinates(center.x, center.y);
            this.lastPanCenterX = coords.x;
            this.lastPanCenterY = coords.y;
        }
    }
    
    /**
     * Handle touch move event
     */
    handleTouchMove(event) {
        event.preventDefault();
        
        // Update touches map
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const existing = this.touches.get(touch.identifier);
            if (existing) {
                existing.currentX = touch.clientX;
                existing.currentY = touch.clientY;
            }
        }
        
        const touchCount = this.touches.size;
        
        if (touchCount === 1) {
            // Check if movement exceeds threshold (cancels tap/long-press)
            const touch = Array.from(this.touches.values())[0];
            const coords = this.getCanvasCoordinates(touch.currentX, touch.currentY);
            
            const deltaX = Math.abs(coords.x - this.tapStartX);
            const deltaY = Math.abs(coords.y - this.tapStartY);
            const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (movement > this.TAP_MOVEMENT_THRESHOLD) {
                this.cancelLongPress();
            }
            
        } else if (touchCount === 2) {
            const touchArray = Array.from(this.touches.values());
            const touch1 = { clientX: touchArray[0].currentX, clientY: touchArray[0].currentY };
            const touch2 = { clientX: touchArray[1].currentX, clientY: touchArray[1].currentY };
            
            const distance = this.getTouchDistance(touch1, touch2);
            const center = this.getTouchCenter(touch1, touch2);
            const coords = this.getCanvasCoordinates(center.x, center.y);
            
            // Determine if it's a pinch or pan based on distance change
            const distanceChange = Math.abs(distance - this.lastPinchDistance);
            const panDeltaX = coords.x - this.lastPanCenterX;
            const panDeltaY = coords.y - this.lastPanCenterY;
            const panMovement = Math.sqrt(panDeltaX * panDeltaX + panDeltaY * panDeltaY);
            
            if (this.gestureState === 'detecting') {
                // Determine gesture type
                if (distanceChange > 10) {
                    this.gestureState = 'pinch';
                    if (this.onPinchStart) {
                        this.onPinchStart(coords.x, coords.y, this.initialPinchDistance);
                    }
                } else if (panMovement > 5) {
                    this.gestureState = 'pan';
                    if (this.onPanStart) {
                        this.onPanStart(coords.x, coords.y);
                    }
                }
            }
            
            if (this.gestureState === 'pinch') {
                // Handle pinch zoom
                const scale = distance / this.lastPinchDistance;
                if (this.onPinch) {
                    this.onPinch(scale, coords.x, coords.y);
                }
                this.lastPinchDistance = distance;
                
            } else if (this.gestureState === 'pan') {
                // Handle two-finger pan
                if (this.onPan) {
                    this.onPan(panDeltaX, panDeltaY);
                }
                this.lastPanCenterX = coords.x;
                this.lastPanCenterY = coords.y;
            }
        }
    }
    
    /**
     * Handle touch end event
     */
    handleTouchEnd(event) {
        event.preventDefault();
        
        const wasGesture = this.gestureState !== null && this.gestureState !== 'detecting';
        
        // Remove ended touches
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const existing = this.touches.get(touch.identifier);
            
            if (existing && this.touches.size === 1) {
                // Last touch ended
                const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
                const duration = Date.now() - existing.startTime;
                
                const deltaX = Math.abs(coords.x - this.tapStartX);
                const deltaY = Math.abs(coords.y - this.tapStartY);
                const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // Check for tap
                if (!wasGesture && duration < this.TAP_DURATION_MS && movement < this.TAP_MOVEMENT_THRESHOLD) {
                    this.handleTap(coords.x, coords.y);
                }
                
                this.cancelLongPress();
            }
            
            this.touches.delete(touch.identifier);
        }
        
        // Handle gesture end
        if (this.touches.size === 0) {
            if (this.gestureState === 'pinch' && this.onPinchEnd) {
                this.onPinchEnd();
            }
            if (this.gestureState === 'pan' && this.onPanEnd) {
                this.onPanEnd();
            }
            this.gestureState = null;
        } else if (this.touches.size === 1 && wasGesture) {
            // Transitioned from 2 touches to 1
            if (this.gestureState === 'pinch' && this.onPinchEnd) {
                this.onPinchEnd();
            }
            if (this.gestureState === 'pan' && this.onPanEnd) {
                this.onPanEnd();
            }
            this.gestureState = null;
        }
    }
    
    /**
     * Handle tap gesture
     */
    handleTap(x, y) {
        const now = Date.now();
        const timeSinceLastTap = now - this.lastTapTime;
        
        // Check for double-tap
        if (timeSinceLastTap < this.DOUBLE_TAP_DELAY_MS) {
            const deltaX = Math.abs(x - this.lastTapX);
            const deltaY = Math.abs(y - this.lastTapY);
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance < 50) {
                this.handleDoubleTap(x, y);
                this.lastTapTime = 0; // Reset to prevent triple-tap
                return;
            }
        }
        
        // Single tap
        this.showFeedback(x, y, 'tap');
        if (this.onTap) {
            this.onTap(x, y);
        }
        
        this.lastTapTime = now;
        this.lastTapX = x;
        this.lastTapY = y;
    }
    
    /**
     * Handle long-press gesture
     */
    handleLongPress(x, y) {
        const coords = this.getCanvasCoordinates(x, y);
        this.showFeedback(x, y, 'long-press');
        if (this.onLongPress) {
            this.onLongPress(coords.x, coords.y);
        }
        this.longPressTimer = null;
    }
    
    /**
     * Handle double-tap gesture
     */
    handleDoubleTap(x, y) {
        this.showFeedback(x, y, 'double-tap');
        if (this.onDoubleTap) {
            this.onDoubleTap(x, y);
        }
    }
    
    /**
     * Cancel long-press timer
     */
    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this.cancelLongPress();
        if (this.feedbackElement && this.feedbackElement.parentNode) {
            this.feedbackElement.parentNode.removeChild(this.feedbackElement);
        }
    }
}
