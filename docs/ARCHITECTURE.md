
# Battle-2D-eath Technical Architecture

## Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Core Systems Architecture](#core-systems-architecture)
4. [Data Structures](#data-structures)
5. [Module Dependencies](#module-dependencies)
6. [Code Organization Patterns](#code-organization-patterns)
7. [Scalability & Multiplayer Considerations](#scalability--multiplayer-considerations)
8. [Performance Optimization](#performance-optimization)
9. [Development Workflow](#development-workflow)

---

## Overview

### Technology Stack
- **Language**: Vanilla JavaScript (ES6+)
- **Rendering**: HTML5 Canvas 2D API
- **Module System**: ES6 Modules (import/export)
- **State Management**: Centralized game state
- **Asset Loading**: Preload system
- **Target Platform**: Mobile browsers (iOS/Android), portrait orientation
- **Target Performance**: 60 FPS

### Architecture Principles
1. **Separation of Concerns**: Clear boundaries between systems
2. **Single Responsibility**: Each module has one primary purpose
3. **Data-Driven Design**: Game behavior defined by configuration data
4. **Event-Driven Communication**: Loose coupling between systems
5. **Multiplayer-Ready**: Architecture supports future network synchronization

---

## Project Structure

```
Battle-2D-eath/
├── index.html                 # Entry point, canvas setup
├── styles/
│   └── main.css              # Minimal styling (canvas fullscreen, portrait lock)
├── src/
│   ├── main.js               # Application bootstrap, initialization
│   ├── config/
│   │   ├── constants.js      # Game constants (canvas size, FPS, etc.)
│   │   ├── characters.js     # Character definitions (Bolt, Boulder)
│   │   ├── weapons.js        # Weapon type definitions and tiers
│   │   ├── items.js          # Consumable item definitions
│   │   └── map.js            # Map configuration (size, spawn points)
│   ├── core/
│   │   ├── GameLoop.js       # Main game loop (update/render cycle)
│   │   ├── GameState.js      # Centralized state management
│   │   ├── EventBus.js       # Event system for inter-module communication
│   │   └── AssetLoader.js    # Preload images and future audio
│   ├── systems/
│   │   ├── InputSystem.js    # Touch input handling and virtual controls
│   │   ├── PhysicsSystem.js  # Movement, collision detection
│   │   ├── CombatSystem.js   # Damage calculation, weapon firing
│   │   ├── AISystem.js       # AI decision-making and behavior
│   │   ├── PickupSystem.js   # Item collection and inventory management
│   │   ├── SafeZoneSystem.js # Zone shrinking and damage
│   │   └── SpawnSystem.js    # Character and item spawning
│   ├── entities/
│   │   ├── Entity.js         # Base entity class
│   │   ├── Character.js      # Player/AI character entity
│   │   ├── Weapon.js         # Weapon entity and projectiles
│   │   ├── Item.js           # Pickup item entity
│   │   └── Projectile.js     # Projectile entity (spears, bullets)
│   ├── rendering/
│   │   ├── Renderer.js       # Main rendering coordinator
│   │   ├── CharacterRenderer.js   # Character drawing
│   │   ├── WeaponRenderer.js      # Weapon effects and projectiles
│   │   ├── UIRenderer.js          # HUD, minimap, buttons
│   │   ├── MapRenderer.js         # Terrain, bushes, obstacles
│   │   └── EffectsRenderer.js     # Visual effects, particles
│   ├── ui/
│   │   ├── VirtualJoystick.js    # Touch joystick component
│   │   ├── WeaponButtons.js      # Weapon firing buttons
│   │   ├── HUD.js                # Health bars, minimap
│   │   ├── InventoryUI.js        # Item slots display
│   │   └── MenuSystem.js         # Character select, game over screens
│   ├── ai/
│   │   ├── AIController.js       # Main AI coordinator
│   │   ├── AIBehaviors.js        # Behavior tree/state machine
│   │   ├── PathFinding.js        # Simple pathfinding (A* or grid-based)
│   │   └── AIPerception.js       # Vision, target detection
│   ├── utils/
│   │   ├── Vector2D.js           # 2D vector math utilities
│   │   ├── Collision.js          # Collision detection helpers
│   │   ├── MathUtils.js          # Math helpers (angles, distance, etc.)
│   │   └── Debug.js              # Debug visualization tools
│   └── network/
│       ├── NetworkManager.js     # Future: network communication
│       ├── StateSync.js          # Future: state synchronization
│       └── Interpolation.js      # Future: client-side prediction
├── assets/
│   ├── images/
│   │   ├── characters/
│   │   │   ├── bolt.png         # Bolt character sprite (64x64)
│   │   │   └── boulder.png      # Boulder character sprite (64x64)
│   │   └── ui/
│   │       └── icons/           # Future: item icons if needed
│   └── audio/                   # Future: sound effects and music
├── docs/
│   ├── GDD.md                   # Game Design Document
│   ├── ARCHITECTURE.md          # This document
│   └── API.md                   # Future: API documentation
└── tests/                       # Future: unit tests
    └── utils/
```

### File Purpose Summary

**Entry Point:**
- `index.html` - Minimal HTML with canvas element, loads main.js

**Core Systems:**
- `main.js` - Bootstrap application, initialize all systems
- `GameLoop.js` - Fixed timestep game loop at 60 FPS
- `GameState.js` - Single source of truth for game state
- `EventBus.js` - Pub/sub event system

**Configuration:**
- `constants.js` - Canvas dimensions, FPS target, physics constants
- `characters.js` - Character stat definitions
- `weapons.js` - Weapon types and tier modifiers
- `items.js` - Consumable item properties
- `map.js` - Map size, spawn points, terrain data

**Game Systems:**
- `InputSystem.js` - Process touch events, update virtual controls
- `PhysicsSystem.js` - Update positions, resolve collisions
- `CombatSystem.js` - Handle weapon firing, damage calculation
- `AISystem.js` - Update all AI characters each frame
- `PickupSystem.js` - Handle item pickup interactions
- `SafeZoneSystem.js` - Shrink zone, apply damage
- `SpawnSystem.js` - Spawn characters and items

---

## Core Systems Architecture

### 1. Game Loop Architecture

The game loop follows a fixed timestep pattern for consistent physics:

```
┌─────────────────────────────────────────────────────────┐
│                     GAME LOOP                           │
│                    (60 FPS Target)                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │   Process Input (Touch Events)      │
        │   - Read joystick state             │
        │   - Read button presses             │
        │   - Update input buffer             │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │   Update Game State (Fixed Step)    │
        │   - Update physics (movement)       │
        │   - Update AI decisions             │
        │   - Process combat                  │
        │   - Check collisions                │
        │   - Update safe zone                │
        │   - Update timers/cooldowns         │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │   Render Frame                      │
        │   - Clear canvas                    │
        │   - Draw map/terrain                │
        │   - Draw entities                   │
        │   - Draw effects                    │
        │   - Draw UI/HUD                     │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │   Request Next Frame                │
        │   (requestAnimationFrame)           │
        └─────────────────────────────────────┘
                          │
                          └──────┐
                                 │
                          (Loop back)
```

**Implementation Pattern:**
```javascript
// GameLoop.js structure
class GameLoop {
  constructor(updateCallback, renderCallback) {
    this.targetFPS = 60;
    this.targetFrameTime = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    this.accumulator = 0;
    this.update = updateCallback;
    this.render = renderCallback;
  }

  start() {
    this.running = true;
    this.loop(performance.now());
  }

  loop(currentTime) {
    if (!this.running) return;
    
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.accumulator += deltaTime;

    // Fixed timestep updates
    while (this.accumulator >= this.targetFrameTime) {
      this.update(this.targetFrameTime / 1000); // Convert to seconds
      this.accumulator -= this.targetFrameTime;
    }

    // Render with interpolation factor
    const interpolation = this.accumulator / this.targetFrameTime;
    this.render(interpolation);

    requestAnimationFrame((time) => this.loop(time));
  }
}
```

### 2. Entity System Architecture

Entity-Component pattern for game objects:

```
┌──────────────────────────────────────────────────────────┐
│                    Entity Base Class                     │
│  - id: unique identifier                                 │
│  - position: Vector2D                                    │
│  - rotation: number (radians)                            │
│  - active: boolean                                       │
└──────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │Character│     │ Weapon  │     │  Item   │
    └─────────┘     └─────────┘     └─────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────┐
│ Player │  │   AI   │
└────────┘  └────────┘
```

**Character Entity Structure:**
```javascript
class Character extends Entity {
  constructor(config) {
    super();
    // Core properties
    this.type = config.type; // 'bolt' or 'boulder'
    this.isPlayer = config.isPlayer;
    
    // Stats
    this.maxHP = config.maxHP;
    this.currentHP = config.maxHP;
    this.shield = 0;
    this.moveSpeed = config.moveSpeed;
    this.hitboxRadius = config.hitboxRadius;
    
    // Combat
    this.weapons = []; // Array of up to 3 weapons
    this.activeWeaponIndex = 0;
    this.specialAbilityCooldown = 0;
    
    // Inventory
    this.healthKits = []; // Max 2
    this.pickupSlots = []; // Max 2 (shield, trap, etc.)
    
    // State
    this.velocity = new Vector2D(0, 0);
    this.facingAngle = 0;
    this.isInBush = false;
    this.isDead = false;
    
    // AI-specific (if AI)
    this.aiController = config.isPlayer ? null : new AIController(this);
  }
}
```

### 3. Input System Architecture

Touch-based input with virtual controls:

```
┌──────────────────────────────────────────────────────────┐
│                    Touch Events                          │
│  (touchstart, touchmove, touchend, touchcancel)          │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │      Input System Router            │
        │  - Track active touches by ID       │
        │  - Route to appropriate handler     │
        └─────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │Joystick  │    │ Weapon   │    │   UI     │
    │ Handler  │    │ Buttons  │    │ Buttons  │
    └──────────┘    └──────────┘    └──────────┘
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │Movement  │    │Aim/Fire  │    │Menu/Item │
    │ Vector   │    │ Vector   │    │ Actions  │
    └──────────┘    └──────────┘    └──────────┘
```

**Input State Management:**
```javascript
class InputSystem {
  constructor() {
    this.touches = new Map(); // touchId -> touch data
    this.joystick = {
      active: false,
      origin: null,
      current: null,
      vector: new Vector2D(0, 0)
    };
    this.weaponButtons = [
      { pressed: false, aimVector: null },
      { pressed: false, aimVector: null },
      { pressed: false, aimVector: null }
    ];
    this.setupEventListeners();
  }

  // Returns normalized movement vector
  getMovementInput() {
    return this.joystick.vector.clone();
  }

  // Returns weapon firing data
  getWeaponInput(index) {
    return this.weaponButtons[index];
  }
}
```

### 4. Rendering Pipeline

Layered rendering approach:

```
Canvas Clear
     │
     ▼
┌─────────────────────────────────────┐
│  Layer 1: Map Background            │
│  - Terrain base color               │
│  - Water areas                      │
│  - Safe zone circle                 │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  Layer 2: Ground Objects            │
│  - Bushes                           │
│  - Obstacles                        │
│  - Dropped items                    │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  Layer 3: Characters                │
│  - AI characters (sorted by Y)      │
│  - Player character                 │
│  - Health bars above characters     │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  Layer 4: Projectiles/Effects       │
│  - Active projectiles               │
│  - Weapon effects                   │
│  - Damage numbers                   │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  Layer 5: UI Overlay                │
│  - Minimap                          │
│  - Health/shield bars               │
│  - Virtual joystick                 │
│  - Weapon buttons                   │
│  - Item slots                       │
└─────────────────────────────────────┘
```

**Renderer Coordinator:**
```javascript
class Renderer {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.canvas = canvas;
    
    // Sub-renderers
    this.mapRenderer = new MapRenderer(this.ctx);
    this.characterRenderer = new CharacterRenderer(this.ctx);
    this.weaponRenderer = new WeaponRenderer(this.ctx);
    this.uiRenderer = new UIRenderer(this.ctx);
    this.effectsRenderer = new EffectsRenderer(this.ctx);
  }

  render(gameState, interpolation) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render layers in order
    this.mapRenderer.render(gameState.map, gameState.safeZone);
    this.characterRenderer.render(gameState.characters, interpolation);
    this.weaponRenderer.render(gameState.projectiles, gameState.effects);
    this.effectsRenderer.render(gameState.effects);
    this.uiRenderer.render(gameState.player, gameState.ui);
  }
}
```

### 5. Collision Detection System

Simple but efficient collision detection:

```
┌──────────────────────────────────────────────────────────┐
│              Spatial Partitioning Grid                   │
│  Divide map into cells for broad-phase detection         │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │   Broad Phase: Grid Check           │
        │   - Only check entities in nearby   │
        │     grid cells                      │
        │   - Reduces O(n²) to O(n)           │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │   Narrow Phase: Shape Check         │
        │   - Circle-Circle (characters)      │
        │   - Circle-Rectangle (obstacles)    │
        │   - Point-Circle (projectiles)      │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │   Collision Response                │
        │   - Separate overlapping entities   │
        │   - Apply damage if needed          │
        │   - Trigger pickup events           │
        └─────────────────────────────────────┘
```

### 6. State Management

Centralized game state with clear structure:

```javascript
class GameState {
  constructor() {
    // Match state
    this.phase = 'menu'; // 'menu', 'playing', 'gameOver'
    this.matchTime = 0;
    
    // Entities
    this.player = null;
    this.characters = []; // All characters (player + AI)
    this.projectiles = [];
    this.items = []; // Pickups on ground
    this.effects = []; // Visual effects
    
    // Map
    this.map = {
      width: 2000,
      height: 2000,
      bushes: [],
      obstacles: [],
      water: []
    };
    
    // Safe zone
    this.safeZone = {
      centerX: 1000,
      centerY: 1000,
      radius: 1000,
      phase: 0,
      nextShrinkTime: 30000
    };
    
    // UI state
    this.ui = {
      selectedCharacter: null,
      showMinimap: true,
      debugMode: false
    };
    
    // Statistics
    this.stats = {
      kills: 0,
      damageDealt: 0,
      survivalTime: 0
    };
  }
}
```

### 7. AI System Architecture

Behavior-driven AI with state machine:

```
┌──────────────────────────────────────────────────────────┐
│                  AI Controller                           │
│  Manages AI character decision-making                    │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │      Perception System              │
        │  - Detect nearby entities           │
        │  - Check line of sight              │
        │  - Update threat assessment         │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │      Behavior State Machine         │
        │  Current State determines actions   │
        └─────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┬───────────────┐
          │               │               │               │
          ▼               ▼               ▼               ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │ IDLE/   │     │ SEEKING │     │ COMBAT  │     │ FLEEING │
    │ PATROL  │     │ LOOT    │     │         │     │         │
    └─────────┘     └─────────┘     └─────────┘     └─────────┘
```

---

## Data Structures

### 1. Character Configuration

```javascript
// config/characters.js
export const CHARACTERS = {
  bolt: {
    name: 'Bolt',
    type: 'bolt',
    maxHP: 80,
    moveSpeed: 250,
    hitboxRadius: 20,
    weaponCooldownMultiplier: 0.85,
    specialAbility: {
      type: 'dash',
      cooldown: 8000,
      dashDistance: 150
    }
  },
  boulder: {
    name: 'Boulder',
    type: 'boulder',
    maxHP: 140,
    moveSpeed: 180,
    hitboxRadius: 28,
    weaponCooldownMultiplier: 1.2,
    specialAbility: {
      type: 'groundSlam',
      cooldown: 12000,
      baseDamage: 40
    }
  }
};
```

### 2. Weapon Definitions

```javascript
// config/weapons.js
export const WEAPON_TYPES = {
  blaster: {
    type: 'blaster',
    attackType: 'cone',
    baseDamage: 25,
    baseRange: 150,
    baseCooldown: 1500,
    coneAngle: 45,
    tierMultipliers: {
      damage: [1.0, 1.4, 1.8],
      range: [1.0, 1.3, 1.6]
    }
  },
  spear: {
    type: 'spear',
    attackType: 'projectile',
    baseDamage: 35,
    baseRange: 300,
    baseCooldown: 2000,
    projectileSpeed: 500,
    tierMultipliers: {
      damage: [1.0, 1.4, 1.8],
      range: [1.0, 1.3, 1.6]
    }
  },
  bomb: {
    type: 'bomb',
    attackType: 'aoe',
    baseDamage: 45,
    baseRange: 250,
    baseCooldown: 3000,
    explosionRadius: 80,
    arcHeight: 100,
    tierMultipliers: {
      damage: [1.0, 1.4, 1.8],
      range: [1.0, 1.3, 1.6]
    }
  },
  gun: {
    type: 'gun',
    attackType: 'burst',
    baseDamage: 15,
    baseRange: 280,
    baseCooldown: 1800,
    burstCount: 3,
    burstDelay: 100,
    projectileSpeed: 600,
    tierMultipliers: {
      damage: [1.0, 1.4, 1.8],
      range: [1.0, 1.3, 1.6]
    }
  }
};
```

### 3. Item Definitions

```javascript
// config/items.js
export const ITEMS = {
  healthKit: {
    type: 'healthKit',
    category: 'health',
    healAmount: 0.3, // 30% of max HP
    useTime: 0,
    maxStack: 2
  },
  shieldPotion: {
    type: 'shieldPotion',
    category: 'pickup',
    shieldAmount: 50,
    useTime: 1000,
    maxStack: 1
  },
  adrenaline: {
    type: 'adrenaline',
    category: 'pickup',
    speedMultiplier: 1.3,
    duration: 3000,
    useTime: 500,
    maxStack: 1
  },
  trap: {
    type: 'trap',
    category: 'pickup',
    rootDuration: 2000,
    damagePerTick: 5,
    tickRate: 500,
    lifetime: 60000,
    maxStack: 1
  },
  invulnerability: {
    type: 'invulnerability',
    category: 'pickup',
    duration: 3000,
    useTime: 500,
    maxStack: 1
  }
};
```

### 4. Map Configuration

```javascript
// config/map.js
export const MAP_CONFIG = {
  width: 2000,
  height: 2000,
  centerX: 1000,
  centerY: 1000,
  
  // Spawn configuration
  characterSpawns: [
    // 24 spawn points around edge
    { x: 1000, y: 200 },
    { x: 1200, y: 250 },
    // ... more spawn points
  ],
  
  weaponSpawns: [
    // 30-40 weapon spawn locations
    { x: 500, y: 500, respawnTime: 30000 },
    { x: 800, y: 600, respawnTime: 30000 },
    // ... more weapon spawns
  ],
  
  itemSpawns: [
    // 20-30 item spawn locations
    { x: 600, y: 700, respawnTime: 20000 },
    // ... more item spawns
  ],
  
  // Terrain features
  bushes: [
    { x: 400, y: 400, radius: 50 },
    { x: 1200, y: 800, radius: 60 },
    // ... more bushes
  ],
  
  obstacles: [
    { x: 700, y: 700, width: 80, height: 80 },
    { x: 1300, y: 1100, width: 100, height: 60 },
    // ... more obstacles
  ],
  
  water: [
    { x: 300, y: 1500, width: 200, height: 150 },
    // ... more water areas
  ],
  
  // Safe zone schedule
  safeZonePhases: [
    { time: 0, radius: 1000, damage: 0 },
    { time: 30000, radius: 700, damage: 2 },
    { time: 120000, radius: 400, damage: 5 },
    { time: 210000, radius: 200, damage: 10 },
    { time: 300000, radius: 100, damage: 20 }
  ]
};
```

---

## Module Dependencies

### Dependency Graph

```
main.js
  │
  ├─> AssetLoader
  ├─> GameState
  ├─> EventBus
  ├─> GameLoop
  │     ├─> InputSystem
  │     │     ├─> VirtualJoystick
  │     │     └─> WeaponButtons
  │     │
  │     ├─> PhysicsSystem
  │     │     ├─> Collision
  │     │     └─> Vector2D
  │     │
  │     ├─> CombatSystem
  │     │     ├─> Weapon
  │     │     ├─> Projectile
  │     │     └─> EventBus
  │     │
  │     ├─> AISystem
  │     │     ├─> AIController
  │     │     ├─> AIBehaviors
  │     │     ├─> AIPerception
  │     │     └─> PathFinding
  │     │
  │     ├─> PickupSystem
  │     ├─> SafeZoneSystem
  │     └─> SpawnSystem
  │
  └─> Renderer
        ├─> MapRenderer
        ├─> CharacterRenderer
        ├─> WeaponRenderer
        ├─> EffectsRenderer
        └─> UIRenderer
              ├─> HUD
              ├─> InventoryUI
              └─> MenuSystem
```

### Import/Export Pattern

```javascript
// Example: main.js
import { GameLoop } from './core/GameLoop.js';
import { GameState } from './core/GameState.js';
import { EventBus } from './core/EventBus.js';
import { AssetLoader } from './core/AssetLoader.js';
import { InputSystem } from './systems/InputSystem.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { Renderer } from './rendering/Renderer.js';
import { CONSTANTS } from './config/constants.js';

// Initialize systems
const gameState = new GameState();
const eventBus = new EventBus();
const assetLoader = new AssetLoader();
const inputSystem = new InputSystem(canvas, eventBus);
const physicsSystem = new PhysicsSystem(gameState);
const renderer = new Renderer(canvas);

// Create game loop
const gameLoop = new GameLoop(
  (deltaTime) => update(deltaTime),
  (interpolation) => render(interpolation)
);
```

### Communication Patterns

**Event Bus for Loose Coupling:**
```javascript
// Publisher
eventBus.emit('characterDamaged', {
  characterId: character.id,
  damage: 25,
  source: 'weapon'
});

// Subscriber
eventBus.on('characterDamaged', (data) => {
  // Update UI, play sound, etc.
  updateHealthBar(data.characterId, data.damage);
});
```

**Direct Method Calls for Tight Coupling:**
```javascript
// PhysicsSystem directly calls collision detection
const collision = Collision.circleCircle(
  entity1.position, entity1.hitboxRadius,
  entity2.position, entity2.hitboxRadius
);
```

---

## Code Organization Patterns

### 1. Naming Conventions

**Files:**
- PascalCase for classes: `GameLoop.js`, `Character.js`
- camelCase for utilities: `constants.js`, `mathUtils

### 1. Naming Conventions

**Files:**
- PascalCase for classes: `GameLoop.js`, `Character.js`
- camelCase for utilities: `constants.js`, `mathUtils.js`
- Descriptive names indicating purpose

**Variables:**
- camelCase: `playerHealth`, `weaponCooldown`
- UPPER_SNAKE_CASE for constants: `MAX_PLAYERS`, `CANVAS_WIDTH`
- Descriptive names, avoid abbreviations

**Functions:**
- camelCase: `updatePosition()`, `calculateDamage()`
- Verb-based names indicating action
- Prefix with `get` for getters, `set` for setters, `is/has` for booleans

**Classes:**
- PascalCase: `GameLoop`, `InputSystem`
- Noun-based names
- Suffix with purpose: `System`, `Manager`, `Controller`, `Renderer`

### 2. Module Structure Pattern

```javascript
// Standard module structure
// 1. Imports
import { Vector2D } from '../utils/Vector2D.js';
import { CONSTANTS } from '../config/constants.js';

// 2. Constants (module-specific)
const PRIVATE_CONSTANT = 100;

// 3. Class definition
export class ModuleName {
  constructor(dependencies) {
    // Initialize properties
    this.dependency = dependencies;
    this.privateState = {};
  }

  // 4. Public methods
  publicMethod() {
    // Implementation
  }

  // 5. Private methods (prefix with _)
  _privateMethod() {
    // Implementation
  }
}

// 6. Helper functions (if needed)
function helperFunction() {
  // Implementation
}
```

### 3. Error Handling Pattern

```javascript
class GameSystem {
  update(deltaTime) {
    try {
      // Critical game logic
      this._updateEntities(deltaTime);
    } catch (error) {
      console.error(`Error in ${this.constructor.name}:`, error);
      // Graceful degradation - continue game loop
      // Log error for debugging but don't crash
    }
  }

  _updateEntities(deltaTime) {
    // Validate inputs
    if (!deltaTime || deltaTime <= 0) {
      console.warn('Invalid deltaTime:', deltaTime);
      return;
    }
    
    // Process entities
    this.entities.forEach(entity => {
      if (entity && entity.active) {
        entity.update(deltaTime);
      }
    });
  }
}
```

### 4. Debug Utilities Pattern

```javascript
// utils/Debug.js
export class Debug {
  static enabled = false;

  static draw(ctx, gameState) {
    if (!this.enabled) return;

    // Draw collision boxes
    gameState.characters.forEach(char => {
      ctx.strokeStyle = 'red';
      ctx.beginPath();
      ctx.arc(char.position.x, char.position.y, char.hitboxRadius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw AI state
    gameState.characters.forEach(char => {
      if (char.aiController) {
        ctx.fillStyle = 'white';
        ctx.fillText(char.aiController.state, char.position.x, char.position.y - 40);
      }
    });

    // Draw FPS
    ctx.fillStyle = 'yellow';
    ctx.fillText(`FPS: ${Math.round(1000 / gameState.deltaTime)}`, 10, 20);
  }

  static log(...args) {
    if (this.enabled) {
      console.log('[DEBUG]', ...args);
    }
  }
}
```

---

## Scalability & Multiplayer Considerations

### Network Synchronization Points

The architecture is designed with clear synchronization boundaries for future multiplayer:

```
Client A                    Server                    Client B
    │                          │                          │
    │  ┌──────────────────┐    │                          │
    │  │ Input Prediction │    │                          │
    │  └──────────────────┘    │                          │
    │         │                │                          │
    │         ▼                │                          │
    │  ┌──────────────────┐    │                          │
    │  │ Send Input       │────┼──────────────────────────┤
    │  └──────────────────┘    │                          │
    │                          │                          │
    │                    ┌─────▼─────┐                    │
    │                    │ Authoritative│                 │
    │                    │ Game State  │                  │
    │                    │ Update      │                  │
    │                    └─────┬─────┘                    │
    │                          │                          │
    │  ┌──────────────────┐    │    ┌──────────────────┐ │
    ├──┤ Receive State    │◄───┼────┤ Broadcast State  │ │
    │  └──────────────────┘    │    └──────────────────┘ │
    │         │                │                          │
    │         ▼                │                          │
    │  ┌──────────────────┐    │                          │
    │  │ Interpolation    │    │                          │
    │  └──────────────────┘    │                          │
    │         │                │                          │
    │         ▼                │                          │
    │  ┌──────────────────┐    │                          │
    │  │ Render           │    │                          │
    │  └──────────────────┘    │                          │
```

### Multiplayer-Ready Design Decisions

**1. Deterministic Game Logic:**
```javascript
// All game logic uses fixed timestep
// Same inputs + same state = same output
class PhysicsSystem {
  update(deltaTime) {
    // Fixed timestep ensures consistency
    const dt = 1/60; // Always 16.67ms
    
    // Deterministic movement
    character.position.x += character.velocity.x * dt;
    character.position.y += character.velocity.y * dt;
  }
}
```

**2. Separate Input from Simulation:**
```javascript
// Input is buffered and processed separately
class InputSystem {
  getInputSnapshot() {
    // Return immutable input state
    return {
      timestamp: Date.now(),
      movement: this.joystick.vector.clone(),
      actions: [...this.actions]
    };
  }
}

// Simulation processes input snapshots
class GameLoop {
  update(deltaTime) {
    const input = this.inputSystem.getInputSnapshot();
    // In multiplayer: send input to server
    // Server processes all inputs and returns state
    this.physicsSystem.update(deltaTime, input);
  }
}
```

**3. State Serialization:**
```javascript
// GameState can be serialized for network transmission
class GameState {
  serialize() {
    return {
      timestamp: this.matchTime,
      characters: this.characters.map(c => ({
        id: c.id,
        position: { x: c.position.x, y: c.position.y },
        rotation: c.rotation,
        hp: c.currentHP,
        shield: c.shield,
        weapons: c.weapons.map(w => w.type)
      })),
      projectiles: this.projectiles.map(p => ({
        id: p.id,
        position: { x: p.position.x, y: p.position.y },
        velocity: { x: p.velocity.x, y: p.velocity.y }
      }))
    };
  }

  deserialize(data) {
    // Reconstruct state from network data
    this.matchTime = data.timestamp;
    // Update entities...
  }
}
```

**4. Client-Side Prediction:**
```javascript
// network/Interpolation.js
export class Interpolation {
  constructor() {
    this.serverStates = []; // Buffer of server states
    this.renderDelay = 100; // 100ms behind server
  }

  // Interpolate between two server states
  interpolate(currentTime) {
    const renderTime = currentTime - this.renderDelay;
    
    // Find two states to interpolate between
    const state1 = this.findState(renderTime);
    const state2 = this.findState(renderTime + 16.67);
    
    if (!state1 || !state2) return state1 || state2;
    
    // Calculate interpolation factor
    const t = (renderTime - state1.timestamp) / (state2.timestamp - state1.timestamp);
    
    // Interpolate positions
    return this.lerp(state1, state2, t);
  }
}
```

### Network Module Structure (Future)

```javascript
// network/NetworkManager.js
export class NetworkManager {
  constructor(gameState, eventBus) {
    this.gameState = gameState;
    this.eventBus = eventBus;
    this.socket = null;
    this.isConnected = false;
  }

  connect(serverUrl) {
    // WebSocket connection
    this.socket = new WebSocket(serverUrl);
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleServerMessage(data);
    };
  }

  sendInput(inputSnapshot) {
    if (!this.isConnected) return;
    
    this.socket.send(JSON.stringify({
      type: 'input',
      data: inputSnapshot
    }));
  }

  handleServerMessage(message) {
    switch(message.type) {
      case 'stateUpdate':
        this.gameState.deserialize(message.data);
        break;
      case 'playerJoined':
        this.eventBus.emit('playerJoined', message.data);
        break;
      case 'playerLeft':
        this.eventBus.emit('playerLeft', message.data);
        break;
    }
  }
}
```

### Scalability Features

**1. Entity Pooling:**
```javascript
// Reuse objects instead of creating/destroying
class ProjectilePool {
  constructor(size = 100) {
    this.pool = [];
    this.active = [];
    
    // Pre-allocate projectiles
    for (let i = 0; i < size; i++) {
      this.pool.push(new Projectile());
    }
  }

  acquire(config) {
    let projectile = this.pool.pop();
    if (!projectile) {
      projectile = new Projectile();
    }
    
    projectile.reset(config);
    this.active.push(projectile);
    return projectile;
  }

  release(projectile) {
    const index = this.active.indexOf(projectile);
    if (index > -1) {
      this.active.splice(index, 1);
      this.pool.push(projectile);
    }
  }
}
```

**2. Spatial Partitioning:**
```javascript
// Efficient collision detection using grid
class SpatialGrid {
  constructor(width, height, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.cells = new Map();
  }

  insert(entity) {
    const cellX = Math.floor(entity.position.x / this.cellSize);
    const cellY = Math.floor(entity.position.y / this.cellSize);
    const key = `${cellX},${cellY}`;
    
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key).push(entity);
  }

  getNearby(position, radius) {
    const nearby = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerX = Math.floor(position.x / this.cellSize);
    const centerY = Math.floor(position.y / this.cellSize);
    
    for (let x = centerX - cellRadius; x <= centerX + cellRadius; x++) {
      for (let y = centerY - cellRadius; y <= centerY + cellRadius; y++) {
        const key = `${x},${y}`;
        if (this.cells.has(key)) {
          nearby.push(...this.cells.get(key));
        }
      }
    }
    
    return nearby;
  }
}
```

**3. Easy Content Addition:**
```javascript
// Adding new character is just config
// config/characters.js
export const CHARACTERS = {
  // Existing characters...
  bolt: { /* ... */ },
  boulder: { /* ... */ },
  
  // New character - just add config
  shadow: {
    name: 'Shadow',
    type: 'shadow',
    maxHP: 100,
    moveSpeed: 230,
    hitboxRadius: 22,
    weaponCooldownMultiplier: 0.95,
    specialAbility: {
      type: 'teleport',
      cooldown: 10000,
      range: 200
    }
  }
};

// No code changes needed - system reads from config
```

---

## Performance Optimization

### Mobile Performance Targets

- **Frame Rate**: Maintain 60 FPS on mid-range devices
- **Memory**: Keep under 100MB RAM usage
- **Battery**: Minimize CPU/GPU usage
- **Load Time**: Under 3 seconds initial load

### Optimization Strategies

**1. Canvas Optimization:**
```javascript
class Renderer {
  render(gameState) {
    // Save/restore only when necessary
    this.ctx.save();
    
    // Use integer positions for crisp rendering
    const x = Math.round(entity.position.x);
    const y = Math.round(entity.position.y);
    
    // Batch similar draw calls
    this.ctx.fillStyle = color;
    entities.forEach(e => {
      this.ctx.fillRect(e.x, e.y, e.width, e.height);
    });
    
    this.ctx.restore();
  }

  // Avoid clearing entire canvas if possible
  clearDirtyRegions() {
    this.dirtyRegions.forEach(region => {
      this.ctx.clearRect(region.x, region.y, region.width, region.height);
    });
  }
}
```

**2. Culling Off-Screen Entities:**
```javascript
class Renderer {
  render(gameState) {
    const camera = gameState.camera;
    
    // Only render entities in viewport
    const visibleEntities = gameState.characters.filter(char => {
      return this.isInViewport(char.position, camera);
    });
    
    visibleEntities.forEach(entity => {
      this.drawEntity(entity);
    });
  }

  isInViewport(position, camera) {
    const margin = 100; // Small margin for smooth entry
    return position.x > camera.x - margin &&
           position.x < camera.x + camera.width + margin &&
           position.y > camera.y - margin &&
           position.y < camera.y + camera.height + margin;
  }
}
```

**3. Efficient Collision Detection:**
```javascript
class PhysicsSystem {
  update(deltaTime) {
    // Use spatial grid for broad phase
    this.spatialGrid.clear();
    this.entities.forEach(e => this.spatialGrid.insert(e));
    
    // Only check nearby entities
    this.entities.forEach(entity => {
      const nearby = this.spatialGrid.getNearby(entity.position, entity.hitboxRadius * 2);
      
      nearby.forEach(other => {
        if (entity !== other) {
          this.checkCollision(entity, other);
        }
      });
    });
  }
}
```

**4. Asset Optimization:**
```javascript
class AssetLoader {
  async loadAssets() {
    // Load critical assets first
    await this.loadCritical([
      'characters/bolt.png',
      'characters/boulder.png'
    ]);
    
    // Load non-critical assets in background
    this.loadNonCritical([
      'ui/icons.png',
      'effects/particles.png'
    ]);
  }
}
```

**5. Memory Management:**
```javascript
class GameState {
  cleanupEntities() {
    // Remove dead entities
    this.characters = this.characters.filter(c => !c.isDead);
    this.projectiles = this.projectiles.filter(p => p.active);
    
    // Limit effect count
    if (this.effects.length > 100) {
      this.effects = this.effects.slice(-50);
    }
    
    // Clear old events
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-500);
    }
  }
}
```

---

## Development Workflow

### Phase 1 Implementation Guide

**Goal**: Character movement with virtual joystick

**Step-by-Step Implementation:**

1. **Setup Project Structure** (30 min)
   - Create all folders
   - Create `index.html` with canvas
   - Create `main.css` for portrait orientation
   - Setup ES6 module structure

2. **Implement Core Systems** (1 hour)
   - `GameLoop.js` - Fixed timestep loop
   - `GameState.js` - Basic state management
   - `Vector2D.js` - Math utilities
   - `constants.js` - Canvas size, FPS

3. **Implement Input System** (1.5 hours)
   - `InputSystem.js` - Touch event handling
   - `VirtualJoystick.js` - Joystick component
   - Test touch detection and vector calculation

4. **Implement Character** (1 hour)
   - `Entity.js` - Base entity class
   - `Character.js` - Character with position/velocity
   - Load Bolt character config

5. **Implement Movement** (1 hour)
   - `PhysicsSystem.js` - Apply velocity to position
   - Connect joystick input to character velocity
   - Add boundary collision

6. **Implement Rendering** (1.5 hours)
   - `Renderer.js` - Main renderer
   - `CharacterRenderer.js` - Draw character (circle or PNG)
   - `UIRenderer.js` - Draw joystick
   - `MapRenderer.js` - Draw background

7. **Integration & Testing** (1 hour)
   - Connect all systems in `main.js`
   - Test on mobile device
   - Adjust joystick sensitivity
   - Verify 60 FPS performance

**Total Time**: ~7 hours for Phase 1

### Testing Strategy

**Unit Testing (Future):**
```javascript
// tests/utils/Vector2D.test.js
import { Vector2D } from '../../src/utils/Vector2D.js';

describe('Vector2D', () => {
  test('normalize returns unit vector', () => {
    const v = new Vector2D(3, 4);
    v.normalize();
    expect(v.magnitude()).toBeCloseTo(1.0);
  });

  test('distance calculation is correct', () => {
    const v1 = new Vector2D(0, 0);
    const v2 = new Vector2D(3, 4);
    expect(v1.distanceTo(v2)).toBe(5);
  });
});
```

**Manual Testing Checklist:**

Phase 1:
- [ ] Canvas renders at correct size
- [ ] Joystick appears in bottom-left
- [ ] Touch moves joystick knob
- [ ] Character moves in joystick direction
- [ ] Character stops when joystick released
- [ ] Character stays within boundaries
- [ ] Maintains 60 FPS on mobile

Phase 2:
- [ ] Weapon button appears
- [ ] Tap fires weapon
- [ ] Weapon effect renders
- [ ] Cooldown prevents spam
- [ ] Hit detection works

### Debug Tools

**Enable Debug Mode:**
```javascript
// In browser console or via UI toggle
window.DEBUG = true;

// Or via URL parameter
const urlParams = new URLSearchParams(window.location.search);
Debug.enabled = urlParams.has('debug');
```

**Debug Visualizations:**
- Collision boxes (red circles)
- AI state labels
- FPS counter
- Input vectors
- Safe zone boundary
- Spatial grid cells

### Build & Deployment

**Development:**
```bash
# Simple HTTP server for local testing
python3 -m http.server 8000
# or
npx serve
```

### Code Review Checklist

Before committing code:
- [ ] Code follows naming conventions
- [ ] No console.log in production code (use Debug.log)
- [ ] Functions are under 50 lines
- [ ] Classes have single responsibility
- [ ] Comments explain "why", not "what"
- [ ] No magic numbers (use constants)
- [ ] Error handling is present
- [ ] Performance tested on mobile

---

### Next Steps

1. Review this architecture document
2. Set up project structure
3. Begin Phase 1 implementation (character movement)
4. Test on mobile device early and often
5. Iterate based on performance and feel