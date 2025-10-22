# Battle-2D-eath - Phase 10

A 2D Battle Royale game built with vanilla JavaScript and HTML5 Canvas.

## Phase 10: Map Editing and Refinement ✅

Phase 10 implements a map editor system for creating custom maps and selecting them from the start screen.

### New Features

- ✅ **Map Editor**: Separate editor interface for creating custom maps
- ✅ **Map Selection**: Choose from multiple maps on the start screen
- ✅ **Custom Maps**: Create, save, and load custom map configurations
- ✅ **Visual Editor**: Click-based placement of bushes, obstacles, and water areas
- ✅ **Export/Import**: Save maps as JSON files and load them into the game

### Using the Map Editor

1. Open `editor.html` in your browser
2. Use the tool buttons to select Bush, Rock, Water, or Erase
3. Click on the map to place objects
4. Export your map as a JSON file
5. Add it to the `maps/` directory
6. Select your custom map from the start screen

For detailed instructions, see [`docs/MAP_EDITOR.md`](docs/MAP_EDITOR.md).

## Phase 1: Core Foundation - Playable Character Movement ✅

Phase 1 implements the fundamental game loop and character movement system.

### Features Implemented

- ✅ **Game Loop**: Fixed timestep at 60 FPS for consistent physics
- ✅ **Character System**: Player character with stats (using Bolt configuration)
- ✅ **Movement Physics**: Velocity-based movement with boundary collision
- ✅ **Virtual Joystick**: Touch-based controls in bottom-left corner
- ✅ **Input System**: Touch and mouse event handling
- ✅ **Rendering Pipeline**: Layered rendering (background → entities → UI)
- ✅ **HUD**: Health bar display
- ✅ **Mobile-First**: Portrait orientation, 720x1280 canvas (9:16 aspect ratio)

### How to Run

1. Start a local HTTP server:
   ```bash
   python3 -m http.server 8080
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```

3. **Controls**:
   - **Desktop**: Click and drag the joystick in the bottom-left corner
   - **Mobile**: Touch and drag the joystick to move your character

### Project Structure

```
Battle-2D-eath/
├── index.html              # Main game entry point
├── editor.html             # Map editor entry point
├── styles/
│   └── main.css           # Mobile-first styling
├── maps/                   # Map JSON files
│   ├── default.json       # Default arena map
│   └── island.json        # Island paradise map
├── src/
│   ├── main.js            # Application bootstrap
│   ├── config/
│   │   ├── constants.js   # Game constants
│   │   ├── characters.js  # Character definitions (Bolt & Boulder)
│   │   ├── weapons.js     # Weapon definitions
│   │   ├── consumables.js # Consumable definitions
│   │   └── map.js         # Map configuration & loading
│   ├── core/
│   │   ├── GameLoop.js    # Fixed timestep game loop
│   │   ├── GameState.js   # Centralized state management
│   │   ├── EventBus.js    # Event system
│   │   └── AssetLoader.js # Asset loading system
│   ├── systems/
│   │   ├── InputSystem.js     # Touch input handling
│   │   ├── PhysicsSystem.js   # Movement and collision
│   │   ├── CombatSystem.js    # Weapon and damage system
│   │   ├── AISystem.js        # AI behavior and decision making
│   │   ├── SafeZoneSystem.js  # Shrinking safe zone
│   │   ├── CameraSystem.js    # Camera following
│   │   └── AbilitySystem.js   # Special abilities
│   ├── entities/
│   │   ├── Entity.js      # Base entity class
│   │   ├── Character.js   # Character entity
│   │   ├── Player.js      # Player-specific logic
│   │   ├── AICharacter.js # AI character logic
│   │   ├── Weapon.js      # Weapon entity
│   │   └── Consumable.js  # Consumable entity
│   ├── renderer/
│   │   ├── Renderer.js            # Main renderer coordinator
│   │   ├── CharacterRenderer.js   # Character drawing
│   │   ├── UIRenderer.js          # HUD and UI elements
│   │   ├── VirtualJoystick.js     # Joystick component
│   │   ├── StartScreen.js         # Character & map selection
│   │   ├── MapRenderer.js         # Map terrain rendering
│   │   ├── MinimapRenderer.js     # Minimap display
│   │   ├── WeaponButton.js        # Weapon UI button
│   │   ├── AbilityButton.js       # Ability UI button
│   │   ├── ConsumableButton.js    # Consumable UI button
│   │   └── WeaponRenderer.js      # Weapon effects rendering
│   ├── editor/
│   │   ├── editorMain.js  # Map editor bootstrap
│   │   ├── MapEditor.js   # Editor logic
│   │   └── EditorUI.js    # Editor interface
│   └── utils/
│       └── Vector2D.js    # 2D vector math utilities
└── docs/
    ├── GDD.md             # Game Design Document
    ├── ARCHITECTURE.md    # Technical Architecture
    └── MAP_EDITOR.md      # Map Editor Guide
```

### Technical Details

- **Language**: Vanilla JavaScript (ES6+)
- **Rendering**: HTML5 Canvas 2D API
- **Module System**: ES6 Modules (import/export)
- **Target Performance**: 60 FPS
- **Canvas Size**: 720x1280 (9:16 aspect ratio)
- **Character**: Bolt (green circle, radius 20px)
- **Movement Speed**: 250 pixels/second
- **Boundary Collision**: Character stays within canvas bounds

### Architecture Highlights

1. **Fixed Timestep Game Loop**: Ensures consistent physics regardless of frame rate
2. **Separation of Concerns**: Clear boundaries between systems
3. **Event-Driven Communication**: EventBus for loose coupling
4. **Data-Driven Design**: Character behavior defined by configuration
5. **Multiplayer-Ready**: Architecture supports future network synchronization

### Debug Mode

To enable debug information (FPS, position, velocity), change `DEBUG_MODE` in `src/config/constants.js` to `true`.

### Completed Phases

- ✅ **Phase 1**: Core Foundation - Character movement
- ✅ **Phase 2**: Combat Basics - Basic weapon system
- ✅ **Phase 3**: AI Opponent - Single AI enemy
- ✅ **Phase 4**: Multiple Weapons - Weapon variety and pickups
- ✅ **Phase 5**: Map and Environment - Full map with features
- ✅ **Phase 6**: Safe Zone - Shrinking zone mechanics
- ✅ **Phase 7**: Polish and Balance - Complete MVP
- ✅ **Phase 8**: UI Layout Refinement - Improved interface
- ✅ **Phase 9**: Gameplay Adjustments - AI and ability fixes
- ✅ **Phase 10**: Map Editor - Custom map creation

### Map System

The game now supports multiple maps:
- **Random Arena**: Procedurally generated terrain (default)
- **Default Arena**: Balanced pre-made map
- **Island Paradise**: Water-heavy tactical map
- **Custom Maps**: Create your own in the editor!

### Browser Compatibility

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Mobile browsers: ✅

### Performance

- Maintains 60 FPS on mid-range devices
- Optimized rendering pipeline
- Efficient collision detection
- Mobile-first design

---

**Status**: Phase 10 Complete ✅

### Documentation

- Game Design: [`docs/GDD.md`](docs/GDD.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Map Editor: [`docs/MAP_EDITOR.md`](docs/MAP_EDITOR.md)

### Quick Start

**Playing the Game:**
```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

**Using the Map Editor:**
```bash
# Same server, then open http://localhost:8080/editor.html
```