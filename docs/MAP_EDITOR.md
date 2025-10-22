# Map Editor Guide

## Overview
The Battle-2D-eath Map Editor allows you to create custom maps with bushes, obstacles, water areas, and customizable backgrounds. Maps are saved as JSON files and automatically appear in the game's start screen for selection.

## Accessing the Map Editor

Open `editor.html` in your browser:
```
http://localhost:8000/editor.html
```

Or directly open the file:
```
file:///path/to/Battle-2D-eath/editor.html
```
## Map Structure

Maps are circular arenas with a configurable radius (default: 1400 units).

### Map JSON Format
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
Maps support two types of backgrounds:

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
- Place image files in `maps/backgrounds/` folder
- Supported formats: PNG, JPG, WEBP
- Image will be scaled to fit the map circle

### Object Properties
- **Bushes**: `x, y, radius` - Circular stealth areas (default radius: 50)
- **Obstacles**: `x, y, width, height` - Rectangular barriers (default: 80x80)
- **Water Areas**: `x, y, radius` - Circular slow zones (default radius: 120)

## Creating a Custom Map

1. Open `editor.html`
2. (Optional) Click **BG Color** to choose a background color, or **BG Image** for a custom image
3. Use tools to place objects on the map
4. Click **Export** button
5. Enter a filename (e.g., `my-map.json`)
6. Save the file to the `maps/` directory
7. Update `maps/manifest.json` to register your map (see below)

## Loading Custom Maps

### Discovery
Maps are discovered from `maps/manifest.json`. The start screen dynamically loads all registered maps with preview thumbnails.

### Adding Your Map to the Game

1. **Save your map** to the `maps/` directory (e.g., `my-map.json`)

2. **Add entry to `maps/manifest.json`**:
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

3. **Launch the game** - Your map will appear in the scrollable map selector on the start screen with a visual preview!

### Map Manifest Format
The manifest provides metadata for the map selection UI:
- **file**: Filename in maps/ directory
- **name**: Display name shown to players
- **radius**: Map size (default: 1400)
- **bushCount, obstacleCount, waterCount**: Object counts (for display)
- **background**: Background configuration

## Example Maps

### Default Arena
Balanced map with even distribution of all terrain types.
- 25 bushes scattered across the arena
- 20 obstacles for cover
- 5 water areas for tactical variety

### Island Paradise
Water-themed map with larger water areas.
- 10 bushes in key positions
- 8 larger obstacles
- 7 significant water areas (larger radius)

## Customizing Backgrounds

### Using Color Backgrounds
1. Click **BG Color** button repeatedly to cycle through preset colors:
   - Green Grass (#2d5016)
   - Dark Gray (#2d3748)
   - Ocean Blue (#1e3a5f)
   - Desert Sand (#c2b280)
   - Snow White (#e8e8e8)
   - Dark Purple (#3d2b56)
   - Brown Earth (#4a3728)

### Using Image Backgrounds
1. Click **BG Image** button
2. Enter the filename (e.g., `grass.png`)
3. Place your image file in `maps/backgrounds/` folder
4. The image will be scaled to cover the entire map circle
5. Recommended image size: 2800x2800 pixels or larger

**Tip:** Use tiled textures or seamless patterns for best results.

## Technical Details

### Map Coordinate System
- Origin: Top-left corner
- Map Center: (1500, 1500)
- Map Radius: 1400 units (default)
- Total Map Size: 3000x3000 units

### Camera System
- Starts centered on map
- Pan speed: 20 units per key press
- Mouse drag panning supported

### File Format
Maps are stored as JSON files for easy editing and version control.

## Advanced Features

### Keyboard Shortcuts
- **Arrow Keys / WASD**: Pan camera
- **+ / =**: Zoom in
- **- / _**: Zoom out
- **H**: Toggle UI visibility

Press **H** to hide all panels for a cleaner view.

## Future Enhancements

Potential features for future versions:
- Adjustable object sizes in UI
- Copy/paste functionality
- Undo/redo
- Map templates
- Snap to grid
- Object rotation
- Terrain painting
- Spawn point customization
- Safe zone editor
- Background image upload directly in editor
- Real-time background preview in editor