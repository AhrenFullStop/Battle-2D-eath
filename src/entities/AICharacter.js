// AI Character entity - extends Character with AI behavior

import { Character } from './Character.js';
import { Vector2D } from '../utils/Vector2D.js';
import { Weapon } from './Weapon.js';

export class AICharacter extends Character {
    constructor(config) {
        // Mark as AI
        config.isPlayer = false;
        super(config);
        
        // AI-specific properties
        this.aiState = 'patrol'; // patrol, seekLoot, combat, flee
        this.aiSkillLevel = config.aiSkillLevel || 'novice'; // novice, intermediate, expert
        
        // Perception
        this.perceptionRange = this.getPerceptionRange();
        this.targetEnemy = null;
        this.targetWeapon = null;
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
        this.fleeHealthThreshold = 0.3; // Flee when below 30% HP
    }
    
    // Get perception range based on skill level
    getPerceptionRange() {
        switch (this.aiSkillLevel) {
            case 'novice': return 250;
            case 'intermediate': return 350;
            case 'expert': return 450;
            default: return 250;
        }
    }
    
    // Get reaction time based on skill level
    getReactionTime() {
        switch (this.aiSkillLevel) {
            case 'novice': return 0.8; // 800ms
            case 'intermediate': return 0.4; // 400ms
            case 'expert': return 0.2; // 200ms
            default: return 0.8;
        }
    }
    
    // Get aim accuracy based on skill level
    getAimAccuracy() {
        switch (this.aiSkillLevel) {
            case 'novice': return 0.6; // 60% accuracy
            case 'intermediate': return 0.8; // 80% accuracy
            case 'expert': return 0.95; // 95% accuracy
            default: return 0.6;
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
    
    // Set AI state
    setState(newState) {
        if (this.aiState !== newState) {
            this.aiState = newState;
            this.stateTimer = 0;
        }
    }
    
    // Get current state
    getState() {
        return this.aiState;
    }
    
    // Check if AI needs to make a decision
    canMakeDecision() {
        return this.decisionCooldown <= 0;
    }
    
    // Reset decision cooldown
    resetDecisionCooldown() {
        this.decisionCooldown = this.reactionTime;
    }
    
    // Set target enemy
    setTargetEnemy(enemy) {
        this.targetEnemy = enemy;
        if (enemy) {
            this.lastSeenPlayerPosition = enemy.position.clone();
        }
    }
    
    // Set target weapon
    setTargetWeapon(weapon) {
        this.targetWeapon = weapon;
    }
    
    // Check if should flee
    shouldFlee() {
        return this.getHealthPercentage() < this.fleeHealthThreshold;
    }
    
    // Get wander direction
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
    
    // Try to pickup a weapon (same logic as Player)
    tryPickupWeapon(weaponConfig) {
        // Check if already has this exact weapon (type and tier)
        if (this.hasWeapon(weaponConfig.type, weaponConfig.tier)) {
            return false; // Can't pickup exact duplicate
        }

        // Create weapon instance and try to add to inventory
        const weapon = new Weapon(weaponConfig);
        const success = this.addWeapon(weapon);
        return success;
    }
}