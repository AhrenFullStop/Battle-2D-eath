# Game Design Document — 2D Battle Royale MVP

---

## Overview
- **Title (working):** Battle-2D-eath
- **Platform:** Mobile (iOS and Android) — touch-first design, portrait
- **Genre:** Top-down, single-device, offline battle royale vs AI
- **Technology:** Simple HTML5 Canvas with vanilla JavaScript
- **Visual Style:** Minimalist/retro — static PNGs, simple shapes, emoji pickups
- **Scope (MVP):** 1 map, 2 playable characters, AI opponents, weapon pickups, shrinking zone, core combat

> **Future:** Multiplayer capability — architecture should support this later

---

## High-Level Gameplay Loop
1. Player selects one of two characters
2. Match starts on full map; weapons, health, and consumables spawn randomly
3. Player navigates map, picks up weapons, fights AI opponents
4. Periodically the safe zone shrinks; being outside causes continuous damage
5. Match ends when player is last alive or player dies
6. Reward screen: basic stats (time survived, kills, damage dealt)

---

## Visual Design Philosophy

### Graphics Approach
**Core Principle:** Simplicity over fidelity. Gameplay and mechanics drive fun, not graphics.

**Characters:**
- Static PNG images (one per character, ~64x64 pixels)
- Simple rotation to face movement direction
- No animation frames needed — position + rotation is sufficient
- Health bar above character (colored rectangle)

**Weapons:**
- Simple geometric shapes when held (rectangles, circles, triangles)
- Weapon effects: basic colored shapes/lines
  - Blaster: colored cone/wedge shape
  - Spear: straight line/rectangle
  - Bomb: circle with arc trajectory line
  - Gun: small projectile dots

**Pickups:**
- Weapons: colored geometric shapes on ground with subtle glow
- Consumables: emoji or simple icons (❤️ for health, 🛡️ for shield, ⚡ for speed, etc.)
- Pickup progress: simple circular progress indicator (3 dots rotating, or partial circle fill)

**UI Elements:**
- Minimalist HUD: rectangles and circles for buttons
- Health/shield: colored bars (red/blue)
- Minimap: simple circle with dots for players
- Loading indicators: 3 dots animation or simple progress circles

**Environment:**
- Map: solid background color with simple texture
- Bushes: green circles or rounded rectangles
- Water: blue areas
- Obstacles: gray/brown shapes
- Safe zone boundary: colored circle outline (green safe, red danger)

---

## Controls and Core Interactions

### Input Layout
- **Movement:** Virtual joystick (bottom-left corner)
  - Touch and drag to move character
  - Visual: outer circle + inner draggable circle
  
- **Combat Controls (bottom-right):**
  - Special ability button (center, larger)
  - Weapon buttons (up to 3, arranged around special button)
  - Each weapon button supports tap or hold+drag for aiming

### Weapon Aiming
- **Tap:** Quick fire in last aimed direction
- **Hold + Drag:** 
  - Press and hold weapon button
  - Drag outward to aim
  - Visual preview shows attack direction/area
  - Release to fire

### Inventory
**Health Kit Slots (2 dedicated slots):**
- Bottom center of screen
- Quick tap to use
- Only holds health kits

**Pickup Slots (2 general slots):**
- Near health kit slots
- Holds tactical items (shield, trap, speed boost, invulnerability)
- Auto-equipped on pickup
- Cannot pickup more if slots full

### Visual Feedback
- **Aim preview:** Semi-transparent overlay showing attack area
- **Cooldown indicator:** Partial circle around button showing remaining cooldown
- **Hit feedback:** Screen edge flash indicating damage direction
- **Safe zone warning:** Red screen pulse when outside safe zone

### UI Layout
- **Top center:** Minimap showing safe zone and player positions
- **Top left:** Health bar, shield indicator
- **Bottom left:** Movement joystick
- **Bottom right:** Weapon and ability buttons
- **Bottom center:** Consumable slots

---

## Characters

Two characters with distinct playstyles. Both use same damage formulas but different stats.

### Character Stats Overview

| Character | Role | Base HP | Move Speed | Special Ability |
|-----------|------|---------|------------|-----------------|
| **Bolt** | Fast/Skirmisher | 80 | High | Dash + brief invisibility |
| **Boulder** | Tank/Frontline | 140 | Low | Ground slam (AoE damage + stun) |

### Stat Definitions
Each character has:
- **Max HP:** Starting health points
- **Move Speed:** Movement rate (higher = faster)
- **Hitbox Size:** Collision radius (affects targeting)
- **Pickup Speed:** Time multiplier for collecting items
- **Weapon Cooldown Modifier:** Affects how fast weapons recharge

### Character Details

**Bolt (Fast Character):**
- Lower HP, smaller hitbox
- Faster movement and weapon cooldowns
- Special: Dash forward quickly, becomes invisible briefly if dash ends in bush
- Playstyle: Hit and run, use bushes for stealth

**Boulder (Tank Character):**
- Higher HP, larger hitbox
- Slower movement and weapon cooldowns
- Special: Ground slam that damages and stuns enemies in area
- Can charge slam while stationary to increase radius
- Playstyle: Frontline fighter, control space with slam

### Stat Modifiers
Characters apply multipliers to base weapon stats:
- Bolt: Faster weapon cooldowns (15% faster)
- Boulder: Slower weapon cooldowns (20% slower)
- Both: Same damage output (balanced)

---

## Weapons and Items

### Weapon System
**Pickup Rules:**
- Must pick up weapons from map to use them
- Can carry up to 3 weapons simultaneously
- Picking up takes time (progress indicator shows)
- If inventory full, replaces lowest tier weapon
- Cannot pickup same tier weapon if already owned

**Weapon Tiers:**
- **Tier 1 (Common):** Base stats, most common spawn
- **Tier 2 (Rare):** Better stats, less common
- **Tier 3 (Epic):** Best stats, rare spawn

Visual distinction: Different colored glows (gray/white → blue → gold)

### Weapon Types

**1. Blaster (Cone Attack):**
- Fires cone-shaped blast in aimed direction
- Hits all enemies in cone area
- Short range, instant hit
- Good for close combat

**2. Spear (Line Projectile):**
- Throws spear in straight line
- Hits first enemy in path
- Medium range, fast projectile
- Good for poking from distance

**3. Bomb (Arc AoE):**
- Lobs bomb that explodes on landing
- Damages all enemies in explosion radius
- Area lingers briefly
- Good for area denial

**4. Gun (Burst Fire):**
- Fires 3 quick shots in aimed direction
- Each shot is separate projectile
- Medium range
- Good for consistent damage

### Weapon Stats
Each weapon has:
- **Damage:** Base damage per hit
- **Range:** How far attack reaches
- **Cooldown:** Time between uses
- **Special Properties:** Type-specific (cone angle, projectile speed, AoE radius, etc.)

Higher tiers improve damage and range proportionally.

### Consumables

**Health Kit:**
- Restores 30% of max HP
- Instant use
- Dedicated inventory slots (can carry 2)

**Shield Potion:**
- Adds 50 shield HP (absorbed before health)
- Takes 1 second to use
- General pickup slot

**Adrenaline:**
- Increases movement speed by 30%
- Lasts 3 seconds
- Quick use (0.5 seconds)
- General pickup slot

**Trap:**
- Deployable item placed on ground
- Roots enemy in place for 2 seconds
- Deals small damage over time
- Lasts 60 seconds or until triggered
- General pickup slot

**Invulnerability:**
- Makes player immune to all damage
- Lasts 3 seconds
- Quick use (0.5 seconds)
- General pickup slot

### Pickup Visuals
- Weapons: Colored shapes with tier-appropriate glow
- Health: Red/pink indicator (❤️ or red cross)
- Shield: Blue indicator (🛡️)
- Speed: Yellow/lightning indicator (⚡)
- Trap: Warning symbol or spike icon
- Invulnerability: Star or shield with sparkle

---

## Environmental Mechanics

### Bush Stealth
**Visibility Rules:**
- Character inside bush is invisible on minimap
- Other players cannot see character in bush
- **Exceptions:**
  - Enemy has direct line of sight within close range
  - Character fires weapon (reveals position briefly)
  - Character uses special ability with visual effect

**Combat:**
- Can still take damage while in bush
- Hit indicators still show
- Position revealed momentarily when firing

### Shrinking Safe Zone
**Mechanics:**
- Safe zone shrinks in phases at set times
- Being outside zone causes continuous damage
- Damage increases each phase
- Visual warning: Red screen pulse, minimap indicator

**Phases:**
- Phase 0: Full map, no damage (first 30 seconds)
- Phase 1: Zone shrinks, low damage starts
- Phase 2: Zone shrinks more, medium damage
- Phase 3: Final zone, high damage

**Feedback:**
- Minimap shows safe zone circle
- Screen edge pulses red when outside
- Damage ticks every 0.5 seconds
- Entering safe zone stops damage immediately

### Terrain Types

**Water:**
- Slows movement by 25%
- No effect on combat
- Visual: Blue colored area

**Obstacles (Rocks):**
- Block movement
- Block projectiles
- Provide cover
- Visual: Gray/brown shapes

---

## AI Opponents

### AI Behavior
AI opponents use same characters and weapons as player. They have different skill levels.

### AI Skill Tiers

**Novice:**
- Limited perception range
- Poor aim accuracy
- Slow reactions
- Basic tactics

**Intermediate:**
- Medium perception range
- Decent aim accuracy
- Moderate reactions
- Uses cover sometimes

**Expert:**
- Wide perception range
- High aim accuracy
- Fast reactions
- Uses cover and bushes effectively

### AI Behaviors

**Core Actions:**
- Move around map
- Pick up weapons and items
- Engage enemies when spotted
- Use special abilities
- Respond to safe zone shrinking
- Use health kits when low HP

**Decision Making:**
- Prioritize survival (safe zone, healing)
- Seek better weapons if available
- Engage enemies when advantageous
- Flee when low health
- Use bushes for stealth (higher skill tiers)

### Match Population
- Total participants: 24 (1 player + 23 AI)
- AI skill distribution: Mix of novice, intermediate, and expert
- Character distribution: Roughly even split between Bolt and Boulder

---

## Map and Match Flow

### Map Layout
**Shape:** Circular arena
**Size:** Medium (allows for 24 participants)
**Elements:**
- Spawn points scattered around edges
- Bushes distributed across map
- Water areas for terrain variety
- Obstacles for cover
- Weapon spawn points
- Consumable spawn points

### Spawn System

**Character Spawns:**
- All participants spawn at match start
- Spawn points around map edges
- Minimum spacing between spawns

**Weapon Spawns:**
- Weapons appear at designated points
- Respawn after being picked up (timer-based)
- Tier determined by weighted random (common > rare > epic)

**Consumable Spawns:**
- Consumables appear at designated points
- Respawn after being picked up (timer-based)
- Type determined by weighted random

### Death and Loot
**When Character Dies:**
- Death is permanent (no respawn)
- Drops all equipped weapons at death location
- Drops all unused consumables
- Other players can pick up dropped items

### Safe Zone Schedule
**Timing Example:**
- 0-30s: Full map, no damage
- ~2 minutes: First shrink begins
- ~3.5 minutes: Second shrink begins
- ~5 minutes: Final shrink begins
- Total match: 10-12 minutes target

**Damage Scaling:**
- Early phases: Low damage (survivable)
- Middle phases: Medium damage (forces movement)
- Final phase: High damage (creates urgency)

---

## Core Game Systems

### Damage System
**Basic Formula:**
```
Final Damage = Base Weapon Damage × Character Modifier × Tier Modifier
```

**Rules:**
- All damage is instant (no damage over time except safe zone)
- Shield HP depletes before health HP
- Minimum damage is always 1
- Character modifiers affect cooldowns, not damage

**Safe Zone Damage:**
- Applied every 0.5 seconds when outside zone
- Increases each phase
- Ignores shield (damages health directly)

### Stat Modifier System
**How Stats Scale:**
- Base values defined per weapon/character
- Multipliers apply to base values
- Character stats modify weapon performance
- Tier upgrades improve weapon stats

**Example:**
- Weapon cooldown = Base Cooldown × Character Cooldown Modifier
- Bolt with 2.0s weapon = 2.0 × 0.85 = 1.7s actual cooldown
- Boulder with 2.0s weapon = 2.0 × 1.2 = 2.4s actual cooldown

### Pickup System
**Process:**
1. Player enters pickup range
2. Pickup timer starts (shown as progress indicator)
3. Timer duration based on character pickup speed
4. If player leaves range, pickup cancels
5. On completion, item added to inventory

**Inventory Rules:**
- Weapons: Replace lowest tier if inventory full
- Consumables: Cannot pickup if slots full
- Same tier weapons: Don't pickup duplicates

---

## Technical Approach

### Technology Stack
**Core:**
- HTML5 Canvas for rendering
- Vanilla JavaScript for game logic
- No external game frameworks (no Phaser, no Three.js)
- Standard browser APIs only

**Why Simple:**
- Full control over code
- Easy to debug
- No framework learning curve
- Lightweight and fast
- Easy to understand and modify

### Rendering Approach
**Graphics:**
- 2D Canvas drawing API
- Simple shapes: `fillRect()`, `arc()`, `stroke()`
- Static images: `drawImage()` for character PNGs
- Text rendering: `fillText()` for UI

**Performance:**
- Target 60 FPS
- Simple collision detection (circle/rectangle overlap)
- Minimal particle effects
- Efficient redraw (only changed areas if needed)

### Game Loop
**Structure:**
```
1. Process input (touch events)
2. Update game state (positions, collisions, AI)
3. Render frame (clear + draw everything)
4. Repeat at 60 FPS
```

**Key Concepts:**
- Fixed timestep for game logic
- Separate render and update
- Input buffering for responsiveness

### Data Structure
**Configuration:**
- Character stats in simple JavaScript objects
- Weapon definitions in arrays
- AI behavior in state machine logic
- Map data in coordinate arrays

### Input Handling
**Touch Events:**
- Track multiple simultaneous touches
- Left side = joystick
- Right side = buttons
- Simple collision detection for button presses

**Aim System:**
- Calculate angle from button center to touch point
- Draw preview line/shape
- Fire on touch release

**Game Camera:**
- Camera should follow the player, the map should be much larger than the players visible area, hence the need for a minimap

---

## MVP Development Plan

### Phase 1: Core Foundation (Week 1)
**Goal:** Playable character movement

**Tasks:**
1. Set up HTML5 Canvas
2. Implement game loop (update + render)
3. Draw simple character (circle or static PNG)
4. Implement virtual joystick
5. Character moves in response to joystick

**Deliverable:** Can move a character around screen with joystick

### Phase 2: Combat Basics (Week 1-2)
**Goal:** Can fire one weapon

**Tasks:**
1. Add weapon button (bottom-right)
2. Implement tap to fire
3. Draw weapon effect (simple shape)
4. Add basic collision detection
5. Display damage numbers

**Deliverable:** Can fire weapon and see it hit things

### Phase 3: AI Opponent (Week 2)
**Goal:** Can fight one AI

**Tasks:**
1. Add one AI character
2. Implement basic AI movement (random walk)
3. AI picks up weapon
4. AI fires at player when in range
5. Both player and AI can die

**Deliverable:** Can fight and defeat one AI opponent

### Phase 4: Multiple Weapons (Week 2-3)
**Goal:** Weapon variety and pickups

**Tasks:**
1. Add weapon pickup system
2. Implement 2-3 weapon types
3. Add weapon inventory (3 slots)
4. Add weapon switching
5. Add weapon tier system (visual distinction)

**Deliverable:** Can pick up and switch between different weapons

### Phase 5: Map and Environment (Week 3)
**Goal:** Full map with features

**Tasks:**
1. Create circular map boundary
2. Add bushes (stealth mechanic)
3. Add obstacles
4. Add minimap
5. Add multiple AI opponents (5-10)

**Deliverable:** Full map with environmental features and multiple AI

### Phase 6: Safe Zone (Week 3-4)
**Goal:** Match has time pressure

**Tasks:**
1. Implement shrinking safe zone
2. Add safe zone damage
3. Add visual indicators (minimap)
4. Add phase timer
5. AI responds to safe zone (should avoid being outside)

**Deliverable:** Complete match with shrinking zone and win/lose conditions

### Phase 7: Polish and Balance (Week 4)
**Goal:** MVP feels complete

**Tasks:**
1. Add health/shield system
2. Add consumables (health kit + shield minimum)
3. Add special abilities for both characters
4. Add start and end-game screen with stats

**Deliverable:** Complete MVP ready for testing

### Phase 8: UI Layout refinement
**Goal:** adjust our UI layout to a superior state

**Task:**
We have an image `docs/ui_layout.png` that shows our ideal layout - please implement it, making changes only to existing HUD elements and positions minimally so as to retain functionality
Here is a description of the design:
```
# Game Info Panel
Position: Top-left corner
Alignment: Left-aligned, stacked vertically
Contents:
- Safe zone timer
- Remaining players
- Kill count
Purpose: Real-time status updates

# Mini-Map
Position: Top-right corner
Alignment: Right-aligned
Shape: rounded square, semi-transparent
Purpose: Tactical awareness of terrain and enemy positions

👉 Right Side Panel
# Health + Shield Bar
Position: Upper-right vertical strip, below the mini-map
Alignment: Right-aligned
Orientation: Vertical bar
Purpose: Displays current health and shield levels (shield stacks health, not overlays)

# Special Pickups
Position: Mid-right, below the health bar
Alignment: Vertical stack of 2 circular icons
Purpose: Quick access to temporary power-ups or items

# Weapon Slots
Position: Bottom-right
Alignment: cluster of circular icons (around special ability note: current layout is correct)
Purpose: use picked up weapons (hold to aim & preview, release to fire)

# Special Ability Button
Position: Bottom-right corner
Shape: Large circular button
Purpose: Activates the character’s unique ability

👈 Left Side Panel
# Joystick
Position: Bottom-left corner
Shape: Semi-transparent circular pad
Purpose: Controls player movement

# Health Kit Button
Position: adjacent to the joystick on its left, a weapon slot to its right
Shape: Red circular icon
Label: “1/2” (indicating available kits)
Purpose: Tap to heal
```

**Deliverable:** Updated UI layout and all game features retained, matching the design and spec, with zero functional regression.

### Phase 9: Gameplay Adjustments
**Goal:** Some gameplay mechanics are not functioning properly. Lets address these while maintaining existing functionality.

**Tasks:**
1. NPC Behavior: NPC's don't currently move far enough away from the shrinking zone, as a result they can occasionally get stuck moving back and forth on the safe-zone line, rather than more realistically retreating to safety toward the center of the map.
2. NPCs should drop health or shield at a random chance (small chance of nothing) instead of their weapons. Currently NPCs drop a weapon on death. Instead they should drop a random pickup.
3. NPCs seem to get stuck on rocks. I have noticed NPCs getting stuck on in-game rocks, perhaps due to their state machine. we should try to elegantly address this.
4. Player Special abilities don't work at all right now. 
   4.1 Bolts dash ability should increase the player speed, dramatically, for 3 seconds. Right now it seems to teleport the player on the map and then the cool down won't allow re-use. 
   4.2 Boulders ground slam doesn't have a visual indication of where the slam will create damage. it should show the damage zone during pressdown, as there is for weapons, only firing when released.

**Deliverable:** All gameplay mechanics are elegantly adjusted. Game is better than ever.

### Phase 10: Map editing and refinement
**Goal:** User can modify set map

**Tasks:**
1. We need a way to edit and explore the map, this isn't intended to be a "special game mode", but is important for creating and saving map configs so that we have engaging maps to play in
2. We should be able to define a map in a data structure, save it and load it at game start
3. We should be able to select a map from a list on the start screen

> Note - we can be "hackey" about this, for example have a dev route with a simple map layout that exports to file or something like that. something simple and robust (open to suggestions)
**Deliverable:** Map editing and load capability

### Phase 11: visuals and characters
**Goal:** add visual feel to the game

**Tasks:**
1. We should be able to add in PNGs for playable and non playable characters as well as weapons or pickups
2. Guide the user what images are needed and where to place them
3. Ensure proper rendering and gameplay after additions

**Deliverable:** Game handles PNGs in place of certain entities

### Testing Strategy
**After Each Phase:**
1. Manual playtest (5-10 minutes)
2. Check for bugs
3. Verify controls feel responsive
4. Adjust values if needed
5. Get feedback from others

**Key Metrics:**
- Can complete a match in 10-12 minutes?
- Controls feel responsive?
- Combat feels fair?
- AI provides challenge?

---

## Success Criteria for MVP

### Must Have
- ✓ Player can move with joystick
- ✓ Player can fire weapons with aim control
- ✓ Can pick up weapons from map
- ✓ Can fight AI opponents
- ✓ Safe zone shrinks and deals damage
- ✓ Match ends when player wins or dies
- ✓ Basic UI shows health, weapons, minimap

### Should Have
- ✓ Both characters playable
- ✓ Multiple weapon types (2-3 minimum)
- ✓ Health kit consumable
- ✓ Bushes provide stealth
- ✓ 10+ AI opponents
- ✓ End screen shows stats

### Nice to Have (Post-MVP)
- All 4 weapon types
- All 5 consumable types
- 3 AI difficulty tiers
- Weapon tier system (common/rare/epic)
- More visual polish
- More characters

---

## Future Enhancements (Post-MVP)

### Multiplayer
- Real-time multiplayer matches
- Team modes (2v2, 3v3)
- Matchmaking system
- Friend invites

### Content Expansion
- More characters (3-5 additional)
- More weapons (2-3 per type)
- More maps (different sizes/shapes)
- More consumables and tactical items

### Progression
- Character unlocks
- Cosmetic customization
- Stats tracking
- Leaderboards

### Polish
- Better animations
- Particle effects
- Sound design
- Tutorial system

---

## Key Takeaways

**What Makes This Work:**
1. **Simple graphics** = Fast iteration, easy debugging
2. **Clear mechanics** = Easy to understand and balance
3. **Vanilla tech** = Full control, no black boxes
4. **Iterative testing** = Playable at every phase
5. **Focused scope** = Can actually finish it

**Development Philosophy:**
- Get it working first, make it pretty later
- Test early, test often
- Keep code simple and readable
- Focus on feel over features
- Ship MVP, then iterate

**Remember:**
The goal is a playable, fun game. Graphics don't matter if the gameplay loop is broken. Start simple, test constantly, and add complexity only when the foundation is solid.
