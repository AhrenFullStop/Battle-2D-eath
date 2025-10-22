# Battle-2D-eath Assets Guide

This guide explains how to add PNG images to Battle-2D-eath to enhance visual appearance while maintaining full backward compatibility.

## Overview

Battle-2D-eath supports optional PNG images for characters, weapons, and consumables. The game works perfectly **without any PNG assets** by using geometric shape fallbacks. This makes the asset system completely optional and gracefully degrading.

## Asset Categories

### 1. Characters

Character images are displayed with rotation to face the movement direction.

**Required Files:**
- `assets/characters/bolt.png` - Bolt character sprite
- `assets/characters/boulder.png` - Boulder character sprite

**Specifications:**
- **Size:** 64x64 pixels (or any square size)
- **Format:** PNG with transparency
- **Rendering:** Image rotates to match character's facing direction
- **Fallback:** Colored circle with direction indicator

**Visual Notes:**
- Image size matches character's hitbox diameter
- Player characters get white outline for distinction
- Health bars remain above character

### 2. Weapons (Pickups)

Weapon images are displayed for ground pickups. Weapon **effects** (blaster cone, projectiles, explosions) remain as colored shapes.

**Required Files:**
- `assets/weapons/blaster.png` - Blaster weapon pickup
- `assets/weapons/spear.png` - Spear weapon pickup
- `assets/weapons/bomb.png` - Bomb weapon pickup
- `assets/weapons/gun.png` - Gun weapon pickup

**Specifications:**
- **Size:** 48x48 pixels
- **Format:** PNG with transparency
- **Rendering:** Displayed for ground pickups with tier-colored glow
- **Fallback:** Colored circle with weapon initial letter

**Visual Notes:**
- Tier-colored glow renders around image (gray/blue/gold)
- Tier number displayed below weapon image
- Pickup progress indicator (green arc) when player nearby
- Weapon attack effects remain geometric shapes

### 3. Consumables

Consumable images are displayed for ground pickups.

**Required Files:**
- `assets/consumables/health.png` - Health Kit pickup
- `assets/consumables/shield.png` - Shield Potion pickup

**Specifications:**
- **Size:** 32x32 pixels
- **Format:** PNG with transparency
- **Rendering:** Displayed with colored glow effect
- **Fallback:** Colored circle

**Visual Notes:**
- Radial glow gradient renders around image
- White outline appears around image
- Pickup progress indicator (green arc) when player nearby

## Directory Structure

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

## Fallback System

The game implements graceful fallback:

1. **Asset Loading**
   - At startup, attempts to load all PNG assets
   - Missing assets handled silently (no errors)
   - Console logs successful asset counts

2. **Rendering**
   - For each entity, renderer checks if PNG available
   - If PNG exists: renders PNG image
   - If PNG missing: renders geometric shape fallback
   - Both paths are optimized and performant

3. **Mixed Asset Support**
   - You can have **some** assets without all
   - Example: Add character PNGs, leave weapons as shapes
   - Each asset category works independently

## Asset Creation Tips

### For Characters (64x64)

- Design recognizable at small sizes
- Use bold colors and clear outlines
- Avoid directional details at edges (image rotates)
- Transparent background required
- Center design within canvas

### For Weapons (48x48)

- Create distinct silhouettes for each weapon
- Icons should be simple and recognizable
- Consider subtle drop shadow for depth
- Transparent background required

### For Consumables (32x32)

- Use iconic symbols (heart for health, shield for armor)
- Bright, saturated colors work best
- Simple designs more readable at small sizes
- Transparent background required

## Performance

- **Pre-loaded** during game initialization
- **No runtime loading** - all assets load before gameplay
- **Minimal performance impact** - PNG rendering as fast as shapes
- **Memory efficient** - Only loads existing assets
- **No texture atlases needed** - Independent images

## Adding New Asset Types

To add support for new asset types (e.g., abilities, effects):

1. Update [`AssetLoader.js`](../src/core/AssetLoader.js) - Add category to `loadGameAssets()`
2. Update respective renderer (e.g., [`AbilityButton.js`](../src/renderer/AbilityButton.js))
3. Add fallback rendering for new asset type
4. Update this guide with new requirements

---

**Remember:** The game works perfectly without any PNG assets. The asset system enhances visuals while maintaining full backward compatibility.