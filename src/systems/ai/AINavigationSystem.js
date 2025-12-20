// AI Navigation System - handles pathfinding, obstacle avoidance, and movement

import { Vector2D } from '../../utils/Vector2D.js';
import { circleRectCollision } from '../../utils/collision.js';
import { MAP_CONFIG, getCurrentMapConfig } from '../../config/map.js';

export class AINavigationSystem {
    constructor() {
        // Reusable scratch vectors to avoid allocations in hot loops
        this._scratchVector1 = new Vector2D(0, 0);
        this._scratchVector2 = new Vector2D(0, 0);
        this._scratchVector3 = new Vector2D(0, 0);
    }
    
    /**
     * Check if AI is stuck and add unstuck behavior
     * @param {AICharacter} ai - The AI character
     * @param {number} deltaTime - Time delta
     * @param {number} aiSpeedMultiplier - AI speed multiplier from game config
     */
    checkIfStuck(ai, deltaTime, aiSpeedMultiplier) {
        // Initialize stuck tracking if not present
        if (!ai.lastPosition) {
            ai.lastPosition = ai.position.clone();
            ai.stuckTimer = 0;
            ai.isStuck = false;
            ai.unstuckDirection = null;
            ai.unstuckTimer = 0;
            ai.unstuckAttempts = 0;
            return;
        }
        
        // Check if AI has moved significantly
        const distanceMoved = ai.position.distanceTo(ai.lastPosition);
        const expectedMovement = ai.moveSpeed * aiSpeedMultiplier * deltaTime * 0.15; // More sensitive - expect at least 15% of speed
        
        if (distanceMoved < expectedMovement && ai.velocity.magnitude() > 0.5) {
            // AI is trying to move but not moving much - likely stuck
            ai.stuckTimer += deltaTime;
            
            if (ai.stuckTimer > 0.3 && !ai.isStuck) {
                // Stuck for more than 0.3 seconds (reduced from 0.5)
                ai.isStuck = true;
                ai.unstuckTimer = 2.0; // Try to unstuck for 2 seconds (increased)
                ai.unstuckAttempts++;
                
                // Generate a more aggressive unstuck direction
                // Try moving perpendicular or opposite to current velocity
                let unstuckAngle;
                if (ai.unstuckAttempts % 3 === 0) {
                    // Every 3rd attempt, try moving backward
                    unstuckAngle = ai.velocity.angle() + Math.PI;
                } else {
                    // Otherwise try perpendicular with some randomness
                    const perpOffset = (Math.random() - 0.5) * Math.PI * 0.5;
                    unstuckAngle = ai.velocity.angle() + Math.PI / 2 + perpOffset;
                }
                
                this._scratchVector1.set(
                    Math.cos(unstuckAngle),
                    Math.sin(unstuckAngle)
                );
                ai.unstuckDirection = this._scratchVector1.clone(); // Clone here as we need to store it
                
                console.log(`AI ${ai.name} is stuck (attempt ${ai.unstuckAttempts}), trying to unstuck at angle ${(unstuckAngle * 180 / Math.PI).toFixed(0)}°`);
            }
        } else {
            // AI is moving normally - reset stuck timer
            if (ai.stuckTimer > 0) {
                ai.stuckTimer = Math.max(0, ai.stuckTimer - deltaTime * 2); // Decay faster when moving
            }
        }
        
        // Update unstuck timer
        if (ai.isStuck) {
            ai.unstuckTimer -= deltaTime;
            if (ai.unstuckTimer <= 0) {
                ai.isStuck = false;
                ai.unstuckDirection = null;
                ai.stuckTimer = 0;
                console.log(`AI ${ai.name} unstuck attempt ended`);
            }
        }
        
        // Update last position
        ai.lastPosition = ai.position.clone();
    }
    
    /**
     * Steer around obstacles using lightweight local avoidance
     * @param {AICharacter} ai - The AI character
     * @param {Vector2D} direction - Direction vector to steer (will be modified in place)
     * @returns {Vector2D} The modified direction vector
     */
    steerAroundObstacles(ai, direction) {
        if (!direction) return direction;

        // Normalize input direction (without allocating)
        const mag = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (mag < 0.0001) return direction;
        let dirX = direction.x / mag;
        let dirY = direction.y / mag;

        const probeDistance = Math.max(12, ai.hitboxRadius + 10);

        if (!this.wouldCollideAt(ai, ai.position.x + dirX * probeDistance, ai.position.y + dirY * probeDistance)) {
            direction.x = dirX;
            direction.y = dirY;
            return direction;
        }

        const baseAngle = Math.atan2(dirY, dirX);
        const offsets = [
            Math.PI / 6,
            -Math.PI / 6,
            Math.PI / 3,
            -Math.PI / 3,
            Math.PI / 2,
            -Math.PI / 2,
            (Math.PI * 3) / 4,
            (-Math.PI * 3) / 4,
            Math.PI
        ];

        for (let i = 0; i < offsets.length; i++) {
            const a = baseAngle + offsets[i];
            const cx = Math.cos(a);
            const cy = Math.sin(a);
            if (!this.wouldCollideAt(ai, ai.position.x + cx * probeDistance, ai.position.y + cy * probeDistance)) {
                direction.x = cx;
                direction.y = cy;
                return direction;
            }
        }

        // If every probe collides, leave direction unchanged (unstuck logic will handle)
        direction.x = dirX;
        direction.y = dirY;
        return direction;
    }

    /**
     * Check if AI would collide with obstacles at a given position
     * @param {AICharacter} ai - The AI character
     * @param {number} x - X coordinate to check
     * @param {number} y - Y coordinate to check
     * @returns {boolean} True if collision would occur
     */
    wouldCollideAt(ai, x, y) {
        const mapConfig = getCurrentMapConfig();
        const radius = ai.hitboxRadius;

        for (const obstacle of mapConfig.obstacles) {
            const rectX = obstacle.position.x - obstacle.width / 2;
            const rectY = obstacle.position.y - obstacle.height / 2;
            if (circleRectCollision(x, y, radius, rectX, rectY, obstacle.width, obstacle.height)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get direction to avoid circular map boundaries
     * @param {AICharacter} ai - The AI character
     * @returns {Vector2D|null} Direction to avoid boundary, or null if not near boundary
     */
    getAvoidBoundaryDirection(ai) {
        const pos = ai.position;
        const checkDistance = 200; // Start avoiding when within 200px of edge
        
        // Calculate distance from map center
        const dx = pos.x - MAP_CONFIG.centerX;
        const dy = pos.y - MAP_CONFIG.centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        
        // Check if close to boundary
        if (distanceFromCenter > MAP_CONFIG.radius - checkDistance) {
            // Push towards center
            this._scratchVector3.set(-dx, -dy);
            const avoidDirection = this._scratchVector3;
            avoidDirection.normalize();
            return avoidDirection;
        }
        
        return null;
    }
}
