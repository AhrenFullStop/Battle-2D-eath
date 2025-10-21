// Base entity class for all game objects

import { Vector2D } from '../utils/Vector2D.js';

let nextEntityId = 1;

export class Entity {
    constructor() {
        // Unique identifier
        this.id = nextEntityId++;
        
        // Position in world space
        this.position = new Vector2D(0, 0);
        
        // Rotation in radians
        this.rotation = 0;
        
        // Active state
        this.active = true;
        
        // Type identifier
        this.type = 'entity';
    }

    // Update entity (override in subclasses)
    update(deltaTime) {
        // Base implementation does nothing
    }

    // Set position
    setPosition(x, y) {
        this.position.set(x, y);
        return this;
    }

    // Set rotation
    setRotation(angle) {
        this.rotation = angle;
        return this;
    }

    // Deactivate entity
    deactivate() {
        this.active = false;
    }

    // Activate entity
    activate() {
        this.active = true;
    }
}