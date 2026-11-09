import {createPixabayClient, daypartForHour} from './src/pixabay-client.mjs';

const PIXABAY_PROXY_URL = 'https://simplite-pixabay-proxy.example.workers.dev/api/media';
const pixabay = createPixabayClient({proxyUrl: PIXABAY_PROXY_URL});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['backgroundType', 'backgroundAlign', 'backgroundImageData', 'backgroundQuality', 'getPhotoDelay', 'dynamicPhotoData', 'dynamicVideoData'], values => {
        const defaults = {};
        if (values.backgroundType === undefined) defaults.backgroundType = 2;
        if (values.backgroundAlign === undefined) defaults.backgroundAlign = 'center';
        if (values.backgroundImageData === undefined) defaults.backgroundImageData = '';
        if (values.backgroundQuality === undefined) defaults.backgroundQuality = 'med';
        if (values.getPhotoDelay === undefined) defaults.getPhotoDelay = true;
        if (values.dynamicPhotoData === undefined) defaults.dynamicPhotoData = emptyMedia();
        if (values.dynamicVideoData === undefined) defaults.dynamicVideoData = emptyMedia();
        if (Object.keys(defaults).length) chrome.storage.local.set(defaults);
    });
});

chrome.runtime.onMessage.addListener(request => {
    if (request.dynamicBg) dynamicBg(request.dynamicBg.force, request.dynamicBg.type);
});

async function dynamicBg(force = false, requestedType) {
    const settings = await chrome.storage.local.get(['backgroundType', 'backgroundQuality', 'dynamicPhotoData', 'dynamicVideoData']);
    const mediaType = requestedType || (settings.backgroundType == 5 ? 'videos' : 'photos');
    const kind = mediaType === 'videos' ? 'video' : 'photo';
    const storageKey = kind === 'video' ? 'dynamicVideoData' : 'dynamicPhotoData';
    const daypart = daypartForHour(new Date().getHours());
    const saved = settings[storageKey] || emptyMedia();
    if (!force && saved.qTime === daypart || !self.navigator.onLine) return;

    const startedAt = Date.now();
    try {
        const selected = await pixabay.getMedia(kind, daypart, settings.backgroundQuality || 'med');
        if (kind === 'photo') {
            const response = await fetch(selected.dataURL);
            if (!response.ok) throw new Error(`Pixabay image returned ${response.status}`);
            selected.dataURL = await toDataURL(await response.blob());
        }
        await chrome.storage.local.set({[storageKey]: selected});
        if (kind === 'photo') notifyIfSlow(startedAt);
    } catch (error) {
        console.error('Failed to load Pixabay background:', error);
        chrome.notifications.create('getBgErrorNotification', {
            type: 'basic',
            title: chrome.i18n.getMessage('getBgErrorNotificationTitle'),
            message: chrome.i18n.getMessage('getBgErrorNotificationMessage'),
            iconUrl: chrome.runtime.getURL('resources/icon_x128.png'),
        });
    }
}

function emptyMedia() {
    return {dataURL: '', photographer_name: '', photographer_url: '', qTime: ''};
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
        if (!settings.getPhotoDelay) return;
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
