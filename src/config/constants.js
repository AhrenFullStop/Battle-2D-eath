// Game constants and configuration values

// Canvas dimensions (9:16 aspect ratio for mobile portrait)
export const CANVAS_WIDTH = 720;
export const CANVAS_HEIGHT = 1280;

// Game loop settings
export const TARGET_FPS = 60;
export const FIXED_TIMESTEP = 1000 / TARGET_FPS; // 16.67ms

// Physics constants
export const FRICTION = 0.85;
export const MAX_VELOCITY = 500;

// Map boundaries (now defined in map.js, but kept for compatibility)
export const MAP_WIDTH = 3000;
export const MAP_HEIGHT = 3000;

// Virtual joystick settings
export const JOYSTICK_RADIUS = 60;
export const JOYSTICK_KNOB_RADIUS = 25;
export const JOYSTICK_POSITION_X = 100;
export const JOYSTICK_POSITION_Y = CANVAS_HEIGHT - 100;
export const JOYSTICK_MAX_DISTANCE = 50;

// Debug settings
export const DEBUG_MODE = false;