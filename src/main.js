// Main application entry point - Battle-2D-eath Phase 7: Polish

import { GameLoop } from './core/GameLoop.js';
import { GameState } from './core/GameState.js';
import { EventBus } from './core/EventBus.js';
import { AssetLoader } from './core/AssetLoader.js';
import { InputSystem } from './systems/InputSystem.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { AISystem } from './systems/AISystem.js';
import { SafeZoneSystem } from './systems/SafeZoneSystem.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { AbilitySystem } from './systems/AbilitySystem.js';
import { Renderer } from './renderer/Renderer.js';
import { StartScreen } from './renderer/StartScreen.js';
import { Player } from './entities/Player.js';
import { AICharacter } from './entities/AICharacter.js';
import { Weapon } from './entities/Weapon.js';
import { Consumable } from './entities/Consumable.js';
import { CHARACTERS } from './config/characters.js';
import { createWeapon } from './config/weapons.js';
import { createConsumable } from './config/consumables.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config/constants.js';
import { MAP_CONFIG, loadMapFromJSON, getCurrentMapConfig, getGameConfig } from './config/map.js';
import { generateAISkills, generateAICharacterTypes, generateWeaponTier } from './config/gameConfig.js';
import { Vector2D } from './utils/Vector2D.js';
import { resolveMapsUrl, warnMissingAsset } from './utils/assetUrl.js';

class Game {
    constructor() {
        // Get canvas element
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }
        
        // Set canvas dimensions
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        
        // Get 2D context
        this.ctx = this.canvas.getContext('2d');
        
        // Game phase
        this.phase = 'start'; // 'start', 'playing', 'ended'
        this.selectedCharacter = null;
        this.selectedMap = null;
        
        // Initialize AssetLoader early for start screen
        this.assetLoader = new AssetLoader();
        
        // Start screen with asset loader
        this.startScreen = new StartScreen(this.canvas, this.ctx, this.assetLoader);
        
        // Initialize core systems (will be set up after character selection)
        this.gameState = null;
        this.eventBus = null;
        
        // Game systems (initialized after character selection)
        this.inputSystem = null;
        this.physicsSystem = null;
        this.combatSystem = null;
        this.safeZoneSystem = null;
        this.aiSystem = null;
        this.abilitySystem = null;
        this.cameraSystem = null;
        this.renderer = null;
        this.gameLoop = null;
        this.consumables = [];
        
        // Setup window resize handler
        window.addEventListener('resize', () => this.onResize());
        // Initial resize will be called after systems are initialized

        // End screen interaction (single handler; avoids duplicate listeners across resets)
        this.onEndScreenTouchEndBound = (e) => this.handleEndScreenTouchEnd(e);
        this.onEndScreenMouseUpBound = (e) => this.handleEndScreenMouseUp(e);
        this.canvas.addEventListener('touchend', this.onEndScreenTouchEndBound, { passive: false });
        this.canvas.addEventListener('mouseup', this.onEndScreenMouseUpBound);
        
        // Setup start screen interaction
        this.setupStartScreenInteraction();
    }
    
    setupStartScreenInteraction() {
        // No need for custom event handlers - StartScreen handles its own events
        // We'll check the startRequested flag in the render loop
    }
    
    async startGame() {
        console.log('Starting game with character:', this.selectedCharacter);
        console.log('Starting game with map:', this.selectedMap?.name || 'Random Arena');
        
        // Load selected map.
        // NOTE: StartScreen preloads map JSON into `selectedMap.mapData` and applies menu overrides
        // into `mapData.gameConfig`. Prefer that to avoid discarding overrides.
        if (this.selectedMap && this.selectedMap.mapData) {
            try {
                loadMapFromJSON(this.selectedMap.mapData);
                console.log('✅ Successfully loaded selected map (with menu overrides):', this.selectedMap.mapData.name);
            } catch (error) {
                console.error('❌ Error loading selected map data:', error);
                console.log('Falling back to default procedural map');
            }
        } else if (this.selectedMap && this.selectedMap.file) {
            try {
                const mapPath = `maps/${this.selectedMap.file}`;
                const mapUrl = resolveMapsUrl(this.selectedMap.file);
                console.log('Fetching map file:', mapUrl);
                const response = await fetch(mapUrl);
                if (!response.ok) {
                    warnMissingAsset('map json', mapPath, `HTTP ${response.status}`);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const mapData = await response.json();
                console.log('Map data loaded:', mapData);
                loadMapFromJSON(mapData);
                console.log('✅ Successfully loaded custom map:', mapData.name);
            } catch (error) {
                console.error('❌ Error loading map file:', error);
                warnMissingAsset('map json', `maps/${this.selectedMap.file}`, error?.message || String(error));
                console.log('Falling back to default procedural map');
            }
        } else {
            console.log('Using default procedural map (no custom map selected)');
        }
        
        // Remove start screen event listeners
        this.startScreen.removeEventListeners();
        
        // Initialize core systems
        this.gameState = new GameState();
        this.eventBus = new EventBus();
        
        // AssetLoader already created in constructor, just ensure assets are loaded
        if (!this.assetLoader.isLoading && this.assetLoader.totalCount === 0) {
            console.log('Loading game assets...');
            await this.assetLoader.loadGameAssets();
            console.log('Game assets loaded');
        }
        
        // Store consumables array in game state for AI drops
        this.gameState.consumables = this.consumables;
        
        // Initialize game systems
        this.inputSystem = new InputSystem(this.canvas, this.eventBus, this.assetLoader);
        this.physicsSystem = new PhysicsSystem(this.gameState);
        this.combatSystem = new CombatSystem(this.gameState, this.eventBus);
        this.safeZoneSystem = new SafeZoneSystem(this.gameState, this.eventBus);
        this.aiSystem = new AISystem(this.gameState, this.eventBus, this.combatSystem);
        this.abilitySystem = new AbilitySystem(this.gameState, this.eventBus, this.combatSystem);
        this.cameraSystem = new CameraSystem(CANVAS_WIDTH, CANVAS_HEIGHT);
        this.renderer = new Renderer(this.canvas, this.assetLoader);
        
        // Store safe zone system reference in game state
        this.gameState.safeZoneSystem = this.safeZoneSystem;
        
        // Initialize game loop
        this.gameLoop = new GameLoop(
            (deltaTime) => this.update(deltaTime),
            (interpolation) => this.render(interpolation)
        );
        
        // Setup event listeners for stats tracking
        this.setupEventListeners();
        
        // Initialize game with selected character
        await this.init();
        
        // Change phase and start
        this.phase = 'playing';
        this.gameLoop.start();
        
        console.log('Game started! Phase 7: Polish - Final MVP');
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Track damage dealt by player for stats
        this.eventBus.on('characterDamaged', (data) => {
            if (data.attacker && data.attacker.isPlayer) {
                this.gameState.addDamage(data.damage);
            }
        });

        // Track kills only when player actually gets the kill
        this.eventBus.on('characterKilled', (data) => {
            if (data.attacker && data.attacker.isPlayer && data.target && !data.target.isPlayer) {
                this.gameState.addKill();
            }
        });
    }

    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    handleEndScreenTouchEnd(event) {
        if (!this.gameState || this.gameState.phase === 'playing') return;
        if (!event.changedTouches || event.changedTouches.length === 0) return;

        const touch = event.changedTouches[0];
        const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
        this.tryHandleReturnToMenu(coords.x, coords.y);
    }

    handleEndScreenMouseUp(event) {
        if (!this.gameState || this.gameState.phase === 'playing') return;
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);
        this.tryHandleReturnToMenu(coords.x, coords.y);
    }

    tryHandleReturnToMenu(x, y) {
        if (!this.renderer || !this.renderer.uiRenderer) return;
        if (this.gameState.phase !== 'gameOver' && this.gameState.phase !== 'victory') return;

        if (this.renderer.uiRenderer.isReturnToMenuHit(x, y)) {
            this.resetToMenu();
        }
    }

    resetToMenu() {
        console.log('Resetting to menu...');

        // Stop running match loop
        if (this.gameLoop) {
            this.gameLoop.stop();
            this.gameLoop = null;
        }

        // Teardown systems and listeners that would otherwise duplicate
        if (this.inputSystem) {
            this.inputSystem.removeEventListeners();
        }
        if (this.eventBus) {
            this.eventBus.clear();
        }
        if (this.combatSystem && typeof this.combatSystem.dispose === 'function') {
            this.combatSystem.dispose();
        }

        // Clear references
        this.gameState = null;
        this.eventBus = null;
        this.inputSystem = null;
        this.physicsSystem = null;
        this.combatSystem = null;
        this.safeZoneSystem = null;
        this.aiSystem = null;
        this.abilitySystem = null;
        this.cameraSystem = null;
        this.renderer = null;
        this.consumables = [];

        // Recreate StartScreen (and its listeners) exactly once
        if (this.startScreen) {
            this.startScreen.removeEventListeners();
        }
        this.startScreen = new StartScreen(this.canvas, this.ctx, this.assetLoader);

        // Return to menu phase and restart the menu loop
        this.phase = 'start';
        if (this.startScreenLoop) {
            this.startScreenLoop.start();
        }
    }

    // Initialize the game
    async init() {
        console.log('Initializing Battle-2D-eath Phase 10: Map Editor...');
        
        // Get the current map config (either loaded or default)
        const mapConfig = getCurrentMapConfig();
        
        // Get game configuration (with fallback to defaults)
        const gameConfig = getGameConfig();
        console.log('Game config:', gameConfig);
        
        // Create player character with selected character type
        const characterConfig = { ...CHARACTERS[this.selectedCharacter], isPlayer: true };
        const player = new Player(characterConfig);
        
        // Spawn player in center of map
        player.setPosition(mapConfig.centerX, mapConfig.centerY);
        
        // Equip player with a Blaster weapon (Tier 1)
        const blasterWeapon = new Weapon(createWeapon('blaster', 1));
        player.equipWeapon(blasterWeapon);
        
        // Add player to game state
        this.gameState.addCharacter(player);
        
        // Create AI opponents (count and distribution from config)
        const aiCount = gameConfig.match.aiCount;
        const characterTypes = generateAICharacterTypes(gameConfig.ai.characterDistribution, aiCount);
        const skillLevels = generateAISkills(gameConfig.ai.skillDistribution, aiCount);
        
        for (let i = 0; i < aiCount; i++) {
            const characterType = characterTypes[i];
            const skillLevel = skillLevels[i];
            
            const aiConfig = {
                ...CHARACTERS[characterType],
                isPlayer: false,
                aiSkillLevel: skillLevel
            };
            const aiOpponent = new AICharacter(aiConfig);
            
            // Spawn AI at spawn points around the map edge
            const spawnPoint = mapConfig.characterSpawns[i % mapConfig.characterSpawns.length];
            aiOpponent.setPosition(spawnPoint.x, spawnPoint.y);
            
            // Add AI to game state
            this.gameState.addCharacter(aiOpponent);
            
            console.log(`AI ${i + 1} spawned: ${aiOpponent.name} (${skillLevel}) at (${Math.round(spawnPoint.x)}, ${Math.round(spawnPoint.y)})`);
        }
        
        // Spawn weapons across the map (count from config)
        const weaponTypes = ['blaster', 'spear', 'bomb', 'gun'];
        const weaponSpawns = [];
        const weaponCount = gameConfig.loot.initialWeapons;
        
        for (let i = 0; i < weaponCount; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 400 + Math.random() * 500;
            let x = mapConfig.centerX + Math.cos(angle) * distance;
            let y = mapConfig.centerY + Math.sin(angle) * distance;
            
            // Find valid spawn position (not on obstacles)
            const validPos = this.findValidSpawnPosition(x, y, mapConfig, 30);
            if (validPos) {
                x = validPos.x;
                y = validPos.y;
                
                const type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
                const tier = generateWeaponTier(gameConfig.loot.weaponTierRatios);
                
                weaponSpawns.push({ pos: new Vector2D(x, y), type, tier });
                this.aiSystem.spawnWeapon(new Vector2D(x, y), type, tier);
            }
        }
        
        // Spawn consumables across the map (count from config)
        const consumableTypes = ['healthKit', 'shieldPotion'];
        const consumableCount = gameConfig.loot.initialConsumables;
        
        for (let i = 0; i < consumableCount; i++) {
            const angle = (i / 6) * Math.PI * 2 + Math.PI / 12;
            const distance = 300 + Math.random() * 600;
            let x = mapConfig.centerX + Math.cos(angle) * distance;
            let y = mapConfig.centerY + Math.sin(angle) * distance;
            
            // Find valid spawn position (not on obstacles)
            const validPos = this.findValidSpawnPosition(x, y, mapConfig, 30);
            if (validPos) {
                x = validPos.x;
                y = validPos.y;
                
                const type = consumableTypes[Math.floor(Math.random() * consumableTypes.length)];
                
                const consumable = new Consumable(createConsumable(type));
                consumable.setPosition(x, y);
                this.consumables.push(consumable);
            }
        }
        
        console.log('Player created:', player.name);
        console.log('Starting weapon:', blasterWeapon.name);
        console.log(`${aiCount} AI opponents spawned (${characterTypes.filter(t => t === 'bolt').length} Bolt, ${characterTypes.filter(t => t === 'boulder').length} Boulder)`);
        console.log(`Skill levels: ${skillLevels.filter(s => s === 'novice').length} novice, ${skillLevels.filter(s => s === 'intermediate').length} intermediate, ${skillLevels.filter(s => s === 'expert').length} expert`);
        console.log(`${weaponSpawns.length} weapons spawned across the map`);
        console.log(`${this.consumables.length} consumables spawned (health kits and shield potions)`);
        console.log(`Map: ${mapConfig.name || 'Random Arena'}`);
        console.log(`Map size: ${mapConfig.width}x${mapConfig.height}, radius: ${mapConfig.radius}`);
        console.log(`Terrain: ${mapConfig.bushes.length} bushes, ${mapConfig.obstacles.length} obstacles, ${mapConfig.waterAreas.length} water areas`);
        // Initialize camera to player position (no lag on start)
        this.cameraSystem.x = player.position.x - CANVAS_WIDTH / 2;
        this.cameraSystem.y = player.position.y - CANVAS_HEIGHT / 2;
        this.cameraSystem.targetX = this.cameraSystem.x;
        this.cameraSystem.targetY = this.cameraSystem.y;
        this.gameState.camera = this.cameraSystem.getBounds();
        
        console.log('Game initialized successfully!');
        
        return true;
    }

    // Update game state (called at fixed timestep)
    update(deltaTime) {
        // Only update if game is initialized and playing
        if (this.phase !== 'playing' || !this.gameState || this.gameState.phase !== 'playing') {
            return;
        }
        
        // Update game time
        this.gameState.updateTime(deltaTime);
        
        // Update safe zone system (Phase 6)
        this.safeZoneSystem.update(deltaTime);
        
        // Update camera to follow player
        if (this.gameState.player) {
            this.cameraSystem.update(this.gameState.player);
            this.gameState.camera = this.cameraSystem.getBounds();
        }
        
        // Update input system
        this.inputSystem.update(this.gameState.player);
        
        // Get player input
        const movementInput = this.inputSystem.getMovementInput();
        
        // Update player with input
        if (this.gameState.player) {
            this.gameState.player.update(deltaTime, movementInput);
            
            // Check if weapon was fired
            const weaponInput = this.inputSystem.checkWeaponFired();
            if (weaponInput.fired && weaponInput.weaponSlot >= 0) {
                // Switch to the weapon slot that was pressed
                this.gameState.player.switchToWeapon(weaponInput.weaponSlot);
                
                // Fire the weapon
                const weapon = this.gameState.player.getActiveWeapon();
                if (weapon) {
                    this.combatSystem.fireWeapon(
                        this.gameState.player,
                        weapon,
                        weaponInput.angle
                    );
                }
            }
            
            // Check if health kit was used (Phase 7)
            if (this.inputSystem.checkHealthKitUsed()) {
                if (this.gameState.player.useHealthKit()) {
                    console.log('Used health kit!');
                    this.eventBus.emit('healthKitUsed', {
                        character: this.gameState.player
                    });
                }
            }
            
            // Update ability preview (for Ground Slam)
            const isChargingAbility = this.inputSystem.isAbilityCharging();
            this.abilitySystem.updateGroundSlamPreview(this.gameState.player, isChargingAbility);
            
            // Check if ability was activated (Phase 7)
            if (this.inputSystem.checkAbilityActivated()) {
                if (this.abilitySystem.activateAbility(this.gameState.player)) {
                    console.log('Activated special ability!');
                }
            }
            
            // Check for weapon pickups
            this.checkWeaponPickups(this.gameState.player);
            
            // Check for consumable pickups (Phase 7)
            this.checkConsumablePickups(this.gameState.player);
        }
        
        // Update all non-player characters
        this.gameState.characters.forEach(character => {
            if (!character.isPlayer) {
                character.update(deltaTime);
            }
        });
        
        // Update AI system
        this.aiSystem.update(deltaTime);
        
        // Update physics (movement and collision)
        this.physicsSystem.update(deltaTime);
        
        // Update combat system
        this.combatSystem.update(deltaTime);
        
        // Update ability system (Phase 7)
        this.abilitySystem.update(deltaTime);
        
        // Handle character deaths and loot dropping
        this.gameState.characters.forEach(character => {
            if (character.isDead && !character.isPlayer) {
                this.aiSystem.handleCharacterDeath(character);
            }
        });
        
        // Remove dead characters after a delay
        this.gameState.characters = this.gameState.characters.filter(char => {
            if (char.isDead && !char.isPlayer) {
                // Keep dead characters for a short time for visual feedback
                return false;
            }
            return true;
        });
        
        // Check match end conditions (Phase 6)
        this.gameState.checkMatchEnd();
    }

    // Check if player can pickup weapons (with timer)
    checkWeaponPickups(player) {
        const availableWeapons = this.aiSystem.getAvailableWeapons();
        const deltaTime = 1/60; // Approximate frame time
        
        availableWeapons.forEach(pickup => {
            if (!pickup.active) return;
            
            // Only update pickup for weapons player is near
            if (pickup.isInRange(player)) {
                const config = pickup.getWeaponConfig();
                const eligibility = player.getWeaponPickupResult(config);

                // Never start/continue pickup progress for invalid pickups
                if (!eligibility.ok) {
                    pickup.playerPickupBlockedReason = eligibility.reason;
                    pickup.resetPickup();
                    return;
                }

                pickup.playerPickupBlockedReason = null;

                // Update pickup progress
                if (pickup.updatePickup(player, deltaTime)) {
                    // Try to pickup weapon
                    const result = player.tryPickupWeapon(config);
                    if (result.ok) {
                        // Successfully picked up
                        pickup.active = false;
                        
                        // Emit event
                        this.eventBus.emit('weaponPickedUp', {
                            character: player,
                            weaponType: config.type,
                            tier: config.tier
                        });
                        
                        console.log(`Player picked up ${config.name} (Tier ${config.tier})`);
                    } else {
                        // If anything changed mid-pickup, stop the loader
                        pickup.playerPickupBlockedReason = result.reason;
                        pickup.resetPickup();
                    }
                }
            } else {
                pickup.playerPickupBlockedReason = null;
            }
        });
    }
    
    // Check if player can pickup consumables (Phase 7)
    checkConsumablePickups(player) {
        const deltaTime = 1/60; // Approximate frame time
        
        this.consumables.forEach(consumable => {
            if (!consumable.active) return;
            
            // Only update pickup for consumables player is near
            if (consumable.isInRange(player)) {
                // Update pickup progress
                if (consumable.updatePickup(player, deltaTime)) {
                    const config = consumable.getConfig();
                    
                    // Try to pickup consumable
                    let success = false;
                    if (config.type === 'healthKit') {
                        success = player.addHealthKit();
                        if (success) {
                            console.log('Picked up health kit!');
                        }
                    } else if (config.type === 'shieldPotion') {
                        player.addShield(50);
                        success = true;
                        console.log('Picked up shield potion!');
                    }
                    
                    if (success) {
                        // Successfully picked up
                        consumable.active = false;
                        
                        // Emit event
                        this.eventBus.emit('consumablePickedUp', {
                            character: player,
                            consumableType: config.type
                        });
                    } else {
                        // Couldn't pickup (inventory full), reset timer
                        consumable.resetPickup();
                    }
                }
            }
        });
    }

    // Render game (called every frame)
    render(interpolation) {
        // Render start screen if not playing
        if (this.phase === 'start') {
            this.startScreen.render();
            
            // Check if start was requested
            if (this.startScreen.checkStartRequested()) {
                console.log('Start button pressed, starting game...');
                this.selectedCharacter = this.startScreen.getSelectedCharacter();
                this.selectedMap = this.startScreen.getSelectedMap();
                // Stop the start screen loop
                if (this.startScreenLoop) {
                    this.startScreenLoop.stop();
                }
                // Start the game
                this.startGame();
            }
            return;
        }
        
        // Render game if playing
        if (this.phase === 'playing' && this.renderer) {
            this.renderer.render(
                this.gameState,
                this.inputSystem,
                this.gameLoop,
                interpolation,
                this.combatSystem,
                this.aiSystem,
                this.consumables,
                this.abilitySystem
            );
        }
    }

    // Handle window resize
    onResize() {
        if (this.renderer) {
            this.renderer.resize();
        }
    }
    
    // Find valid spawn position not on obstacles
    findValidSpawnPosition(x, y, mapConfig, clearanceRadius = 30, maxAttempts = 10) {
        // Check if position overlaps with any obstacle
        const checkPosition = (checkX, checkY) => {
            for (const obstacle of mapConfig.obstacles) {
                // Calculate obstacle bounds
                const obstacleLeft = obstacle.position.x - obstacle.width / 2;
                const obstacleRight = obstacle.position.x + obstacle.width / 2;
                const obstacleTop = obstacle.position.y - obstacle.height / 2;
                const obstacleBottom = obstacle.position.y + obstacle.height / 2;
                
                // Check if spawn position is too close to obstacle (with clearance)
                if (checkX + clearanceRadius > obstacleLeft &&
                    checkX - clearanceRadius < obstacleRight &&
                    checkY + clearanceRadius > obstacleTop &&
                    checkY - clearanceRadius < obstacleBottom) {
                    return false; // Overlaps with obstacle
                }
            }
            return true; // Valid position
        };
        
        // Try original position first
        if (checkPosition(x, y)) {
            return { x, y };
        }
        
        // Try nearby positions in a spiral pattern
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const radius = attempt * 50; // Expand search radius
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const testX = x + Math.cos(angle) * radius;
                const testY = y + Math.sin(angle) * radius;
                
                // Make sure it's still within map bounds
                const distFromCenter = Math.sqrt(
                    Math.pow(testX - mapConfig.centerX, 2) +
                    Math.pow(testY - mapConfig.centerY, 2)
                );
                
                if (distFromCenter < mapConfig.radius - 100 && checkPosition(testX, testY)) {
                    return { x: testX, y: testY };
                }
            }
        }
        
        // If all attempts fail, return null (skip this spawn)
        console.warn(`Could not find valid spawn position near (${Math.round(x)}, ${Math.round(y)})`);
        return null;
    }
}

// Initialize and start the game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('=== Battle-2D-eath Phase 11: Visuals and Characters (PNG Assets) ===');
        console.log('Loading assets and start screen...');
        
        // Create game instance
        const game = new Game();
        
        // Load game assets for start screen
        console.log('Loading game assets...');
        await game.assetLoader.loadGameAssets();
        console.log('Game assets loaded for start screen');
        
        // Start render loop for start screen
        const startScreenLoop = new GameLoop(
            () => {}, // No update needed for start screen
            () => game.render()
        );
        startScreenLoop.start();
        
        // Store in game for later cleanup
        game.startScreenLoop = startScreenLoop;
        
        // Make game accessible for debugging
        window.game = game;
        
        console.log('Start screen ready! Select your character and press START.');
    } catch (error) {
        console.error('Error starting game:', error);
    }
});