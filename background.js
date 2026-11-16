import './src/settings.js';
import {createPixabayClient, daypartForHour} from './src/pixabay-client.mjs';

const Settings = globalThis.SimpliteSettings;
const PIXABAY_PROXY_URL = 'https://simplite-backend.fitzxel.workers.dev/api/media';
const pixabay = createPixabayClient({proxyUrl: PIXABAY_PROXY_URL});

// Fill in missing defaults and migrate values written by older versions.
chrome.runtime.onInstalled.addListener(async details => {
    const values = await chrome.storage.local.get([...Settings.KEYS, ...Settings.OBSOLETE_KEYS]);
    const patch = Settings.migrationPatch(values);
    // Updating from a version that only had the classic bar: tell the user
    // about the new default once, and offer the classic one back.
    if (details?.reason === 'update' && values.searchBarStyle === undefined) patch.searchBarIntroPending = true;
    if (Object.keys(patch).length) await chrome.storage.local.set(patch);
    const obsolete = Settings.OBSOLETE_KEYS.filter(key => key in values);
    if (obsolete.length) await chrome.storage.local.remove(obsolete);
});

// Replies with {ok} so the popup can show the outcome of a manual refresh.
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!request?.dynamicBg) return;
    dynamicBg(request.dynamicBg.force, request.dynamicBg.type)
        .then(ok => sendResponse({ok}), () => sendResponse({ok: false}));
    return true;
});

async function dynamicBg(force = false, requestedType) {
    const settings = Settings.withDefaults(await chrome.storage.local.get(['backgroundType', 'backgroundQuality', 'dynamicPhotoData', 'dynamicVideoData']));
    const mediaType = requestedType || (settings.backgroundType === Settings.BG.VIDEOS ? 'videos' : 'photos');
    const kind = mediaType === 'videos' ? 'video' : 'photo';
    const storageKey = kind === 'video' ? 'dynamicVideoData' : 'dynamicPhotoData';
    const daypart = daypartForHour(new Date().getHours());
    const saved = settings[storageKey];
    if (!self.navigator.onLine) return false;
    if (!force && saved.qTime === daypart && saved.dataURL) return true;

    const startedAt = Date.now();
    try {
        const selected = await pixabay.getMedia(kind, daypart, settings.backgroundQuality);
        if (kind === 'photo') {
            const response = await fetch(selected.dataURL);
            if (!response.ok) throw new Error(`Pixabay image returned ${response.status}`);
            selected.dataURL = await toDataURL(await response.blob());
        }
        await chrome.storage.local.set({[storageKey]: selected});
        if (kind === 'photo') notifyIfSlow(startedAt);
        return true;
    } catch (error) {
        console.error('Failed to load Pixabay background:', error);
        chrome.notifications.create('getBgErrorNotification', {
            type: 'basic',
            title: chrome.i18n.getMessage('getBgErrorNotificationTitle'),
            message: chrome.i18n.getMessage('getBgErrorNotificationMessage'),
            iconUrl: chrome.runtime.getURL('resources/icon_x128.png'),
        });
        return false;
    }
}

async function toDataURL(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`;
}

function notifyIfSlow(startedAt) {
    if ((Date.now() - startedAt) / 1000 <= 3.6) return;
    chrome.storage.local.get(['getPhotoDelay'], settings => {
        if (settings.getPhotoDelay === false) return;
        chrome.notifications.create('getPhotoDelay', {
            type: 'basic',
            title: chrome.i18n.getMessage('photoDelayNotificationTitle'),
            message: chrome.i18n.getMessage('photoDelayNotificationMessage'),
            buttons: [
                {title: chrome.i18n.getMessage('photoDelayNotificationPrimaryButton')},
                {title: chrome.i18n.getMessage('photoDelayNotificationSecondButton')},
            ],
            iconUrl: chrome.runtime.getURL('resources/icon_x128.png'),
        });
    });
}

chrome.notifications.onClicked.addListener(id => {
    if (id === 'getPhotoDelay') chrome.tabs.create({url: chrome.runtime.getURL('popup-options.html')});
});
chrome.notifications.onButtonClicked.addListener((id, button) => {
    if (id !== 'getPhotoDelay') return;
    if (button === 0) chrome.storage.local.set({getPhotoDelay: false});
    if (button === 1) chrome.tabs.create({url: chrome.runtime.getURL('popup-options.html')});
});
