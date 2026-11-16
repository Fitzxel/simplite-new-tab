// Shared settings schema for the background worker, popup and new tab page.
// Written as a plain script that publishes `globalThis.SimpliteSettings`, so it
// can be loaded with a <script> tag and also side-effect imported by the
// module service worker.
(() => {
    const BG = Object.freeze({
        COLOR: 'color',
        DEFAULT: 'default',
        CUSTOM: 'custom',
        PHOTOS: 'photos',
        VIDEOS: 'videos',
    });

    // Versions <= 2.0.1 stored the background type as 1-5 (number or string).
    const LEGACY_BG = Object.freeze({1: BG.COLOR, 2: BG.DEFAULT, 3: BG.CUSTOM, 4: BG.PHOTOS, 5: BG.VIDEOS});

    const ALIGNS = Object.freeze(['top', 'bottom', 'center', 'left', 'right']);
    const QUALITIES = Object.freeze(['low', 'med', 'high']);
    const THEMES = Object.freeze(['auto', 'light', 'dark']);
    const SEARCHBAR_STYLES = Object.freeze(['classic', 'glass', 'solid', 'none']);
    // Pre-release name of the glass style.
    const LEGACY_SEARCHBAR = Object.freeze({modern: 'glass'});

    // Settings that change how a page looks before its scripts run. They are
    // mirrored to localStorage so src/boot.js can apply them synchronously.
    const MIRRORED_KEYS = Object.freeze(['theme', 'searchBarStyle']);
    const MIRROR_PREFIX = 'simplite.';

    // Keys from older versions that are no longer read.
    const OBSOLETE_KEYS = Object.freeze(['highQuality']);

    const emptyMedia = () => ({dataURL: '', photographer_name: '', photographer_url: '', qTime: ''});

    const DEFAULTS = Object.freeze({
        backgroundType: BG.DEFAULT,
        backgroundAlign: 'center',
        backgroundImageData: '',
        backgroundQuality: 'med',
        // Empty string means "follow the theme's page color".
        backgroundColor: '',
        theme: 'auto',
        searchBarStyle: 'glass',
        // True for users who updated from a version with only the classic bar,
        // until they pick a style or dismiss the notice in the popup.
        searchBarIntroPending: false,
        getPhotoDelay: true,
        dynamicPhotoData: Object.freeze(emptyMedia()),
        dynamicVideoData: Object.freeze(emptyMedia()),
    });

    const KEYS = Object.freeze(Object.keys(DEFAULTS));

    function defaults() {
        return JSON.parse(JSON.stringify(DEFAULTS));
    }

    function normalizeBackgroundType(value) {
        if (Object.values(BG).includes(value)) return value;
        return LEGACY_BG[value] ?? DEFAULTS.backgroundType;
    }

    function pick(value, allowed, fallback) {
        return allowed.includes(value) ? value : fallback;
    }

    // Returns a complete, valid settings object from whatever is in storage.
    function withDefaults(values = {}) {
        const out = defaults();
        for (const key of KEYS) {
            if (values[key] !== undefined && values[key] !== null) out[key] = values[key];
        }
        out.backgroundType = normalizeBackgroundType(out.backgroundType);
        out.backgroundAlign = pick(out.backgroundAlign, ALIGNS, DEFAULTS.backgroundAlign);
        out.backgroundQuality = pick(out.backgroundQuality, QUALITIES, DEFAULTS.backgroundQuality);
        out.theme = pick(out.theme, THEMES, DEFAULTS.theme);
        out.searchBarStyle = pick(LEGACY_SEARCHBAR[out.searchBarStyle] ?? out.searchBarStyle, SEARCHBAR_STYLES, DEFAULTS.searchBarStyle);
        out.searchBarIntroPending = out.searchBarIntroPending === true;
        if (typeof out.backgroundColor !== 'string') out.backgroundColor = '';
        if (typeof out.backgroundImageData !== 'string') out.backgroundImageData = '';
        out.getPhotoDelay = out.getPhotoDelay !== false;
        for (const key of ['dynamicPhotoData', 'dynamicVideoData']) {
            out[key] = {...emptyMedia(), ...(typeof out[key] === 'object' ? out[key] : {})};
        }
        return out;
    }

    // The writes needed to bring stored values up to the current schema.
    function migrationPatch(values = {}) {
        const normalized = withDefaults(values);
        const patch = {};
        for (const key of KEYS) {
            if (JSON.stringify(values[key]) !== JSON.stringify(normalized[key])) patch[key] = normalized[key];
        }
        return patch;
    }

    // Sets <html data-theme> / <html data-searchbar> and refreshes the mirror.
    function applyAppearance(state, root = globalThis.document?.documentElement) {
        if (root) {
            if (state.theme === 'light' || state.theme === 'dark') root.dataset.theme = state.theme;
            else delete root.dataset.theme;
            root.dataset.searchbar = state.searchBarStyle;
        }
        try {
            for (const key of MIRRORED_KEYS) globalThis.localStorage.setItem(MIRROR_PREFIX + key, state[key]);
        } catch {
            // localStorage unavailable: the page still renders, just without the early hint.
        }
    }

    globalThis.SimpliteSettings = Object.freeze({
        BG,
        ALIGNS,
        QUALITIES,
        THEMES,
        SEARCHBAR_STYLES,
        MIRRORED_KEYS,
        MIRROR_PREFIX,
        KEYS,
        OBSOLETE_KEYS,
        DEFAULTS,
        defaults,
        emptyMedia,
        normalizeBackgroundType,
        withDefaults,
        migrationPatch,
        applyAppearance,
        isDynamic: type => type === BG.PHOTOS || type === BG.VIDEOS,
    });
})();
