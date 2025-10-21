// Physics system for movement and collision detection

import { Vector2D } from '../utils/Vector2D.js';
import { FRICTION } from '../config/constants.js';
import { MAP_CONFIG, clampToMapBounds } from '../config/map.js';

export class PhysicsSystem {
    constructor(gameState) {
        this.gameState = gameState;
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
        // Don't apply movement if character is stunned (Phase 7: Boulder ability)
        if (character.stunned) {
            character.velocity.set(0, 0);
            return;
        }
        
        // Apply input to player
        if (character.isPlayer) {
            this.applyPlayerInput(character);
        }
        
        // Check if character is in water (slows movement)
        const waterSpeedMultiplier = this.isInWater(character) ? 0.75 : 1.0;
        
        // Apply friction
        character.velocity.multiply(FRICTION);
        
        // Store old position for collision resolution
        const oldX = character.position.x;
        const oldY = character.position.y;
        
        // Update position based on velocity (with water slowdown)
        character.position.x += character.velocity.x * deltaTime * waterSpeedMultiplier;
        character.position.y += character.velocity.y * deltaTime * waterSpeedMultiplier;
        
        // Check obstacle collisions
        if (this.checkObstacleCollision(character)) {
            // Revert to old position if colliding with obstacle
            character.position.x = oldX;
            character.position.y = oldY;
            character.velocity.set(0, 0);
        }
        
        // Apply circular map boundary
        this.constrainToMapBounds(character);
        
        // Update stealth state (if in bush)
        character.isInBush = this.isInBush(character);
    }

    // Apply player input to velocity
    applyPlayerInput(character) {
        const input = character.getInputVector();
        
        // If there's input, set velocity based on input direction and move speed
        if (input.x !== 0 || input.y !== 0) {
            const inputVector = new Vector2D(input.x, input.y);
            
            // Normalize and scale by move speed
            const magnitude = inputVector.magnitude();
            if (magnitude > 0) {
                inputVector.normalize();
                inputVector.multiply(character.moveSpeed);
                character.velocity.set(inputVector.x, inputVector.y);
            }
        }
    }

    // Keep character within circular map boundaries
    constrainToMapBounds(character) {
        const dx = character.position.x - MAP_CONFIG.centerX;
        const dy = character.position.y - MAP_CONFIG.centerY;
        const distanceSquared = dx * dx + dy * dy;
        const maxDistance = MAP_CONFIG.radius - character.hitboxRadius;
        
        if (distanceSquared > maxDistance * maxDistance) {
            const distance = Math.sqrt(distanceSquared);
            const scale = maxDistance / distance;
            character.position.x = MAP_CONFIG.centerX + dx * scale;
            character.position.y = MAP_CONFIG.centerY + dy * scale;
            character.velocity.set(0, 0);
        }
    }

    // Check if character is colliding with any obstacle
    checkObstacleCollision(character) {
        for (const obstacle of MAP_CONFIG.obstacles) {
            if (this.circleRectCollision(
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

    // Circle-rectangle collision detection
    circleRectCollision(circleX, circleY, radius, rectX, rectY, rectWidth, rectHeight) {
        const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
        const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));
        
        const dx = circleX - closestX;
        const dy = circleY - closestY;
        
        return (dx * dx + dy * dy) < (radius * radius);
    }

    // Check if character is in water
    isInWater(character) {
        for (const water of MAP_CONFIG.waterAreas) {
            const rectX = water.position.x - water.width / 2;
            const rectY = water.position.y - water.height / 2;
            
            if (character.position.x >= rectX &&
                character.position.x <= rectX + water.width &&
                character.position.y >= rectY &&
                character.position.y <= rectY + water.height) {
                return true;
            }
        }
        return false;
    }

    // Check if character is in a bush
    isInBush(character) {
        for (const bush of MAP_CONFIG.bushes) {
            const dx = character.position.x - bush.position.x;
            const dy = character.position.y - bush.position.y;
            const distanceSquared = dx * dx + dy * dy;
            
            if (distanceSquared <= bush.radius * bush.radius) {
                return true;
            }
        }
        return false;
    }

    // Circle-circle collision detection (for future use)
    checkCircleCollision(entity1, entity2) {
        const dx = entity2.position.x - entity1.position.x;
        const dy = entity2.position.y - entity1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = entity1.hitboxRadius + entity2.hitboxRadius;
        
        return distance < minDistance;
    }

    // Separate two overlapping circles (for future use)
    separateCircles(entity1, entity2) {
        const dx = entity2.position.x - entity1.position.x;
        const dy = entity2.position.y - entity1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = entity1.hitboxRadius + entity2.hitboxRadius;
        
        if (distance < minDistance && distance > 0) {
            const overlap = minDistance - distance;
            const separationX = (dx / distance) * overlap * 0.5;
            const separationY = (dy / distance) * overlap * 0.5;
            
            entity1.position.x -= separationX;
            entity1.position.y -= separationY;
            entity2.position.x += separationX;
            entity2.position.y += separationY;
        }
    }
}