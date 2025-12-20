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

// Virtual joystick settings (20% larger)
export const JOYSTICK_RADIUS = 80; 
export const JOYSTICK_KNOB_RADIUS = 30; // Was 25, now 20% larger
export const JOYSTICK_POSITION_X = 110;
export const JOYSTICK_POSITION_Y = CANVAS_HEIGHT - 110;
export const JOYSTICK_MAX_DISTANCE = 60; // Was 50, now 20% larger

// Debug settings
export const DEBUG_MODE = false;