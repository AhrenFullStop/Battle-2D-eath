import { META_CONFIG } from '../config/metaProgression.js';
import { safeJsonParse } from '../utils/jsonHelpers.js';

let cachedProfile = null;

function createDefaultProfile() {
    return {
        profileVersion: META_CONFIG.storage.profileVersion,
        xp: 0,
        coins: 0,
        purchases: {
            upgrades: {},
            items: {}
        },
        stats: {
            matchesPlayed: 0,
            wins: 0,
            kills: 0,
            damageDealt: 0,
            damageTaken: 0,
            healsConsumed: 0,
            shieldsUsed: 0,
            abilityUsedCount: 0,
            friendlyRevives: 0,
            weaponFiredCount: 0,
            bestPlacement: null
        },
        history: []
    };
}

export function migrateProfile(raw) {
    // For now we only have v1; keep this structure so future changes are painless.
    if (!raw || typeof raw !== 'object') return createDefaultProfile();

    const version = Number(raw.profileVersion || 0);
    if (version === META_CONFIG.storage.profileVersion) {
        // Ensure any missing sub-objects are repaired.
        const repaired = createDefaultProfile();
        return {
            ...repaired,
            ...raw,
            purchases: {
                ...repaired.purchases,
                ...(raw.purchases || {}),
                upgrades: { ...(raw.purchases?.upgrades || {}) },
                items: { ...(raw.purchases?.items || {}) }
            },
            stats: {
                ...repaired.stats,
                ...(raw.stats || {})
            },
            history: Array.isArray(raw.history) ? raw.history : []
        };
    }

    // Unknown/older versions: best-effort migrate by overlaying onto defaults.
    const base = createDefaultProfile();
    return {
        ...base,
        ...raw,
        profileVersion: META_CONFIG.storage.profileVersion,
        purchases: {
            ...base.purchases,
            ...(raw.purchases || {}),
            upgrades: { ...(raw.purchases?.upgrades || {}) },
            items: { ...(raw.purchases?.items || {}) }
        },
        stats: {
            ...base.stats,
            ...(raw.stats || {})
        },
        history: Array.isArray(raw.history) ? raw.history : []
    };
}

export function loadProfile() {
    if (cachedProfile) return cachedProfile;

    const key = META_CONFIG.storage.profileKey;
    const raw = safeJsonParse(localStorage.getItem(key));
    cachedProfile = migrateProfile(raw);
    return cachedProfile;
}

export function saveProfile(profile) {
    const key = META_CONFIG.storage.profileKey;
    cachedProfile = profile;
    try {
        localStorage.setItem(key, JSON.stringify(profile));
    } catch (e) {
        // Ignore quota failures; progression is a nice-to-have.
        console.warn('Failed to save profile:', e);
    }
}

export function getLevelForXp(totalXp) {
    const xp = Math.max(0, Number(totalXp) || 0);
    const { curve, k } = META_CONFIG.levels;

    if (curve === 'sqrt') {
        // Level 1 at 0 XP.
        return Math.max(1, Math.floor(Math.sqrt(xp / Math.max(1, k))) + 1);
    }

    // Fallback linear.
    return Math.max(1, Math.floor(xp / 100) + 1);
}

export function getXpForLevel(level) {
    const l = Math.max(1, Number(level) || 1);
    const { curve, k } = META_CONFIG.levels;
    if (curve === 'sqrt') {
        // Inverse of getLevelForXp: xp >= k*(level-1)^2
        return Math.floor(Math.max(0, k) * Math.pow(l - 1, 2));
    }
    return (l - 1) * 100;
}

export function getXpProgress(totalXp) {
    const level = getLevelForXp(totalXp);
    const currentLevelXp = getXpForLevel(level);
    const nextLevelXp = getXpForLevel(level + 1);
    const clampedXp = Math.max(0, Number(totalXp) || 0);

    const span = Math.max(1, nextLevelXp - currentLevelXp);
    const into = Math.max(0, Math.min(span, clampedXp - currentLevelXp));

    return {
        level,
        currentLevelXp,
        nextLevelXp,
        progress01: into / span
    };
}

export function computeMatchRewards(matchStats) {
    const stats = matchStats || {};

    const kills = Number(stats.kills) || 0;
    const damageDealt = Number(stats.damageDealt) || 0;
    const friendlyRevives = Number(stats.friendlyRevives) || 0;
    const placement = Number(stats.finalPlacement) || 0;

    const xpCfg = META_CONFIG.rewards.xp;
    const coinsCfg = META_CONFIG.rewards.coins.byPlacement;

    const xpEarned =
        kills * xpCfg.perKill +
        Math.floor(damageDealt * xpCfg.perDamageDealt) +
        friendlyRevives * xpCfg.perFriendlyRevive;

    const coinsEarned =
        coinsCfg[placement] ?? coinsCfg.default;

    return {
        xpEarned: Math.max(0, Math.floor(xpEarned)),
        coinsEarned: Math.max(0, Math.floor(coinsEarned)),
        breakdown: {
            kills,
            damageDealt: Math.round(damageDealt),
            friendlyRevives,
            placement
        }
    };
}

export function recordMatchToProfile(profile, matchStats, context = {}) {
    const p = profile;
    const stats = matchStats || {};

    const placement = Number(stats.finalPlacement) || 0;
    const kills = Number(stats.kills) || 0;

    p.stats.matchesPlayed += 1;
    if (placement === 1) p.stats.wins += 1;
    p.stats.kills += kills;

    p.stats.damageDealt += Number(stats.damageDealt) || 0;
    p.stats.damageTaken += Number(stats.damageTaken) || 0;
    p.stats.healsConsumed += Number(stats.healsConsumed) || 0;
    p.stats.shieldsUsed += Number(stats.shieldsUsed) || 0;
    p.stats.abilityUsedCount += Number(stats.abilityUsedCount) || 0;
    p.stats.friendlyRevives += Number(stats.friendlyRevives) || 0;
    p.stats.weaponFiredCount += Number(stats.weaponFiredCount) || 0;

    if (p.stats.bestPlacement == null || placement < p.stats.bestPlacement) {
        p.stats.bestPlacement = placement;
    }

    // Keep a small match history for later analytics / dashboards.
    const entry = {
        ts: Date.now(),
        placement,
        kills,
        damageDealt: Math.round(Number(stats.damageDealt) || 0),
        damageTaken: Math.round(Number(stats.damageTaken) || 0),
        healsConsumed: Number(stats.healsConsumed) || 0,
        shieldsUsed: Number(stats.shieldsUsed) || 0,
        abilityUsedCount: Number(stats.abilityUsedCount) || 0,
        friendlyRevives: Number(stats.friendlyRevives) || 0,
        weaponFiredCount: Number(stats.weaponFiredCount) || 0,
        character: context.character || null,
        map: context.map || null
    };

    p.history.unshift(entry);
    if (p.history.length > META_CONFIG.history.maxEntries) {
        p.history.length = META_CONFIG.history.maxEntries;
    }
}

function getLifetimeStat(profile, key) {
    // Allow requirements to reference lifetime stats by key.
    // Keep this conservative: only expose intended stats.
    switch (key) {
        case 'xp': return Number(profile.xp) || 0;
        case 'level': return getLevelForXp(profile.xp);
        case 'coins': return Number(profile.coins) || 0;
        case 'matchesPlayed':
        case 'wins':
        case 'kills':
        case 'damageDealt':
        case 'damageTaken':
        case 'healsConsumed':
        case 'shieldsUsed':
        case 'abilityUsedCount':
        case 'friendlyRevives':
        case 'weaponFiredCount':
            return Number(profile.stats?.[key]) || 0;
        default:
            return 0;
    }
}

export function checkRequirements(profile, requirements) {
    if (!requirements) return { ok: true, reason: null };

    if (typeof requirements.xp === 'number' && (Number(profile.xp) || 0) < requirements.xp) {
        return { ok: false, reason: 'requires_xp' };
    }

    if (typeof requirements.level === 'number' && getLevelForXp(profile.xp) < requirements.level) {
        return { ok: false, reason: 'requires_level' };
    }

    if (requirements.stats && typeof requirements.stats === 'object') {
        for (const [key, minValue] of Object.entries(requirements.stats)) {
            if (typeof minValue !== 'number') continue;
            if (getLifetimeStat(profile, key) < minValue) {
                return { ok: false, reason: `requires_stat_${key}` };
            }
        }
    }

    return { ok: true, reason: null };
}

export function getUpgradeLevel(profile, upgradeId) {
    return Number(profile.purchases?.upgrades?.[upgradeId] || 0);
}

export function purchaseUpgrade(profile, upgradeId) {
    const upgrade = META_CONFIG.catalog.upgrades?.[upgradeId];
    if (!upgrade) return { ok: false, reason: 'unknown_upgrade' };

    const currentLevel = getUpgradeLevel(profile, upgradeId);
    const nextLevel = currentLevel + 1;

    const levelDef = upgrade.levels?.find(l => l.index === nextLevel);
    if (!levelDef) return { ok: false, reason: 'max_level' };

    const req = checkRequirements(profile, levelDef.requirements);
    if (!req.ok) return { ok: false, reason: req.reason };

    const cost = Number(levelDef.cost) || 0;
    if ((Number(profile.coins) || 0) < cost) return { ok: false, reason: 'not_enough_coins' };

    profile.coins -= cost;
    if (!profile.purchases) profile.purchases = { upgrades: {}, items: {} };
    if (!profile.purchases.upgrades) profile.purchases.upgrades = {};
    profile.purchases.upgrades[upgradeId] = nextLevel;

    return { ok: true, reason: null, newLevel: nextLevel, cost };
}

export function getMaxHpMultiplierFromUpgrades(profile) {
    // Apply all MAX_HP_PERCENT buffs from purchased upgrade levels.
    let bonusPercent = 0;

    for (const upgrade of Object.values(META_CONFIG.catalog.upgrades || {})) {
        const ownedLevel = getUpgradeLevel(profile, upgrade.id);
        if (!ownedLevel) continue;

        for (const levelDef of upgrade.levels || []) {
            if (levelDef.index > ownedLevel) continue;
            const buff = levelDef.buff;
            if (buff?.type === 'MAX_HP_PERCENT') {
                bonusPercent += Number(buff.percentage) || 0;
            }
        }
    }

    return 1 + bonusPercent / 100;
}
