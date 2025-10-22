# Battle-2D-eath Assets Guide

This guide explains how to add PNG images to Battle-2D-eath to enhance the visual appearance of characters, weapons, and consumables.

## Overview

Battle-2D-eath supports PNG images for visual assets while maintaining full backward compatibility. The game works perfectly **without any PNG assets** by using geometric shape fallbacks (circles, rectangles, etc.). This makes the asset system completely optional and gracefully degrading.

## Asset Categories

### 1. Characters
Character images are displayed with rotation to face the movement direction.

**Required Files:**
- `assets/characters/bolt.png` - Bolt character sprite
- `assets/characters/boulder.png` - Boulder character sprite

**Specifications:**
- **Recommended Size:** 64x64 pixels (or any square size)
- **Format:** PNG with transparency
- **Usage:** Image rotates to match character's facing direction
- **Fallback:** Colored circle with direction indicator

**Visual Notes:**
- Image size matches the character's hitbox diameter (2 × radius)
- Player characters get a white outline/border for distinction
- Health bars remain above the character regardless of image or circle rendering

### 2. Weapons (Pickups)
Weapon images are displayed for pickups on the ground. Weapon **effects** (blaster cone, projectiles, explosions) remain as colored shapes.

**Required Files:**
- `assets/weapons/blaster.png` - Blaster weapon pickup
- `assets/weapons/spear.png` - Spear weapon pickup
- `assets/weapons/bomb.png` - Bomb weapon pickup
- `assets/weapons/gun.png` - Gun weapon pickup

**Specifications:**
- **Recommended Size:** 48x48 pixels
- **Format:** PNG with transparency
- **Usage:** Displayed for ground pickups with tier-colored glow
- **Fallback:** Colored circle with weapon initial letter

**Visual Notes:**
- Tier-colored glow effect renders around the image
- Tier number displayed below the weapon image
- Pickup progress indicator (green arc) appears when player is nearby
- Weapon attack effects (cones, projectiles) remain as geometric shapes

### 3. Consumables
Consumable images are displayed for pickups on the ground.

**Required Files:**
- `assets/consumables/health.png` - Health Kit pickup
- `assets/consumables/shield.png` - Shield Potion pickup

**Specifications:**
- **Recommended Size:** 32x32 pixels
- **Format:** PNG with transparency
- **Usage:** Displayed with colored glow effect
- **Fallback:** Colored circle

**Visual Notes:**
- Radial glow gradient renders around the image (matches consumable color)
- White outline appears around the image
- Pickup progress indicator (green arc) appears when player is nearby

## Directory Structure

Create the following directory structure in your project root:

```
Battle-2D-eath/
├── assets/
│   ├── characters/
│   │   ├── bolt.png
│   │   └── boulder.png
│   ├── weapons/
│   │   ├── blaster.png
│   │   ├── spear.png
│   │   ├── bomb.png
│   │   └── gun.png
│   └── consumables/
│       ├── health.png
│       └── shield.png
```

## File Naming Conventions

**IMPORTANT:** File names must match exactly as shown above. The asset loader uses these exact names:

- Character files: `bolt.png`, `boulder.png`
- Weapon files: `blaster.png`, `spear.png`, `bomb.png`, `gun.png`
- Consumable files: `health.png`, `shield.png`

## How the Fallback System Works

The game implements a graceful fallback system:

1. **Asset Loading Phase**
   - When the game starts, it attempts to load all PNG assets
   - Missing assets are handled silently (no errors, no crashes)
   - The console logs how many assets were successfully loaded

2. **Rendering Phase**
   - For each entity (character, weapon, consumable), the renderer checks if a PNG is available
   - If PNG exists and is loaded: renders the PNG image
   - If PNG missing or failed to load: renders geometric shape fallback
   - Both rendering paths are optimized and performant

3. **Mixed Asset Support**
   - You can have **some** assets without having all of them
   - Example: Add character PNGs but leave weapons as circles
   - Each asset category works independently

## Asset Creation Tips

### For Characters (64x64)
- Design should be recognizable at small sizes
- Use bold colors and clear outlines
- Consider that the image will rotate - avoid directional details at edges
- Transparent background is required
- Center your design within the canvas

### For Weapons (48x48)
- Create distinct silhouettes for each weapon type
- Icons should be simple and recognizable
- Consider adding a subtle drop shadow for depth
- Transparent background is required

### For Consumables (32x32)
- Use iconic symbols (heart for health, shield for armor)
- Bright, saturated colors work best
- Simple designs are more readable at small sizes
- Transparent background is required

## Performance Considerations

- **PNG assets are pre-loaded** during game initialization
- **No runtime loading** - all assets load before gameplay starts
- **Minimal performance impact** - PNG rendering is as fast as shape rendering
- **Memory efficient** - Only loads assets that exist
- **No texture atlases needed** - Each asset is an independent image

## Adding New Asset Types (Future)

To add support for new asset types (e.g., abilities, effects):

1. Update [`AssetLoader.js`](../src/core/AssetLoader.js) - Add new category to `loadGameAssets()`
2. Update respective renderer (e.g., [`AbilityRenderer.js`](../src/renderer/AbilityRenderer.js))
3. Add fallback rendering for new asset type
4. Update this guide with new requirements

---

**Remember:** The game works perfectly without any PNG assets. The asset system is designed to enhance visuals while maintaining full backward compatibility!