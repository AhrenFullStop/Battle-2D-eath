/**
 * Collision detection utilities
 * 
 * Shared collision algorithms used across physics, combat, and AI systems.
 */

/**
 * Check if a circle intersects with a rectangle
 * @param {number} circleX - Circle center X
 * @param {number} circleY - Circle center Y
 * @param {number} radius - Circle radius
 * @param {number} rectX - Rectangle X
 * @param {number} rectY - Rectangle Y
 * @param {number} rectWidth - Rectangle width
 * @param {number} rectHeight - Rectangle height
 * @returns {boolean} True if collision detected
 */
export function circleRectCollision(circleX, circleY, radius, rectX, rectY, rectWidth, rectHeight) {
    const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
    const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));
    const dx = circleX - closestX;
    const dy = circleY - closestY;
    return (dx * dx + dy * dy) < (radius * radius);
}
