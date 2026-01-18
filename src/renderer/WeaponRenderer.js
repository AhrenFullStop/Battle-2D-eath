// Weapon renderer for drawing weapon effects, projectiles, and damage numbers
import { PROJECTILE_STATES } from '../entities/Weapon.js';

export class WeaponRenderer {
    constructor(ctx, assetLoader = null) {
        this.ctx = ctx;
        this.assetLoader = assetLoader;
    }
    
    // Render all combat visuals
    render(combatSystem, weaponPickups = [], player = null) {
        // Render weapon pickups
        weaponPickups.forEach(pickup => this.renderWeaponPickup(pickup, player));
        
        // Render weapon effects
        if (combatSystem) {
            const effects = combatSystem.getWeaponEffects();
            effects.forEach(effect => this.renderWeaponEffect(effect));
        
            // Render projectiles
            const projectiles = combatSystem.getProjectiles();
            projectiles.forEach(projectile => this.renderProjectile(projectile));
        
            // Render damage numbers
            const damageNumbers = combatSystem.getDamageNumbers();
            damageNumbers.forEach(number => this.renderDamageNumber(number));
        }
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
        const progress = 1 - effect.alpha;
        const radius = effect.explosionRadius * progress;
        
        // Draw primary blast
        ctx.fillStyle = effect.color;
        ctx.globalAlpha = effect.alpha * 0.6;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw inner flash
        if (progress < 0.5) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = (1 - progress * 2) * 0.8;
            ctx.beginPath();
            ctx.arc(effect.position.x, effect.position.y, radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw outline
        ctx.strokeStyle = effect.glowColor;
        ctx.lineWidth = 5 * effect.alpha;
        ctx.globalAlpha = effect.alpha;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Render projectile
    renderProjectile(projectile) {
        const ctx = this.ctx;
        
        ctx.save();
        
        if (projectile.state === PROJECTILE_STATES.FLYING) {
            this.renderFlyingProjectile(projectile);
        } else if (projectile.state === PROJECTILE_STATES.LANDED) {
            this.renderLandedProjectile(projectile);
        }

        ctx.restore();
    }

    // Render projectile while in flight
    renderFlyingProjectile(projectile) {
        const ctx = this.ctx;
        const x = projectile.position.x;
        const y = projectile.position.y;
        const h = projectile.height || 0;

        // Draw shadow at ground position
        if (h > 5) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(x, y, projectile.radius * 1.5, projectile.radius * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw projectile trail
        const trailLength = 20;
        const trailX = x - projectile.velocity.x * 0.02;
        const trailY = y - h - projectile.velocity.y * 0.02;
        
        const gradient = ctx.createLinearGradient(
            trailX,
            trailY,
            x,
            y - h
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, projectile.color);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = projectile.radius * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(x, y - h);
        ctx.stroke();
        
        // Draw projectile body
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(
            x,
            y - h,
            projectile.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw glow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Render projectile while landed (waiting for fuse)
    renderLandedProjectile(projectile) {
        const ctx = this.ctx;
        const x = projectile.position.x;
        const y = projectile.position.y;

        // Draw warning indicator (expanding ring)
        const fuseProgress = projectile.fuseElapsed / projectile.fuseTime;
        const warningRadius = projectile.explosionRadius * fuseProgress;

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.2;
        ctx.beginPath();
        ctx.arc(x, y, projectile.explosionRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(x, y, warningRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw bomb on ground
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(x, y, projectile.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Flicker effect for imminent explosion
        if (fuseProgress > 0.7) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = Math.sin(Date.now() * 0.05) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.arc(x, y, projectile.radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
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
    renderWeaponPickup(pickup, player = null) {
        const ctx = this.ctx;
        const x = pickup.position.x;
        const y = pickup.position.y + pickup.bobOffset;

        const isPlayerInRange = !!(player && pickup.isInRange(player));
        const blockedReason = isPlayerInRange ? pickup.playerPickupBlockedReason : null;
        const isBlocked = !!blockedReason;
        
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
        ctx.globalAlpha = isBlocked ? 0.35 : 1.0;
        const rendered = this.renderWeaponPickupImage(pickup, x, y);
        
        if (!rendered) {
            // Fallback to circle rendering
            this.renderWeaponPickupCircle(pickup, x, y);
        }

        // Draw a clear blocked indicator when in range and not pickupable
        if (isBlocked) {
            const badgeRadius = 10;
            const badgeX = x + pickup.radius - 4;
            const badgeY = y - pickup.radius + 4;

            // Badge background
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
            ctx.fill();

            // X mark
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(badgeX - 4, badgeY - 4);
            ctx.lineTo(badgeX + 4, badgeY + 4);
            ctx.moveTo(badgeX + 4, badgeY - 4);
            ctx.lineTo(badgeX - 4, badgeY + 4);
            ctx.stroke();

            // Reason label (short)
            const reasonLabel = blockedReason === 'duplicate_same_tier'
                ? 'DUP'
                : blockedReason === 'lower_than_equipped'
                    ? 'LOW'
                    : 'FULL';

            ctx.globalAlpha = 0.85;
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(reasonLabel, x, y + pickup.radius + 6);
            ctx.fillText(reasonLabel, x, y + pickup.radius + 6);
        }
        
        // Draw pickup progress if being picked up
        if (pickup.isBeingPickedUp && !isBlocked) {
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