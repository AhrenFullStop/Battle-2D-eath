export class AudioManager {
    constructor() {
        this.ctx = null;
        this.currentVolume = 1.0;
        this.buffers = new Map();
        this.isMuted = false;
        
        // Browsers require user interaction to resume audio context
        this.initialized = false;
    }

    // Initialize AudioContext (must be called from user gesture)
    init() {
        if (!this.initialized) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
        }
        
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(volume) {
        this.currentVolume = Math.max(0, Math.min(1, volume));
        this.isMuted = this.currentVolume === 0;
    }

    getVolume() {
        return this.currentVolume;
    }

    // Load an audio file into a buffer
    async load(key, arrayBuffer) {
        if (!this.ctx) return;
        try {
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers.set(key, audioBuffer);
        } catch (e) {
            console.error(`Failed to decode audio data for ${key}:`, e);
        }
    }

    has(key) {
        return this.buffers.has(key);
    }

    // Play a sound by key
    play(key, options = {}) {
        if (!this.ctx || this.isMuted || this.currentVolume <= 0) return;

        // Resume if suspended (safeguard)
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // Check if we have the file; if not, try to synthesize fallback
        if (!this.buffers.has(key)) {
            // Check if we can synthesize based on the key name
            const type = key.split('_')[1] || key;
            this.playSynthesized(type);
            return;
        }

        const buffer = this.buffers.get(key);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.ctx.createGain();
        
        // Calculate volume
        const volume = (options.volume || 1.0) * this.currentVolume;
        gainNode.gain.value = volume;

        // Apply pitch variance if requested
        if (options.pitchVariance) {
            const variance = options.pitchVariance;
            const detune = (Math.random() * variance * 2) - variance; // +/- variance
            source.detune.value = detune * 100; // cents
        }

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        source.start(0);
    }

    // Synthesized fallbacks
    playSynthesized(type) {
        if (!this.ctx || this.isMuted || this.currentVolume <= 0) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const volume = this.currentVolume * 0.3; // Lower volume for synths to be less annoying

        switch (type) {
            case 'blaster':
            case 'gun':
                // High pitch decay "pew"
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
                gain.gain.setValueAtTime(volume, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
                break;

            case 'spear':
                // White noise burst "swish" (simulated with random frequency ramps for simple oscillator)
                // Actually, simple oscillator is bad for whoosh. Let's use a low sine sweep.
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.linearRampToValueAtTime(1000, t + 0.15);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(volume, t + 0.05);
                gain.gain.linearRampToValueAtTime(0, t + 0.2);
                osc.start(t);
                osc.stop(t + 0.2);
                break;

            case 'bomb':
            case 'explosion':
                // Low pitch decay "boom"
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, t);
                osc.frequency.exponentialRampToValueAtTime(10, t + 0.5);
                gain.gain.setValueAtTime(volume, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
                osc.start(t);
                osc.stop(t + 0.5);
                break;

            case 'hit':
            case 'damage':
                // Short crunch
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.linearRampToValueAtTime(50, t + 0.05);
                gain.gain.setValueAtTime(volume, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.05);
                osc.start(t);
                osc.stop(t + 0.05);
                break;
                
            case 'kill':
            case 'death':
                // Descending tones
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.linearRampToValueAtTime(200, t + 0.3);
                gain.gain.setValueAtTime(volume, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;

            default:
                // Generic beep
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, t);
                gain.gain.setValueAtTime(volume, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
                break;
        }
    }
}
