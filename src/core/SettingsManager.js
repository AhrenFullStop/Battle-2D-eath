export const SETTINGS_KEY = 'battle2d_settings';

export class SettingsManager {
    constructor() {
        this.settings = {
            volume: 0.5, // Default volume
            userName: 'Player'
        };
        this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
        return this.settings;
    }

    save() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.save();
    }
}

export const settingsManager = new SettingsManager();
