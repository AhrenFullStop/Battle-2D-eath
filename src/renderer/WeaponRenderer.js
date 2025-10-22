// Weapon renderer for drawing weapon effects, projectiles, and damage numbers

export class WeaponRenderer {
    constructor(ctx, assetLoader = null) {
        this.ctx = ctx;
        this.assetLoader = assetLoader;
    }
    
    // Render all combat visuals
    render(combatSystem, weaponPickups = []) {
        // Render weapon pickups
        weaponPickups.forEach(pickup => this.renderWeaponPickup(pickup));
        
        // Render weapon effects
        const effects = combatSystem.getWeaponEffects();
        effects.forEach(effect => this.renderWeaponEffect(effect));
        
        // Render projectiles
        const projectiles = combatSystem.getProjectiles();
        projectiles.forEach(projectile => this.renderProjectile(projectile));
        
        // Render damage numbers
        const damageNumbers = combatSystem.getDamageNumbers();
        damageNumbers.forEach(number => this.renderDamageNumber(number));
    }
    
    // Render weapon effect
    renderWeaponEffect(effect) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.globalAlpha = effect.alpha;
        
        if (effect.attackType === 'cone') {
            this.renderConeEffect(effect);
        } else if (effect.attackType === 'aoe') {
            this.renderAoeEffect(effect);
        }
        
        ctx.restore();
    }
    
    // Render cone effect (Blaster)
    renderConeEffect(effect) {
        const ctx = this.ctx;
        const coneAngleRad = effect.coneAngle * Math.PI / 180;
        const startAngle = effect.angle - coneAngleRad / 2;
        const endAngle = effect.angle + coneAngleRad / 2;
        
        // Draw filled cone
        ctx.fillStyle = effect.color;
        ctx.globalAlpha = effect.alpha * 0.4;
        ctx.beginPath();
        ctx.moveTo(effect.position.x, effect.position.y);
        ctx.arc(
            effect.position.x,
            effect.position.y,
            effect.range,
            startAngle,
            endAngle
        );
        ctx.closePath();
        ctx.fill();
        
        // Draw cone outline
        ctx.strokeStyle = effect.glowColor;
        ctx.lineWidth = 3;
        ctx.globalAlpha = effect.alpha * 0.8;
        ctx.stroke();
        
        // Draw center flash
        ctx.fillStyle = effect.glowColor;
        ctx.globalAlpha = effect.alpha;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, 10, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Render AoE effect (Bomb explosion)
    renderAoeEffect(effect) {
        const ctx = this.ctx;
        
        // Draw expanding circle
        const radius = effect.explosionRadius * (1 - effect.alpha);
        
        ctx.fillStyle = effect.color;
        ctx.globalAlpha = effect.alpha * 0.5;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw outline
        ctx.strokeStyle = effect.glowColor;
        ctx.lineWidth = 3;
        ctx.globalAlpha = effect.alpha;
        ctx.stroke();
    }
    
    // Render projectile
    renderProjectile(projectile) {
        const ctx = this.ctx;
        
        ctx.save();
        
        // Draw projectile trail
        const trailLength = 20;
        const trailX = projectile.position.x - projectile.velocity.x * 0.02;
        const trailY = projectile.position.y - projectile.velocity.y * 0.02;
        
        const gradient = ctx.createLinearGradient(
            trailX,
            trailY,
            projectile.position.x,
            projectile.position.y
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, projectile.color);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = projectile.radius * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(projectile.position.x, projectile.position.y);
        ctx.stroke();
        
        // Draw projectile body
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(
            projectile.position.x,
            projectile.position.y,
            projectile.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw glow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Render damage number
    renderDamageNumber(damageNumber) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.globalAlpha = damageNumber.alpha;
        
        // Draw text shadow for better visibility
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${damageNumber.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            damageNumber.damage.toString(),
            damageNumber.position.x + 2,
            damageNumber.position.y + 2
        );
        
        // Draw damage number
        ctx.fillStyle = damageNumber.color;
        ctx.fillText(
            damageNumber.damage.toString(),
            damageNumber.position.x,
            damageNumber.position.y
        );
        
        // Draw outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(
            damageNumber.damage.toString(),
            damageNumber.position.x,
            damageNumber.position.y
        );
        
        ctx.restore();
    }

    // Render weapon pickup
    renderWeaponPickup(pickup) {
        const ctx = this.ctx;
        const x = pickup.position.x;
        const y = pickup.position.y + pickup.bobOffset;
        
        ctx.save();
        
        // Draw tier glow (outer ring) - always visible
        ctx.globalAlpha = pickup.glowIntensity * 0.3;
        ctx.fillStyle = pickup.tierColor;
        ctx.beginPath();
        ctx.arc(x, y, pickup.radius + 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw weapon glow
        ctx.globalAlpha = pickup.glowIntensity * 0.5;
        ctx.fillStyle = pickup.glowColor;
        ctx.beginPath();
        ctx.arc(x, y, pickup.radius + 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Try to render as PNG, otherwise use circle
        ctx.globalAlpha = 1.0;
        const rendered = this.renderWeaponPickupImage(pickup, x, y);
        
        if (!rendered) {
            // Fallback to circle rendering
            this.renderWeaponPickupCircle(pickup, x, y);
        }
        
        // Draw pickup progress if being picked up
        if (pickup.isBeingPickedUp) {
            const progress = pickup.getPickupProgress();
            const progressRadius = pickup.radius + 12;
            
            // Draw progress arc
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(
                x,
                y,
                progressRadius,
                -Math.PI / 2,
                -Math.PI / 2 + (Math.PI * 2 * progress)
            );
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // Render weapon pickup as PNG image
    renderWeaponPickupImage(pickup, x, y) {
        if (!this.assetLoader) {
            return false;
        }

        const img = this.assetLoader.getWeaponImage(pickup.weaponConfig.type);
        if (!img) {
            return false;
        }

        const ctx = this.ctx;
        const size = pickup.radius * 2;
        
        // Draw weapon image
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        
        // Draw tier indicator (small number) below image
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = pickup.tierColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(pickup.weaponConfig.tier.toString(), x, y + size / 2 + 2);
        ctx.fillText(pickup.weaponConfig.tier.toString(), x, y + size / 2 + 2);
        
        return true;
    }

    // Render weapon pickup as circle (fallback)
    renderWeaponPickupCircle(pickup, x, y) {
        const ctx = this.ctx;
        
        // Draw weapon base
        ctx.fillStyle = pickup.color;
        ctx.beginPath();
        ctx.arc(x, y, pickup.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw tier border
        ctx.strokeStyle = pickup.tierColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw weapon icon (first letter of weapon name)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pickup.weaponConfig.name.charAt(0), x, y);
        
        // Draw tier indicator (small number)
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = pickup.tierColor;
        ctx.fillText(pickup.weaponConfig.tier.toString(), x, y + 12);
    }
}