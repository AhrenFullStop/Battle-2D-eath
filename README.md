# Battle-2D-eath - Phase 1

A 2D Battle Royale game built with vanilla JavaScript and HTML5 Canvas.

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
├── index.html              # Entry point
├── styles/
│   └── main.css           # Mobile-first styling
├── src/
│   ├── main.js            # Application bootstrap
│   ├── config/
│   │   ├── constants.js   # Game constants
│   │   └── characters.js  # Character definitions (Bolt & Boulder)
│   ├── core/
│   │   ├── GameLoop.js    # Fixed timestep game loop
│   │   ├── GameState.js   # Centralized state management
│   │   ├── EventBus.js    # Event system
│   │   └── AssetLoader.js # Asset loading system
│   ├── systems/
│   │   ├── InputSystem.js # Touch input handling
│   │   └── PhysicsSystem.js # Movement and collision
│   ├── entities/
│   │   ├── Entity.js      # Base entity class
│   │   ├── Character.js   # Character entity
│   │   └── Player.js      # Player-specific logic
│   ├── renderer/
│   │   ├── Renderer.js    # Main renderer coordinator
│   │   ├── CharacterRenderer.js # Character drawing
│   │   ├── UIRenderer.js  # HUD and UI elements
│   │   └── VirtualJoystick.js # Joystick component
│   └── utils/
│       └── Vector2D.js    # 2D vector math utilities
└── docs/
    ├── GDD.md             # Game Design Document
    └── ARCHITECTURE.md    # Technical Architecture
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

### Next Steps (Future Phases)

- **Phase 2**: Weapons and combat system
- **Phase 3**: AI opponents
- **Phase 4**: Items and pickups
- **Phase 5**: Safe zone mechanics
- **Phase 6**: Polish and optimization

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

**Status**: Phase 1 Complete ✅

For detailed architecture information, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
For game design details, see [`docs/GDD.md`](docs/GDD.md).