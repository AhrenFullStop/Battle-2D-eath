// Export Modal - Comprehensive export workflow with validation and GitHub Pages integration

export class ExportModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.onClose = null;
    }
    
    /**
     * Show the export modal with validation results and export options
     * @param {Object} mapData - The map data to export
     * @param {Object} validationResult - Validation result with errors and warnings
     */
    show(mapData, validationResult) {
        if (this.isOpen) {
            this.close();
        }
        
        this.isOpen = true;
        this.createModal(mapData, validationResult);
        this.setupEventListeners();
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        
        // Focus trap - focus first interactive element
        setTimeout(() => {
            const firstButton = this.modal.querySelector('button');
            if (firstButton) firstButton.focus();
        }, 100);
    }
    
    /**
     * Close the modal and cleanup
     */
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        
        // Animate out
        if (this.modal) {
            this.modal.style.opacity = '0';
            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.parentNode.removeChild(this.modal);
                }
                this.modal = null;
            }, 200);
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Call onClose callback if provided
        if (this.onClose) {
            this.onClose();
            this.onClose = null;
        }
    }
    
    /**
     * Create the modal DOM structure
     */
    createModal(mapData, validationResult) {
        const overlay = document.createElement('div');
        overlay.className = 'export-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'export-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'export-modal-title');
        
        // Build modal content
        let content = `
            <div class="export-modal-header">
                <h2 id="export-modal-title">Export Map</h2>
                <button class="export-modal-close" aria-label="Close modal" title="Close (Esc)">×</button>
            </div>
            <div class="export-modal-body">
        `;
        
        // Show validation results
        if (validationResult.errors.length > 0) {
            content += this.renderValidationErrors(validationResult.errors);
        } else if (validationResult.warnings.length > 0) {
            content += this.renderValidationWarnings(validationResult.warnings);
        } else {
            content += this.renderValidationSuccess();
        }
        
        // If no errors, show export options and instructions
        if (validationResult.errors.length === 0) {
            content += this.renderJSONPreview(mapData);
            content += this.renderIntegrationInstructions(mapData);
            content += this.renderFooter(mapData);
        } else {
            // Only close button if there are errors
            content += `
                <div class="export-modal-footer">
                    <button class="export-btn export-btn-secondary" data-action="close">Close</button>
                </div>
            `;
        }
        
        content += `</div>`;
        
        modal.innerHTML = content;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        this.modal = overlay;
        
        // Animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
    }
    
    /**
     * Render validation errors section
     */
    renderValidationErrors(errors) {
        return `
            <div class="export-validation-section export-validation-error">
                <div class="export-validation-icon">❌</div>
                <h3>Cannot Export - Fix These Errors:</h3>
                <ul class="export-validation-list">
                    ${errors.map(error => `<li>${this.escapeHtml(error)}</li>`).join('')}
                </ul>
                <p class="export-validation-hint">Fix these errors and try exporting again.</p>
            </div>
        `;
    }
    
    /**
     * Render validation warnings section
     */
    renderValidationWarnings(warnings) {
        return `
            <div class="export-validation-section export-validation-warning">
                <div class="export-validation-icon">⚠️</div>
                <h3>Warnings (you can still export):</h3>
                <ul class="export-validation-list">
                    ${warnings.map(warning => `<li>${this.escapeHtml(warning)}</li>`).join('')}
                </ul>
                <p class="export-validation-hint">These warnings won't prevent export, but you may want to review them.</p>
            </div>
        `;
    }
    
    /**
     * Render validation success section
     */
    renderValidationSuccess() {
        return `
            <div class="export-validation-section export-validation-success">
                <div class="export-validation-icon">✅</div>
                <h3>Map Validated Successfully!</h3>
                <p class="export-validation-hint">Your map is ready to export and use in the game.</p>
            </div>
        `;
    }
    
    /**
     * Render JSON preview section
     */
    renderJSONPreview(mapData) {
        const json = JSON.stringify(mapData, null, 2);
        const highlighted = this.highlightJSON(json);
        
        return `
            <div class="export-section">
                <h3>JSON Preview</h3>
                <div class="export-json-preview">
                    <pre><code>${highlighted}</code></pre>
                </div>
            </div>
        `;
    }
    
    /**
     * Render integration instructions section
     */
    renderIntegrationInstructions(mapData) {
        const filename = this.sanitizeFilename(mapData.name);
        const manifestEntry = this.generateManifestEntryCode(mapData);
        const hasImageBackground = mapData.background?.type === 'image';
        
        return `
            <div class="export-section export-instructions">
                <h3>How to Add Your Map to the Game</h3>
                
                <div class="export-instruction-step">
                    <h4>Step 1: Save the JSON file</h4>
                    <ol>
                        <li>Click "Download JSON" below or copy to clipboard</li>
                        <li>Save as: <code>${filename}.json</code></li>
                        <li>Place in your project's <code>maps/</code> directory</li>
                    </ol>
                </div>
                
                <div class="export-instruction-step">
                    <h4>Step 2: Register in Manifest</h4>
                    <ol>
                        <li>Open <code>maps/manifest.json</code></li>
                        <li>Add this entry to the "maps" array:</li>
                    </ol>
                    <div class="export-code-block">
                        <pre><code>${this.escapeHtml(manifestEntry)}</code></pre>
                        <button class="export-copy-code-btn" data-copy-text="${this.escapeHtml(manifestEntry)}" title="Copy manifest entry">
                            📋 Copy
                        </button>
                    </div>
                </div>
                
                ${hasImageBackground ? `
                <div class="export-instruction-step">
                    <h4>Step 3: Background Images</h4>
                    <ul>
                        <li>Place your background image in: <code>maps/backgrounds/</code></li>
                        <li>Filename should match: <code>${this.escapeHtml(mapData.background.value)}</code></li>
                        <li>Supported formats: PNG, JPG, WEBP</li>
                    </ul>
                </div>
                
                <div class="export-instruction-step">
                    <h4>Step 4: Test Your Map</h4>
                ` : `
                <div class="export-instruction-step">
                    <h4>Step 3: Test Your Map</h4>
                `}
                    <ol>
                        <li>Commit and push changes to GitHub</li>
                        <li>Wait for GitHub Pages to deploy (1-2 minutes)</li>
                        <li>Open the game and select your map from the menu</li>
                        <li>Play and enjoy!</li>
                    </ol>
                </div>
                
                <div class="export-instruction-step export-troubleshooting">
                    <h4>Troubleshooting</h4>
                    <ul>
                        <li><strong>Map doesn't appear:</strong> Check manifest.json syntax (use a JSON validator)</li>
                        <li><strong>Background doesn't load:</strong> Verify image path and filename match exactly</li>
                        <li><strong>Objects are misplaced:</strong> Check that all coordinates are within map radius</li>
                    </ul>
                    <p class="export-help-link">Need help? Check the documentation at <code>docs/MAP_EDITOR.md</code></p>
                </div>
            </div>
        `;
    }
    
    /**
     * Render footer with action buttons
     */
    renderFooter(mapData) {
        const filename = this.sanitizeFilename(mapData.name);
        const json = JSON.stringify(mapData, null, 2);
        
        return `
            <div class="export-modal-footer">
                <div class="export-filename-input">
                    <label for="export-filename">Filename:</label>
                    <input type="text" id="export-filename" value="${filename}.json" />
                </div>
                <div class="export-action-buttons">
                    <button class="export-btn export-btn-secondary" data-action="close">Close</button>
                    <button class="export-btn export-btn-primary" data-action="copy" data-json="${this.escapeHtml(json)}">
                        📋 Copy to Clipboard
                    </button>
                    <button class="export-btn export-btn-primary" data-action="download" data-json="${this.escapeHtml(json)}">
                        ⬇️ Download JSON
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners for modal interactions
     */
    setupEventListeners() {
        if (!this.modal) return;
        
        // Close button
        const closeBtn = this.modal.querySelector('.export-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('export-modal-overlay')) {
                this.close();
            }
        });
        
        // Escape key to close
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Action buttons
        const actionButtons = this.modal.querySelectorAll('[data-action]');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.getAttribute('data-action');
                
                switch (action) {
                    case 'close':
                        this.close();
                        break;
                    case 'copy':
                        const copyJson = btn.getAttribute('data-json');
                        this.copyToClipboard(copyJson, btn);
                        break;
                    case 'download':
                        const downloadJson = btn.getAttribute('data-json');
                        const filenameInput = this.modal.querySelector('#export-filename');
                        const filename = filenameInput ? filenameInput.value : 'map.json';
                        this.downloadJSON(downloadJson, filename);
                        break;
                }
            });
        });
        
        // Copy code buttons
        const copyCodeButtons = this.modal.querySelectorAll('.export-copy-code-btn');
        copyCodeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-copy-text');
                this.copyToClipboard(text, btn);
            });
        });
        
        // Focus trap
        this.setupFocusTrap();
    }
    
    /**
     * Setup focus trap for accessibility
     */
    setupFocusTrap() {
        const modalContent = this.modal.querySelector('.export-modal');
        if (!modalContent) return;
        
        const focusableElements = modalContent.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        modalContent.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }
    
    /**
     * Sanitize map name to valid filename
     */
    sanitizeFilename(name) {
        return name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    
    /**
     * Generate manifest entry object
     */
    generateManifestEntry(mapData) {
        const filename = this.sanitizeFilename(mapData.name);
        
        // Count objects for manifest metadata
        const bushCount = mapData.bushes?.length || 0;
        const obstacleCount = mapData.obstacles?.length || 0;
        const waterCount = mapData.waterAreas?.length || 0;
        
        return {
            file: `${filename}.json`,
            name: mapData.name,
            radius: mapData.radius,
            background: mapData.background,
            bushCount,
            obstacleCount,
            waterCount
        };
    }
    
    /**
     * Generate manifest entry as formatted JSON code
     */
    generateManifestEntryCode(mapData) {
        const entry = this.generateManifestEntry(mapData);
        return JSON.stringify(entry, null, 2);
    }
    
    /**
     * Copy text to clipboard with visual feedback
     */
    async copyToClipboard(text, button) {
        try {
            // Try modern clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            
            // Show success feedback
            if (button) {
                const originalText = button.textContent;
                button.textContent = '✓ Copied!';
                button.classList.add('export-btn-success');
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('export-btn-success');
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            alert('Failed to copy to clipboard. Please copy manually.');
        }
    }
    
    /**
     * Download JSON as file
     */
    downloadJSON(json, filename) {
        try {
            // Ensure filename has .json extension
            if (!filename.endsWith('.json')) {
                filename += '.json';
            }
            
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Map exported successfully as', filename);
        } catch (error) {
            console.error('Failed to download JSON:', error);
            alert('Failed to download file. Please try copying to clipboard instead.');
        }
    }
    
    /**
     * Simple JSON syntax highlighting
     */
    highlightJSON(json) {
        return json
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
            .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
            .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
            .replace(/: (true|false|null)/g, ': <span class="json-boolean">$1</span>');
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
