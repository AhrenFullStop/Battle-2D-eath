// Asset loader for images and future audio files

export class AssetLoader {
    constructor() {
        this.images = new Map();
        this.loadedCount = 0;
        this.totalCount = 0;
        this.isLoading = false;
    }

    // Load an image asset
    loadImage(key, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.images.set(key, img);
                this.loadedCount++;
                resolve(img);
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${path}`));
            };
            
            img.src = path;
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

    // Get a loaded image
    getImage(key) {
        return this.images.get(key);
    }

    // Check if an image is loaded
    hasImage(key) {
        return this.images.has(key);
    }

    // Get loading progress (0 to 1)
    getProgress() {
        if (this.totalCount === 0) return 1;
        return this.loadedCount / this.totalCount;
    }

    // Clear all loaded assets
    clear() {
        this.images.clear();
        this.loadedCount = 0;
        this.totalCount = 0;
    }
}