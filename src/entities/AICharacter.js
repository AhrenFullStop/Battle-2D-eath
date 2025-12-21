// AI Character entity - extends Character with AI behavior

import { Character } from './Character.js';
import { Vector2D } from '../utils/Vector2D.js';

export class AICharacter extends Character {
    /**
     * Create a new AI character
     * @param {Object} config - AI character configuration
     */
    constructor(config) {
        // Mark as AI
        config.isPlayer = false;
        super(config);
        
        // AI-specific properties
        this.aiState = 'patrol'; // patrol, seekLoot, combat, flee
        this.aiSkillLevel = config.aiSkillLevel || 'novice'; // novice, intermediate, expert

        // Optional data-driven profile (preferred); keeps older hardcoded defaults as fallback.
        this.aiProfile = config.aiProfile || null;
        
        // Perception
        this.perceptionRange = this.getPerceptionRange();
        this.targetEnemy = null;
        this.targetWeapon = null;
        this.targetConsumable = null; // For health kits and other consumables
        this.lastSeenPlayerPosition = null;
        
        // Decision making
        this.stateTimer = 0;
        this.decisionCooldown = 0;
        this.reactionTime = this.getReactionTime();
        
        // Movement
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderChangeTimer = 0;
        
        // Combat
        this.aimAccuracy = this.getAimAccuracy();
        this.combatRange = 200;

        // Aggression influences how early we flee (higher aggression => lower flee threshold)
        const aggression = this.getAggression();
        this.fleeHealthThreshold = 0.45 - aggression * 0.25; // 0.20..0.45

        // Strafing intensity (used by AISystem)
        this.strafeStrength = this.getStrafeStrength();

        // Ability usage cadence (used by AISystem)
        this.abilityUseChancePerSecond = this.getAbilityUseChancePerSecond();
    }
    
    // Get perception range based on skill level
    getPerceptionRange() {
        if (this.aiProfile && typeof this.aiProfile.perceptionRange === 'number') {
            return this.aiProfile.perceptionRange;
        }
        switch (this.aiSkillLevel) {
            case 'novice': return 250;
            case 'intermediate': return 350;
            case 'expert': return 450;
            default: return 250;
        }
    }
    
    // Get reaction time based on skill level
    getReactionTime() {
        if (this.aiProfile && typeof this.aiProfile.reactionTimeSeconds === 'number') {
            return this.aiProfile.reactionTimeSeconds;
        }
        switch (this.aiSkillLevel) {
            case 'novice': return 0.8; // 800ms
            case 'intermediate': return 0.4; // 400ms
            case 'expert': return 0.2; // 200ms
            default: return 0.8;
        }
    }
    
    // Get aim accuracy based on skill level
    getAimAccuracy() {
        if (this.aiProfile && typeof this.aiProfile.aimAccuracy === 'number') {
            return this.aiProfile.aimAccuracy;
        }
        switch (this.aiSkillLevel) {
            case 'novice': return 0.6; // 60% accuracy
            case 'intermediate': return 0.8; // 80% accuracy
            case 'expert': return 0.95; // 95% accuracy
            default: return 0.6;
        }
    }

    getAggression() {
        if (this.aiProfile && typeof this.aiProfile.aggression === 'number') {
            return this.aiProfile.aggression;
        }
        switch (this.aiSkillLevel) {
            case 'novice': return 0.35;
            case 'intermediate': return 0.6;
            case 'expert': return 0.8;
            default: return 0.35;
        }
    }

    getStrafeStrength() {
        if (this.aiProfile && typeof this.aiProfile.strafeStrength === 'number') {
            return this.aiProfile.strafeStrength;
        }
        switch (this.aiSkillLevel) {
            case 'novice': return 0.35;
            case 'intermediate': return 0.45;
            case 'expert': return 0.55;
            default: return 0.35;
        }
    }

    getAbilityUseChancePerSecond() {
        if (this.aiProfile && typeof this.aiProfile.abilityUseChancePerSecond === 'number') {
            return this.aiProfile.abilityUseChancePerSecond;
        }
        switch (this.aiSkillLevel) {
            case 'novice': return 0.08;
            case 'intermediate': return 0.14;
            case 'expert': return 0.22;
            default: return 0.08;
        }
    }
    
    // Update AI character
    update(deltaTime) {
        if (this.isDead) return;
        
        // Update timers
        this.stateTimer += deltaTime;
        this.decisionCooldown -= deltaTime;
        this.wanderChangeTimer -= deltaTime;
        
        // Call parent update
        super.update(deltaTime);
    }
    
    /**
     * Set AI state
     * @param {string} newState - New AI state ('patrol', 'seekLoot', 'combat', 'flee')
     */
    setState(newState) {
        if (this.aiState !== newState) {
            this.aiState = newState;
            this.stateTimer = 0;
        }
    }

    /**
     * Get current AI state
     * @returns {string} Current AI state
     */
    getState() {
        return this.aiState;
    }

    /**
     * Check if AI can make a decision
     * @returns {boolean} True if decision cooldown has expired
     */
    canMakeDecision() {
        return this.decisionCooldown <= 0;
    }

    /**
     * Reset decision cooldown
     */
    resetDecisionCooldown() {
        this.decisionCooldown = this.reactionTime;
    }

    /**
     * Set target enemy
     * @param {Character} enemy - Enemy to target
     */
    setTargetEnemy(enemy) {
        this.targetEnemy = enemy;
        if (enemy) {
            this.lastSeenPlayerPosition = enemy.position.clone();
        }
    }

    /**
     * Set target weapon
     * @param {WeaponPickup} weapon - Weapon to target
     */
    setTargetWeapon(weapon) {
        this.targetWeapon = weapon;
    }

    /**
     * Check if AI should flee
     * @returns {boolean} True if health is below flee threshold
     */
    shouldFlee() {
        return this.getHealthPercentage() < this.fleeHealthThreshold;
    }

    /**
     * Get wander direction for patrol behavior
     * @returns {Vector2D} Wander direction vector
     */
    getWanderDirection() {
        // Change wander angle periodically
        if (this.wanderChangeTimer <= 0) {
            this.wanderAngle += (Math.random() - 0.5) * Math.PI / 2;
            this.wanderChangeTimer = 2.0 + Math.random() * 2.0; // 2-4 seconds
        }
        
        return new Vector2D(
            Math.cos(this.wanderAngle),
            Math.sin(this.wanderAngle)
        );
    }
    
    // Override die to handle AI death
    die() {
        super.die();
        this.setState('dead');
    }
    
}