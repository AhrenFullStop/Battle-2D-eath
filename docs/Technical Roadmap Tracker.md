# Battle-2D-eath — Technical Roadmap Tracker

This document is the canonical “what we’re building + how we build it + what’s next” tracker for an agentic team.

## Vision
Build an open source, offline, peer-to-peer (P2P) battle royale that is simple, performant, and relentlessly fun.

- Served as a static site (GitHub Pages compatible)
- No servers for gameplay
- Mobile-first and playable on desktop
- Simple assets (PNGs; no complex sprite pipelines)

## Principles (non‑negotiables)
- **No gameplay servers. Ever.** The game must run fully client-side.
- **Simple stack**: vanilla JS (ES modules) + Canvas + HTML/CSS.
- **Performance first**: keep frame-time stable; avoid heavy allocations inside the hot loop.
- **Determinism is sacred** (multiplayer): simulate from inputs, not state sync.
- **Data-driven content**: characters/weapons/maps should be authored in config/JSON.
- **Graceful degradation**: assets are optional; fallbacks must remain solid.

## Current State (as observed)
### What’s working (core loop)
- Character selection + map selection exist (canvas-driven StartScreen).
- Game starts, movement and touch controls feel good.
- Weapons fire correctly; hitboxes and damage feel consistent.
- Pickups exist for weapons + consumables.
- Safe zone system exists with warning overlay.
- Map editor exists as a separate entrypoint (editor.html).

### Known problems (confirmed in code)
- **Map background images not shown in the menu:** StartScreen uses a placeholder gradient + “IMAGE” badge for image backgrounds rather than rendering the image.
  - See: preview rendering in [src/renderer/StartScreen.js](../src/renderer/StartScreen.js)
- **Island map background image works on localhost but fails on GitHub Pages (reported):**
  - In-game background images load from `maps/backgrounds/<filename>`.
  - See: background loading in [src/renderer/MapRenderer.js](../src/renderer/MapRenderer.js)
  - Map specifies background image: [maps/Island.json](../maps/Island.json) and registry: [maps/manifest.json](../maps/manifest.json)
  - Likely causes to validate: base-path handling on GH Pages, relative URL resolution, and case-sensitive path mismatches.

### Technical gaps vs stated goals
- **Menu UX is not scalable** for many maps/characters; needs a redesign and a proper navigation model.
- **AI lacks challenge and variety**; no ability usage; weak obstacle navigation.
- **RPG meta loop** (XP/coins/upgrades) not present.
- **Multiplayer** not present.
- **Editor accessibility + mobile usability** not present.

## Architecture map (what lives where)
### Entry points
- Game: [src/main.js](../src/main.js) (start screen → init systems → game loop)
- Editor: [src/editor/editorMain.js](../src/editor/editorMain.js) (separate app)

### Core runtime
- State: [src/core/GameState.js](../src/core/GameState.js)
- Events: [src/core/EventBus.js](../src/core/EventBus.js)
- Loop: [src/core/GameLoop.js](../src/core/GameLoop.js)
- Assets: [src/core/AssetLoader.js](../src/core/AssetLoader.js)

### Systems
- Input: [src/systems/InputSystem.js](../src/systems/InputSystem.js)
- Physics: [src/systems/PhysicsSystem.js](../src/systems/PhysicsSystem.js)
- Combat: [src/systems/CombatSystem.js](../src/systems/CombatSystem.js)
- Abilities: [src/systems/AbilitySystem.js](../src/systems/AbilitySystem.js)
- AI: [src/systems/AISystem.js](../src/systems/AISystem.js)
- Safe Zone: [src/systems/SafeZoneSystem.js](../src/systems/SafeZoneSystem.js)
- Camera: [src/systems/CameraSystem.js](../src/systems/CameraSystem.js)

### Rendering
- Coordinator: [src/renderer/Renderer.js](../src/renderer/Renderer.js)
- Menu: [src/renderer/StartScreen.js](../src/renderer/StartScreen.js)
- World: [src/renderer/MapRenderer.js](../src/renderer/MapRenderer.js), [src/renderer/CharacterRenderer.js](../src/renderer/CharacterRenderer.js), [src/renderer/WeaponRenderer.js](../src/renderer/WeaponRenderer.js)
- UI: [src/renderer/UIRenderer.js](../src/renderer/UIRenderer.js)

### Content/config
- Characters: [src/config/characters.js](../src/config/characters.js)
- Weapons: [src/config/weapons.js](../src/config/weapons.js)
- Maps: [src/config/map.js](../src/config/map.js) + registry [maps/manifest.json](../maps/manifest.json) + map files in [maps/](../maps/)
- Match/game tuning: [src/config/gameConfig.js](../src/config/gameConfig.js)

## Engineering practices (how we keep this project agent-friendly)
- **Prefer small PR-sized changes**: one tracked task → one coherent change.
- **Avoid “magic booleans”**: when something can fail, return a reason enum/string.
- **EventBus for cross-system communication**: don’t create hidden couplings.
- **No heavy allocations inside per-frame loops**: reuse vectors and arrays where possible.
- **Deterministic multiplayer prep**:
  - Route all player actions as “inputs” with timestamps/ticks.
  - Seed RNG explicitly (no `Math.random()` in simulation paths used for multiplayer).
- **Config-driven gameplay**: new characters/weapons/maps should rarely require new code.

---

# Roadmap Tracker

How to use:
- Check off tasks with `- [x]` when complete.
- When a milestone is finished, add a short summary in the “Milestone Completion Notes” section including file pointers (paths + key symbols).
- No timeline estimates in this doc.

## Milestone 0 — Navigation + Restart (P0)
Goal: A player can always get back to the main menu without refresh; state resets cleanly.

- [x] Add “Return to Menu” button on match end screen
  - User story: As a player, when I die or win I can return to the main menu without refreshing.
  - Acceptance:
    - Button is visible on victory + game over.
    - Clicking returns to StartScreen/menu state.
    - No lingering input listeners or duplicate handlers after returning.

- [x] Implement `Game.resetToMenu()` lifecycle
  - User story: As the app, I can teardown and reinitialize game systems safely.
  - Acceptance:
    - Stops `GameLoop` cleanly.
    - Clears `GameState` entities and UI state.
    - Recreates and reattaches StartScreen listeners once.
    - Re-selecting character/map and pressing Battle starts a fresh match.

- [x] Fix kill attribution logic (sanity)
  - User story: As a player, my “kills” stat reflects actual kills, not “AI deaths happened”.
  - Acceptance:
    - Kills increment only when player is responsible (or explicitly defined rules).
    - End screen placement + kills look reasonable.

Milestone Completion Notes (fill in when done):
- Summary:
  - End screen now includes a clickable “Return to Menu” button (victory + game over).
  - Added a safe teardown + restart path (`resetToMenu`) that stops the match loop, clears listeners/state, and re-enters StartScreen without duplicates.
  - Kill stat now increments only when the player actually killed an AI (not on any AI death).
- Files touched:
  - [src/main.js](../src/main.js)
  - [src/renderer/UIRenderer.js](../src/renderer/UIRenderer.js)
  - [src/systems/InputSystem.js](../src/systems/InputSystem.js)
  - [src/systems/CombatSystem.js](../src/systems/CombatSystem.js)
- Key decisions:
  - End-screen input is handled by a single canvas listener in `Game` (hit-testing the UI button) to avoid per-reset listener duplication.
  - Kill attribution is based on an explicit `characterKilled` event emitted by `CombatSystem` when damage transitions a target from alive → dead.

## Milestone 1 — Pickup UX correctness (P0)
Goal: Pickups never “infinite load”; invalid pickups communicate why; rule matches design.

- [x] Return structured pickup results (success / reason)
  - User story: As UI, I can render “not pickupable” states reliably.
  - Acceptance:
    - `tryPickupWeapon(...)` (or equivalent) returns `{ ok: boolean, reason: string }`.
    - Reasons include at minimum: `duplicate_same_tier`, `lower_than_equipped`, `inventory_full_no_replace`.

- [x] Stop updating pickup progress when pickup is invalid
  - User story: As a player, I never see a loader for something I can’t pick up.
  - Acceptance:
    - If reason is non-pickupable, pickup progress does not begin.
    - If player leaves range, progress resets as today.

- [x] Add “not pickupable” visual treatment for weapon pickups
  - User story: As a player, I can immediately tell why I can’t pick up an item.
  - Acceptance:
    - When non-pickupable: show a clear indicator (e.g., grew tint) in-world.
    - When pickupable: loader behaves the same as today.

Milestone Completion Notes (fill in when done):
- Summary:
  - Weapon pickups now return structured results (`{ ok, reason }`) and share a single ruleset across player + AI.
  - The pickup loader/progress never starts for invalid pickups (fixes the “infinite loader” loop).
  - In-world pickups show a clear “blocked” state (dimmed + badge + short reason label) when the player is in range.
- Files touched:
  - [src/entities/Character.js](../src/entities/Character.js)
  - [src/main.js](../src/main.js)
  - [src/entities/Weapon.js](../src/entities/Weapon.js)
  - [src/renderer/WeaponRenderer.js](../src/renderer/WeaponRenderer.js)
  - [src/renderer/Renderer.js](../src/renderer/Renderer.js)
  - [src/systems/AISystem.js](../src/systems/AISystem.js)
  - [src/entities/Player.js](../src/entities/Player.js)
  - [src/entities/AICharacter.js](../src/entities/AICharacter.js)
- Key decisions:
  - Canonical pickup rule evaluation lives in `Character.getWeaponPickupResult(...)` so UI gating, player pickup, and AI pickup all agree.
  - `lower_than_equipped` is interpreted as “you already own this weapon type at a higher tier”.
  - Rendering uses a lightweight flag on the pickup (`playerPickupBlockedReason`) set during the game update; indicator only appears while the player is in range.

## Milestone 2 — Menu overhaul + scalable content browsing (P0/P1)
Goal: A menu that feels modern, scales to many characters/maps, and exposes editor + multiplayer.

Design constraints:
- Still static-site compatible.
- Keep tech simple (vanilla JS + HTML/CSS + canvas as needed).

- [ ] Define menu navigation model
  - User story: As a user, I can move between: Home → Solo → Multiplayer → Map Editor.
  - Acceptance:
    - Clear states and transitions documented.
    - Single “source of truth” for menu state.

- [ ] Decide: Canvas StartScreen vs DOM overlay UI
  - User story: As the project, we pick one UI approach that’s scalable and accessible.
  - Acceptance:
    - Decision recorded (with rationale) in this doc’s “Decision Log”.
    - Implementation tasks below reflect the chosen approach.

- [ ] Render real image backgrounds in map selection
  - User story: As a player, I see the actual background image for image-based maps.
  - Acceptance:
    - Map cards show the real JPEG/PNG when `background.type === 'image'`.
    - Image loads are cached and do not hitch scrolling.

- [ ] Add menu access to the Map Editor
  - User story: As a player/creator, I can launch the editor from the main menu.
  - Acceptance:
    - “Map Editor” entry exists in menu.
    - Opens editor without manual URL typing.

- [ ] Add menu entry for Multiplayer (stub)
  - User story: As a player, I can see Multiplayer is a first-class mode.
  - Acceptance:
    - Menu includes Multiplayer button.
    - For now, shows a simple “coming soon” placeholder (no extra screens beyond what’s required).

Milestone Completion Notes (fill in when done):
- Summary:
- Files touched:
- Key decisions:

## Milestone 3 — GitHub Pages asset correctness (P1)
Goal: Maps and backgrounds behave identically on localhost and GitHub Pages.

- [ ] Reproduce and diagnose Island background failing on GH Pages
  - User story: As a dev, I can explain why it fails and verify the fix.
  - Acceptance:
    - Root cause is documented (base path / casing / caching / mime / etc.).
    - Fix validated on GH Pages.

- [ ] Introduce a single “asset URL resolver” helper
  - User story: As the codebase, we don’t scatter path logic across renderers.
  - Acceptance:
    - One helper builds URLs for `assets/*` and `maps/*`.
    - Both StartScreen previews and in-game MapRenderer use it.

- [ ] Add a small “asset health check” in dev logs
  - User story: As a dev, I can quickly see missing files and broken URLs.
  - Acceptance:
    - Logs clear warnings when a referenced map background can’t be fetched.
    - No noisy logs during normal play.

Milestone Completion Notes (fill in when done):
- Summary:
- Files touched:
- Key decisions:

## Milestone 4 — AI: believable, varied, and performant (P0/P1)
Goal: Bots become the fun engine: more opponents, fewer dumb moments, varied skill, and abilities.

Notes:
- Current AI is state-machine based but lacks robust navigation and ability usage.
- Current gameplay uses randomness in several places; we’ll need to control that for multiplayer later.

- [ ] AI obstacle navigation upgrade (lightweight)
  - User story: As a player, bots don’t get stuck on rocks and can route around obstacles.
  - Acceptance:
    - Bots no longer “buzz” against obstacles for extended periods.
    - Pathing remains lightweight (no heavy grid search per bot per frame unless optimized).

- [ ] Add ability usage for AI (dash/slam)
  - User story: As a player, bots use abilities sometimes and it changes fights.
  - Acceptance:
    - At least one skill tier uses abilities intentionally.
    - Cooldowns and existing ability rules are respected.

- [ ] Implement skill profiles (aim, aggression, reaction time)
  - User story: As a player, I face distinct bot personalities.
  - Acceptance:
    - Novice/intermediate/expert feel meaningfully different.
    - Skill distribution remains configurable in game config.

- [ ] Increase bot counts safely
  - User story: As a player, I can play higher-pop matches on capable devices.
  - Acceptance:
    - Bot count becomes a configurable map/game setting.
    - Performance remains acceptable (no severe stutters).

- [ ] AI research notes (in-doc)
  - User story: As future agents, we have a curated list of approaches to borrow.
  - Acceptance:
    - Add a short section to this doc with links/keywords/approaches.
    - Include what was tried and what was rejected.

Milestone Completion Notes (fill in when done):
- Summary:
- Files touched:
- Key decisions:

## Milestone 5 — Map Editor: mobile-first, menu-accessible, content pipeline (P1)
Goal: Creating and shipping maps becomes easy and fun.

- [ ] Editor UX pass for mobile interactions
  - User story: As a creator on a phone, I can pan/zoom/place reliably.
  - Acceptance:
    - Touch gestures are predictable (no accidental placements).
    - Primary actions are reachable and readable on mobile.

- [ ] Add “export → save instructions” flow designed for GH Pages
  - User story: As a creator, I can export a JSON and know exactly where to put it.
  - Acceptance:
    - Export output includes background config conventions.
    - Minimal steps to register in manifest.

- [ ] Add map validation
  - User story: As the game, we reject invalid or legacy map JSON cleanly.
  - Acceptance:
    - Validates required fields and clamps unsafe values.
    - Shows actionable errors instead of silent failures.

- [ ] Ship at least 2 additional maps
  - User story: As a player, I have variety.
  - Acceptance:
    - New maps appear in manifest and load correctly.
    - Backgrounds (color or image) render in menu and in-game.

Milestone Completion Notes (fill in when done):
- Summary:
- Files touched:
- Key decisions:

## Milestone 6 — RPG meta loop (XP, coins, upgrades) (P1/P2)
Goal: Add lightweight progression while staying offline and simple.

Constraints:
- No account system.
- Storage is local (LocalStorage / IndexedDB). “Secure” is not the goal; “not trivially breakable” is a bonus.

- [ ] Define player profile schema (versioned)
  - User story: As the game, I can evolve saved data without breaking old players.
  - Acceptance:
    - `profileVersion` exists and migrations are supported.
    - Stores XP, coins, unlocked items, and basic stats.

- [ ] Award XP/coins from match results
  - User story: As a player, finishing matches earns progression.
  - Acceptance:
    - XP/coins computed from placement + kills + survival time (simple rules).
    - Persisted after match end.

- [ ] Add upgrade framework (data-driven)
  - User story: As a designer/dev, I can add upgrades without rewriting systems.
  - Acceptance:
    - Upgrade definitions live in config.
    - Applying upgrades modifies character/weapon parameters in a controlled way.

- [ ] Add minimal “Store/Upgrades” UI entry
  - User story: As a player, I can spend coins.
  - Acceptance:
    - UI allows buying at least one upgrade.
    - Purchases persist across reloads.

Milestone Completion Notes (fill in when done):
- Summary:
- Files touched:
- Key decisions:

## Milestone 7 — Multiplayer (P2P, no servers) (P0 but gated by decisions)
Goal: Real multiplayer with no game servers, evolving from “works” to “robust”.

Reality check:
- True internet-grade P2P in browsers typically needs some form of signalling and NAT traversal support.
- Our rule is “no servers ever” — so we must explicitly decide what “multiplayer” means under that constraint.

### Decision Log (must resolve before serious implementation)
- [ ] Define acceptable connectivity model
  - Options to decide between:
    - A) Same-device / split-screen style (not true P2P, but zero networking)
    - B) Same-LAN peer connections (best effort) with manual pairing
    - C) Internet P2P with user-supplied signalling (copy/paste offers) and best-effort ICE
  - Acceptance:
    - Chosen model documented, including known limitations.

### Implementation track (after decision)
- [ ] Introduce “Netcode layer” abstraction
  - User story: As the codebase, local and networked matches share the same simulation.
  - Acceptance:
    - Simulation consumes an “input stream” regardless of source.
    - Local play is just a special case of the same interface.

- [ ] Implement deterministic tick clock
  - User story: As multiplayer, all peers simulate the same ticks.
  - Acceptance:
    - Fixed tick rate defined and enforced.
    - All simulation randomness is seeded and replayable.

- [ ] Build pairing UX (no servers)
  - User story: As two players, we can connect without hosted infrastructure.
  - Acceptance:
    - Host creates a join code (offer) that can be copy/pasted (and optionally QR).
    - Client pastes code (answer) to connect.

- [ ] Start with 1v1 Free-For-All (smallest playable slice)
  - User story: As two players, we can fight in the same match.
  - Acceptance:
    - Both players spawn and can move/fire.
    - Match end rules work.

- [ ] Add Duos/Trios/FFA support (configurable)
  - User story: As a group, we can pick a mode.
  - Acceptance:
    - Team assignment is deterministic and synced.
    - Bots can be configured per mode.

Milestone Completion Notes (fill in when done):
- Summary:
- Files touched:
- Key decisions:

---

# Backlog / Tech Debt (important, but don’t derail P0s)
- [ ] Align documentation vs actual defaults (AI count, etc.)
  - Acceptance: README/GDD match shipped defaults or explicitly explain differences.

- [ ] Ensure combat uses current map obstacles for projectile collisions
  - Context: Combat currently checks collisions against default map obstacles.
  - Acceptance: Uses current loaded map config for obstacles.

- [ ] Remove per-frame `Date.now()`-driven gameplay randomness from simulation paths
  - Acceptance: Visual-only effects may use wall clock; simulation uses tick time.

- [ ] Add minimal debug overlay toggles for AI + networking
  - Acceptance: One flag enables rendering of AI state and target info.
