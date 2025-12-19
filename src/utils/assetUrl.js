// Shared helper for building correct asset/map URLs on both localhost and GitHub Pages.
//
// Why this exists:
// - GitHub Pages project sites are served from a subpath (e.g. /<repo>/).
// - Any leading-slash URLs (e.g. /maps/...) will break there.
// - Case sensitivity differs between dev machines and GH Pages.

export function isAssetDebugEnabled() {
    try {
        const host = window.location && window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') return true;
        return window.localStorage && window.localStorage.getItem('debugAssets') === '1';
    } catch {
        return false;
    }
}

export function resolveAssetUrl(relativePath) {
    const raw = String(relativePath || '');
    const clean = raw.startsWith('/') ? raw.slice(1) : raw;
    return new URL(clean, document.baseURI).toString();
}

export function resolveMapsUrl(pathUnderMaps) {
    return resolveAssetUrl(`maps/${String(pathUnderMaps || '').replace(/^\/+/, '')}`);
}

export function resolveMapBackgroundUrl(filename) {
    return resolveAssetUrl(`maps/backgrounds/${String(filename || '').replace(/^\/+/, '')}`);
}

export function warnMissingAsset(kind, requestPathOrUrl, detail) {
    if (!isAssetDebugEnabled()) return;
    const extra = detail ? ` (${detail})` : '';
    console.warn(`[assets] Missing/failed ${kind}: ${requestPathOrUrl}${extra}`);
    console.warn('[assets] Tip: GitHub Pages is case-sensitive; check filename casing and avoid leading "/" paths.');
}
