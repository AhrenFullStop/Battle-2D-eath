// Start screen with character selection and map selection

import { CHARACTERS } from '../config/characters.js';

export class StartScreen {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.selectedCharacter = 'bolt'; // Default selection
        this.selectedMap = null;
        
        // Maps will be loaded dynamically
        this.availableMaps = [];
        this.selectedMapIndex = 0;
        this.mapsLoaded = false;
        
        // Load maps from manifest
        this.loadMapsFromManifest();
        
        // Calculate scaled dimensions based on canvas size
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        
        // Character cards positioning (responsive to canvas size)
        this.cardWidth = Math.min(280, this.canvas.width * 0.38);
        this.cardHeight = Math.min(380, this.canvas.height * 0.45);
        this.cardSpacing = 40;
        this.scrollOffset = 0;
        
        // Map cards positioning
        this.mapCardWidth = 260;
        this.mapCardHeight = 220;
        this.mapCardSpacing = 20;
        this.mapScrollOffset = 0;
        
        // Touch handling
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartScrollOffset = 0;
        this.lastTouchX = 0;
        this.velocity = 0;
        this.isDraggingMaps = false;
        
        // Start button (positioned near bottom)
        this.startButton = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 60 * scale,
            width: 200 * scale,
            height: 50 * scale,
            text: 'START'
        };
        
        // Layout positions
        this.titleY = 60 * scale;
        this.subtitleY = 100 * scale;
        this.cardsY = this.canvas.height * 0.35;
        this.mapSectionY = this.canvas.height * 0.6;
        this.instructionY = this.canvas.height - 25 * scale;
        
        // Start requested flag
        this.startRequested = false;
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    async loadMapsFromManifest() {
        try {
            const response = await fetch('maps/manifest.json');
            if (!response.ok) {
                throw new Error(`Failed to load manifest: ${response.status}`);
            }
            const manifest = await response.json();
            this.availableMaps = manifest.maps || [];
            
            // Load actual map data for accurate previews
            await this.loadMapData();
            
            if (this.availableMaps.length > 0) {
                this.selectedMap = this.availableMaps[0];
                this.selectedMapIndex = 0;
            }
            
            this.mapsLoaded = true;
            console.log('Loaded maps from manifest:', this.availableMaps.length, 'maps');
        } catch (error) {
            console.error('Error loading maps manifest:', error);
            // Fallback to default map if manifest fails
            this.availableMaps = [{
                file: 'default.json',
                name: 'Default Arena',
                radius: 1400,
                bushCount: 25,
                obstacleCount: 20,
                waterCount: 5,
                background: { type: 'color', value: '#2d3748' },
                mapData: null
            }];
            this.selectedMap = this.availableMaps[0];
            this.selectedMapIndex = 0;
            this.mapsLoaded = true;
        }
    }
    
    async loadMapData() {
        // Load actual map data for each map for accurate previews
        const loadPromises = this.availableMaps.map(async (map) => {
            try {
                const response = await fetch(`maps/${map.file}`);
                if (response.ok) {
                    const data = await response.json();
                    map.mapData = data;
                    console.log(`Loaded map data for ${map.name}`);
                } else {
                    console.warn(`Could not load map data for ${map.name}`);
                    map.mapData = null;
                }
            } catch (error) {
                console.warn(`Error loading map data for ${map.name}:`, error);
                map.mapData = null;
            }
        });
        
        await Promise.all(loadPromises);
    }
    
    setupEventListeners() {
        this.onTouchStartBound = (e) => this.handleTouchStart(e);
        this.onTouchMoveBound = (e) => this.handleTouchMove(e);
        this.onTouchEndBound = (e) => this.handleTouchEnd(e);
        
        this.canvas.addEventListener('touchstart', this.onTouchStartBound, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEndBound, { passive: false });
        
        // Mouse events for desktop
        this.onMouseDownBound = (e) => this.handleMouseDown(e);
        this.onMouseMoveBound = (e) => this.handleMouseMove(e);
        this.onMouseUpBound = (e) => this.handleMouseUp(e);
        this.onWheelBound = (e) => this.handleWheel(e);
        
        this.canvas.addEventListener('mousedown', this.onMouseDownBound);
        this.canvas.addEventListener('mousemove', this.onMouseMoveBound);
        this.canvas.addEventListener('mouseup', this.onMouseUpBound);
        this.canvas.addEventListener('wheel', this.onWheelBound, { passive: false });
    }
    
    removeEventListeners() {
        this.canvas.removeEventListener('touchstart', this.onTouchStartBound);
        this.canvas.removeEventListener('touchmove', this.onTouchMoveBound);
        this.canvas.removeEventListener('touchend', this.onTouchEndBound);
        
        this.canvas.removeEventListener('mousedown', this.onMouseDownBound);
        this.canvas.removeEventListener('mousemove', this.onMouseMoveBound);
        this.canvas.removeEventListener('mouseup', this.onMouseUpBound);
        this.canvas.removeEventListener('wheel', this.onWheelBound);
    }
    
    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    handleWheel(event) {
        event.preventDefault();
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);
        
        // Check if in map section
        if (coords.y >= this.mapSectionY && coords.y <= this.mapSectionY + this.mapCardHeight + 60) {
            const maxScroll = Math.max(0, (this.mapCardWidth + this.mapCardSpacing) * this.availableMaps.length - this.canvas.width + 40);
            if (event.deltaY > 0) {
                this.mapScrollOffset = Math.min(maxScroll, this.mapScrollOffset + 50);
            } else {
                this.mapScrollOffset = Math.max(0, this.mapScrollOffset - 50);
            }
        }
        // Check if in character section
        else if (coords.y >= this.cardsY - this.cardHeight / 2 && coords.y <= this.cardsY + this.cardHeight / 2) {
            if (event.deltaY > 0) {
                this.scrollOffset -= 50;
            } else {
                this.scrollOffset += 50;
            }
        }
    }
    
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
        
        this.isDragging = true;
        this.dragStartX = coords.x;
        this.dragStartY = coords.y;
        
        // Check if starting drag in map section
        if (coords.y >= this.mapSectionY && coords.y <= this.mapSectionY + this.mapCardHeight + 60) {
            this.isDraggingMaps = true;
            this.dragStartScrollOffset = this.mapScrollOffset;
        } else {
            this.isDraggingMaps = false;
            this.dragStartScrollOffset = this.scrollOffset;
        }
        
        this.lastTouchX = coords.x;
        this.velocity = 0;
    }
    
    handleTouchMove(event) {
        event.preventDefault();
        if (!this.isDragging) return;
        
        const touch = event.touches[0];
        const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
        
        const deltaX = coords.x - this.dragStartX;
        
        if (this.isDraggingMaps) {
            this.mapScrollOffset = this.dragStartScrollOffset - deltaX;
            const maxScroll = Math.max(0, (this.mapCardWidth + this.mapCardSpacing) * this.availableMaps.length - this.canvas.width + 40);
            this.mapScrollOffset = Math.max(0, Math.min(maxScroll, this.mapScrollOffset));
        } else {
            this.scrollOffset = this.dragStartScrollOffset + deltaX;
        }
        
        this.velocity = coords.x - this.lastTouchX;
        this.lastTouchX = coords.x;
    }
    
    handleTouchEnd(event) {
        event.preventDefault();
        
        const touch = event.changedTouches[0];
        const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
        
        // Don't process if we were dragging significantly
        const dragDistance = Math.abs(coords.x - this.dragStartX);
        if (dragDistance > 10) {
            this.isDragging = false;
            this.isDraggingMaps = false;
            return null;
        }
        
        // Check if tapped on start button
        if (this.isPointInButton(coords.x, coords.y, this.startButton)) {
            console.log('START button tapped!');
            this.startRequested = true;
            this.isDragging = false;
            return 'start';
        }
        
        // Check if tapped on a map card
        this.availableMaps.forEach((map, index) => {
            const cardX = this.getMapCardX(index);
            if (this.isPointInMapCard(coords.x, coords.y, cardX)) {
                this.selectedMapIndex = index;
                this.selectedMap = map;
                console.log('Selected map:', map.name);
            }
        });
        
        // Check if tapped on a character card
        const characterKeys = Object.keys(CHARACTERS);
        characterKeys.forEach((key, index) => {
            const cardX = this.getCardX(index);
            if (this.isPointInCard(coords.x, coords.y, cardX)) {
                this.selectedCharacter = key;
                console.log('Selected character:', key);
            }
        });
        
        this.isDragging = false;
        this.isDraggingMaps = false;
        return null;
    }
    
    handleMouseDown(event) {
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);
        this.isDragging = true;
        this.dragStartX = coords.x;
        this.dragStartY = coords.y;
        
        // Check if starting drag in map section
        if (coords.y >= this.mapSectionY && coords.y <= this.mapSectionY + this.mapCardHeight + 60) {
            this.isDraggingMaps = true;
            this.dragStartScrollOffset = this.mapScrollOffset;
        } else {
            this.isDraggingMaps = false;
            this.dragStartScrollOffset = this.scrollOffset;
        }
    }
    
    handleMouseMove(event) {
        if (!this.isDragging) return;
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);
        const deltaX = coords.x - this.dragStartX;
        
        if (this.isDraggingMaps) {
            this.mapScrollOffset = this.dragStartScrollOffset - deltaX;
            const maxScroll = Math.max(0, (this.mapCardWidth + this.mapCardSpacing) * this.availableMaps.length - this.canvas.width + 40);
            this.mapScrollOffset = Math.max(0, Math.min(maxScroll, this.mapScrollOffset));
        } else {
            this.scrollOffset = this.dragStartScrollOffset + deltaX;
        }
    }
    
    handleMouseUp(event) {
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);
        
        // Don't process if we were dragging significantly
        const dragDistance = Math.abs(coords.x - this.dragStartX);
        if (dragDistance > 10) {
            this.isDragging = false;
            this.isDraggingMaps = false;
            return null;
        }
        
        // Check start button
        if (this.isPointInButton(coords.x, coords.y, this.startButton)) {
            console.log('START button clicked!');
            this.startRequested = true;
            this.isDragging = false;
            return 'start';
        }
        
        // Check map selection
        this.availableMaps.forEach((map, index) => {
            const cardX = this.getMapCardX(index);
            if (this.isPointInMapCard(coords.x, coords.y, cardX)) {
                this.selectedMapIndex = index;
                this.selectedMap = map;
                console.log('Selected map:', map.name);
            }
        });
        
        // Check character selection
        const characterKeys = Object.keys(CHARACTERS);
        characterKeys.forEach((key, index) => {
            const cardX = this.getCardX(index);
            if (this.isPointInCard(coords.x, coords.y, cardX)) {
                this.selectedCharacter = key;
                console.log('Selected character:', key);
            }
        });
        
        this.isDragging = false;
        this.isDraggingMaps = false;
        return null;
    }
    
    getCardX(index) {
        const centerX = this.canvas.width / 2;
        const totalWidth = (this.cardWidth + this.cardSpacing) * Object.keys(CHARACTERS).length;
        const startX = centerX - totalWidth / 2 + this.cardWidth / 2;
        return startX + index * (this.cardWidth + this.cardSpacing) + this.scrollOffset;
    }
    
    getMapCardX(index) {
        const padding = 20;
        return padding + (this.mapCardWidth + this.mapCardSpacing) * index - this.mapScrollOffset;
    }
    
    isPointInCard(x, y, cardX) {
        return x >= cardX - this.cardWidth / 2 &&
               x <= cardX + this.cardWidth / 2 &&
               y >= this.cardsY - this.cardHeight / 2 &&
               y <= this.cardsY + this.cardHeight / 2;
    }
    
    isPointInMapCard(x, y, cardX) {
        return x >= cardX &&
               x <= cardX + this.mapCardWidth &&
               y >= this.mapSectionY + 40 &&
               y <= this.mapSectionY + 40 + this.mapCardHeight;
    }
    
    isPointInButton(x, y, button) {
        return x >= button.x - button.width / 2 &&
               x <= button.x + button.width / 2 &&
               y >= button.y - button.height / 2 &&
               y <= button.y + button.height / 2;
    }
    
    render() {
        const ctx = this.ctx;
        ctx.save();
        
        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate font sizes
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const titleSize = Math.max(28, 42 * scale);
        const subtitleSize = Math.max(16, 20 * scale);
        const instructionSize = Math.max(11, 14 * scale);
        
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${titleSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('BATTLE-2D-EATH', this.canvas.width / 2, this.titleY);
        
        // Subtitle
        ctx.font = `${subtitleSize}px Arial`;
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('Select Your Character', this.canvas.width / 2, this.subtitleY);
        
        // Render character cards
        const characterKeys = Object.keys(CHARACTERS);
        characterKeys.forEach((key, index) => {
            this.renderCharacterCard(key, index);
        });
        
        // Render map selection
        this.renderMapSelection();
        
        // Render start button
        this.renderStartButton();
        
        // Instructions
        ctx.font = `${instructionSize}px Arial`;
        ctx.fillStyle = '#888888';
        ctx.fillText('Swipe to browse • Scroll/Drag maps to see more', this.canvas.width / 2, this.instructionY);
        
        ctx.restore();
    }
    
    renderCharacterCard(characterKey, index) {
        const ctx = this.ctx;
        const character = CHARACTERS[characterKey];
        const cardX = this.getCardX(index);
        const cardY = this.cardsY;
        const isSelected = characterKey === this.selectedCharacter;
        
        // Calculate scaled sizes
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const nameSize = Math.max(20, 28 * scale);
        const statsSize = Math.max(12, 16 * scale);
        const circleRadius = Math.max(35, 45 * scale);
        
        ctx.save();
        
        // Card background
        ctx.fillStyle = isSelected ? '#2d4a7c' : '#16213e';
        ctx.strokeStyle = isSelected ? '#4ade80' : '#444444';
        ctx.lineWidth = isSelected ? 4 : 2;
        
        const cornerRadius = 15;
        this.roundRect(ctx,
            cardX - this.cardWidth / 2,
            cardY - this.cardHeight / 2,
            this.cardWidth,
            this.cardHeight,
            cornerRadius
        );
        ctx.fill();
        ctx.stroke();
        
        // Character name
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${nameSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(character.name, cardX, cardY - this.cardHeight / 2 + 45 * scale);
        
        // Character visual (colored circle)
        ctx.fillStyle = character.color;
        ctx.beginPath();
        ctx.arc(cardX, cardY - 25 * scale, circleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        // Character stats
        ctx.font = `${statsSize}px Arial`;
        ctx.textAlign = 'left';
        const statsX = cardX - this.cardWidth / 2 + 15;
        let statsY = cardY + 25 * scale;
        
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('Stats:', statsX, statsY);
        statsY += 22 * scale;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`HP: ${character.maxHP}`, statsX, statsY);
        statsY += 20 * scale;
        ctx.fillText(`Speed: ${character.moveSpeed}`, statsX, statsY);
        statsY += 20 * scale;
        ctx.fillText(`Cooldown: ${(character.weaponCooldownMultiplier * 100).toFixed(0)}%`, statsX, statsY);
        statsY += 20 * scale;
        
        // Special ability
        const abilityName = character.specialAbility.type === 'dash' ? 'Dash' : 'Ground Slam';
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`Ability: ${abilityName}`, statsX, statsY);
        
        ctx.restore();
    }
    
    renderMapSelection() {
        const ctx = this.ctx;
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const labelSize = Math.max(14, 18 * scale);
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${labelSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('Select Map:', 20, this.mapSectionY + 25);
        
        if (!this.mapsLoaded) {
            ctx.fillStyle = '#666666';
            ctx.font = `${labelSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('Loading maps...', this.canvas.width / 2, this.mapSectionY + 120);
            return;
        }
        
        // Clip region for maps
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, this.mapSectionY + 40, this.canvas.width, this.mapCardHeight + 20);
        ctx.clip();
        
        // Render map cards
        this.availableMaps.forEach((map, index) => {
            this.renderMapCard(map, index);
        });
        
        ctx.restore();
        
        // Scroll indicators
        const maxScroll = Math.max(0, (this.mapCardWidth + this.mapCardSpacing) * this.availableMaps.length - this.canvas.width + 40);
        if (maxScroll > 0) {
            // Left arrow
            if (this.mapScrollOffset > 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.beginPath();
                ctx.moveTo(15, this.mapSectionY + 140);
                ctx.lineTo(5, this.mapSectionY + 150);
                ctx.lineTo(15, this.mapSectionY + 160);
                ctx.fill();
            }
            
            // Right arrow
            if (this.mapScrollOffset < maxScroll) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.beginPath();
                ctx.moveTo(this.canvas.width - 15, this.mapSectionY + 140);
                ctx.lineTo(this.canvas.width - 5, this.mapSectionY + 150);
                ctx.lineTo(this.canvas.width - 15, this.mapSectionY + 160);
                ctx.fill();
            }
        }
    }
    
    renderMapCard(map, index) {
        const ctx = this.ctx;
        const x = this.getMapCardX(index);
        const y = this.mapSectionY + 40;
        const isSelected = index === this.selectedMapIndex;
        
        // Skip if off-screen
        if (x + this.mapCardWidth < 0 || x > this.canvas.width) return;
        
        // Card background
        ctx.fillStyle = isSelected ? '#2a4a2a' : '#1e2738';
        ctx.strokeStyle = isSelected ? '#4ade80' : '#444444';
        ctx.lineWidth = isSelected ? 3 : 2;
        
        this.roundRect(ctx, x, y, this.mapCardWidth, this.mapCardHeight, 10);
        ctx.fill();
        ctx.stroke();
        
        // Map preview
        this.drawMapPreview(map, x + 10, y + 10, this.mapCardWidth - 20, 120);
        
        // Map name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(map.name, x + this.mapCardWidth / 2, y + 150);
        
        // Stats
        ctx.font = '12px Arial';
        ctx.fillStyle = '#aaaaaa';
        ctx.textAlign = 'left';
        const statsX = x + 10;
        ctx.fillText(`Radius: ${map.radius}m`, statsX, y + 170);
        ctx.fillText(`Bushes: ${map.bushCount || 0}`, statsX, y + 185);
        ctx.fillText(`Rocks: ${map.obstacleCount || 0}`, statsX + 80, y + 185);
        ctx.fillText(`Water: ${map.waterCount || 0}`, statsX, y + 200);
    }
    
    drawMapPreview(map, x, y, width, height) {
        const ctx = this.ctx;
        const scale = Math.min(width, height) / (map.radius * 2);
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        // Background - show differently for image vs color
        if (map.background?.type === 'image') {
            // For image backgrounds, show a gradient with "IMAGE" indicator
            const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
            gradient.addColorStop(0, '#3a3a4a');
            gradient.addColorStop(1, '#2a2a3a');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, width, height);
            
            // Add "IMAGE" badge
            ctx.fillStyle = 'rgba(100, 100, 255, 0.3)';
            ctx.fillRect(x + width - 50, y + 5, 45, 18);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('IMAGE', x + width - 47, y + 16);
        } else {
            // For color backgrounds, show the actual color
            const bgColor = map.background?.value || '#2d3748';
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, width, height);
        }
        
        // Map circle
        ctx.fillStyle = '#3a3a4a';
        ctx.beginPath();
        ctx.arc(centerX, centerY, map.radius * scale * 0.9, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Draw actual map data if available
        if (map.mapData) {
            this.drawActualMapData(map.mapData, centerX, centerY, scale, map.radius);
        } else {
            // Fallback to simplified indicators
            this.drawSimplifiedIndicators(map, centerX, centerY, scale);
        }
    }
    
    drawActualMapData(mapData, centerX, centerY, scale, radius) {
        const ctx = this.ctx;
        
        // Calculate offset (map data is centered at 1500,1500 but we're drawing centered at centerX, centerY)
        const mapCenterX = 1500; // Default map center from map.js
        const mapCenterY = 1500;
        
        // Draw water areas (blue circles or rectangles)
        if (mapData.waterAreas && mapData.waterAreas.length > 0) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
            mapData.waterAreas.forEach(water => {
                const wx = centerX + (water.x - mapCenterX) * scale;
                const wy = centerY + (water.y - mapCenterY) * scale;
                
                if (water.radius !== undefined) {
                    // Circle water
                    const r = water.radius * scale;
                    if (r > 0.5) { // Only draw if visible
                        ctx.beginPath();
                        ctx.arc(wx, wy, r, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            });
        }
        
        // Draw obstacles (gray rectangles)
        if (mapData.obstacles && mapData.obstacles.length > 0) {
            ctx.fillStyle = 'rgba(120, 113, 108, 0.7)';
            mapData.obstacles.forEach(obstacle => {
                const ox = centerX + (obstacle.x - mapCenterX) * scale;
                const oy = centerY + (obstacle.y - mapCenterY) * scale;
                const w = obstacle.width * scale;
                const h = obstacle.height * scale;
                
                if (w > 0.5 && h > 0.5) { // Only draw if visible
                    ctx.fillRect(ox - w / 2, oy - h / 2, w, h);
                }
            });
        }
        
        // Draw bushes (green circles)
        if (mapData.bushes && mapData.bushes.length > 0) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
            mapData.bushes.forEach(bush => {
                const bx = centerX + (bush.x - mapCenterX) * scale;
                const by = centerY + (bush.y - mapCenterY) * scale;
                const r = bush.radius * scale;
                
                if (r > 0.5) { // Only draw if visible
                    ctx.beginPath();
                    ctx.arc(bx, by, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }
    
    drawSimplifiedIndicators(map, centerX, centerY, scale) {
        const ctx = this.ctx;
        
        // Simplified indicators (fallback when map data not available)
        if (map.waterCount > 0) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
            const waterRadius = 6;
            for (let i = 0; i < Math.min(map.waterCount, 5); i++) {
                const angle = (Math.PI * 2 * i) / 5;
                const wx = centerX + Math.cos(angle) * (map.radius * scale * 0.5);
                const wy = centerY + Math.sin(angle) * (map.radius * scale * 0.5);
                ctx.beginPath();
                ctx.arc(wx, wy, waterRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        if (map.obstacleCount > 0) {
            ctx.fillStyle = 'rgba(120, 113, 108, 0.8)';
            const obstacleSize = 5;
            for (let i = 0; i < Math.min(map.obstacleCount, 8); i++) {
                const angle = (Math.PI * 2 * i) / 8 + Math.PI / 8;
                const ox = centerX + Math.cos(angle) * (map.radius * scale * 0.3);
                const oy = centerY + Math.sin(angle) * (map.radius * scale * 0.3);
                ctx.fillRect(ox - obstacleSize / 2, oy - obstacleSize / 2, obstacleSize, obstacleSize);
            }
        }
        
        if (map.bushCount > 0) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
            const bushRadius = 3;
            for (let i = 0; i < Math.min(map.bushCount, 12); i++) {
                const angle = (Math.PI * 2 * i) / 12;
                const bx = centerX + Math.cos(angle) * (map.radius * scale * 0.7);
                const by = centerY + Math.sin(angle) * (map.radius * scale * 0.7);
                ctx.beginPath();
                ctx.arc(bx, by, bushRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    renderStartButton() {
        const ctx = this.ctx;
        const btn = this.startButton;
        
        ctx.save();
        
        // Calculate scaled font size
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const buttonTextSize = Math.max(18, 22 * scale);
        
        // Button background
        ctx.fillStyle = '#4ade80';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        
        this.roundRect(ctx,
            btn.x - btn.width / 2,
            btn.y - btn.height / 2,
            btn.width,
            btn.height,
            8
        );
        ctx.fill();
        ctx.stroke();
        
        // Button text
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${buttonTextSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.text, btn.x, btn.y);
        
        ctx.restore();
    }
    
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    getSelectedCharacter() {
        return this.selectedCharacter;
    }
    
    getSelectedMap() {
        return this.selectedMap;
    }
    
    checkStartRequested() {
        const requested = this.startRequested;
        this.startRequested = false;
        return requested;
    }
}