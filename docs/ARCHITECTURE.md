# Battle-2D-eath Technical Architecture

## Overview

Battle-2D-eath is built with vanilla JavaScript and HTML5 Canvas using a clean, modular architecture with clear system boundaries.

### Technology Stack

- **Language:** Vanilla JavaScript (ES6+)
- **Rendering:** HTML5 Canvas 2D API
- **Module System:** ES6 Modules (import/export)
- **State Management:** Centralized [`GameState`](../src/core/GameState.js)
- **Event System:** [`EventBus`](../src/core/EventBus.js) for decoupled communication
- **Performance:** Fixed timestep game loop targeting 60 FPS

### Architecture Principles

1. **Separation of Concerns** - Clear boundaries between systems
2. **Data-Driven Design** - Behavior defined by configuration, not hardcoded
3. **Event-Driven Communication** - Systems communicate via events
4. **ECS-Like Pattern** - Entities with behavior driven by systems
5. **No External Dependencies** - Pure vanilla JavaScript

---

## Project Structure

```
Battle-2D-eath/
├── index.html              # Main game entry
├── editor.html             # Map editor entry
├── src/
│   ├── main.js            # Bootstrap and initialization
│   ├── config/
│   │   ├── constants.js   # Game constants
│   │   ├── characters.js  # Character definitions
│   │   ├── weapons.js     # Weapon definitions
│   │   ├── consumables.js # Consumable definitions
│   │   ├── gameConfig.js  # General game configuration
│   │   └── map.js         # Map loading and configuration
│   ├── core/
│   │   ├── GameLoop.js    # Fixed timestep game loop
│   │   ├── GameState.js   # Centralized state management
│   │   ├── EventBus.js    # Pub/sub event system
│   │   └── AssetLoader.js # PNG asset loading
│   ├── systems/
│   │   ├── InputSystem.js     # Touch input handling
│   │   ├── PhysicsSystem.js   # Movement and collision
│   │   ├── CombatSystem.js    # Weapon firing and damage
│   │   ├── AISystem.js        # AI decision-making
│   │   ├── SafeZoneSystem.js  # Zone shrinking
│   │   ├── CameraSystem.js    # Camera following
│   │   └── AbilitySystem.js   # Character abilities
│   ├── entities/
│   │   ├── Entity.js      # Base entity class
│   │   ├── Character.js   # Character base
│   │   ├── Player.js      # Player-specific logic
│   │   ├── AICharacter.js # AI-specific logic
│   │   ├── Weapon.js      # Weapon entity
│   │   └── Consumable.js  # Consumable entity
│   ├── renderer/
│   │   ├── Renderer.js            # Main coordinator
│   │   ├── CharacterRenderer.js   # Character drawing
│   │   ├── UIRenderer.js          # HUD and UI
│   │   ├── VirtualJoystick.js     # Joystick component
│   │   ├── StartScreen.js         # Character/map selection
│   │   ├── MapRenderer.js         # Map terrain
│   │   ├── MinimapRenderer.js     # Minimap
│   │   ├── WeaponButton.js        # Weapon UI
│   │   ├── AbilityButton.js       # Ability UI
│   │   ├── ConsumableButton.js    # Consumable UI
│   │   └── WeaponRenderer.js      # Weapon effects
│   ├── editor/
│   │   ├── editorMain.js  # Editor bootstrap
│   │   ├── MapEditor.js   # Editor logic
│   │   └── EditorUI.js    # Editor interface
│   └── utils/
│       └── Vector2D.js    # 2D vector math
├── maps/
│   ├── manifest.json      # Map registry
│   ├── *.json             # Map files
│   └── backgrounds/       # Custom map backgrounds
├── assets/
│   ├── characters/        # Character PNGs
│   ├── weapons/           # Weapon PNGs
│   └── consumables/       # Consumable PNGs
└── docs/                  # Documentation
```

---

## Core Systems

### Game Loop ([`GameLoop.js`](../src/core/GameLoop.js))

Fixed timestep loop ensuring consistent physics regardless of frame rate.

**Flow:**
1. Process input events
2. Update game state (fixed 16.67ms steps)
3. Render frame
4. Request next frame via `requestAnimationFrame`

**Key Features:**
- Accumulator pattern for fixed timestep
- Interpolation for smooth rendering
- 60 FPS target

### Game State ([`GameState.js`](../src/core/GameState.js))

Centralized state management - single source of truth.

**Contains:**
- `player` - Player character
- `characters` - All characters (player + AI)
- `consumables` - Pickups on ground
- `map` - Current map data
- `safeZone` - Zone state and damage
- `camera` - Camera position and viewport
- `ui` - UI state and stats

### Event Bus ([`EventBus.js`](../src/core/EventBus.js))

Pub/sub system for decoupled communication between systems.

**Common Events:**
- `characterDamaged` - When character takes damage
- `characterDied` - When character dies
- `weaponFired` - When weapon is used
- `itemPickedUp` - When item is collected
- `safeZoneShrinking` - When zone begins shrinking

### Input System ([`InputSystem.js`](../src/systems/InputSystem.js))

Handles touch and mouse input, manages virtual controls.

**Components:**
- Virtual joystick for movement
- Weapon buttons with aim preview
- Ability button
- Consumable buttons

**Input State:**
- Movement vector from joystick
- Weapon aim vectors
- Button press states
- Touch tracking

### Physics System ([`PhysicsSystem.js`](../src/systems/PhysicsSystem.js))

Updates entity positions and handles collisions.

**Responsibilities:**
- Apply velocity to positions
- Boundary collision (keep entities on map)
- Entity-entity collision (characters, obstacles)
- Terrain effects (water slows movement)
- Bush stealth detection

### Combat System ([`CombatSystem.js`](../src/systems/CombatSystem.js))

Manages weapon firing and damage calculation.

**Weapon Types:**
- **Blaster** - Cone area attack
- **Spear** - Line projectile
- **Bomb** - Arc projectile with AoE
- **Gun** - Burst fire projectiles

**Damage Formula:**
```javascript
damage = weaponBaseDamage * tierMultiplier
```

### AI System ([`AISystem.js`](../src/systems/AISystem.js))

Controls AI opponent behavior and decision-making.

**AI States:**
- `exploring` - Moving around map
- `seeking_weapon` - Going to weapon pickup
- `seeking_consumable` - Going to health/shield
- `engaging` - Attacking visible enemy
- `fleeing` - Running from danger at low HP
- `moving_to_safe_zone` - Avoiding zone damage

**AI Features:**
- Line-of-sight perception
- Weapon preference based on character type
- Dynamic threat assessment
- Obstacle avoidance
- Safe zone awareness

### Safe Zone System ([`SafeZoneSystem.js`](../src/systems/SafeZoneSystem.js))

Manages zone shrinking and damage.

**Phases:**
- Phase 0: Full map, no damage (30s)
- Phase 1-3: Progressive shrinking with increasing damage

**Damage:**
- Applied every 0.5s when outside zone
- Bypasses shield
- Increases each phase

### Ability System ([`AbilitySystem.js`](../src/systems/AbilitySystem.js))

Handles character special abilities.

**Abilities:**
- **Bolt Dash** - Speed boost for 3 seconds
- **Boulder Slam** - AoE damage with stun, shows preview during charge

---

## Entity System

### Base Entity ([`Entity.js`](../src/entities/Entity.js))

All game objects inherit from `Entity`:

```javascript
class Entity {
  constructor() {
    this.id = generateUniqueId();
    this.position = new Vector2D(0, 0);
    this.rotation = 0;
    this.active = true;
  }
}
```

### Character ([`Character.js`](../src/entities/Character.js))

Base character class extended by [`Player`](../src/entities/Player.js) and [`AICharacter`](../src/entities/AICharacter.js).

**Properties:**
- Stats: HP, shield, speed, hitbox
- Weapons: Up to 3 equipped
- Consumables: Health kits and pickup slots
- State: Velocity, facing angle, in bush, dead

### Player ([`Player.js`](../src/entities/Player.js))

Player-controlled character with input handling.

### AICharacter ([`AICharacter.js`](../src/entities/AICharacter.js))

AI-controlled character with state machine logic.

---

## Rendering Pipeline

### Renderer ([`Renderer.js`](../src/renderer/Renderer.js))

Coordinates all rendering, draws in layers:

**Layer Order:**
1. Map background (color or image)
2. Terrain (water, safe zone)
3. Ground objects (bushes, obstacles, pickups)
4. Characters (sorted by Y position)
5. Weapon effects (projectiles, explosions)
6. UI overlay (HUD, joystick, buttons)

### Character Renderer ([`CharacterRenderer.js`](../src/renderer/CharacterRenderer.js))

Draws characters with PNG images or circle fallbacks.

**Features:**
- Rotation to face direction
- Health bar above character
- Shield indicator
- Player outline for distinction

### Map Renderer ([`MapRenderer.js`](../src/renderer/MapRenderer.js))

Draws map terrain and features.

**Elements:**
- Background (solid color or tiled image)
- Safe zone circle
- Water areas
- Obstacles
- Bushes

### UI Renderer ([`UIRenderer.js`](../src/renderer/UIRenderer.js))

Draws HUD and interface elements.

**Components:**
- Game info (timer, players remaining, kills)
- Health/shield bars
- Minimap
- Debug info (if enabled)

---

## Configuration System

All game behavior is data-driven via configuration files in [`src/config/`](../src/config/).

### Character Config ([`characters.js`](../src/config/characters.js))

Defines Bolt and Boulder stats:

```javascript
export const CHARACTERS = {
  bolt: {
    name: 'Bolt',
    maxHP: 80, //max base of 100 (can go over with modifiers)
    moveSpeed: 100, //max base of 100 (can go over with modifiers)
    hitboxRadius: 20,
    // ... more stats
  },
  boulder: { /* ... */ }
};
```

### Weapon Config ([`weapons.js`](../src/config/weapons.js))

Defines weapon types and tiers:

```javascript
export const WEAPON_TYPES = {
  blaster: {
    baseDamage: 25,
    baseRange: 150,
    cooldown: 1500,
    // ... tier multipliers
  },
  // ... other weapons
};
```

### Adding Content

**New Character:**
1. Add to [`src/config/characters.js`](../src/config/characters.js)
2. Add PNG to [`assets/characters/`](../assets/characters/) (optional)
3. No code changes needed

**New Weapon:**
1. Add to [`src/config/weapons.js`](../src/config/weapons.js)
2. Add PNG to [`assets/weapons/`](../assets/weapons/) (optional)
3. May need new attack logic in [`CombatSystem.js`](../src/systems/CombatSystem.js)

**New Map:**
1. Create in map editor ([`editor.html`](../editor.html))
2. Save to [`maps/`](../maps/)
3. Register in [`maps/manifest.json`](../maps/manifest.json)

---

## Map System

### Map Structure

Maps are JSON files with terrain data:

```javascript
{
  "name": "Map Name",
  "radius": 1400,
  "background": { "type": "color", "value": "#2d3748" },
  "bushes": [{ "x": 1500, "y": 1200, "radius": 50 }],
  "obstacles": [{ "x": 1400, "y": 1400, "width": 80, "height": 80 }],
  "waterAreas": [{ "x": 1300, "y": 1500, "radius": 120 }]
}
```

### Map Loading ([`map.js`](../src/config/map.js))

Maps are loaded dynamically:

1. Read [`maps/manifest.json`](../maps/manifest.json)
2. Display in start screen with previews
3. Load selected map on game start
4. Parse terrain features for gameplay

### Map Editor ([`editor/`](../src/editor/))

Standalone editor for creating maps:

- Visual placement of terrain features
- Background customization
- JSON export/import
- Preview rendering

See [`MAP_EDITOR.md`](MAP_EDITOR.md) for usage guide.

---

## Asset System

### Asset Loader ([`AssetLoader.js`](../src/core/AssetLoader.js))

Preloads PNG assets at startup.

**Asset Categories:**
- Characters: [`assets/characters/`](../assets/characters/)
- Weapons: [`assets/weapons/`](../assets/weapons/)
- Consumables: [`assets/consumables/`](../assets/consumables/)

**Fallback System:**
- If PNG missing: Use geometric shape
- If PNG fails to load: Silently fallback
- Mixed assets supported (some PNGs, some shapes)

See [`ASSETS_GUIDE.md`](ASSETS_GUIDE.md) for specifications.

---

## Performance Optimizations

### Rendering

- Only draw entities in viewport (culling)
- Batch similar draw calls
- Use integer positions for crisp rendering
- Minimize canvas state changes

### Collision Detection

- Spatial partitioning for broad-phase
- Simple circle-circle checks for characters
- Early exit optimizations

### Memory Management

- Object pooling for projectiles
- Limit active effects count
- Clean up dead entities each frame
- Efficient data structures

---

## Development Guidelines

### Code Style

**Files:** PascalCase for classes, camelCase for utilities
**Variables:** camelCase, UPPER_SNAKE_CASE for constants
**Functions:** Verb-based names (updatePosition, calculateDamage)
**Classes:** Noun-based names with suffix (InputSystem, CharacterRenderer)

### Module Pattern

```javascript
// 1. Imports
import { Vector2D } from '../utils/Vector2D.js';

// 2. Module-specific constants
const CONSTANT = 100;

// 3. Class definition
export class SystemName {
  constructor(dependencies) {
    this.dependency = dependencies;
  }

  // Public methods
  update(deltaTime) { }

  // Private methods (prefix with _)
  _privateMethod() { }
}

// 4. Helper functions (if needed)
function helperFunction() { }
```

### Debugging

Enable debug mode via [`src/config/constants.js`](../src/config/constants.js):

```javascript
export const DEBUG_MODE = true;
```

Shows:
- FPS counter
- Character positions
- Collision boxes
- AI states

---

## Key Concepts

### Fixed Timestep

Game logic runs at fixed 60 FPS regardless of rendering speed:

```javascript
while (accumulator >= FIXED_DT) {
  update(FIXED_DT); // Always 16.67ms
  accumulator -= FIXED_DT;
}
```

### Event-Driven Architecture

Systems communicate via events, not direct calls:

```javascript
// Publisher
eventBus.emit('characterDamaged', { id, damage });

// Subscriber
eventBus.on('characterDamaged', (data) => {
  updateHealthBar(data.id, data.damage);
});
```

### Data-Driven Design

Behavior defined by configuration, not code:

```javascript
// Add character = edit config
// Add weapon = edit config
// Add map = create JSON
// No code changes needed
```

---

## Getting Started as a Contributor

### Understanding the Codebase

1. **Start with [`main.js`](../src/main.js)** - See initialization flow
2. **Read [`GameLoop.js`](../src/core/GameLoop.js)** - Understand update/render cycle
3. **Explore [`GameState.js`](../src/core/GameState.js)** - See what data exists
4. **Check systems** in [`src/systems/`](../src/systems/) - See where logic lives
5. **Look at configs** in [`src/config/`](../src/config/) - See how content is defined

### Making Changes

**For Content:**
- Edit configuration files in [`src/config/`](../src/config/)
- No code knowledge required for new characters/weapons/maps

**For Features:**
- Add new system in [`src/systems/`](../src/systems/)
- Wire up in [`main.js`](../src/main.js)
- Use [`EventBus`](../src/core/EventBus.js) for communication

**For Visuals:**
- Add renderer in [`src/renderer/`](../src/renderer/)
- Call from [`Renderer.js`](../src/renderer/Renderer.js)
- Add assets in [`assets/`](../assets/) (optional)

### Testing

1. Start local server: `python3 -m http.server 8080`
2. Open `http://localhost:8080`
3. Test on mobile for touch controls
4. Enable debug mode for diagnostics
5. Check browser console for errors

---

## Architecture Benefits

**Modularity** - Systems are independent and swappable
**Extensibility** - Easy to add content via configuration
**Maintainability** - Clear structure, easy to find code
**Performance** - Optimized for 60 FPS on mobile
**Simplicity** - No frameworks, pure JavaScript, easy to understand

---

For game design and mechanics, see [`GDD.md`](GDD.md)
For asset creation, see [`ASSETS_GUIDE.md`](ASSETS_GUIDE.md)
For map editing, see [`MAP_EDITOR.md`](MAP_EDITOR.md)