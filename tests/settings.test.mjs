import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const settingsSource = await readFile(new URL('../src/settings.js', import.meta.url), 'utf8');
const newtabSource = await readFile(new URL('../src/newtab.js', import.meta.url), 'utf8');

function loadSettings() {
    const context = vm.createContext({});
    vm.runInContext(settingsSource, context);
    return context.SimpliteSettings;
}

test('migrates legacy numeric background types, stored as numbers or strings', () => {
    const S = loadSettings();
    assert.equal(S.normalizeBackgroundType(1), 'color');
    assert.equal(S.normalizeBackgroundType('3'), 'custom');
    assert.equal(S.normalizeBackgroundType(5), 'videos');
    assert.equal(S.normalizeBackgroundType('photos'), 'photos');
    assert.equal(S.normalizeBackgroundType('nonsense'), 'default');
});

test('migration patch fills missing defaults and rewrites only what changed', () => {
    const S = loadSettings();
    const patch = S.migrationPatch({backgroundType: '4', backgroundAlign: 'top', backgroundQuality: 'high', getPhotoDelay: false});
    assert.equal(patch.backgroundType, 'photos');
    assert.equal(patch.theme, 'auto');
    assert.equal(patch.backgroundColor, '');
    assert.equal('backgroundAlign' in patch, false);
    assert.equal('getPhotoDelay' in patch, false);
    assert.deepEqual(Object.keys(S.migrationPatch(S.defaults())), []);
});

test('withDefaults rejects invalid values', () => {
    const S = loadSettings();
    const out = S.withDefaults({backgroundAlign: 'diagonal', backgroundQuality: 'ultra', theme: 'neon', dynamicPhotoData: null});
    assert.equal(out.backgroundAlign, 'center');
    assert.equal(out.backgroundQuality, 'med');
    assert.equal(out.theme, 'auto');
    assert.equal(out.dynamicPhotoData.dataURL, '');
});

test('new tab applies every key when several settings change at once', () => {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            value: '', style: {}, dataset: {}, classList: {add() {}, remove() {}}, handlers: {},
            addEventListener(name, handler) { this.handlers[name] = handler; },
            removeAttribute(name) { delete this[name]; }, load() {}, pause() {}, play() { return Promise.resolve(); },
        });
        return elements.get(id);
    };
    let onChanged;
    const timers = [];
    const context = vm.createContext({
        document: {title: '', querySelector: element, addEventListener() {}, body: {style: {}}, documentElement: {dataset: {}}},
        chrome: {
            i18n: {getMessage: key => key},
            storage: {local: {get(_keys, callback) { callback({backgroundType: 2}); }}, onChanged: {addListener(fn) { onChanged = fn; }}},
            runtime: {sendMessage() {}},
        },
        navigator: {onLine: true}, addEventListener() {}, setTimeout(fn) { timers.push(fn); },
    });
    vm.runInContext(settingsSource, context);
    vm.runInContext(newtabSource, context);

    const img = element('#img-bg');
    assert.equal(img.src, 'resources/default_wallpaper.jpg');

    onChanged({
        backgroundType: {newValue: 'custom'},
        backgroundImageData: {newValue: 'data:image/png;base64,AAA'},
        backgroundAlign: {newValue: 'top'},
        theme: {newValue: 'dark'},
    }, 'local');
    timers.forEach(fn => fn());

    assert.equal(img.src, 'data:image/png;base64,AAA');
    assert.equal(img.style.objectPosition, 'top');
    assert.equal(element('#video-bg').style.objectPosition, 'top');
    assert.equal(context.document.documentElement.dataset.theme, 'dark');
});
