/**
 * Canvas rendering and coordinate helpers
 */

/**
 * Convert screen coordinates to canvas coordinates
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {number} clientX - Screen X coordinate
 * @param {number} clientY - Screen Y coordinate
 * @returns {{x: number, y: number}} Canvas coordinates
 */
export function getCanvasCoordinates(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}
