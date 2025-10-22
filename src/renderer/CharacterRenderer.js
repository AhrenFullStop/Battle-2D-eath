// Character renderer for drawing characters on canvas

export class CharacterRenderer {
    constructor(ctx, assetLoader = null) {
        this.ctx = ctx;
        this.assetLoader = assetLoader;
    }

    // Render all characters
    render(characters) {
        characters.forEach(character => {
            if (character.isAlive()) {
                this.drawCharacter(character);
            }
        });
    }

    // Draw a single character
    drawCharacter(character) {
        const ctx = this.ctx;
        const pos = character.position;
        
        ctx.save();
        
        // Try to render as PNG image first
        const rendered = this.drawCharacterImage(character);
        
        // Fallback to circle if PNG not available
        if (!rendered) {
            this.drawCharacterCircle(character);
        }
        
        // Draw health bar above character
        this.drawHealthBar(character);
        
        // Draw AI state label for debugging (if AI character)
        if (!character.isPlayer && character.aiState !== undefined) {
            this.drawAIStateLabel(character);
        }
        
        ctx.restore();
    }

    // Draw character as PNG image with rotation
    drawCharacterImage(character) {
        if (!this.assetLoader) {
            return false;
        }

        const img = this.assetLoader.getCharacterImage(character.characterType);
        if (!img) {
            return false;
        }

        const ctx = this.ctx;
        const pos = character.position;
        const size = character.radius * 2; // Image size matches hitbox diameter
        
        ctx.save();
        
        // Move to character position and rotate
        ctx.translate(pos.x, pos.y);
        ctx.rotate(character.facingAngle);
        
        // Draw image centered at origin
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        
        ctx.restore();
        
        return true;
    }

    // Draw character as circle (fallback)
    drawCharacterCircle(character) {
        const ctx = this.ctx;
        const pos = character.position;
        
        // Draw character as a circle
        ctx.fillStyle = character.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, character.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw character outline
        ctx.strokeStyle = character.isPlayer ? '#ffffff' : '#000000';
        ctx.lineWidth = character.isPlayer ? 3 : 2;
        ctx.stroke();
        
        // Draw facing direction indicator
        if (character.velocity.magnitude() > 0.1) {
            const angle = character.facingAngle;
            const lineLength = character.radius + 10;
            const endX = pos.x + Math.cos(angle) * lineLength;
            const endY = pos.y + Math.sin(angle) * lineLength;
            
            ctx.strokeStyle = character.isPlayer ? '#ffffff' : '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }
    
    // Draw AI state label for debugging
    drawAIStateLabel(character) {
        const ctx = this.ctx;
        const pos = character.position;
        
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        const label = character.aiState.toUpperCase();
        const labelY = pos.y - character.radius - 20;
        
        // Draw text with outline
        ctx.strokeText(label, pos.x, labelY);
        ctx.fillText(label, pos.x, labelY);
    }

    // Draw health bar above character
    drawHealthBar(character) {
        const ctx = this.ctx;
        const pos = character.position;
        const barWidth = character.radius * 2;
        const barHeight = 4;
        const barY = pos.y - character.radius - 10;
        
        // Background (red)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(pos.x - barWidth / 2, barY, barWidth, barHeight);
        
        // Health (green)
        const healthWidth = barWidth * character.getHealthPercentage();
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(pos.x - barWidth / 2, barY, healthWidth, barHeight);
        
        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(pos.x - barWidth / 2, barY, barWidth, barHeight);
    }
}