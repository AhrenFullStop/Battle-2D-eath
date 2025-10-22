# Game Design Document — Battle-2D-eath

## Overview

**Battle-2D-eath** is a 2D battle royale game featuring top-down combat against AI opponents in a shrinking safe zone.

- **Platform:** Mobile-first (portrait orientation), works on desktop browsers
- **Genre:** Battle royale, top-down action
- **Technology:** HTML5 Canvas with vanilla JavaScript
- **Visual Style:** Minimalist with optional PNG assets, geometric fallbacks
- **Scope:** 1 player vs 23 AI opponents, 2 playable characters, 4 weapon types, custom maps

---

## Core Gameplay Loop

1. Select character (Bolt or Boulder) and map
2. Spawn with 23 AI opponents on the map
3. Collect weapons and consumables from pickups
4. Fight opponents while staying inside the shrinking safe zone
5. Match ends when player is last alive (win) or player dies (loss)
6. View stats: kills, damage dealt, survival time

---

## Characters

Two characters with distinct playstyles using the same damage formulas but different stats.

### Character Stats

| Character | Role | Base HP | Move Speed | Special Ability |
|-----------|------|---------|------------|-----------------|
| **Bolt** | Fast/Skirmisher | 80 | 250 | Dash + brief speed boost |
| **Boulder** | Tank/Frontline | 140 | 180 | Ground slam (AoE damage + stun) |

### Bolt (Fast Character)

- **Stats:** Lower HP (80), smaller hitbox (radius 20)
- **Speed:** Faster movement and weapon cooldowns (15% faster)
- **Special:** Dash forward dramatically increasing speed for 3 seconds
- **Playstyle:** Hit-and-run, mobility-focused

### Boulder (Tank Character)

- **Stats:** Higher HP (140), larger hitbox (radius 28)
- **Speed:** Slower movement and weapon cooldowns (20% slower)
- **Special:** Ground slam that damages and stuns enemies in area, shows damage zone preview during charge
- **Playstyle:** Frontline fighter, area control

---

## Weapons

### Weapon System

**Pickup Rules:**
- Weapons spawn at designated locations on the map
- Players can carry up to 3 weapons simultaneously
- Picking up takes time (progress indicator shown)
- If inventory full, replaces lowest tier weapon
- Cannot pickup duplicate tier weapons

**Weapon Tiers:**
- **Tier 1 (Common):** Base stats, gray/white glow
- **Tier 2 (Rare):** Better stats (1.4x damage, 1.3x range), blue glow
- **Tier 3 (Epic):** Best stats (1.8x damage, 1.6x range), gold glow

### Weapon Types

**1. Blaster (Cone Attack)**
- Fires cone-shaped blast in aimed direction
- Hits all enemies in cone area
- Short range, instant hit
- Best for: Close combat

**2. Spear (Line Projectile)**
- Throws spear in straight line
- Hits first enemy in path
- Medium range, fast projectile
- Best for: Poking from distance

**3. Bomb (Arc AoE)**
- Lobs bomb that explodes on landing
- Damages all enemies in explosion radius
- Area lingers briefly for denial
- Best for: Area control

**4. Gun (Burst Fire)**
- Fires 3 quick shots in aimed direction
- Each shot is separate projectile
- Medium range, consistent damage
- Best for: Sustained damage

### Weapon Controls

- **Hold:** Press and hold weapon button
- **Drag:** Drag outward to aim (preview shows attack direction/area)
- **Release:** Fire weapon in aimed direction

---

## Consumables

### Health Kits

- Restores 30% of max HP instantly
- Dedicated inventory slots (can carry 2)
- Quick tap to use

### Shield Potion

- Adds 50 shield HP (absorbed before health damage)
- Takes 1 second to use
- General pickup slot (max 1)

---

## Environmental Mechanics

### Bushes (Stealth)

- Character inside bush is invisible on minimap
- Other players cannot see character in bush
- **Exceptions:** Enemy has line of sight at close range, firing weapon reveals position
- Can still take damage while hidden

### Shrinking Safe Zone

**Mechanics:**
- Safe zone shrinks in phases at set times
- Being outside zone causes continuous damage
- Damage increases each phase
- Visual warning: Red screen pulse, minimap indicator

**Phases:**
- Phase 0: Full map (1400 radius), no damage, first 30 seconds
- Phase 1: Shrinks to 700 radius, low damage (2 per tick)
- Phase 2: Shrinks to 400 radius, medium damage (5 per tick)
- Phase 3: Final zone (200 radius), high damage (10 per tick)

**Damage:**
- Applied every 0.5 seconds when outside zone
- Bypasses shield, damages health directly
- Entering safe zone stops damage immediately

### Terrain Types

**Water:**
- Slows movement by 25%
- No effect on combat
- Blue colored areas

**Obstacles (Rocks):**
- Block movement and projectiles
- Provide cover
- Gray/brown rectangular shapes

---

## AI Opponents

### AI Behavior

AI uses same characters and weapons as player, with different skill levels affecting perception, accuracy, and tactics.

### AI Skill Tiers

**Novice:**
- Limited perception range
- Poor aim accuracy
- Slow reactions

**Intermediate:**
- Medium perception range
- Decent aim accuracy
- Moderate reactions

**Expert:**
- Wide perception range
- High aim accuracy
- Fast reactions
- Uses cover and bushes effectively

### AI Actions

- Move around map strategically
- Pick up weapons and items
- Engage enemies when spotted
- Use special abilities
- Respond to safe zone shrinking
- Use health kits when low HP
- Flee when severely wounded

### Match Population

- Total: 24 participants (1 player + 23 AI)
- Skill distribution: Mix of novice, intermediate, and expert
- Character distribution: Roughly even split between Bolt and Boulder

---

## Map System

### Map Structure

**Shape:** Circular arena
**Size:** Configurable radius (default 1400 units)
**Elements:**
- Spawn points scattered around edges
- Bushes distributed across map
- Water areas for terrain variety
- Obstacles for cover
- Weapon spawn points
- Consumable spawn points

### Available Maps

- **Random Arena:** Procedurally generated terrain
- **Default Arena:** Balanced pre-made map
- **Island Paradise:** Water-heavy tactical map
- **Custom Maps:** Player-created via map editor

### Map Editor

The built-in map editor allows creation of custom maps:
- Place bushes, obstacles, and water areas
- Choose background color or custom image
- Export as JSON file
- Register in `maps/manifest.json` for selection

See [`MAP_EDITOR.md`](MAP_EDITOR.md) for detailed guide.

---

## Combat System

### Damage Formula

```
Final Damage = Base Weapon Damage × Tier Modifier
```

**Rules:**
- All damage is instant (except safe zone)
- Shield HP depletes before health HP
- Minimum damage is always 1
- Safe zone damage bypasses shield

### Death and Loot

**When Character Dies:**
- Death is permanent (no respawn)
- Drops all equipped weapons
- Drops all unused consumables
- Other players can pick up dropped items

---

## Controls and UI

### Input Layout

**Movement (Bottom-Left):**
- Virtual joystick for touch-based movement
- Touch and drag to move character

**Combat Controls (Bottom-Right):**
- Special ability button (large, center)
- Weapon buttons (up to 3, arranged around ability)
- Hold and drag to aim, release to fire

**Consumables (Bottom-Center):**
- Health kit slots (2 dedicated)
- Quick tap to use

### UI Elements

- **Top-Left:** Game info (safe zone timer, remaining players, kill count)
- **Top-Right:** Minimap showing terrain and positions
- **Right Side:** Health/shield bar (vertical), pickup slots
- **Bottom-Right:** Weapon and ability buttons
- **Bottom-Left:** Movement joystick
- **Bottom-Center:** Health kit button

---

## Visual Style

### Graphics Approach

**Core Principle:** Simplicity and clarity over visual fidelity. Gameplay mechanics drive the experience.

**Characters:**
- Optional PNG images (64x64 pixels) with rotation
- Fallback: Colored circles with direction indicator
- Health bar above character

**Weapons:**
- Pickup: PNG images or colored shapes with tier glow
- Effects: Colored geometric shapes (cones, lines, circles)

**Environment:**
- Solid background or custom PNG image
- Bushes: Green circles
- Water: Blue areas
- Obstacles: Gray/brown rectangles
- Safe zone: Colored circle outline (green safe, red danger)

**Asset System:**
- Completely optional PNG asset support
- Graceful fallback to geometric shapes
- See [`ASSETS_GUIDE.md`](ASSETS_GUIDE.md) for specifications

---

## Technical Overview

### Technology Stack

- **Core:** HTML5 Canvas + vanilla JavaScript
- **Module System:** ES6 imports/exports
- **Architecture:** ECS-like pattern with system boundaries
- **Performance:** 60 FPS target with fixed timestep

### Key Systems

- **Game Loop:** Fixed timestep for consistent physics
- **Event Bus:** Loose coupling between systems
- **Entity System:** Base entity with specialized subclasses
- **Input System:** Touch-based with virtual controls
- **Physics System:** Movement and collision detection
- **Combat System:** Weapon firing and damage calculation
- **AI System:** Behavior-driven opponent logic
- **Safe Zone System:** Zone shrinking and damage
- **Rendering:** Layered canvas rendering pipeline

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for detailed technical documentation.

---

## Success Criteria

### Core Features

✅ Player can move with joystick
✅ Player can fire weapons with aim control
✅ Can pick up weapons from map
✅ Can fight AI opponents
✅ Safe zone shrinks and deals damage
✅ Match ends when player wins or dies
✅ UI shows health, weapons, minimap
✅ Both characters playable with unique abilities
✅ Multiple weapon types with tiers
✅ Health kits and consumables
✅ Bushes provide stealth
✅ 23 AI opponents with varied skills
✅ Custom map creation and selection
✅ PNG asset support with fallbacks

---

## Future Enhancement Ideas

Potential additions for future versions:

- **Multiplayer:** Real-time matches, team modes, matchmaking
- **Content:** More characters, weapons, maps, consumables
- **Progression:** Character unlocks, stats tracking, leaderboards
- **Polish:** Enhanced animations, particle effects, sound design, tutorial

---

## Development Philosophy

**Core Principles:**
1. Simple graphics enable fast iteration
2. Clear mechanics are easy to understand and balance
3. Vanilla tech provides full control
4. Data-driven design allows easy content addition
5. Test early, test often

**Remember:** Gameplay feel matters more than visual fidelity. The foundation must be solid before adding complexity.
