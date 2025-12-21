// Map Editor Main - Bootstrap the map editor

import { MapEditor } from './MapEditor.js';
import { EditorUI } from './EditorUI.js';
import { TouchGestureHandler } from './TouchGestureHandler.js';
import { MapValidator } from './MapValidator.js';
import { MobileUI } from './MobileUI.js';

class EditorApp {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set up canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Detect mobile viewport
        this.isMobile = window.innerWidth < 768;
        
        // Initialize editor components
        this.editor = new MapEditor();
        this.camera = { x: 400, y: 400, zoom: 0.3 }; // Start zoomed out and centered
        this.ui = new EditorUI(this.canvas, this.ctx, this.editor, this.camera);
        
        // Initialize validator
        this.validator = new MapValidator();
        
        // Camera panning
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.panSpeed = 1;
        
        // Touch gesture handler
        this.gestureHandler = new TouchGestureHandler(this.canvas);
        this.setupGestureCallbacks();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Auto-fit viewport for mobile
        if (this.isMobile) {
            this.fitMapToViewport();
            // Create mobile-specific UI (pass editorUI for access to background data)
            this.mobileUI = new MobileUI(this.editor, this.ui);
        }
        
        // Start render loop
        this.lastTime = performance.now();
        this.render();
        
        console.log('Map Editor initialized! Use buttons to place objects.');
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Touch events - use gesture handler
        this.canvas.addEventListener('touchstart', (e) => this.gestureHandler.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.gestureHandler.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.gestureHandler.handleTouchEnd(e), { passive: false });
        
        // Keyboard events for camera, UI toggle, and undo/redo
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        console.log('Controls: H = toggle UI, +/- = zoom, Ctrl+Z/Y = undo/redo');
    }
    
    /**
     * Setup gesture handler callbacks
     */
    setupGestureCallbacks() {
        // Tap - place object or click UI
        this.gestureHandler.onTap = (canvasX, canvasY) => {
            // Check if clicked on UI button
            const action = this.ui.checkButtonClick(canvasX, canvasY);
            if (action) {
                this.handleAction(action);
                // Mark this as UI interaction to prevent double-tap
                this.gestureHandler.lastTapTime = 0;
                return;
            }
            
            // Place object if not pan tool
            if (this.editor.getCurrentTool() !== 'pan') {
                const worldX = canvasX / this.camera.zoom + this.camera.x;
                const worldY = canvasY / this.camera.zoom + this.camera.y;
                this.editor.handleClick(worldX, worldY);
            }
        };
        
        // Long-press - for future: select/edit/delete object
        this.gestureHandler.onLongPress = (canvasX, canvasY) => {
            // Check if on UI first
            const action = this.ui.checkButtonClick(canvasX, canvasY);
            if (action) return; // Ignore long-press on UI
            
            const worldX = canvasX / this.camera.zoom + this.camera.x;
            const worldY = canvasY / this.camera.zoom + this.camera.y;
            
            // Check if near an object
            const nearObject = this.editor.isNearObject(worldX, worldY, 50);
            if (nearObject) {
                // For now, just delete it (like erase tool)
                this.editor.eraseAtPosition(worldX, worldY);
                console.log('Long-press: deleted object');
            }
        };
        
        // Double-tap - quick zoom to area (not on UI)
        this.gestureHandler.onDoubleTap = (canvasX, canvasY) => {
            // Check if on UI - don't zoom if double-tapping UI
            const action = this.ui.checkButtonClick(canvasX, canvasY);
            if (action) return;
            
            // Zoom in on double-tap at the tapped location
            const oldZoom = this.camera.zoom;
            this.camera.zoom = Math.min(2.0, this.camera.zoom + 0.3);
            
            // Zoom toward the tap point
            const worldX = canvasX / oldZoom + this.camera.x;
            const worldY = canvasY / oldZoom + this.camera.y;
            this.camera.x = worldX - canvasX / this.camera.zoom;
            this.camera.y = worldY - canvasY / this.camera.zoom;
            
            console.log('Double-tap zoom:', this.camera.zoom.toFixed(1));
        };
        
        // Pinch zoom
        this.gestureHandler.onPinch = (scale, centerX, centerY) => {
            const oldZoom = this.camera.zoom;
            this.camera.zoom = Math.max(0.3, Math.min(2.0, this.camera.zoom * scale));
            
            // Adjust camera position to zoom toward pinch center
            const worldX = centerX / oldZoom + this.camera.x;
            const worldY = centerY / oldZoom + this.camera.y;
            this.camera.x = worldX - centerX / this.camera.zoom;
            this.camera.y = worldY - centerY / this.camera.zoom;
        };
        
        // Two-finger pan
        this.gestureHandler.onPan = (deltaX, deltaY) => {
            this.camera.x -= deltaX / this.camera.zoom;
            this.camera.y -= deltaY / this.camera.zoom;
        };
    }
    
    /**
     * Fit map to viewport (for mobile initialization)
     */
    fitMapToViewport() {
        const mapRadius = 1400;
        const mapSize = mapRadius * 2;
        const viewportMin = Math.min(window.innerWidth, window.innerHeight);
        
        // Calculate zoom to fit map with some padding
        this.camera.zoom = (viewportMin * 0.8) / mapSize;
        
        // Center camera on map center
        this.camera.x = 1500 - (window.innerWidth / 2) / this.camera.zoom;
        this.camera.y = 1500 - (window.innerHeight / 2) / this.camera.zoom;
        
        console.log('Map auto-fitted to viewport, zoom:', this.camera.zoom.toFixed(2));
    }
    
    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    handleMouseDown(e) {
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        
        // Check if clicked on UI button
        const action = this.ui.checkButtonClick(coords.x, coords.y);
        if (action) {
            this.handleAction(action);
            return;
        }
        
        // Check if Pan tool is selected or if using middle/right mouse
        if (this.editor.getCurrentTool() === 'pan' || e.button === 1 || e.button === 2) {
            e.preventDefault();
            this.isPanning = true;
            this.lastPanX = coords.x;
            this.lastPanY = coords.y;
            return;
        }
        
        // Otherwise, place object (if not Pan tool)
        if (this.editor.getCurrentTool() !== 'pan') {
            const worldX = coords.x / this.camera.zoom + this.camera.x;
            const worldY = coords.y / this.camera.zoom + this.camera.y;
            this.editor.handleClick(worldX, worldY);
        }
    }
    
    handleMouseMove(e) {
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        
        // Update UI with mouse position
        const worldX = coords.x / this.camera.zoom + this.camera.x;
        const worldY = coords.y / this.camera.zoom + this.camera.y;
        this.ui.updateMousePosition(worldX, worldY);
        
        // Handle panning
        if (this.isPanning) {
            const deltaX = (coords.x - this.lastPanX) / this.camera.zoom;
            const deltaY = (coords.y - this.lastPanY) / this.camera.zoom;
            this.camera.x -= deltaX;
            this.camera.y -= deltaY;
            this.lastPanX = coords.x;
            this.lastPanY = coords.y;
        }
    }
    
    handleMouseUp(e) {
        this.isPanning = false;
    }
    
    // Touch events are now handled by TouchGestureHandler
    // (removed handleTouchStart, handleTouchMove, handleTouchEnd)
    
    handleKeyDown(e) {
        // Undo/Redo shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            if (this.editor.undo()) {
                console.log('Undo performed');
            }
            e.preventDefault();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            if (this.editor.redo()) {
                console.log('Redo performed');
            }
            e.preventDefault();
            return;
        }
        
        const speed = 20;
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.camera.y -= speed;
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.camera.y += speed;
                e.preventDefault();
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.camera.x -= speed;
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.camera.x += speed;
                e.preventDefault();
                break;
            case 'h':
            case 'H':
                this.ui.toggleUI();
                e.preventDefault();
                break;
            case '+':
            case '=':
                this.camera.zoom = Math.min(2.0, this.camera.zoom + 0.1);
                console.log('Zoom level:', this.camera.zoom.toFixed(1));
                e.preventDefault();
                break;
            case '-':
            case '_':
                this.camera.zoom = Math.max(0.3, this.camera.zoom - 0.1);
                console.log('Zoom level:', this.camera.zoom.toFixed(1));
                e.preventDefault();
                break;
        }
    }
    
    handleAction(action) {
        switch (action) {
            case 'undo':
                if (this.editor.undo()) {
                    console.log('Undo performed');
                }
                break;
                
            case 'redo':
                if (this.editor.redo()) {
                    console.log('Redo performed');
                }
                break;
                
            case 'clear':
                if (confirm('Clear all objects from the map?')) {
                    this.editor.clearMap();
                }
                break;
                
            case 'export':
                this.exportMap();
                break;
                
            case 'import':
                this.importMap();
                break;
                
            case 'zoom_in':
                this.camera.zoom = Math.min(2.0, this.camera.zoom + 0.1);
                console.log('Zoom level:', this.camera.zoom.toFixed(1));
                break;
                
            case 'zoom_out':
                // Calculate center of viewport
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                
                // Get world position at center
                const worldCenterX = centerX / this.camera.zoom + this.camera.x;
                const worldCenterY = centerY / this.camera.zoom + this.camera.y;
                
                // Zoom out
                const newZoom = Math.max(0.3, this.camera.zoom - 0.1);
                
                // Adjust camera to keep center point stable
                this.camera.x = worldCenterX - centerX / newZoom;
                this.camera.y = worldCenterY - centerY / newZoom;
                this.camera.zoom = newZoom;
                
                console.log('Zoom level:', this.camera.zoom.toFixed(1));
                break;
                
            case 'background':
                this.ui.cycleBackground();
                break;
        }
    }
    
    exportMap() {
        // Sync game config from form to editor before exporting
        this.ui.syncGameConfigToEditor();
        
        // Validate map before export
        const mapData = this.editor.getMapData();
        const validation = this.validator.validate(mapData);
        
        if (!validation.valid) {
            const errorMsg = 'Map validation failed:\n' + validation.errors.join('\n');
            alert(errorMsg);
            console.error('Validation errors:', validation.errors);
            return;
        }
        
        if (validation.warnings.length > 0) {
            const warningMsg = 'Map has warnings:\n' + validation.warnings.join('\n') + '\n\nContinue with export?';
            if (!confirm(warningMsg)) {
                return;
            }
        }
        
        const json = this.editor.exportToJSON();
        
        // Create a download link
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Prompt for filename
        const filename = prompt('Enter map filename:', 'custom-map.json');
        if (filename) {
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Map exported successfully!');
        }
    }
    
    importMap() {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const success = this.editor.importFromJSON(event.target.result);
                    if (success) {
                        // Sync the background dropdown with imported map
                        this.ui.syncBackgroundSelector();
                        // Sync the game config to the form
                        this.ui.loadGameConfigIntoForm();
                        alert('Map imported successfully!');
                    } else {
                        alert('Error importing map. Please check the JSON format.');
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply zoom and camera transformation
        this.ctx.save();
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render map
        const centerX = 1500;
        const centerY = 1500;
        const radius = 1400;
        
        // Get map data
        const mapData = this.editor.getMapData();
        
        // Get background image if available
        const bgImage = this.editor.getBackgroundImage();
        
        // Render background (image or color)
        if (mapData.background?.type === 'image' && bgImage.loaded && bgImage.image) {
            // Draw background image scaled to map circle
            const size = radius * 2;
            this.ctx.drawImage(
                bgImage.image,
                centerX - radius,
                centerY - radius,
                size,
                size
            );
        } else {
            // Map background with configured color
            const bgColor = mapData.background?.value || '#2d3748';
            this.ctx.fillStyle = bgColor;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Map border (full opacity)
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw grid (full opacity)
        this.drawGrid(centerX, centerY, radius);
        
        // Set terrain opacity to 20%
        this.ctx.globalAlpha = 0.2;
        
        // Draw water areas
        mapData.waterAreas.forEach(water => {
            this.ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            this.ctx.beginPath();
            this.ctx.arc(water.x, water.y, water.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#3b82f6';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
        
        // Draw obstacles
        mapData.obstacles.forEach(obstacle => {
            this.ctx.fillStyle = '#78716c';
            this.ctx.fillRect(
                obstacle.x - obstacle.width / 2,
                obstacle.y - obstacle.height / 2,
                obstacle.width,
                obstacle.height
            );
            this.ctx.strokeStyle = '#57534e';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                obstacle.x - obstacle.width / 2,
                obstacle.y - obstacle.height / 2,
                obstacle.width,
                obstacle.height
            );
        });
        
        // Draw bushes
        mapData.bushes.forEach(bush => {
            this.ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
            this.ctx.beginPath();
            this.ctx.arc(bush.x, bush.y, bush.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#22c55e';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
        
        // Reset opacity to full for cursor preview
        this.ctx.globalAlpha = 1.0;
        
        // Draw cursor preview
        this.drawCursorPreview();
        
        this.ctx.restore();
        
        // Render UI (not affected by zoom/pan)
        this.ui.render();
        
        // Continue loop
        requestAnimationFrame(() => this.render());
    }
    
    drawGrid(centerX, centerY, radius) {
        const gridSize = 100;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = centerX - radius; x <= centerX + radius; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, centerY - radius);
            this.ctx.lineTo(x, centerY + radius);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = centerY - radius; y <= centerY + radius; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(centerX - radius, y);
            this.ctx.lineTo(centerX + radius, y);
            this.ctx.stroke();
        }
    }
    
    drawCursorPreview() {
        const worldX = this.ui.mouseWorldX;
        const worldY = this.ui.mouseWorldY;
        
        if (!worldX || !worldY) return;
        
        const tool = this.editor.getCurrentTool();
        const centerX = 1500;
        const centerY = 1500;
        const radius = 1400;
        
        // Check if within map bounds
        const dx = worldX - centerX;
        const dy = worldY - centerY;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
        if (distFromCenter > radius) return;
        
        if (tool === 'pan') {
            // Draw pan cursor
            this.ctx.strokeStyle = '#6b7280';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(worldX, worldY, 15, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Draw crosshair
            this.ctx.beginPath();
            this.ctx.moveTo(worldX - 10, worldY);
            this.ctx.lineTo(worldX + 10, worldY);
            this.ctx.moveTo(worldX, worldY - 10);
            this.ctx.lineTo(worldX, worldY + 10);
            this.ctx.stroke();
        } else if (tool === 'erase') {
            // Draw erase cursor
            this.ctx.strokeStyle = '#ef4444';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(worldX, worldY, 50, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Draw X
            this.ctx.beginPath();
            this.ctx.moveTo(worldX - 20, worldY - 20);
            this.ctx.lineTo(worldX + 20, worldY + 20);
            this.ctx.moveTo(worldX + 20, worldY - 20);
            this.ctx.lineTo(worldX - 20, worldY + 20);
            this.ctx.stroke();
        } else {
            // Draw placement preview
            this.ctx.globalAlpha = 0.5;
            
            switch (tool) {
                case 'bush':
                    this.ctx.fillStyle = '#22c55e';
                    this.ctx.beginPath();
                    this.ctx.arc(worldX, worldY, 50, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                    
                case 'obstacle':
                    this.ctx.fillStyle = '#78716c';
                    this.ctx.fillRect(worldX - 40, worldY - 40, 80, 80);
                    break;
                    
                case 'water':
                    this.ctx.fillStyle = '#3b82f6';
                    this.ctx.beginPath();
                    this.ctx.arc(worldX, worldY, 120, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
            }
            
            this.ctx.globalAlpha = 1.0;
        }
    }
}

// Prevent context menu on right click
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Initialize editor when page loads
window.addEventListener('load', () => {
    new EditorApp();
});