// Main rendering coordinator

import { CharacterRenderer } from './CharacterRenderer.js';
import { WeaponRenderer } from './WeaponRenderer.js';
import { UIRenderer } from './UIRenderer.js';
import { MapRenderer } from './MapRenderer.js';
import { MinimapRenderer } from './MinimapRenderer.js';

export class Renderer {
    constructor(canvas, assetLoader = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.assetLoader = assetLoader;
        
        // Sub-renderers with assetLoader support
        this.mapRenderer = new MapRenderer(this.ctx, assetLoader);
        this.characterRenderer = new CharacterRenderer(this.ctx, assetLoader);
        this.weaponRenderer = new WeaponRenderer(this.ctx, assetLoader);
        this.uiRenderer = new UIRenderer(this.ctx, canvas);
        this.minimapRenderer = new MinimapRenderer(this.ctx);
    }

    /**
     * Render the game world and UI
     * @param {Object} gameState - Current game state
     * @param {InputSystem} inputSystem - Input system for UI elements
     * @param {GameLoop} gameLoop - Game loop for timing info
     * @param {number} interpolation - Interpolation factor for smooth rendering
     * @param {CombatSystem} combatSystem - Combat system for effects
     * @param {AISystem} aiSystem - AI system for weapon pickups
     * @param {Array} consumables - Consumable entities
     * @param {AbilitySystem} abilitySystem - Ability system for previews
     */
    render(gameState, inputSystem, gameLoop, interpolation, combatSystem, aiSystem, consumables, abilitySystem) {
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
            this.weaponRenderer.render(combatSystem, pickups, gameState.player);
        }
        
        // Layer 3: Ground slam preview (if active)
        if (abilitySystem) {
            const preview = abilitySystem.getGroundSlamPreview();
            if (preview) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.3;
                this.ctx.fillStyle = '#ff4444';
                this.ctx.beginPath();
                this.ctx.arc(preview.position.x, preview.position.y, preview.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw border
                this.ctx.globalAlpha = 0.6;
                this.ctx.strokeStyle = '#ff0000';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                this.ctx.restore();
            }
        }
        
        // Layer 4: Characters
        this.characterRenderer.render(gameState.characters);
        
        // Layer 5: Weapon effects and projectiles (already rendered with pickups above)
        
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

    /**
     * Resize canvas to fill viewport
     */
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
