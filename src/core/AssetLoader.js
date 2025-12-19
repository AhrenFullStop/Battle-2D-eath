// Asset loader for images and future audio files

import { resolveAssetUrl, warnMissingAsset } from '../utils/assetUrl.js';

export class AssetLoader {
    constructor() {
        this.images = new Map();
        this.loadedCount = 0;
        this.totalCount = 0;
        this.isLoading = false;
        
        // Asset categories
        this.characterImages = new Map();
        this.characterMenuPreviewImages = new Map();
        this.weaponImages = new Map();
        this.consumableImages = new Map();
    }

    // Load an image asset with optional fallback handling
    loadImage(key, path, silent = false) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.images.set(key, img);
                this.loadedCount++;
                resolve(img);
            };
            
            img.onerror = () => {
                warnMissingAsset('image', path, `key=${key}`);
                if (silent) {
                    // Silent failure - asset is optional
                    this.loadedCount++;
                    resolve(null);
                } else {
                    reject(new Error(`Failed to load image: ${path}`));
                }
            };

            img.src = resolveAssetUrl(path);
        });
    }

    // Load multiple images
    async loadImages(imageList) {
        this.isLoading = true;
        this.totalCount = imageList.length;
        this.loadedCount = 0;

        const promises = imageList.map(({ key, path }) =>
            this.loadImage(key, path)
        );

        try {
            await Promise.all(promises);
            this.isLoading = false;
            return true;
        } catch (error) {
            console.error('Error loading assets:', error);
            this.isLoading = false;
            return false;
        }
    }

    // Load all game PNG assets (characters, weapons, consumables, UI)
    async loadGameAssets() {
        this.isLoading = true;
        
        const assetList = [
            // UI/Utility assets
            { key: 'intro_logo', path: 'assets/utils/intro_logo.png', category: 'ui', type: 'logo' },
            
            // Character assets
            { key: 'char_bolt', path: 'assets/characters/bolt.png', category: 'character', type: 'bolt' },
            { key: 'char_boulder', path: 'assets/characters/boulder.png', category: 'character', type: 'boulder' },

            // Character menu preview assets (optional)
            { key: 'char_menu_bolt', path: 'assets/utils/bolt_preview.png', category: 'characterMenu', type: 'bolt' },
            { key: 'char_menu_boulder', path: 'assets/utils/boulder_preview.png', category: 'characterMenu', type: 'boulder' },
            
            // Weapon assets
            { key: 'weapon_blaster', path: 'assets/weapons/blaster.png', category: 'weapon', type: 'blaster' },
            { key: 'weapon_spear', path: 'assets/weapons/spear.png', category: 'weapon', type: 'spear' },
            { key: 'weapon_bomb', path: 'assets/weapons/bomb.png', category: 'weapon', type: 'bomb' },
            { key: 'weapon_gun', path: 'assets/weapons/gun.png', category: 'weapon', type: 'gun' },
            
            // Consumable assets
            { key: 'consumable_healthKit', path: 'assets/consumables/health.png', category: 'consumable', type: 'healthKit' },
            { key: 'consumable_shieldPotion', path: 'assets/consumables/shield.png', category: 'consumable', type: 'shieldPotion' }
        ];

        this.totalCount = assetList.length;
        this.loadedCount = 0;

        // Load all assets with silent failures (optional assets)
        const promises = assetList.map(async ({ key, path, category, type }) => {
            const img = await this.loadImage(key, path, true);
            
            if (img) {
                // Store in category-specific maps for easy retrieval
                if (category === 'character') {
                    this.characterImages.set(type, img);
                } else if (category === 'characterMenu') {
                    this.characterMenuPreviewImages.set(type, img);
                } else if (category === 'weapon') {
                    this.weaponImages.set(type, img);
                } else if (category === 'consumable') {
                    this.consumableImages.set(type, img);
                }
            }
            
            return img;
        });

        try {
            const results = await Promise.all(promises);
            const successCount = results.filter(img => img !== null).length;
            
            if (successCount > 0) {
                console.log(`Loaded ${successCount} of ${assetList.length} game assets`);
            } else {
                console.log('No PNG assets found - using fallback geometric rendering');
            }
            
            this.isLoading = false;
            return true;
        } catch (error) {
            console.error('Error loading game assets:', error);
            this.isLoading = false;
            return false;
        }
    }

    // Get a loaded image
    getImage(key) {
        return this.images.get(key);
    }

    // Check if an image is loaded
    hasImage(key) {
        return this.images.has(key);
    }

    // Get character image by type (bolt, boulder)
    getCharacterImage(characterType) {
        const img = this.characterImages.get(characterType);
        return (img && img.complete) ? img : null;
    }

    // Get character menu preview image by type (bolt, boulder)
    getCharacterMenuPreviewImage(characterType) {
        const img = this.characterMenuPreviewImages.get(characterType);
        return (img && img.complete) ? img : null;
    }

    // Check if character image is loaded
    hasCharacterImage(characterType) {
        const img = this.characterImages.get(characterType);
        return img && img.complete;
    }

    // Get weapon image by type (blaster, spear, bomb, gun)
    getWeaponImage(weaponType) {
        const img = this.weaponImages.get(weaponType);
        return (img && img.complete) ? img : null;
    }

    // Check if weapon image is loaded
    hasWeaponImage(weaponType) {
        const img = this.weaponImages.get(weaponType);
        return img && img.complete;
    }

    // Get consumable image by type (healthKit, shieldPotion)
    getConsumableImage(consumableType) {
        const img = this.consumableImages.get(consumableType);
        return (img && img.complete) ? img : null;
    }

    // Check if consumable image is loaded
    hasConsumableImage(consumableType) {
        const img = this.consumableImages.get(consumableType);
        return img && img.complete;
    }

    // Get loading progress (0 to 1)
    getProgress() {
        if (this.totalCount === 0) return 1;
        return this.loadedCount / this.totalCount;
    }

    // Clear all loaded assets
    clear() {
        this.images.clear();
        this.characterImages.clear();
        this.characterMenuPreviewImages.clear();
        this.weaponImages.clear();
        this.consumableImages.clear();
        this.loadedCount = 0;
        this.totalCount = 0;
    }
}