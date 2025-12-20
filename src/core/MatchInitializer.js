import { GameState } from './GameState.js';
import { Player } from '../entities/Player.js';
import { AICharacter } from '../entities/AICharacter.js';
import { EventBus } from './EventBus.js';
import { InputSystem } from '../systems/InputSystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { SafeZoneSystem } from '../systems/SafeZoneSystem.js';
import { AISystem } from '../systems/AISystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { AbilitySystem } from '../systems/AbilitySystem.js';
import { Renderer } from '../renderer/Renderer.js';
import { GameLoop } from './GameLoop.js';
import { SpawnManager } from './SpawnManager.js';
import { CHARACTERS } from '../config/characters.js';
import { createWeapon } from '../config/weapons.js';
import { Weapon } from '../entities/Weapon.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config/constants.js';
import { generateAISkills, generateAICharacterTypes } from '../config/gameConfig.js';
import { getCurrentMapConfig, getGameConfig } from '../config/map.js';
import { getMaxHpMultiplierFromUpgrades } from './ProfileStore.js';
import { createMulberry32 } from '../net/prng.js';

export class MatchInitializer {
    constructor(canvas, gameState, assetLoader) {
        this.canvas = canvas;
        this.gameState = gameState;
        this.assetLoader = assetLoader;
    }

    async initializeSoloMatch(playerCharacterType, selectedMap, profile) {
        console.log('Initializing solo match...');

        // Initialize core systems
        const eventBus = new EventBus();

        // Initialize systems
        const inputSystem = new InputSystem(this.canvas, eventBus, this.assetLoader);
        const physicsSystem = new PhysicsSystem(this.gameState);
        const combatSystem = new CombatSystem(this.gameState, eventBus);
        const safeZoneSystem = new SafeZoneSystem(this.gameState, eventBus);
        const abilitySystem = new AbilitySystem(this.gameState, eventBus, combatSystem);
        const aiSystem = new AISystem(this.gameState, eventBus, combatSystem, abilitySystem);
        const cameraSystem = new CameraSystem(CANVAS_WIDTH, CANVAS_HEIGHT);
        const renderer = new Renderer(this.canvas, this.assetLoader);

        // Store safe zone system reference in game state
        this.gameState.safeZoneSystem = safeZoneSystem;

        // Create spawn manager
        const spawnManager = new SpawnManager(this.gameState, selectedMap.mapData?.obstacles || [], aiSystem);

        // Setup event listeners for stats tracking
        this.setupEventListeners(eventBus, profile);

        // Initialize game with selected character
        const playerCharacter = await this.initSoloGame(selectedMap, playerCharacterType, spawnManager, profile);

        const systems = {
            inputSystem,
            physicsSystem,
            combatSystem,
            safeZoneSystem,
            abilitySystem,
            aiSystem,
            cameraSystem,
            renderer,
            eventBus
        };

        return { systems, spawnManager, playerCharacter };
    }

    async initializeMultiplayerMatch(session, playerCharacterType, selectedMap, profile) {
        console.log('Initializing multiplayer match...');

        // Initialize core systems
        const eventBus = new EventBus();

        // Systems (no AI / no loot)
        const inputSystem = new InputSystem(this.canvas, eventBus, this.assetLoader);
        const physicsSystem = new PhysicsSystem(this.gameState);
        const combatSystem = new CombatSystem(this.gameState, eventBus);
        const safeZoneSystem = new SafeZoneSystem(this.gameState, eventBus);
        const abilitySystem = new AbilitySystem(this.gameState, eventBus, combatSystem);
        const aiSystem = null;
        const cameraSystem = new CameraSystem(CANVAS_WIDTH, CANVAS_HEIGHT);
        const renderer = new Renderer(this.canvas, this.assetLoader);

        this.gameState.safeZoneSystem = safeZoneSystem;

        // Create spawn manager (no AI system for multiplayer)
        const spawnManager = new SpawnManager(this.gameState, selectedMap.mapData?.obstacles || [], null);

        // Setup event listeners for stats tracking
        this.setupEventListeners(eventBus, profile);

        // Initialize multiplayer game
        const playerCharacter = this.initMultiplayerGame(session, selectedMap, spawnManager);

        const systems = {
            inputSystem,
            physicsSystem,
            combatSystem,
            safeZoneSystem,
            abilitySystem,
            aiSystem,
            cameraSystem,
            renderer,
            eventBus
        };

        return { systems, spawnManager, playerCharacter };
    }

    async initSoloGame(selectedMap, playerCharacterType, spawnManager, profile) {
        const mapConfig = getCurrentMapConfig();
        const gameConfig = getGameConfig();

        // Create player character with selected character type
        const characterConfig = { ...CHARACTERS[playerCharacterType], isPlayer: true };
        const player = new Player(characterConfig);

        // Apply progression upgrades
        const maxHpMultiplier = getMaxHpMultiplierFromUpgrades(profile);
        if (Number.isFinite(maxHpMultiplier) && maxHpMultiplier > 0) {
            player.progressionBaseMaxHP = player.progressionBaseMaxHP || player.maxHP;
            player.maxHP = player.progressionBaseMaxHP * maxHpMultiplier;
            player.currentHP = player.maxHP;
        }

        // Spawn all players (human + bots) spread across the map
        const totalCharactersToSpawn = gameConfig.match.aiCount + 1;
        const spawnPoints = spawnManager.generateCharacterSpawns(mapConfig, totalCharactersToSpawn, {
            clearanceRadius: 70,
            minSpacing: 240,
            marginFromEdge: 140,
            maxAttemptsPerSpawn: 250
        });

        // First spawn is always the human player
        player.setPosition(spawnPoints[0].x, spawnPoints[0].y);

        // Equip player with a Blaster weapon (Tier 1)
        const blasterWeapon = new Weapon(createWeapon('blaster', 1));
        player.equipWeapon(blasterWeapon);

        // Add player to game state
        this.gameState.addCharacter(player);

        // Create AI opponents
        const aiCount = gameConfig.match.aiCount;
        const characterTypes = generateAICharacterTypes(gameConfig.ai.characterDistribution, aiCount);
        const skillLevels = generateAISkills(gameConfig.ai.skillDistribution, aiCount);

        for (let i = 0; i < aiCount; i++) {
            const characterType = characterTypes[i];
            const skillLevel = skillLevels[i];

            const baseSkillProfile = gameConfig.ai.skillProfiles?.[skillLevel] || null;

            // Per-bot personality variance
            const varianceStrength = skillLevel === 'expert' ? 0.07 : (skillLevel === 'intermediate' ? 0.1 : 0.14);
            const jitter = (value, min, max) => {
                if (typeof value !== 'number') return value;
                const factor = 1 + (Math.random() - 0.5) * 2 * varianceStrength;
                const v = value * factor;
                return Math.max(min, Math.min(max, v));
            };

            const skillProfile = baseSkillProfile ? {
                ...baseSkillProfile,
                reactionTimeSeconds: jitter(baseSkillProfile.reactionTimeSeconds, 0.12, 1.2),
                perceptionRange: jitter(baseSkillProfile.perceptionRange, 180, 600),
                aimAccuracy: jitter(baseSkillProfile.aimAccuracy, 0.35, 0.99),
                aggression: jitter(baseSkillProfile.aggression, 0.15, 0.95),
                strafeStrength: jitter(baseSkillProfile.strafeStrength, 0.2, 0.8),
                abilityUseChancePerSecond: jitter(baseSkillProfile.abilityUseChancePerSecond, 0.02, 0.6)
            } : null;

            const aiConfig = {
                ...CHARACTERS[characterType],
                isPlayer: false,
                aiSkillLevel: skillLevel,
                aiProfile: skillProfile
            };
            const aiOpponent = new AICharacter(aiConfig);

            // Stable per-bot movement style
            aiOpponent.strafeSide = Math.random() < 0.5 ? -1 : 1;

            // Spawn AI using the same randomized spawn distribution as the player
            const spawnPoint = spawnPoints[i + 1];
            aiOpponent.setPosition(spawnPoint.x, spawnPoint.y);

            // Add AI to game state
            this.gameState.addCharacter(aiOpponent);

            console.log(`AI ${i + 1} spawned: ${aiOpponent.name} (${skillLevel}) at (${Math.round(spawnPoint.x)}, ${Math.round(spawnPoint.y)})`);
        }

        // Spawn weapons and consumables
        const weaponSpawns = spawnManager.spawnInitialWeapons(mapConfig, gameConfig.loot.initialWeapons, gameConfig);
        const consumableCount = spawnManager.spawnInitialConsumables(mapConfig, gameConfig.loot.initialConsumables);

        console.log('Player created:', player.name);
        console.log('Starting weapon:', blasterWeapon.name);
        console.log(`${aiCount} AI opponents spawned (${characterTypes.filter(t => t === 'bolt').length} Bolt, ${characterTypes.filter(t => t === 'boulder').length} Boulder)`);
        console.log(`Skill levels: ${skillLevels.filter(s => s === 'novice').length} novice, ${skillLevels.filter(s => s === 'intermediate').length} intermediate, ${skillLevels.filter(s => s === 'expert').length} expert`);
        console.log(`${weaponSpawns.length} weapons spawned across the map`);
        console.log(`${consumableCount} consumables spawned (health kits and shield potions)`);
        console.log(`Map: ${mapConfig.name || 'Random Arena'}`);
        console.log(`Map size: ${mapConfig.width}x${mapConfig.height}, radius: ${mapConfig.radius}`);
        console.log(`Terrain: ${mapConfig.bushes.length} bushes, ${mapConfig.obstacles.length} obstacles, ${mapConfig.waterAreas.length} water areas`);

        console.log('Solo game initialized successfully!');

        return player;
    }

    initMultiplayerGame(session, selectedMap, spawnManager) {
        const mapConfig = getCurrentMapConfig();

        // Create players (Bolt vs Bolt for the MVP slice)
        const localIsHost = session.role === 'host';
        const localPlayerIndex = localIsHost ? 0 : 1;

        // Deterministic spawns
        const rng = createMulberry32((session.seed >>> 0) || 1);
        const spawns = spawnManager.generateCharacterSpawns(mapConfig, 2, {
            clearanceRadius: 70,
            minSpacing: 520,
            marginFromEdge: 180,
            maxAttemptsPerSpawn: 350
        }, rng);

        // Assign spawn order by player index
        const boltConfigLocal = { ...CHARACTERS['bolt'], isPlayer: true };
        const boltConfigRemote = { ...CHARACTERS['bolt'], isPlayer: false };

        const localPlayer = new Player(boltConfigLocal);
        const remotePlayer = new Player(boltConfigRemote);
        remotePlayer.isRemoteHuman = true;

        const p0 = localIsHost ? localPlayer : remotePlayer;
        const p1 = localIsHost ? remotePlayer : localPlayer;
        p0.setPosition(spawns[0].x, spawns[0].y);
        p1.setPosition(spawns[1].x, spawns[1].y);

        // Fixed starting weapon (deterministic): Blaster tier 1
        const blaster0 = new Weapon(createWeapon('blaster', 1));
        const blaster1 = new Weapon(createWeapon('blaster', 1));
        p0.equipWeapon(blaster0);
        p1.equipWeapon(blaster1);

        this.gameState.addCharacter(p0);
        this.gameState.addCharacter(p1);

        // Camera to local player
        const cameraSystem = this.gameState.cameraSystem;
        cameraSystem.x = localPlayer.position.x - CANVAS_WIDTH / 2;
        cameraSystem.y = localPlayer.position.y - CANVAS_HEIGHT / 2;
        cameraSystem.targetX = cameraSystem.x;
        cameraSystem.targetY = cameraSystem.y;

        return localPlayer;
    }

    setupEventListeners(eventBus, profile) {
        // Setup event listeners for stats tracking (extracted from main.js)
        // This would include listeners for damage, kills, etc.
        // For now, keeping it minimal as the original logic is complex
    }
}