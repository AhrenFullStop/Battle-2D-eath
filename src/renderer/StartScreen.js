// Start screen with character selection

import { CHARACTERS } from '../config/characters.js';

export class StartScreen {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.selectedCharacter = 'bolt'; // Default selection
        
        // Calculate scaled dimensions based on canvas size
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        
        // Character cards positioning (responsive to canvas size)
        this.cardWidth = Math.min(280, this.canvas.width * 0.38);
        this.cardHeight = Math.min(380, this.canvas.height * 0.45);
        this.cardSpacing = 40;
        this.scrollOffset = 0;
        
        // Touch handling
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartScrollOffset = 0;
        this.lastTouchX = 0;
        this.velocity = 0;
        
        // Start button (positioned near bottom)
        this.startButton = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 80 * scale,
            width: 200 * scale,
            height: 60 * scale,
            text: 'START'
        };
        
        // Layout positions
        this.titleY = 80 * scale;
        this.subtitleY = 130 * scale;
        this.cardsY = this.canvas.height / 2;
        this.instructionY = this.canvas.height - 30 * scale;
        
        // Start requested flag
        this.startRequested = false;
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.onTouchStartBound = (e) => this.handleTouchStart(e);
        this.onTouchMoveBound = (e) => this.handleTouchMove(e);
        this.onTouchEndBound = (e) => this.handleTouchEnd(e);
        
        this.canvas.addEventListener('touchstart', this.onTouchStartBound, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEndBound, { passive: false });
        
        // Mouse events for desktop
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }
    
    removeEventListeners() {
        this.canvas.removeEventListener('touchstart', this.onTouchStartBound);
        this.canvas.removeEventListener('touchmove', this.onTouchMoveBound);
        this.canvas.removeEventListener('touchend', this.onTouchEndBound);
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
    
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
        
        this.isDragging = true;
        this.dragStartX = coords.x;
        this.dragStartScrollOffset = this.scrollOffset;
        this.lastTouchX = coords.x;
        this.velocity = 0;
    }
    
    handleTouchMove(event) {
        event.preventDefault();
        if (!this.isDragging) return;
        
        const touch = event.touches[0];
        const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
        
        const deltaX = coords.x - this.dragStartX;
        this.scrollOffset = this.dragStartScrollOffset + deltaX;
        
        // Calculate velocity for momentum
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
            return null;
        }
        
        // Check if tapped on start button
        if (this.isPointInButton(coords.x, coords.y, this.startButton)) {
            console.log('START button tapped!');
            this.startRequested = true;
            this.isDragging = false;
            return 'start';
        }
        
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
        return null;
    }
    
    handleMouseDown(event) {
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);
        this.isDragging = true;
        this.dragStartX = coords.x;
        this.dragStartScrollOffset = this.scrollOffset;
    }
    
    handleMouseMove(event) {
        if (!this.isDragging) return;
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);
        const deltaX = coords.x - this.dragStartX;
        this.scrollOffset = this.dragStartScrollOffset + deltaX;
    }
    
    handleMouseUp(event) {
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);
        
        // Don't process if we were dragging significantly
        const dragDistance = Math.abs(coords.x - this.dragStartX);
        if (dragDistance > 10) {
            this.isDragging = false;
            return null;
        }
        
        // Check start button first
        if (this.isPointInButton(coords.x, coords.y, this.startButton)) {
            console.log('START button clicked!');
            this.startRequested = true;
            this.isDragging = false;
            return 'start';
        }
        
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
        return null;
    }
    
    getCardX(index) {
        const centerX = this.canvas.width / 2;
        const totalWidth = (this.cardWidth + this.cardSpacing) * Object.keys(CHARACTERS).length;
        const startX = centerX - totalWidth / 2 + this.cardWidth / 2;
        return startX + index * (this.cardWidth + this.cardSpacing) + this.scrollOffset;
    }
    
    isPointInCard(x, y, cardX) {
        return x >= cardX - this.cardWidth / 2 &&
               x <= cardX + this.cardWidth / 2 &&
               y >= this.cardsY - this.cardHeight / 2 &&
               y <= this.cardsY + this.cardHeight / 2;
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
        
        // Calculate font sizes based on canvas size
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const titleSize = Math.max(32, 48 * scale);
        const subtitleSize = Math.max(18, 24 * scale);
        const instructionSize = Math.max(12, 16 * scale);
        
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
        
        // Render start button
        this.renderStartButton();
        
        // Instructions
        ctx.font = `${instructionSize}px Arial`;
        ctx.fillStyle = '#888888';
        ctx.fillText('Swipe to see more characters', this.canvas.width / 2, this.instructionY);
        
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
        const nameSize = Math.max(24, 32 * scale);
        const statsSize = Math.max(14, 18 * scale);
        const circleRadius = Math.max(40, 50 * scale);
        
        ctx.save();
        
        // Card background
        ctx.fillStyle = isSelected ? '#2d4a7c' : '#16213e';
        ctx.strokeStyle = isSelected ? '#4ade80' : '#444444';
        ctx.lineWidth = isSelected ? 4 : 2;
        
        const cornerRadius = 20;
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
        ctx.fillText(character.name, cardX, cardY - this.cardHeight / 2 + 50 * scale);
        
        // Character visual (colored circle)
        ctx.fillStyle = character.color;
        ctx.beginPath();
        ctx.arc(cardX, cardY - 30 * scale, circleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Character stats
        ctx.font = `${statsSize}px Arial`;
        ctx.textAlign = 'left';
        const statsX = cardX - this.cardWidth / 2 + 20;
        let statsY = cardY + 30 * scale;
        
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('Stats:', statsX, statsY);
        statsY += 25 * scale;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`HP: ${character.maxHP}`, statsX, statsY);
        statsY += 22 * scale;
        ctx.fillText(`Speed: ${character.moveSpeed}`, statsX, statsY);
        statsY += 22 * scale;
        ctx.fillText(`Cooldown: ${(character.weaponCooldownMultiplier * 100).toFixed(0)}%`, statsX, statsY);
        statsY += 22 * scale;
        
        // Special ability
        const abilityName = character.specialAbility.type === 'dash' ? 'Dash' : 'Ground Slam';
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`Ability: ${abilityName}`, statsX, statsY);
        
        ctx.restore();
    }
    
    renderStartButton() {
        const ctx = this.ctx;
        const btn = this.startButton;
        
        ctx.save();
        
        // Calculate scaled font size
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const buttonTextSize = Math.max(20, 24 * scale);
        
        // Button background
        ctx.fillStyle = '#4ade80';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        
        this.roundRect(ctx,
            btn.x - btn.width / 2,
            btn.y - btn.height / 2,
            btn.width,
            btn.height,
            10
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
    
    checkStartRequested() {
        const requested = this.startRequested;
        this.startRequested = false; // Reset flag
        return requested;
    }
}