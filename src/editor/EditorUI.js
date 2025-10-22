// Editor UI - Handles rendering and UI for the map editor

export class EditorUI {
    constructor(canvas, ctx, editor, camera) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.editor = editor;
        this.camera = camera;
        
        // UI button positions and sizes
        this.toolButtons = [
            { tool: 'pan', label: 'Pan', x: 20, y: 20, width: 100, height: 40, color: '#6b7280' },
            { tool: 'bush', label: 'Bush', x: 130, y: 20, width: 100, height: 40, color: '#22c55e' },
            { tool: 'obstacle', label: 'Rock', x: 240, y: 20, width: 100, height: 40, color: '#78716c' },
            { tool: 'water', label: 'Water', x: 350, y: 20, width: 100, height: 40, color: '#3b82f6' },
            { tool: 'erase', label: 'Erase', x: 460, y: 20, width: 100, height: 40, color: '#ef4444' }
        ];
        
        this.actionButtons = [
            { action: 'clear', label: 'Clear All', x: 20, y: 70, width: 100, height: 40 },
            { action: 'export', label: 'Export', x: 130, y: 70, width: 100, height: 40 },
            { action: 'import', label: 'Import', x: 240, y: 70, width: 100, height: 40 },
            { action: 'zoom_in', label: 'Zoom +', x: 350, y: 70, width: 80, height: 40 },
            { action: 'zoom_out', label: 'Zoom -', x: 440, y: 70, width: 80, height: 40 },
            { action: 'background', label: 'BG Color', x: 530, y: 70, width: 100, height: 40 }
        ];
        
        // Available background colors
        this.backgroundColors = [
            { name: 'Green Grass', value: '#2d5016' },
            { name: 'Dark Gray', value: '#2d3748' },
            { name: 'Ocean Blue', value: '#1e3a5f' },
            { name: 'Desert Sand', value: '#c2b280' },
            { name: 'Snow White', value: '#e8e8e8' },
            { name: 'Dark Purple', value: '#3d2b56' },
            { name: 'Brown Earth', value: '#4a3728' }
        ];
        this.currentBackgroundIndex = 0;
        
        // Available background images (loaded from manifest)
        this.backgroundImages = [];
        this.loadBackgroundImages();
        
        // UI visibility toggle
        this.showUI = true;
        
        // Stats display position
        this.statsX = 20;
        this.statsY = 130;
        
        // Mouse position in world coordinates
        this.mouseWorldX = 0;
        this.mouseWorldY = 0;
        
        // Create background selector dropdown
        this.createBackgroundSelector();
    }
    
    async loadBackgroundImages() {
        try {
            const response = await fetch('maps/manifest.json');
            const manifest = await response.json();
            
            // Extract unique background images from maps
            const imageSet = new Set();
            manifest.maps.forEach(map => {
                if (map.background?.type === 'image') {
                    imageSet.add(map.background.value);
                }
            });
            
            // Convert to array with display names
            this.backgroundImages = Array.from(imageSet).map(filename => ({
                name: filename.replace(/\.(png|jpg|jpeg|webp)$/i, '').replace(/_/g, ' '),
                file: filename
            }));
            
            // Update dropdown if it exists
            if (this.backgroundSelect) {
                this.updateBackgroundDropdown();
            }
            
            console.log('Loaded background images:', this.backgroundImages);
        } catch (error) {
            console.error('Error loading background images from manifest:', error);
            this.backgroundImages = [];
        }
    }
    
    createBackgroundSelector() {
        const container = document.createElement('div');
        container.id = 'backgroundSelectorContainer';
        container.style.position = 'absolute';
        container.style.top = '70px';
        container.style.left = '640px';
        container.style.zIndex = '1000';
        container.style.pointerEvents = 'auto';
        
        const label = document.createElement('label');
        label.textContent = 'Background: ';
        label.style.color = '#ffffff';
        label.style.fontSize = '14px';
        label.style.fontFamily = 'Arial';
        label.style.marginRight = '5px';
        
        const select = document.createElement('select');
        select.id = 'backgroundSelect';
        select.style.padding = '8px';
        select.style.fontSize = '14px';
        select.style.backgroundColor = '#374151';
        select.style.color = '#ffffff';
        select.style.border = '2px solid #6b7280';
        select.style.borderRadius = '4px';
        select.style.cursor = 'pointer';
        select.style.minWidth = '150px';
        
        // Add "None" option
        const noneOption = document.createElement('option');
        noneOption.value = '';
        noneOption.textContent = 'None';
        select.appendChild(noneOption);
        
        // Add "Color Background" optgroup
        const colorGroup = document.createElement('optgroup');
        colorGroup.label = 'Color Backgrounds';
        this.backgroundColors.forEach(bg => {
            const option = document.createElement('option');
            option.value = `color:${bg.value}`;
            option.textContent = bg.name;
            colorGroup.appendChild(option);
        });
        select.appendChild(colorGroup);
        
        // Will add image backgrounds when loaded
        this.backgroundSelect = select;
        this.updateBackgroundDropdown();
        
        select.addEventListener('change', (e) => {
            this.handleBackgroundChange(e.target.value);
        });
        
        container.appendChild(label);
        container.appendChild(select);
        document.body.appendChild(container);
        
        console.log('Background selector created');
    }
    
    updateBackgroundDropdown() {
        if (!this.backgroundSelect) return;
        
        // Remove existing image group if present
        const existingImageGroup = this.backgroundSelect.querySelector('optgroup[label="Image Backgrounds"]');
        if (existingImageGroup) {
            existingImageGroup.remove();
        }
        
        // Add image backgrounds if available
        if (this.backgroundImages.length > 0) {
            const imageGroup = document.createElement('optgroup');
            imageGroup.label = 'Image Backgrounds';
            this.backgroundImages.forEach(bg => {
                const option = document.createElement('option');
                option.value = `image:${bg.file}`;
                option.textContent = bg.name;
                imageGroup.appendChild(option);
            });
            this.backgroundSelect.appendChild(imageGroup);
        }
    }
    
    handleBackgroundChange(value) {
        if (!value) {
            // None selected - use default gray
            this.editor.setBackground({ type: 'color', value: '#2d3748' });
        } else if (value.startsWith('color:')) {
            // Color background
            const color = value.substring(6);
            this.editor.setBackground({ type: 'color', value: color });
        } else if (value.startsWith('image:')) {
            // Image background
            const filename = value.substring(6);
            this.editor.setBackground({ type: 'image', value: filename });
        }
        console.log('Background changed to:', value);
    }
    
    syncBackgroundSelector() {
        if (!this.backgroundSelect) return;
        
        const mapData = this.editor.getMapData();
        const bg = mapData.background;
        
        if (!bg || bg.type === 'color') {
            const color = bg?.value || '#2d3748';
            this.backgroundSelect.value = `color:${color}`;
        } else if (bg.type === 'image') {
            this.backgroundSelect.value = `image:${bg.value}`;
        }
    }
    
    updateMousePosition(screenX, screenY) {
        // Convert screen coordinates to world coordinates
        this.mouseWorldX = screenX + this.camera.x;
        this.mouseWorldY = screenY + this.camera.y;
    }
    
    toggleUI() {
        this.showUI = !this.showUI;
    }
    
    render() {
        if (!this.showUI) {
            // Just show a small hint when UI is hidden
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, 10, 200, 30);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Press H to show UI', 20, 25);
            this.ctx.restore();
            return;
        }
        
        this.ctx.save();
        
        // Draw tool buttons
        this.toolButtons.forEach(button => {
            const isActive = this.editor.getCurrentTool() === button.tool;
            this.drawButton(button, isActive);
        });
        
        // Draw action buttons
        this.actionButtons.forEach(button => {
            this.drawActionButton(button);
        });
        
        // Draw stats
        this.drawStats();
        
        // Draw map name input area
        this.drawMapName();
        
        // Draw instructions
        this.drawInstructions();
        
        this.ctx.restore();
    }
    
    drawButton(button, isActive) {
        const ctx = this.ctx;
        
        // Button background
        ctx.fillStyle = isActive ? button.color : '#1f2937';
        ctx.fillRect(button.x, button.y, button.width, button.height);
        
        // Button border
        ctx.strokeStyle = isActive ? '#ffffff' : '#4b5563';
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.strokeRect(button.x, button.y, button.width, button.height);
        
        // Button text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
    }
    
    drawActionButton(button) {
        const ctx = this.ctx;
        
        // Button background
        ctx.fillStyle = '#374151';
        ctx.fillRect(button.x, button.y, button.width, button.height);
        
        // Button border
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 2;
        ctx.strokeRect(button.x, button.y, button.width, button.height);
        
        // Button text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
    }
    
    drawStats() {
        const ctx = this.ctx;
        const counts = this.editor.getObjectCount();
        
        // Stats background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.statsX, this.statsY, 200, 100);
        
        // Stats text
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        let y = this.statsY + 10;
        ctx.fillText(`Bushes: ${counts.bushes}`, this.statsX + 10, y);
        y += 20;
        ctx.fillText(`Obstacles: ${counts.obstacles}`, this.statsX + 10, y);
        y += 20;
        ctx.fillText(`Water Areas: ${counts.waterAreas}`, this.statsX + 10, y);
        y += 20;
        ctx.fillText(`Total: ${counts.total}`, this.statsX + 10, y);
    }
    
    drawMapName() {
        const ctx = this.ctx;
        const mapData = this.editor.getMapData();
        
        // Name display
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.statsX, this.statsY + 110, 200, 70);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        let y = this.statsY + 120;
        ctx.fillText(`Map: ${mapData.name}`, this.statsX + 10, y);
        
        // Show current background
        y += 22;
        if (mapData.background?.type === 'image') {
            const imageName = mapData.background.value.substring(0, 15);
            ctx.fillText(`BG: ${imageName}...`, this.statsX + 10, y);
            
            // Show "IMAGE" indicator
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(this.statsX + 150, y - 2, 40, 16);
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('IMAGE', this.statsX + 170, y + 5);
            ctx.textAlign = 'left';
            ctx.font = '14px Arial';
        } else {
            const bgColor = mapData.background?.value || '#2d3748';
            const bgName = this.backgroundColors.find(bg => bg.value === bgColor)?.name || 'Custom';
            ctx.fillText(`BG: ${bgName}`, this.statsX + 10, y);
            
            // Show background color sample
            ctx.fillStyle = bgColor;
            ctx.fillRect(this.statsX + 150, y - 2, 40, 16);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.statsX + 150, y - 2, 40, 16);
        }
    }
    
    drawInstructions() {
        const ctx = this.ctx;
        const startY = this.canvas.height - 120;
        
        // Instructions background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(20, startY, 400, 100);
        
        // Instructions text
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        let y = startY + 10;
        ctx.fillText('Instructions:', 30, y);
        y += 16;
        ctx.fillText('• Select Pan tool to drag camera', 30, y);
        y += 16;
        ctx.fillText('• Select a tool and click to place objects', 30, y);
        y += 16;
        ctx.fillText('• Arrow keys/WASD to pan, +/- or H to toggle UI', 30, y);
        y += 16;
        ctx.fillText('• Use Background dropdown to select image/color', 30, y);
        y += 16;
        ctx.fillText('• Export to save your map as JSON', 30, y);
    }
    
    cycleBackground() {
        this.currentBackgroundIndex = (this.currentBackgroundIndex + 1) % this.backgroundColors.length;
        const newBg = this.backgroundColors[this.currentBackgroundIndex];
        this.editor.setBackground({ type: 'color', value: newBg.value });
        console.log('Background changed to:', newBg.name);
    }
    
    checkButtonClick(screenX, screenY) {
        // Check tool buttons
        for (const button of this.toolButtons) {
            if (this.isPointInRect(screenX, screenY, button)) {
                this.editor.setTool(button.tool);
                return button.tool;
            }
        }
        
        // Check action buttons
        for (const button of this.actionButtons) {
            if (this.isPointInRect(screenX, screenY, button)) {
                return button.action;
            }
        }
        
        return null;
    }
    
    isPointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
    }
    
    renderMap(mapData, camera) {
        const ctx = this.ctx;
        
        ctx.save();
        
        // Translate for camera
        ctx.translate(-camera.x, -camera.y);
        
        // Draw map boundary
        const centerX = 1500;
        const centerY = 1500;
        const radius = mapData.radius;
        
        // Map background with configured color
        const bgColor = mapData.background?.value || '#2d3748';
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Map border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw grid
        this.drawGrid(centerX, centerY, radius);
        
        // Draw water areas
        mapData.waterAreas.forEach(water => {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
            ctx.beginPath();
            ctx.arc(water.x, water.y, water.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        // Draw obstacles
        mapData.obstacles.forEach(obstacle => {
            ctx.fillStyle = '#78716c';
            ctx.fillRect(
                obstacle.x - obstacle.width / 2,
                obstacle.y - obstacle.height / 2,
                obstacle.width,
                obstacle.height
            );
            ctx.strokeStyle = '#57534e';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                obstacle.x - obstacle.width / 2,
                obstacle.y - obstacle.height / 2,
                obstacle.width,
                obstacle.height
            );
        });
        
        // Draw bushes
        mapData.bushes.forEach(bush => {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
            ctx.beginPath();
            ctx.arc(bush.x, bush.y, bush.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        ctx.restore();
    }
    
    drawGrid(centerX, centerY, radius) {
        const ctx = this.ctx;
        const gridSize = 100;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = centerX - radius; x <= centerX + radius; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, centerY - radius);
            ctx.lineTo(x, centerY + radius);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = centerY - radius; y <= centerY + radius; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(centerX - radius, y);
            ctx.lineTo(centerX + radius, y);
            ctx.stroke();
        }
    }
    
    drawCursorPreview(x, y) {
        const ctx = this.ctx;
        const tool = this.editor.getCurrentTool();
        
        if (tool === 'pan') {
            // Draw pan cursor (hand icon or just a circle)
            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw crosshair
            ctx.beginPath();
            ctx.moveTo(x - 10, y);
            ctx.lineTo(x + 10, y);
            ctx.moveTo(x, y - 10);
            ctx.lineTo(x, y + 10);
            ctx.stroke();
        } else if (tool === 'erase') {
            // Draw erase cursor
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 50, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw X
            ctx.beginPath();
            ctx.moveTo(x - 20, y - 20);
            ctx.lineTo(x + 20, y + 20);
            ctx.moveTo(x + 20, y - 20);
            ctx.lineTo(x - 20, y + 20);
            ctx.stroke();
        } else {
            // Draw placement preview
            ctx.globalAlpha = 0.5;
            
            switch (tool) {
                case 'bush':
                    ctx.fillStyle = '#22c55e';
                    ctx.beginPath();
                    ctx.arc(x, y, 50, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'obstacle':
                    ctx.fillStyle = '#78716c';
                    ctx.fillRect(x - 40, y - 40, 80, 80);
                    break;
                    
                case 'water':
                    ctx.fillStyle = '#3b82f6';
                    ctx.beginPath();
                    ctx.arc(x, y, 120, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
            
            ctx.globalAlpha = 1.0;
        }
    }
}