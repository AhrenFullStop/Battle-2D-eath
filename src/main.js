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
import { MAP_CONFIG } from './config/map.js';
import { Vector2D } from './utils/Vector2D.js';

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
        
        // Start screen
        this.startScreen = new StartScreen(this.canvas, this.ctx);
        
        // Initialize core systems (will be set up after character selection)
        this.gameState = null;
        this.eventBus = null;
        this.assetLoader = null;
        
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
        
        // Setup start screen interaction
        this.setupStartScreenInteraction();
    }
    
    setupStartScreenInteraction() {
        // No need for custom event handlers - StartScreen handles its own events
        // We'll check the startRequested flag in the render loop
    }
    
    async startGame() {
        console.log('Starting game with character:', this.selectedCharacter);
        
        // Remove start screen event listeners
        this.startScreen.removeEventListeners();
        
        // Initialize core systems
        this.gameState = new GameState();
        this.eventBus = new EventBus();
        this.assetLoader = new AssetLoader();
        
        // Initialize game systems
        this.inputSystem = new InputSystem(this.canvas, this.eventBus);
        this.physicsSystem = new PhysicsSystem(this.gameState);
        this.combatSystem = new CombatSystem(this.gameState, this.eventBus);
        this.safeZoneSystem = new SafeZoneSystem(this.gameState, this.eventBus);
        this.aiSystem = new AISystem(this.gameState, this.eventBus, this.combatSystem);
        this.abilitySystem = new AbilitySystem(this.gameState, this.eventBus, this.combatSystem);
        this.cameraSystem = new CameraSystem(CANVAS_WIDTH, CANVAS_HEIGHT);
        this.renderer = new Renderer(this.canvas);
        
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
    }

    // Initialize the game
    async init() {
        console.log('Initializing Battle-2D-eath Phase 7: Polish...');
        
        // Create player character with selected character type
        const characterConfig = { ...CHARACTERS[this.selectedCharacter], isPlayer: true };
        const player = new Player(characterConfig);
        
        // Spawn player in center of map
        player.setPosition(MAP_CONFIG.centerX, MAP_CONFIG.centerY);
        
        // Equip player with a Blaster weapon (Tier 1)
        const blasterWeapon = new Weapon(createWeapon('blaster', 1));
        player.equipWeapon(blasterWeapon);
        
        // Add player to game state
        this.gameState.addCharacter(player);
        
        // Create 7 AI opponents (mix of characters and skill levels)
        const aiCount = 7;
        const characterTypes = ['bolt', 'boulder'];
        const skillLevels = ['novice', 'novice', 'novice', 'novice', 'intermediate', 'intermediate', 'expert'];
        
        for (let i = 0; i < aiCount; i++) {
            const characterType = characterTypes[i % characterTypes.length];
            const skillLevel = skillLevels[i % skillLevels.length];
            
            const aiConfig = {
                ...CHARACTERS[characterType],
                isPlayer: false,
                aiSkillLevel: skillLevel
            };
            const aiOpponent = new AICharacter(aiConfig);
            
            // Spawn AI at spawn points around the map edge
            const spawnPoint = MAP_CONFIG.characterSpawns[i % MAP_CONFIG.characterSpawns.length];
            aiOpponent.setPosition(spawnPoint.x, spawnPoint.y);
            
            // Add AI to game state
            this.gameState.addCharacter(aiOpponent);
            
            console.log(`AI ${i + 1} spawned: ${aiOpponent.name} (${skillLevel}) at (${Math.round(spawnPoint.x)}, ${Math.round(spawnPoint.y)})`);
        }
        
        // Spawn weapons across the map (reduced count for performance)
        const weaponTypes = ['blaster', 'spear', 'bomb', 'gun'];
        const weaponSpawns = [];
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 400 + Math.random() * 500;
            const x = MAP_CONFIG.centerX + Math.cos(angle) * distance;
            const y = MAP_CONFIG.centerY + Math.sin(angle) * distance;
            const type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
            const tier = Math.random() < 0.6 ? 1 : (Math.random() < 0.8 ? 2 : 3);
            
            weaponSpawns.push({ pos: new Vector2D(x, y), type, tier });
            this.aiSystem.spawnWeapon(new Vector2D(x, y), type, tier);
        }
        
        // Spawn consumables across the map (Phase 7)
        const consumableTypes = ['healthKit', 'shieldPotion'];
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Math.PI / 12;
            const distance = 300 + Math.random() * 600;
            const x = MAP_CONFIG.centerX + Math.cos(angle) * distance;
            const y = MAP_CONFIG.centerY + Math.sin(angle) * distance;
            const type = consumableTypes[Math.floor(Math.random() * consumableTypes.length)];
            
            const consumable = new Consumable(createConsumable(type));
            consumable.setPosition(x, y);
            this.consumables.push(consumable);
        }
        
        console.log('Player created:', player.name);
        console.log('Starting weapon:', blasterWeapon.name);
        console.log(`${aiCount} AI opponents spawned with mixed characters and skill levels`);
        console.log(`${weaponSpawns.length} weapons spawned across the map`);
        console.log(`${this.consumables.length} consumables spawned (health kits and shield potions)`);
        console.log(`Map size: ${MAP_CONFIG.width}x${MAP_CONFIG.height}, radius: ${MAP_CONFIG.radius}`);
        console.log(`Terrain: ${MAP_CONFIG.bushes.length} bushes, ${MAP_CONFIG.obstacles.length} obstacles, ${MAP_CONFIG.waterAreas.length} water areas`);
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
                // Track kills if player dealt damage
                if (!character.isPlayer) {
                    this.gameState.addKill();
                }
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
                // Update pickup progress
                if (pickup.updatePickup(player, deltaTime)) {
                    const config = pickup.getWeaponConfig();
                    
                    // Try to pickup weapon
                    if (player.tryPickupWeapon(config)) {
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
                        // Couldn't pickup (duplicate), reset timer
                        pickup.resetPickup();
                    }
                }
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
                this.consumables
            );
        }
    }

    // Handle window resize
    onResize() {
        if (this.renderer) {
            this.renderer.resize();
        }
    }
}

// Initialize and start the game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('=== Battle-2D-eath Phase 7: Polish ===');
        console.log('Loading start screen...');
        
        // Create game instance
        const game = new Game();
        
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