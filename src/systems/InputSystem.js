// Input system for handling touch events and virtual controls

import { VirtualJoystick } from '../renderer/VirtualJoystick.js';
import { WeaponButton } from '../renderer/WeaponButton.js';
import { ConsumableButton } from '../renderer/ConsumableButton.js';
import { AbilityButton } from '../renderer/AbilityButton.js';
import { Vector2D } from '../utils/Vector2D.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config/constants.js';
import { getCanvasCoordinates } from '../utils/canvasHelpers.js';

export class InputSystem {
    constructor(canvas, eventBus, assetLoader = null) {
        this.canvas = canvas;
        this.eventBus = eventBus;
        this.assetLoader = assetLoader;
        
        // Virtual joystick for movement
        this.joystick = new VirtualJoystick();
        
        // Special ability button (larger, bottom-right corner)
        const abilityRadius = 60;
        const abilityX = CANVAS_WIDTH - 90;
        const abilityY = CANVAS_HEIGHT - 90;
        this.abilityButton = new AbilityButton(abilityX, abilityY, abilityRadius);
        
        // Weapon buttons (positioned around ability button with better spacing) - 3 slots
        const weaponRadius = 48;
        this.weaponButtons = [];
        
        // Position weapons in an arc around the ability button with more spacing
        const weaponPositions = [
            { x: abilityX - 160, y: abilityY }, // Left 
            { x: abilityX - 115, y: abilityY - 115 }, // Top-left 
            { x: abilityX, y: abilityY - 160 } // Top 
        ];
        
        for (let i = 0; i < 3; i++) {
            const button = new WeaponButton(
                weaponPositions[i].x,
                weaponPositions[i].y,
                weaponRadius,
                i,
                assetLoader
            );
            this.weaponButtons.push(button);
        }
        
        // Health kit button (single button, center-bottom area) - consolidated slot
        const healthKitRadius = 40;
        const healthKitX = (CANVAS_WIDTH / 2) - 20; // Centered horizontally
        const healthKitY = CANVAS_HEIGHT - 80; // Bottom center
        this.healthKitButtons = [];
        
        // Only create one button that handles all health kits
        const button = new ConsumableButton(
            healthKitX,
            healthKitY,
            healthKitRadius,
            0, // Single slot index
            assetLoader
        );
        this.healthKitButtons.push(button);
        
        // Track active touches
        this.touches = new Map();
        
        // Movement input vector
        this.movementVector = new Vector2D(0, 0);
        
        // Weapon firing state
        this.weaponFired = false;
        this.weaponAimAngle = 0;
        
        // Ability activation state
        this.abilityActivated = false;
        this.abilityCharging = false;
        
        // Health kit usage state
        this.healthKitUsed = false;
        
        // Bound listeners (so we can remove them on reset)
        this.onTouchStartBound = (e) => this.onTouchStart(e);
        this.onTouchMoveBound = (e) => this.onTouchMove(e);
        this.onTouchEndBound = (e) => this.onTouchEnd(e);
        this.onTouchCancelBound = (e) => this.onTouchEnd(e);
        this.onMouseDownBound = (e) => this.onMouseDown(e);
        this.onMouseMoveBound = (e) => this.onMouseMove(e);
        this.onMouseUpBound = (e) => this.onMouseUp(e);

        // Setup event listeners
        this.setupEventListeners();
    }

    // Setup touch event listeners
    setupEventListeners() {
        // Prevent default touch behaviors
        this.canvas.addEventListener('touchstart', this.onTouchStartBound, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEndBound, { passive: false });
        this.canvas.addEventListener('touchcancel', this.onTouchCancelBound, { passive: false });
        
        // Mouse events for desktop testing
        this.canvas.addEventListener('mousedown', this.onMouseDownBound);
        this.canvas.addEventListener('mousemove', this.onMouseMoveBound);
        this.canvas.addEventListener('mouseup', this.onMouseUpBound);
    }

    /**
     * Remove all input listeners
     */
    removeEventListeners() {
        this.canvas.removeEventListener('touchstart', this.onTouchStartBound);
        this.canvas.removeEventListener('touchmove', this.onTouchMoveBound);
        this.canvas.removeEventListener('touchend', this.onTouchEndBound);
        this.canvas.removeEventListener('touchcancel', this.onTouchCancelBound);
        this.canvas.removeEventListener('mousedown', this.onMouseDownBound);
        this.canvas.removeEventListener('mousemove', this.onMouseMoveBound);
        this.canvas.removeEventListener('mouseup', this.onMouseUpBound);
    }

    // Get canvas-relative coordinates from touch/mouse event
    getCanvasCoordinates(clientX, clientY) {
        return getCanvasCoordinates(this.canvas, clientX, clientY);
    }

    // Handle touch start
    onTouchStart(event) {
        event.preventDefault();
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            
            let handled = false;
            
            // Try ability button first
            if (this.abilityButton.onTouchStart(touch.identifier, coords.x, coords.y)) {
                this.touches.set(touch.identifier, { type: 'ability', coords });
                handled = true;
            }
            
            // Try weapon buttons
            if (!handled) {
                for (let j = 0; j < this.weaponButtons.length; j++) {
                    if (this.weaponButtons[j].onTouchStart(touch.identifier, coords.x, coords.y)) {
                        this.touches.set(touch.identifier, { type: 'weapon', index: j, coords });
                        handled = true;
                        break;
                    }
                }
            }
            
            // Try health kit button (single button)
            if (!handled) {
                if (this.healthKitButtons[0].onTouchStart(touch.identifier, coords.x, coords.y)) {
                    this.touches.set(touch.identifier, { type: 'healthKit', index: 0, coords });
                    handled = true;
                }
            }
            
            // Try to activate joystick if not handled
            if (!handled && this.joystick.onTouchStart(touch.identifier, coords.x, coords.y)) {
                this.touches.set(touch.identifier, { type: 'joystick', coords });
            }
        }
    }

    // Handle touch move
    onTouchMove(event) {
        event.preventDefault();
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            
            // Update controls if this touch controls them
            if (this.touches.has(touch.identifier)) {
                const touchData = this.touches.get(touch.identifier);
                if (touchData.type === 'joystick') {
                    this.joystick.onTouchMove(touch.identifier, coords.x, coords.y);
                    touchData.coords = coords;
                } else if (touchData.type === 'weapon') {
                    this.weaponButtons[touchData.index].onTouchMove(touch.identifier, coords.x, coords.y);
                    touchData.coords = coords;
                } else if (touchData.type === 'ability') {
                    // Track ability button hold for preview
                    touchData.coords = coords;
                }
                // Health kit buttons don't need move updates
            }
        }
    }

    // Handle touch end
    onTouchEnd(event) {
        event.preventDefault();
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            
            // Release controls if this touch was controlling them
            if (this.touches.has(touch.identifier)) {
                const touchData = this.touches.get(touch.identifier);
                if (touchData.type === 'joystick') {
                    this.joystick.onTouchEnd(touch.identifier);
                } else if (touchData.type === 'weapon') {
                    const button = this.weaponButtons[touchData.index];
                    const shouldFire = button.onTouchEnd(touch.identifier);
                    if (shouldFire) {
                        this.weaponFired = true;
                        this.weaponAimAngle = button.getAimAngle();
                        this.weaponSlotFired = touchData.index;
                    }
                } else if (touchData.type === 'ability') {
                    const shouldActivate = this.abilityButton.onTouchEnd(touch.identifier);
                    if (shouldActivate) {
                        this.abilityActivated = true;
                    }
                    this.abilityCharging = false;
                } else if (touchData.type === 'healthKit') {
                    const button = this.healthKitButtons[0]; // Only one button now
                    const shouldUse = button.onTouchEnd(touch.identifier);
                    if (shouldUse) {
                        this.healthKitUsed = true;
                    }
                }
                this.touches.delete(touch.identifier);
            }
        }
    }

    // Mouse events for desktop testing
    onMouseDown(event) {
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);
        this.joystick.onTouchStart('mouse', coords.x, coords.y);
    }

    onMouseMove(event) {
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);
        this.joystick.onTouchMove('mouse', coords.x, coords.y);
    }

    onMouseUp(event) {
        this.joystick.onTouchEnd('mouse');
    }

    // Update input state (called each frame)
    update(player) {
        // Get movement vector from joystick
        this.movementVector = this.joystick.getVector();
        
        // Update weapon buttons
        if (player) {
            const weapons = player.getAllWeapons();
            for (let i = 0; i < this.weaponButtons.length; i++) {
                const button = this.weaponButtons[i];
                
                // Set weapon for button
                if (i < weapons.length) {
                    button.setWeapon(weapons[i]);
                    
                    // Update cooldown
                    button.setCooldownProgress(weapons[i].getCooldownProgress());
                    
                    // Update aim direction if not aiming
                    if (!button.isAiming) {
                        button.setAimDirection(player.facingAngle);
                    }
                } else {
                    button.setWeapon(null);
                }
            }
            
            // Update ability button cooldown and charging state
            if (player.specialAbilityCooldown > 0 && player.specialAbility) {
                const progress = player.specialAbilityCooldown / player.specialAbility.cooldown;
                this.abilityButton.setCooldownProgress(progress);
            } else {
                this.abilityButton.setCooldownProgress(0);
            }
            
            // Update ability charging state (for Ground Slam preview)
            this.abilityCharging = this.abilityButton.pressed && this.abilityButton.isReady();
        }
    }

    // Get the current movement input vector
    getMovementInput() {
        return this.movementVector.clone();
    }

    // Check if weapon was fired and consume the event
    checkWeaponFired() {
        if (this.weaponFired) {
            this.weaponFired = false;
            return {
                fired: true,
                angle: this.weaponAimAngle,
                weaponSlot: this.weaponSlotFired
            };
        }
        return { fired: false, angle: 0, weaponSlot: -1 };
    }
    
    // Check if ability was activated and consume the event
    checkAbilityActivated() {
        if (this.abilityActivated) {
            this.abilityActivated = false;
            return true;
        }
        return false;
    }
    
    // Check if ability is currently being charged (for preview)
    isAbilityCharging() {
        return this.abilityCharging;
    }
    
    // Check if health kit was used and consume the event
    checkHealthKitUsed() {
        if (this.healthKitUsed) {
            this.healthKitUsed = false;
            return true;
        }
        return false;
    }

    // Get the joystick for rendering
    getJoystick() {
        return this.joystick;
    }

    // Get the weapon buttons for rendering
    getWeaponButtons() {
        return this.weaponButtons;
    }
    
    // Get the ability button for rendering
    getAbilityButton() {
        return this.abilityButton;
    }
    
    // Get the health kit buttons for rendering
    getHealthKitButtons() {
        return this.healthKitButtons;
    }

    // Reset all input
    reset() {
        this.joystick.reset();
        this.weaponButtons.forEach(button => button.reset());
        this.abilityButton.reset();
        this.healthKitButtons.forEach(button => button.reset());
        this.touches.clear();
        this.movementVector.set(0, 0);
        this.weaponFired = false;
        this.weaponSlotFired = -1;
        this.abilityActivated = false;
        this.healthKitUsed = false;
    }
}