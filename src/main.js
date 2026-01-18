/**
 * main.js - Game Entry Point and Lifecycle Manager
 *
 * Main application entry point that orchestrates the game lifecycle, manages
 * transitions between menu and gameplay, and coordinates solo vs multiplayer modes.
 * This is the top-level controller that delegates to specialized systems.
 *
 * Key Responsibilities:
 * - Initialize StartScreen (menu system)
 * - Manage game mode selection (solo vs multiplayer)
 * - Coordinate match initialization via MatchInitializer
 * - Delegate gameplay updates to GameOrchestrator or MultiplayerMatchController
 * - Handle match teardown and return to menu
 *
 * Architecture Notes:
 * - Uses GameLoop for fixed timestep updates (60 FPS)
 * - Delegates solo gameplay to GameOrchestrator
 * - Delegates multiplayer to MultiplayerMatchController
 * - Manages canvas event listeners for end-screen interactions
 *
 * @module main
 */

import { GameLoop } from './core/GameLoop.js';
import { GameState } from './core/GameState.js';
import { AssetLoader } from './core/AssetLoader.js';
import { AudioManager } from './core/AudioManager.js';
import { settingsManager } from './core/SettingsManager.js';
import { StartScreen } from './renderer/StartScreen.js';
import { MatchInitializer } from './core/MatchInitializer.js';
import { GameOrchestrator } from './core/GameOrchestrator.js';
import { MultiplayerMatchController } from './core/MultiplayerMatchController.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config/constants.js';
import { loadMapFromJSON } from './config/map.js';
import { resolveMapsUrl, warnMissingAsset } from './utils/assetUrl.js';
import { loadProfile } from './core/ProfileStore.js';
import { getCanvasCoordinates } from './utils/canvasHelpers.js';

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

        // Audio Manager
        this.audioManager = new AudioManager();
        this.audioManager.setVolume(settingsManager.get('volume'));

        // Start screen with asset loader
        this.startScreen = new StartScreen(this.canvas, this.ctx, this.assetLoader);

        // Initialize core systems
        this.gameState = new GameState();

        // Match controllers
        this.matchInitializer = null;
        this.gameOrchestrator = null;
        this.multiplayerController = null;

        // Game loop
        this.gameLoop = null;
        this.startScreenLoop = null;

        // Setup window resize handler
        window.addEventListener('resize', () => this.onResize());

        // End screen interaction (single handler; avoids duplicate listeners across resets)
        this.onEndScreenTouchEndBound = (e) => this.handleEndScreenTouchEnd(e);
        this.onEndScreenMouseUpBound = (e) => this.handleEndScreenMouseUp(e);
        this.canvas.addEventListener('touchend', this.onEndScreenTouchEndBound, { passive: false });
        this.canvas.addEventListener('mouseup', this.onEndScreenMouseUpBound);

        // Setup start screen interaction
        this.setupStartScreenInteraction();

        // Meta progression
        this.profile = loadProfile();
    }
    
    setupStartScreenInteraction() {
        // No need for custom event handlers - StartScreen handles its own events
        // We'll check the startRequested flag in the render loop
    }
    
    async startSoloMatch(playerCharacterType, selectedMap) {
        console.log('Starting solo match with character:', playerCharacterType);
        console.log('Starting solo match with map:', selectedMap?.name || 'Random Arena');

        // Load selected map
        if (selectedMap && selectedMap.mapData) {
            try {
                loadMapFromJSON(selectedMap.mapData);
                console.log('✅ Successfully loaded selected map (with menu overrides):', selectedMap.mapData.name);
            } catch (error) {
                console.error('❌ Error loading selected map data:', error);
                console.log('Falling back to default procedural map');
            }
        } else if (selectedMap && selectedMap.file) {
            try {
                const mapPath = `maps/${selectedMap.file}`;
                const mapUrl = resolveMapsUrl(selectedMap.file);
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
                warnMissingAsset('map json', `maps/${selectedMap.file}`, error?.message || String(error));
                console.log('Falling back to default procedural map');
            }
        } else {
            console.log('Using default procedural map (no custom map selected)');
        }

        // Remove start screen event listeners
        this.startScreen.removeEventListeners();

        // Ensure assets are loaded
        if (!this.assetLoader.isLoading && this.assetLoader.totalCount === 0) {
            console.log('Loading game assets...');
            // Load assets including audio
            await this.assetLoader.loadGameAssets(this.audioManager);
            console.log('Game assets loaded');
        }

        // Initialize match using MatchInitializer
        this.matchInitializer = new MatchInitializer(this.canvas, this.gameState, this.assetLoader);
        const { systems, spawnManager, playerCharacter } = await this.matchInitializer.initializeSoloMatch(playerCharacterType, selectedMap, this.profile, this.audioManager);

        // Create orchestrator
        this.gameOrchestrator = new GameOrchestrator(this.gameState, systems, systems.renderer, spawnManager, playerCharacter, this.profile);

        // Initialize game loop
        this.gameLoop = new GameLoop(
            (deltaTime) => this.update(deltaTime),
            (interpolation) => this.render(interpolation)
        );

        // Change phase and start
        this.phase = 'playing';
        this.gameLoop.start();

        console.log('Solo match started! Phase 11: Architecture Refactor');
    }

    async startMultiplayerMatch(session, playerCharacterType, selectedMap, isHost) {
        console.log('Starting multiplayer match:', session?.role);
        console.log('Session data:', JSON.stringify({ ...session, connection: 'Active' }));

        // Load a deterministic map file (no procedural randomness)
        const mapFile = session.mapFile || 'facey.json';
        try {
            console.log('Loading multiplayer map:', mapFile);
            const mapPath = `maps/${mapFile}`;
            const mapUrl = resolveMapsUrl(mapFile);
            const response = await fetch(mapUrl);
            if (!response.ok) {
                warnMissingAsset('map json', mapPath, `HTTP ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const mapData = await response.json();
            loadMapFromJSON(mapData);
            console.log('✅ Multiplayer map loaded:', mapData.name || mapFile);
        } catch (error) {
            console.error('❌ Failed to load multiplayer map:', error);
            console.log('Falling back to default procedural map (non-deterministic)');
        }

        // Remove start screen listeners but KEEP the active multiplayer connection.
        console.log('Removing StartScreen listeners...');
        this.startScreen.removeEventListeners({ preserveMultiplayerConnection: true });

        // Ensure assets are loaded
        if (!this.assetLoader.isLoading && this.assetLoader.totalCount === 0) {
            console.log('Loading game assets for MP...');
            await this.assetLoader.loadGameAssets(this.audioManager);
        }

        // Initialize multiplayer match using MultiplayerMatchController
        console.log('Initializing MultiplayerMatchController...');
        this.multiplayerController = new MultiplayerMatchController(this, this.canvas, this.gameState, this.assetLoader, this.profile);

        console.log('Calling multiplayerController.startMatch...');
        try {
            await this.multiplayerController.startMatch(session, playerCharacterType, { mapData: selectedMap }, isHost, this.audioManager);
        } catch (e) {
            console.error('❌ CRASH in multiplayerController.startMatch:', e);
            throw e;
        }

        // Initialize game loop
        console.log('Initializing GameLoop...');
        this.gameLoop = new GameLoop(
            (deltaTime) => this.update(deltaTime),
            (interpolation) => this.render(interpolation)
        );

        this.phase = 'playing';
        console.log('Starting GameLoop...');
        this.gameLoop.start();
        console.log('Multiplayer Match successfully started!');
    }
    

    handleEndScreenTouchEnd(event) {
        if (!this.gameState || this.gameState.phase === 'playing') return;
        if (!event.changedTouches || event.changedTouches.length === 0) return;

        const touch = event.changedTouches[0];
        const coords = getCanvasCoordinates(this.canvas, touch.clientX, touch.clientY);
        this.tryHandleReturnToMenu(coords.x, coords.y);
    }

    handleEndScreenMouseUp(event) {
        if (!this.gameState || this.gameState.phase === 'playing') return;
        const coords = getCanvasCoordinates(this.canvas, event.clientX, event.clientY);
        this.tryHandleReturnToMenu(coords.x, coords.y);
    }

    tryHandleReturnToMenu(x, y) {
        let renderer = null;
        if (this.multiplayerController && this.multiplayerController.orchestrator) {
            renderer = this.multiplayerController.orchestrator.systems.renderer;
        } else if (this.gameOrchestrator) {
            renderer = this.gameOrchestrator.systems.renderer;
        }

        if (!renderer || !renderer.uiRenderer) return;
        if (this.gameState.phase !== 'gameOver' && this.gameState.phase !== 'victory') return;

        if (renderer.uiRenderer.isReturnToMenuHit(x, y)) {
            this.resetToMenu();
        }
    }

    resetToMenu() {
        console.log('Resetting to menu...');

        // Teardown multiplayer controller if active
        if (this.multiplayerController) {
            this.multiplayerController.teardown();
            this.multiplayerController = null;
        }

        // Stop running match loop
        if (this.gameLoop) {
            this.gameLoop.stop();
            this.gameLoop = null;
        }

        // Clear match controllers
        this.matchInitializer = null;
        this.gameOrchestrator = null;

        // Reset game state
        this.gameState = new GameState();

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


    // Update game state (called at fixed timestep)
    update(deltaTime) {
        // Only update if game is initialized and playing
        if (this.phase !== 'playing' || !this.gameState || this.gameState.phase !== 'playing') {
            return;
        }

        // Delegate to appropriate controller
        if (this.multiplayerController) {
            this.multiplayerController.update(deltaTime);
        } else if (this.gameOrchestrator) {
            this.gameOrchestrator.update(deltaTime);
        }
    }



    // Render game (called every frame)
    render(interpolation) {
        // Render start screen if not playing
        if (this.phase === 'start') {
            this.startScreen.render();

            // Check if multiplayer start was requested
            const mpSession = this.startScreen.checkMultiplayerStartRequested
                ? this.startScreen.checkMultiplayerStartRequested()
                : null;
            if (mpSession) {
                console.log('Multiplayer start requested');
                if (this.startScreenLoop) {
                    this.startScreenLoop.stop();
                }
                this.startMultiplayerMatch(mpSession.session, mpSession.characterType, mpSession.selectedMap, mpSession.isHost);
                return;
            }

            // Check if start was requested
            if (this.startScreen.checkStartRequested()) {
                console.log('Start button pressed, starting game...');

                // Initialize/Resume Audio Context on user interaction
                this.audioManager.init();

                this.selectedCharacter = this.startScreen.getSelectedCharacter();
                this.selectedMap = this.startScreen.getSelectedMap();
                // Stop the start screen loop
                if (this.startScreenLoop) {
                    this.startScreenLoop.stop();
                }
                // Start the game
                this.startSoloMatch(this.selectedCharacter, this.selectedMap);
            }
            return;
        }

        // Render game if playing
        if (this.phase === 'playing') {
            // Delegate rendering to the appropriate controller's renderer
            if (this.multiplayerController) {
                // Multiplayer rendering is handled by the controller
                // For now, assume the renderer is accessible
                if (this.multiplayerController.orchestrator && this.multiplayerController.orchestrator.systems.renderer) {
                    this.multiplayerController.orchestrator.systems.renderer.render(
                        this.gameState,
                        this.multiplayerController.orchestrator.systems.inputSystem,
                        this.gameLoop,
                        interpolation,
                        this.multiplayerController.orchestrator.systems.combatSystem,
                        this.multiplayerController.orchestrator.systems.aiSystem,
                        [], // No consumables in multiplayer
                        this.multiplayerController.orchestrator.systems.abilitySystem
                    );
                }
            } else if (this.gameOrchestrator && this.gameOrchestrator.systems.renderer) {
                this.gameOrchestrator.systems.renderer.render(
                    this.gameState,
                    this.gameOrchestrator.systems.inputSystem,
                    this.gameLoop,
                    interpolation,
                    this.gameOrchestrator.systems.combatSystem,
                    this.gameOrchestrator.systems.aiSystem,
                    this.gameOrchestrator.spawnManager.consumables,
                    this.gameOrchestrator.systems.abilitySystem
                );
            }
        }
    }

    // Handle window resize
    onResize() {
        let renderer = null;
        if (this.multiplayerController && this.multiplayerController.orchestrator) {
            renderer = this.multiplayerController.orchestrator.systems.renderer;
        } else if (this.gameOrchestrator) {
            renderer = this.gameOrchestrator.systems.renderer;
        }

        if (renderer) {
            renderer.resize();
        }
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