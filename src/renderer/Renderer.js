// Main rendering coordinator

import { CharacterRenderer } from './CharacterRenderer.js';
import { WeaponRenderer } from './WeaponRenderer.js';
import { UIRenderer } from './UIRenderer.js';
import { MapRenderer } from './MapRenderer.js';
import { MinimapRenderer } from './MinimapRenderer.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Sub-renderers
        this.mapRenderer = new MapRenderer(this.ctx);
        this.characterRenderer = new CharacterRenderer(this.ctx);
        this.weaponRenderer = new WeaponRenderer(this.ctx);
        this.uiRenderer = new UIRenderer(this.ctx, canvas);
        this.minimapRenderer = new MinimapRenderer(this.ctx);
    }

    // Main render method called each frame
    render(gameState, inputSystem, gameLoop, interpolation, combatSystem, aiSystem, consumables) {
        // CRITICAL: Clear the entire canvas before rendering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context state
        this.ctx.save();
        
        // Get camera position
        const camera = gameState.camera;
        
        // Translate canvas to camera position (world space)
        this.ctx.translate(-camera.x, -camera.y);
        
        // Layer 1: Map background and terrain
        this.mapRenderer.render(camera, gameState, consumables);
        
        // Layer 2: Weapon pickups on ground
        if (aiSystem) {
            const pickups = aiSystem.getAvailableWeapons();
            pickups.forEach(pickup => {
                if (pickup.active) {
                    pickup.update(0); // Update animations
                }
            });
            this.weaponRenderer.render(combatSystem, pickups);
        }
        
        // Layer 3: Characters
        this.characterRenderer.render(gameState.characters);
        
        // Layer 4: Weapon effects and projectiles (already rendered with pickups above)
        
        // Restore context (back to screen space for UI)
        this.ctx.restore();
        
        // Layer 5: UI Overlay (screen space)
        const joystick = inputSystem.getJoystick();
        const weaponButtons = inputSystem.getWeaponButtons();
        const abilityButton = inputSystem.getAbilityButton();
        const healthKitButtons = inputSystem.getHealthKitButtons();
        this.uiRenderer.render(gameState, joystick, weaponButtons, abilityButton, healthKitButtons, gameLoop);
        
        // Layer 6: Minimap (screen space)
        this.minimapRenderer.render(gameState, this.canvas.width);
    }

    // Resize canvas to fill viewport
    resize() {
        // Get viewport dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Set canvas CSS to fill viewport
        this.canvas.style.width = `${windowWidth}px`;
        this.canvas.style.height = `${windowHeight}px`;
        
        // No transform needed - canvas fills screen naturally
        this.canvas.style.transform = 'none';
    }
}
