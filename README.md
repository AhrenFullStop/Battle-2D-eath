# Battle-2D-eath

A minimalist 2D battle royale game built with vanilla JavaScript and HTML5 Canvas. Battle against 23 AI opponents with distinct characters, weapons, and abilities in a shrinking safe zone.

## 🎮 Features

- **2 Playable Characters** - Bolt (fast/agile) and Boulder (tank) with unique abilities
- **4 Weapon Types** - Blaster, Spear, Bomb, and Gun with 3 tiers each
- **Shrinking Safe Zone** - Strategic gameplay with increasing danger over time
- **Health Kits & Tactical Consumables** - Shield potions and special pickups
- **Intelligent AI** - 23 opponents with varied skill levels and behaviors
- **Custom Maps** - Built-in map editor for creating and sharing arenas
- **PNG Asset Support** - Optional visual enhancements with graceful fallbacks
- **Mobile-First Design** - Touch controls with virtual joystick

## 🚀 Quick Start

### Playing the Game

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/Battle-2D-eath.git
   cd Battle-2D-eath
   ```

2. **Start a local server:**
   ```bash
   npm run dev
   ```
> make sure you have node/npm installed

3. **Open in browser:**
   ```
   http://localhost:8080
   ```

4. **Select character and map, then play!**

### Controls

- **Desktop/Mobile**: Virtual joystick (bottom-left) for movement
- **Combat**: Weapon buttons (bottom-right) - hold to aim, release to fire
- **Special Ability**: Large center button (bottom-right)
- **Consumables**: Bottom-center buttons for health kits and pickups

## 🛠️ Development

Built with vanilla JavaScript - no frameworks or build tools required.

### Project Structure

```
Battle-2D-eath/
├── index.html              # Main game entry point
├── editor.html             # Map editor entry point
├── src/
│   ├── main.js            # Application bootstrap
│   ├── config/            # Game configuration (characters, weapons, maps)
│   ├── core/              # Core systems (game loop, state, events)
│   ├── entities/          # Game entities (characters, weapons, consumables)
│   ├── systems/           # Game systems (physics, AI, combat, input)
│   ├── renderer/          # Rendering (canvas drawing, UI components)
│   ├── editor/            # Map editor code
│   └── utils/             # Utilities (vector math, etc.)
├── maps/                   # Map JSON files
├── assets/                 # Optional PNG assets
└── docs/                   # Documentation
```

### Key Technologies

- **HTML5 Canvas** - 2D rendering
- **ES6 Modules** - Code organization
- **Vanilla JavaScript** - No external dependencies
- **Fixed Timestep Game Loop** - Consistent 60 FPS physics

### Adding Features

The codebase uses an ECS-like pattern with clear system boundaries:

- **Entities** ([`src/entities/`](src/entities/)) - Game objects (characters, weapons)
- **Systems** ([`src/systems/`](src/systems/)) - Game logic (physics, AI, combat)
- **Renderer** ([`src/renderer/`](src/renderer/)) - Visual presentation
- **Config** ([`src/config/`](src/config/)) - Data-driven behavior

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for detailed technical overview.

## 📦 Map Editor

Create custom battle arenas with the built-in map editor:

1. Open [`editor.html`](editor.html) in your browser
2. Place bushes, obstacles, and water areas
3. Choose background color or custom image
4. Export as JSON and save to [`maps/`](maps/) directory
5. Add to [`maps/manifest.json`](maps/manifest.json) to make it selectable

See [`docs/MAP_EDITOR.md`](docs/MAP_EDITOR.md) for complete guide.

## 🎨 Assets

The game supports optional PNG images for enhanced visuals:

- **Characters**: [`assets/characters/`](assets/characters/) - bolt.png, boulder.png
- **Weapons**: [`assets/weapons/`](assets/weapons/) - blaster.png, spear.png, bomb.png, gun.png
- **Consumables**: [`assets/consumables/`](assets/consumables/) - health.png, shield.png

The game works perfectly without any assets using geometric shape fallbacks.

See [`docs/ASSETS_GUIDE.md`](docs/ASSETS_GUIDE.md) for specifications and guidelines.

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

### Development Setup

1. Fork and clone the repository
2. Make your changes
3. Test locally with a simple HTTP server
4. Submit a pull request

### Code Style

- Use clear, descriptive variable names
- Follow existing patterns (ES6 classes, modules)
- Keep functions focused and under 50 lines
- Comment complex logic, not obvious code
- Test on mobile browsers if changing UI/input

### Where to Start

Good first contributions:

- **New Characters**: Add to [`src/config/characters.js`](src/config/characters.js)
- **New Weapons**: Add to [`src/config/weapons.js`](src/config/weapons.js)
- **New Maps**: Use the map editor and share via PR
- **Bug Fixes**: Check issues or test gameplay edge cases
- **Documentation**: Improve guides or add code comments

### Project Organization

- [`src/config/`](src/config/) - Data-driven configuration
- [`src/systems/`](src/systems/) - Core game logic
- [`src/entities/`](src/entities/) - Game object classes
- [`src/renderer/`](src/renderer/) - Visual presentation
- [`src/core/`](src/core/) - Game loop, state, events

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for detailed system descriptions.

## 📚 Documentation

- **[Game Design Document](docs/GDD.md)** - Game mechanics and features
- **[Technical Architecture](docs/ARCHITECTURE.md)** - System design and patterns
- **[Map Editor Guide](docs/MAP_EDITOR.md)** - Creating custom maps
- **[Assets Guide](docs/ASSETS_GUIDE.md)** - Adding PNG graphics

## 🌐 Browser Compatibility

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS/Android)

## 🎯 Game Mechanics

### Characters

- **Bolt** - Fast, agile character with dash ability
- **Boulder** - Tank character with ground slam ability

### Weapons

Each weapon has 3 tiers (Common → Rare → Epic) with increasing damage:

- **Blaster** - Cone-shaped close-range attack
- **Spear** - Long-range projectile
- **Bomb** - Area-of-effect explosion
- **Gun** - 3-shot burst fire

### Safe Zone

The safe zone shrinks periodically, dealing increasing damage to players outside. Strategy involves balancing combat with safe zone positioning.

## 📄 License

Free and open - suggestions - no; but PR's are welcome!

## 🙏 Acknowledgments

Built as a learning project exploring vanilla JavaScript game development with HTML5 Canvas.

---

**Current Version**: 1.0 (All core features complete)

For detailed gameplay mechanics, see [`docs/GDD.md`](docs/GDD.md)