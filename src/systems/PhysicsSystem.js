// Physics system for movement and collision detection

import { Vector2D } from '../utils/Vector2D.js';
import { FRICTION } from '../config/constants.js';
import { getCurrentMapConfig, getGameConfig, clampToMapBounds } from '../config/map.js';
import { circleRectCollision } from '../utils/collision.js';

export class PhysicsSystem {
    constructor(gameState) {
        this.gameState = gameState;
        // Reusable scratch vector for input processing
        this._inputScratch = new Vector2D(0, 0);
    }

    // Update all physics (called each frame)
    update(deltaTime) {
        // Update all characters
        this.gameState.characters.forEach(character => {
            if (character.isAlive()) {
                this.updateCharacterPhysics(character, deltaTime);
            }
        });
    }

    // Update character physics
    updateCharacterPhysics(character, deltaTime) {
        // Don't apply movement if character is stunned (e.g.: Boulder ability)
        if (character.stunned) {
            character.velocity.set(0, 0);
            return;
        }
        
        // Apply input to human-controlled characters (local player or remote network player)
        if (typeof character.getInputVector === 'function') {
            this.applyPlayerInput(character);
        }
        
        // Check if character is in water (slows movement)
        const waterSpeedMultiplier = this.isInWater(character) ? 0.75 : 1.0;
        
        // Apply friction
        character.velocity.multiply(FRICTION);
        
        // Store old position for collision resolution
        const oldX = character.position.x;
        const oldY = character.position.y;

        const deltaX = character.velocity.x * deltaTime * waterSpeedMultiplier;
        const deltaY = character.velocity.y * deltaTime * waterSpeedMultiplier;

        // Axis-separated movement for lightweight sliding along obstacles.
        // This prevents characters from getting fully stuck on corners.
        character.position.x = oldX + deltaX;
        character.position.y = oldY;
        if (this.checkObstacleCollision(character)) {
            character.position.x = oldX;
            character.velocity.x = 0;
        }

        character.position.y = oldY + deltaY;
        if (this.checkObstacleCollision(character)) {
            character.position.y = oldY;
            character.velocity.y = 0;
        }
        
        // Apply circular map boundary
        this.constrainToMapBounds(character);
        
        // Update stealth state (if in bush)
        character.isInBush = this.isInBush(character);
    }

    /**
     * Apply player input to character movement
     * @param {Character} character - Character to move
     */
    applyPlayerInput(character) {
        const input = character.getInputVector();
        
        // If there's input, set velocity based on input direction and move speed
        if (input.x !== 0 || input.y !== 0) {
            this._inputScratch.set(input.x, input.y);
            const inputVector = this._inputScratch;
            
            // Normalize and scale by move speed
            const magnitude = inputVector.magnitude();
            if (magnitude > 0) {
                inputVector.normalize();
                const gameConfig = getGameConfig();
                const inputSpeedMultiplier = gameConfig.movement?.inputSpeedMultiplier ?? 2.5;
                const playerSpeedMultiplier = gameConfig.movement?.playerSpeedMultiplier ?? 1.0;
                inputVector.multiply(character.moveSpeed * playerSpeedMultiplier * inputSpeedMultiplier);
                character.velocity.set(inputVector.x, inputVector.y);
            }
        }
    }

    // Keep character within circular map boundaries
    constrainToMapBounds(character) {
        const mapConfig = getCurrentMapConfig();
        const dx = character.position.x - mapConfig.centerX;
        const dy = character.position.y - mapConfig.centerY;
        const distanceSquared = dx * dx + dy * dy;
        const maxDistance = mapConfig.radius - character.hitboxRadius;
        
        if (distanceSquared > maxDistance * maxDistance) {
            const distance = Math.sqrt(distanceSquared);
            const scale = maxDistance / distance;
            character.position.x = mapConfig.centerX + dx * scale;
            character.position.y = mapConfig.centerY + dy * scale;
            character.velocity.set(0, 0);
        }
    }

    // Check if character is colliding with any obstacle
    checkObstacleCollision(character) {
        const mapConfig = getCurrentMapConfig();
        for (const obstacle of mapConfig.obstacles) {
            if (circleRectCollision(
                character.position.x,
                character.position.y,
                character.hitboxRadius,
                obstacle.position.x - obstacle.width / 2,
                obstacle.position.y - obstacle.height / 2,
                obstacle.width,
                obstacle.height
            )) {
                return true;
            }
        }
        return false;
    }

    // Check if character is in water
    isInWater(character) {
        const mapConfig = getCurrentMapConfig();
        for (const water of mapConfig.waterAreas) {
            // Check if water has radius (circle) or width/height (rectangle)
            if (water.radius !== undefined) {
                // Circle-based water area
                const dx = character.position.x - water.position.x;
                const dy = character.position.y - water.position.y;
                const distanceSquared = dx * dx + dy * dy;
                if (distanceSquared <= water.radius * water.radius) {
                    return true;
                }
            } else {
                // Rectangle-based water area
                const rectX = water.position.x - water.width / 2;
                const rectY = water.position.y - water.height / 2;
                
                if (character.position.x >= rectX &&
                    character.position.x <= rectX + water.width &&
                    character.position.y >= rectY &&
                    character.position.y <= rectY + water.height) {
                    return true;
                }
            }
        }
        return false;
    }

    // Check if character is in a bush
    isInBush(character) {
        const mapConfig = getCurrentMapConfig();
        for (const bush of mapConfig.bushes) {
            const dx = character.position.x - bush.position.x;
            const dy = character.position.y - bush.position.y;
            const distanceSquared = dx * dx + dy * dy;
            
            if (distanceSquared <= bush.radius * bush.radius) {
                return true;
            }
        }
        return false;
    }
}