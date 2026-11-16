document.title = chrome.i18n.getMessage('newTabTitle');

// search
const searchInput = document.querySelector('#search-input');
const searchClear = document.querySelector('#search-clear');
const searchError = document.querySelector('#search-error');

function showSearchError(message) {
    searchError.textContent = chrome.i18n.getMessage(message);
    searchError.hidden = false;
}

function clearSearchError() {
    searchError.textContent = '';
    searchError.hidden = true;
}

// Search using the browser's configured search provider.
document.querySelector('#search-form').addEventListener('submit', (e)=> {
    e.preventDefault();
    clearSearchError();
    const query = searchInput.value.trim();
    if (!query) return;

    const options = {text: query, disposition: 'CURRENT_TAB'};
    if (globalThis.browser?.search?.query) {
        try {
            Promise.resolve(globalThis.browser.search.query(options)).catch(() => showSearchError('searchFailed'));
        } catch {
            showSearchError('searchFailed');
        }
    } else if (globalThis.chrome?.search?.query) {
        try {
            globalThis.chrome.search.query(options, () => {
                if (globalThis.chrome.runtime?.lastError) showSearchError('searchFailed');
            });
        } catch {
            showSearchError('searchFailed');
        }
    } else {
        showSearchError('searchUnavailable');
    }
});

searchInput.placeholder = chrome.i18n.getMessage('searchForm');
searchInput.title = chrome.i18n.getMessage('searchForm');
searchClear.title = chrome.i18n.getMessage('deleteButton');
document.querySelector('#button-search').title = chrome.i18n.getMessage('search');

searchInput.addEventListener('input', ()=> {
    clearSearchError();
    if (searchInput.value.length > 0) {
        searchClear.style.display = 'flex';
    }
    else if (searchInput.value.length == 0) {
        searchClear.style.display = '';
    }
});
searchClear.addEventListener('click', ()=> {
    clearSearchError();
    searchInput.value = '';
    searchClear.style.display = '';
});

// on focus input
let isFocus = false;

searchInput.addEventListener('focus', ()=> {
    document.querySelector('#search-form').classList.add('input-focus');
    isFocus = true;
});
searchInput.addEventListener('blur', ()=> {
    document.querySelector('#search-form').classList.remove('input-focus');
    isFocus = false;
});

// background
const Settings = globalThis.SimpliteSettings;
const BG = Settings.BG;
const bgImg = document.querySelector('#img-bg');
const bgVideo = document.querySelector('#video-bg');
const bgCredit = document.querySelector('#photographer');
const FADE_MS = 350;
const DEFAULT_WALLPAPER = 'resources/default_wallpaper.jpg';

let bgState = Settings.withDefaults();
let shown = null; // {kind, src} currently on screen
let renderToken = 0;

bgVideo.autoplay = true;
bgVideo.loop = true;
bgVideo.muted = true;

bgImg.addEventListener('load', e=> {
    e.target.style.opacity = '1';
});
bgVideo.addEventListener('loadeddata', e=> {
    e.target.style.opacity = '1';
});

// What should be on screen for the given settings.
function resolveMedia(state) {
    const type = state.backgroundType;
    if (type === BG.DEFAULT) return {kind: 'img', src: DEFAULT_WALLPAPER};
    if (type === BG.CUSTOM) return {kind: 'img', src: state.backgroundImageData};
    if (Settings.isDynamic(type)) {
        // Videos need a connection; fall back to the last dynamic photo offline.
        const useVideo = type === BG.VIDEOS && navigator.onLine;
        const data = useVideo ? state.dynamicVideoData : state.dynamicPhotoData;
        return {kind: useVideo ? 'video' : 'img', src: data.dataURL, credit: data};
    }
    return {kind: 'none', src: ''};
}

function showCredit(credit) {
    if (!credit?.photographer_name) {
        bgCredit.style.display = 'none';
        return;
    }
    bgCredit.textContent = credit.photographer_name;
    bgCredit.title = `${chrome.i18n.getMessage('photographer')}: ${credit.photographer_name}`;
    bgCredit.href = credit.photographer_url;
    bgCredit.style.display = '';
}

function renderBackground() {
    const state = bgState;
    bgImg.style.objectPosition = state.backgroundAlign;
    bgVideo.style.objectPosition = state.backgroundAlign;
    document.body.style.backgroundColor = state.backgroundType === BG.COLOR && state.backgroundColor ? state.backgroundColor : '';

    const media = resolveMedia(state);
    if (!media.src) media.kind = 'none';
    if (shown && shown.kind === media.kind && shown.src === media.src) return;

    const isFirstRender = shown === null;
    shown = {kind: media.kind, src: media.src};
    const token = ++renderToken;

    bgImg.style.opacity = '';
    bgVideo.style.opacity = '';
    bgCredit.style.display = 'none';

    const swap = () => {
        if (token !== renderToken) return; // a newer render superseded this one
        if (media.kind !== 'img') bgImg.removeAttribute('src');
        if (media.kind !== 'video') {
            bgVideo.removeAttribute('src');
            bgVideo.load();
        }
        if (media.kind === 'img') bgImg.src = media.src;
        if (media.kind === 'video') bgVideo.src = media.src;
        if (media.kind !== 'none') showCredit(media.credit);
    };
    if (isFirstRender) swap();
    else setTimeout(swap, FADE_MS);
}

chrome.storage.local.get(Settings.KEYS, values=> {
    bgState = Settings.withDefaults(values);
    Settings.applyAppearance(bgState);
    renderBackground();
    if (Settings.isDynamic(bgState.backgroundType)) chrome.runtime.sendMessage({dynamicBg:{force: false}});
});

// Apply every changed key, even when several change at once.
chrome.storage.onChanged.addListener((changes, area)=> {
    if (area && area !== 'local') return;
    const keys = Object.keys(changes).filter(key => Settings.KEYS.includes(key));
    if (!keys.length) return;
    const next = {...bgState};
    for (const key of keys) next[key] = changes[key].newValue;
    bgState = Settings.withDefaults(next);
    if (keys.some(key => Settings.MIRRORED_KEYS.includes(key))) Settings.applyAppearance(bgState);
    renderBackground();
});

addEventListener('online', renderBackground);
addEventListener('offline', renderBackground);

addEventListener('keydown', (e)=> {
    if (!isFocus && e.key == 'k' && e.ctrlKey) {
        e.preventDefault();
        searchInput.focus();
        isFocus = true;
    }
    // Alt+N: new dynamic background (Ctrl+F is left to the browser's find bar).
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyN' && Settings.isDynamic(bgState.backgroundType)) {
        e.preventDefault();
        chrome.runtime.sendMessage({dynamicBg:{force: true}});
    }
});

document.addEventListener('visibilitychange', ()=> {
    if (shown?.kind !== 'video') return;
    if (document.hidden) bgVideo.pause();
    else bgVideo.play().catch(() => {});
});
