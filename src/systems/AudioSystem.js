export class AudioSystem {
    constructor(eventBus, audioManager) {
        this.eventBus = eventBus;
        this.audioManager = audioManager;
        
        this.setupListeners();
    }

    setupListeners() {
        if (!this.eventBus) return;

        // Weapon events
        this.eventBus.on('weaponFired', (data) => {
            const weaponType = data.weapon?.type || 'blaster';
            // Play specific weapon sound or fallback to synth
            this.audioManager.play(`weapon_${weaponType}`, { 
                pitchVariance: 0.1,
                volume: 0.8 
            });
        });

        // Combat events
        this.eventBus.on('characterDamaged', (data) => {
            // Distinct sound for player vs enemy hit could be added here
            // For now, general hit sound
            this.audioManager.play('impact_hit', {
                pitchVariance: 0.2,
                volume: 0.6
            });
        });

        this.eventBus.on('characterKilled', (data) => {
            this.audioManager.play('impact_kill', {
                volume: 1.0
            });
        });

        // Future events can be added here (pickups, level up, etc.)
    }

    dispose() {
        // Cleanup if necessary (though EventBus usually handles clearing)
    }
}
