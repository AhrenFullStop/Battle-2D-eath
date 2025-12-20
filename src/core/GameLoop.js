// Fixed timestep game loop for consistent physics at 60 FPS

import { TARGET_FPS, FIXED_TIMESTEP } from '../config/constants.js';

export class GameLoop {
    constructor(updateCallback, renderCallback) {
        this.targetFPS = TARGET_FPS;
        this.targetFrameTime = FIXED_TIMESTEP;
        this.lastFrameTime = 0;
        this.accumulator = 0;
        this.running = false;
        
        // Callbacks for game logic
        this.update = updateCallback;
        this.render = renderCallback;
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 0;
    }

    // Start the game loop
    start() {
        this.running = true;
        this.lastFrameTime = performance.now();
        this.lastFPSUpdate = performance.now();
        this.loop(this.lastFrameTime);
    }

    // Stop the game loop
    stop() {
        this.running = false;
    }

    // Main game loop using fixed timestep
    loop(currentTime) {
        if (!this.running) return;

        // Calculate delta time since last frame
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        this.accumulator += deltaTime;

        // Fixed timestep updates - ensures consistent physics
        // Run multiple updates if we've fallen behind
        while (this.accumulator >= this.targetFrameTime) {
            // Convert to seconds for physics calculations
            const dt = this.targetFrameTime / 1000;
            this.update(dt);
            this.accumulator -= this.targetFrameTime;
        }

        // Calculate interpolation factor for smooth rendering
        const interpolation = this.accumulator / this.targetFrameTime;
        this.render(interpolation);

        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.lastFPSUpdate >= 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
        }

        // Request next frame
        requestAnimationFrame((time) => this.loop(time));
    }

    /**
     * Get current FPS for debugging
     * @returns {number} Current frames per second
     */
    getFPS() {
        return this.currentFPS;
    }
}