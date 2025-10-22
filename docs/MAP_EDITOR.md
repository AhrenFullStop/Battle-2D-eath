# Map Editor Guide

## Overview

The Battle-2D-eath Map Editor allows you to create custom battle arenas with bushes, obstacles, water areas, and customizable backgrounds. Maps are saved as JSON files and automatically appear in the game's start screen.

## Accessing the Editor

**Local Server:**
```bash
npm run dev
# Then open: http://localhost:8080/editor.html
```

**Direct File:**
```
file:///path/to/Battle-2D-eath/editor.html
```

## Creating a Map

1. Open [`editor.html`](../editor.html) in your browser
2. Use tool buttons to place objects:
   - **Bush** - Stealth areas (green circles)
   - **Rock** - Obstacles for cover (gray rectangles)
   - **Water** - Movement-slowing areas (blue circles)
   - **Erase** - Remove objects
3. Customize background (color or image)
4. Click **Export** and save to [`maps/`](../maps/) directory
5. Register in [`maps/manifest.json`](../maps/manifest.json)

## Map Structure

Maps are circular arenas with configurable radius (default: 1400 units).

### JSON Format

```json
{
  "name": "My Custom Map",
  "radius": 1400,
  "background": {
    "type": "color",
    "value": "#2d3748"
  },
  "bushes": [
    {"x": 1500, "y": 1200, "radius": 50}
  ],
  "obstacles": [
    {"x": 1400, "y": 1400, "width": 80, "height": 80}
  ],
  "waterAreas": [
    {"x": 1300, "y": 1500, "radius": 120}
  ]
}
```

### Background Options

**Color Background:**
```json
"background": {
  "type": "color",
  "value": "#2d3748"
}
```

**Image Background:**
```json
"background": {
  "type": "image",
  "value": "grass-texture.png"
}
```

Place image files in [`maps/backgrounds/`](../maps/backgrounds/) folder. Supported formats: PNG, JPG, WEBP.

### Object Properties

- **Bushes:** `{x, y, radius}` - Circular stealth areas (default radius: 50)
- **Obstacles:** `{x, y, width, height}` - Rectangular barriers (default: 80×80)
- **Water Areas:** `{x, y, radius}` - Circular slow zones (default radius: 120)

## Registering Maps

### Adding to Game

1. **Save map** to [`maps/`](../maps/) directory (e.g., `my-map.json`)

2. **Add to [`maps/manifest.json`](../maps/manifest.json):**
```json
{
  "maps": [
    {
      "file": "my-map.json",
      "name": "My Custom Map",
      "radius": 1400,
      "bushCount": 20,
      "obstacleCount": 15,
      "waterCount": 5,
      "background": {
        "type": "color",
        "value": "#2d3748"
      }
    }
  ]
}
```

3. **Launch game** - Your map appears in the map selector with preview!

### Manifest Properties

- **file:** Filename in maps/ directory
- **name:** Display name shown to players
- **radius:** Map size (default: 1400)
- **bushCount, obstacleCount, waterCount:** Object counts for display
- **background:** Background configuration

## Background Customization

### Color Backgrounds

Click **BG Color** button to cycle through preset colors:
- Green Grass (#2d5016)
- Dark Gray (#2d3748)
- Ocean Blue (#1e3a5f)
- Desert Sand (#c2b280)
- Snow White (#e8e8e8)
- Dark Purple (#3d2b56)
- Brown Earth (#4a3728)

### Image Backgrounds

1. Click **BG Image** button
2. Enter filename (e.g., `grass.png`)
3. Place image in [`maps/backgrounds/`](../maps/backgrounds/)
4. Image scales to cover map circle
5. Recommended size: 2800×2800 pixels or larger

**Tip:** Use tiled textures or seamless patterns for best results.

## Editor Controls

### Keyboard Shortcuts

- **Arrow Keys / WASD:** Pan camera
- **+ / =:** Zoom in
- **- / _:** Zoom out
- **H:** Toggle UI visibility

Press **H** to hide panels for cleaner view.

### Mouse Controls

- **Click:** Place selected object
- **Drag:** Pan camera
- **Scroll:** Zoom in/out

## Example Maps

### Default Arena
Balanced map with even terrain distribution.
- 25 bushes scattered across arena
- 20 obstacles for cover
- 5 water areas for tactical variety

### Island Paradise
Water-themed map with larger water areas.
- 10 bushes in key positions
- 8 larger obstacles
- 7 significant water areas

## Technical Details

### Coordinate System

- **Origin:** Top-left corner
- **Map Center:** (1500, 1500)
- **Map Radius:** 1400 units (default)
- **Total Map Size:** 3000×3000 units

### Camera System

- Starts centered on map
- Pan speed: 20 units per key press
- Mouse drag panning supported

### File Format

Maps stored as JSON for easy editing and version control. Can be edited manually in any text editor.

---

**Need help?** See [`GDD.md`](GDD.md) for gameplay mechanics or [`ARCHITECTURE.md`](ARCHITECTURE.md) for technical details.