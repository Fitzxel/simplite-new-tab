// Popup / options page. Every change is saved immediately; the new tab page
// listens to storage changes, so nothing needs to be reloaded.
const Settings = globalThis.SimpliteSettings;
const BG = Settings.BG;
const MAX_IMAGE_MB = 20;

const $ = selector => document.querySelector(selector);
const msg = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

// ---------- i18n ----------
document.documentElement.lang = chrome.i18n.getUILanguage();
document.documentElement.dir = chrome.i18n.getMessage('@@bidi_dir') || 'ltr';
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = msg(el.dataset.i18n);
for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = msg(el.dataset.i18nTitle);
for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', msg(el.dataset.i18nAria));
$('#version').textContent = `v${chrome.runtime.getManifest().version}`;

// ---------- State ----------
let saved = Settings.withDefaults();
// The tile the user picked. It can differ from the saved type while
// "Your image" is selected but no image has been chosen yet.
let uiType = saved.backgroundType;

const ui = {
    toast: $('#toast'),
    thumbColor: $('#thumb-color'),
    thumbCustom: $('#thumb-custom'),
    thumbPhotos: $('#thumb-photos'),
    panels: document.querySelectorAll('.panel[data-for]'),
    positionRow: $('#position-row'),
    color: $('#bg-color'),
    colorTheme: $('#bg-color-theme'),
    drop: $('#drop-file'),
    dropHint: $('#drop-hint'),
    dropError: $('#drop-error'),
    dropProgress: $('#drop-progress'),
    preview: $('#custom-preview'),
    fileInput: $('#input-file'),
    newBg: $('#new-bg-btn'),
    slow: $('#slow-notices'),
    reset: $('#reset-btn'),
};

function setRadio(name, value) {
    const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
}

function setImage(img, src) {
    if (src) {
        if (img.getAttribute('src') !== src) img.src = src;
        img.hidden = false;
    } else {
        img.removeAttribute('src');
        img.hidden = true;
    }
}

function themePageColor() {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--bg-page').trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value : '#242424';
}

function render() {
    setRadio('bgType', uiType);
    setRadio('quality', saved.backgroundQuality);
    setRadio('align', saved.backgroundAlign);
    setRadio('theme', saved.theme);
    setRadio('searchBarStyle', saved.searchBarStyle);
    Settings.applyAppearance(saved);

    for (const panel of ui.panels) panel.hidden = !panel.dataset.for.split(' ').includes(uiType);
    ui.positionRow.hidden = uiType === BG.COLOR;

    // Thumbnails
    ui.thumbColor.style.background = saved.backgroundColor || '';
    setImage(ui.thumbCustom, saved.backgroundImageData);
    setImage(ui.thumbPhotos, saved.dynamicPhotoData.dataURL);

    // Solid color
    if (document.activeElement !== ui.color) ui.color.value = saved.backgroundColor || themePageColor();
    ui.colorTheme.hidden = !saved.backgroundColor;

    // Custom image
    const hasImage = Boolean(saved.backgroundImageData);
    setImage(ui.preview, saved.backgroundImageData);
    ui.drop.classList.toggle('has-image', hasImage);
    ui.dropHint.textContent = msg(hasImage ? 'customReplaceHint' : 'customDropHint');

    ui.slow.checked = saved.getPhotoDelay;
}

// ---------- Saving ----------
let toastTimer;
function toast(text, tone = 'ok') {
    clearTimeout(toastTimer);
    ui.toast.textContent = text;
    ui.toast.dataset.tone = tone;
    ui.toast.classList.add('show');
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), tone === 'error' ? 3500 : 1600);
}

async function save(patch, {quiet = false} = {}) {
    try {
        await chrome.storage.local.set(patch);
        Object.assign(saved, patch);
        render();
        if (!quiet) toast(msg('statusSaved'));
    } catch (error) {
        console.error('Failed to save settings:', error);
        toast(msg('statusSaveFailed'), 'error');
    }
}

// ---------- Background type ----------
document.querySelectorAll('input[name="bgType"]').forEach(input => input.addEventListener('change', () => {
    uiType = input.value;
    hideDropError();
    if (uiType === BG.CUSTOM && !saved.backgroundImageData) {
        // Nothing to show yet: wait until an image is chosen before saving.
        render();
        ui.drop.querySelector('#browse-img-btn').focus({preventScroll: true});
        return;
    }
    save({backgroundType: uiType});
    if (Settings.isDynamic(uiType)) requestDynamic(false);
}));

// ---------- Solid color ----------
let colorTimer;
ui.color.addEventListener('input', () => {
    clearTimeout(colorTimer);
    const value = ui.color.value;
    colorTimer = setTimeout(() => save({backgroundColor: value}, {quiet: true}), 80);
});
ui.color.addEventListener('change', () => {
    clearTimeout(colorTimer);
    save({backgroundColor: ui.color.value});
});
ui.colorTheme.addEventListener('click', () => save({backgroundColor: ''}));

// ---------- Custom image ----------
function showDropError(text) {
    ui.dropError.textContent = text;
    ui.dropError.hidden = false;
}
function hideDropError() {
    ui.dropError.hidden = true;
    ui.dropError.textContent = '';
}

function readImage(file) {
    hideDropError();
    if (!file) return;
    if (!file.type.startsWith('image/')) return showDropError(msg('customNotImage'));
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return showDropError(msg('customTooLarge', [String(MAX_IMAGE_MB)]));

    const bar = ui.dropProgress.firstElementChild;
    const reader = new FileReader();
    bar.style.width = '0%';
    ui.dropProgress.hidden = false;
    reader.addEventListener('progress', e => {
        if (e.lengthComputable) bar.style.width = `${Math.round(e.loaded / e.total * 100)}%`;
    });
    reader.addEventListener('load', async () => {
        bar.style.width = '100%';
        uiType = BG.CUSTOM;
        await save({backgroundImageData: reader.result, backgroundType: BG.CUSTOM});
        setTimeout(() => { ui.dropProgress.hidden = true; }, 250);
    });
    reader.addEventListener('error', () => {
        ui.dropProgress.hidden = true;
        showDropError(msg('customNotImage'));
    });
    reader.readAsDataURL(file);
}

$('#browse-img-btn').addEventListener('click', e => {
    e.stopPropagation();
    ui.fileInput.click();
});
ui.drop.addEventListener('click', () => ui.fileInput.click());
ui.fileInput.addEventListener('change', () => {
    readImage(ui.fileInput.files[0]);
    ui.fileInput.value = '';
});

let dragDepth = 0;
ui.drop.addEventListener('dragenter', e => {
    e.preventDefault();
    dragDepth++;
    ui.drop.classList.add('dragging');
});
ui.drop.addEventListener('dragover', e => e.preventDefault());
ui.drop.addEventListener('dragleave', () => {
    if (--dragDepth <= 0) {
        dragDepth = 0;
        ui.drop.classList.remove('dragging');
    }
});
ui.drop.addEventListener('drop', e => {
    e.preventDefault();
    dragDepth = 0;
    ui.drop.classList.remove('dragging');
    readImage(e.dataTransfer.files[0]);
});

// ---------- Dynamic backgrounds ----------
async function requestDynamic(force) {
    const type = uiType === BG.VIDEOS ? 'videos' : 'photos';
    try {
        const response = await chrome.runtime.sendMessage({dynamicBg: {force, type}});
        return Boolean(response?.ok);
    } catch (error) {
        console.error('Failed to request a dynamic background:', error);
        return false;
    }
}

document.querySelectorAll('input[name="quality"]').forEach(input => input.addEventListener('change', () => {
    save({backgroundQuality: input.value});
}));

ui.newBg.addEventListener('click', async () => {
    if (!navigator.onLine) return toast(msg('offline'), 'error');
    const label = ui.newBg.querySelector('span');
    ui.newBg.disabled = true;
    ui.newBg.setAttribute('aria-busy', 'true');
    label.textContent = msg('newBackgroundLoading');
    const ok = await requestDynamic(true);
    ui.newBg.disabled = false;
    ui.newBg.removeAttribute('aria-busy');
    label.textContent = msg('newBackground');
    toast(msg(ok ? 'newBackgroundDone' : 'newBackgroundError'), ok ? 'ok' : 'error');
});

// ---------- Position, theme, advanced ----------
document.querySelectorAll('input[name="align"]').forEach(input => input.addEventListener('change', () => {
    save({backgroundAlign: input.value});
}));
document.querySelectorAll('input[name="theme"]').forEach(input => input.addEventListener('change', () => {
    save({theme: input.value});
}));
document.querySelectorAll('input[name="searchBarStyle"]').forEach(input => input.addEventListener('change', () => {
    save({searchBarStyle: input.value});
}));
ui.slow.addEventListener('change', () => save({getPhotoDelay: ui.slow.checked}));

let resetTimer;
function disarmReset() {
    clearTimeout(resetTimer);
    delete ui.reset.dataset.confirm;
    ui.reset.textContent = msg('resetAll');
}
ui.reset.addEventListener('click', async () => {
    if (!ui.reset.dataset.confirm) {
        ui.reset.dataset.confirm = '';
        ui.reset.textContent = msg('resetConfirm');
        resetTimer = setTimeout(disarmReset, 3000);
        return;
    }
    disarmReset();
    const defaults = Settings.defaults();
    await chrome.storage.local.set(defaults);
    saved = defaults;
    uiType = saved.backgroundType;
    hideDropError();
    render();
    toast(msg('resetDone'));
});
ui.reset.addEventListener('blur', disarmReset);

// ---------- Sync ----------
// Keep in step with changes made elsewhere (background fetches, another
// settings page, the notification buttons).
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const keys = Object.keys(changes).filter(key => Settings.KEYS.includes(key));
    if (!keys.length) return;
    const next = {...saved};
    for (const key of keys) next[key] = changes[key].newValue;
    const previousType = saved.backgroundType;
    saved = Settings.withDefaults(next);
    if (saved.backgroundType !== previousType) uiType = saved.backgroundType;
    render();
});

chrome.storage.local.get(Settings.KEYS, values => {
    saved = Settings.withDefaults(values);
    uiType = saved.backgroundType;
    render();
});
