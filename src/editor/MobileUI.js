// Mobile UI Helper - Creates mobile-specific UI elements

export class MobileUI {
    constructor(editor, editorUI) {
        this.editor = editor;
        this.editorUI = editorUI;
        
        this.createMobileSettingsButton();
        this.createMobileBackgroundButton();
    }
    
    /**
     * Create mobile settings button and modal
     */
    createMobileSettingsButton() {
        // Settings gear button
        const btn = document.createElement('button');
        btn.id = 'mobileSettingsButton';
        btn.innerHTML = '⚙️';
        btn.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 10px;
            width: 50px;
            height: 50px;
            background: #374151;
            border: 2px solid #6b7280;
            border-radius: 8px;
            color: white;
            font-size: 24px;
            z-index: 1001;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'settingsOverlay';
        overlay.className = 'modal-overlay';
        
        btn.addEventListener('click', () => {
            const panel = document.getElementById('gameSettingsPanel');
            if (panel) {
                overlay.classList.add('active');
                panel.classList.add('active');
            }
        });
        
        overlay.addEventListener('click', () => {
            const panel = document.getElementById('gameSettingsPanel');
            if (panel) {
                overlay.classList.remove('active');
                panel.classList.remove('active');
            }
        });
        
        document.body.appendChild(btn);
        document.body.appendChild(overlay);
        
        // Add close button to existing settings panel
        setTimeout(() => {
            const panel = document.getElementById('gameSettingsPanel');
            if (panel && !document.getElementById('closeSettingsButton')) {
                const closeBtn = document.createElement('button');
                closeBtn.id = 'closeSettingsButton';
                closeBtn.innerHTML = '×';
                panel.insertBefore(closeBtn, panel.firstChild);
                
                closeBtn.addEventListener('click', () => {
                    overlay.classList.remove('active');
                    panel.classList.remove('active');
                });
            }
        }, 100);
    }
    
    /**
     * Create mobile background selector button and panel
     */
    createMobileBackgroundButton() {
        const btn = document.createElement('button');
        btn.id = 'mobileBackgroundButton';
        btn.innerHTML = '🎨';
        btn.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 70px;
            width: 50px;
            height: 50px;
            background: #374151;
            border: 2px solid #6b7280;
            border-radius: 8px;
            color: white;
            font-size: 24px;
            z-index: 1001;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Background selector panel
        const bgPanel = document.createElement('div');
        bgPanel.id = 'mobileBackgroundPanel';
        bgPanel.style.cssText = `
            position: fixed;
            bottom: 160px;
            left: 10px;
            width: 280px;
            max-height: 400px;
            overflow-y: auto;
            background: rgba(31, 41, 55, 0.98);
            border: 2px solid #6b7280;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            display: none;
            font-family: Arial, sans-serif;
        `;
        
        bgPanel.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #60a5fa; font-size: 16px;">Map Background</h3>
            <div style="margin-bottom: 15px;">
                <label style="color: #ffffff; font-size: 14px; display: block; margin-bottom: 5px;">Type:</label>
                <select id="mobileBgType" style="width: 100%; padding: 8px; font-size: 14px; background: #374151; color: #fff; border: 1px solid #6b7280; border-radius: 4px;">
                    <option value="color">Color</option>
                    <option value="image">Image</option>
                </select>
            </div>
            <div id="mobileBgColorSection">
                <label style="color: #ffffff; font-size: 14px; display: block; margin-bottom: 5px;">Color:</label>
                <div id="mobileColorGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;"></div>
            </div>
            <div id="mobileBgImageSection" style="display: none;">
                <label style="color: #ffffff; font-size: 14px; display: block; margin-bottom: 5px;">Image:</label>
                <div id="mobileImageGrid" style="display: grid; grid-template-columns: 1fr; gap: 8px;"></div>
            </div>
            <button id="closeBgPanel" style="width: 100%; margin-top: 10px; padding: 8px; background: #ef4444; color: white; border: none; border-radius: 4px; font-size: 14px; cursor: pointer;">Close</button>
        `;
        
        document.body.appendChild(bgPanel);
        document.body.appendChild(btn);
        
        // Populate color grid
        const colorGrid = bgPanel.querySelector('#mobileColorGrid');
        this.editorUI.backgroundColors.forEach(bg => {
            const colorBtn = document.createElement('button');
            colorBtn.style.cssText = `
                width: 100%;
                height: 50px;
                background: ${bg.value};
                border: 2px solid #6b7280;
                border-radius: 4px;
                cursor: pointer;
                font-size: 10px;
                color: ${bg.value === '#e8e8e8' ? '#000' : '#fff'};
                text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            `;
            colorBtn.textContent = bg.name;
            colorBtn.addEventListener('click', () => {
                this.editor.setBackground({ type: 'color', value: bg.value });
                bgPanel.style.display = 'none';
            });
            colorGrid.appendChild(colorBtn);
        });
        
        // Populate image grid
        const imageGrid = bgPanel.querySelector('#mobileImageGrid');
        const updateImageGrid = () => {
            imageGrid.innerHTML = '';
            
            const images = this.editorUI.backgroundImages;
            
            if (!images || images.length === 0) {
                // Show loading message
                const loadingMsg = document.createElement('div');
                loadingMsg.style.cssText = `
                    color: #9ca3af;
                    font-size: 12px;
                    padding: 10px;
                    text-align: center;
                `;
                loadingMsg.textContent = 'Loading images...';
                imageGrid.appendChild(loadingMsg);
                return;
            }
            
            images.forEach(bg => {
                const imgBtn = document.createElement('button');
                imgBtn.style.cssText = `
                    width: 100%;
                    padding: 12px;
                    background: #374151;
                    border: 2px solid #6b7280;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    color: #fff;
                    text-align: left;
                `;
                imgBtn.textContent = bg.name;
                imgBtn.addEventListener('click', () => {
                    this.editor.setBackground({ type: 'image', value: bg.file });
                    bgPanel.style.display = 'none';
                });
                imageGrid.appendChild(imgBtn);
            });
        };
        
        // Initial update
        updateImageGrid();
        // Update images periodically to catch async loading
        setInterval(updateImageGrid, 1000);
        
        // Type selector
        const typeSelect = bgPanel.querySelector('#mobileBgType');
        const colorSection = bgPanel.querySelector('#mobileBgColorSection');
        const imageSection = bgPanel.querySelector('#mobileBgImageSection');
        
        typeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'color') {
                colorSection.style.display = 'block';
                imageSection.style.display = 'none';
            } else {
                colorSection.style.display = 'none';
                imageSection.style.display = 'block';
                // Force immediate update when switching to images
                setTimeout(updateImageGrid, 100);
            }
        });
        
        // Toggle panel
        btn.addEventListener('click', () => {
            bgPanel.style.display = bgPanel.style.display === 'none' ? 'block' : 'none';
        });
        
        // Close button
        bgPanel.querySelector('#closeBgPanel').addEventListener('click', () => {
            bgPanel.style.display = 'none';
        });
    }
}
