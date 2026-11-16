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
        searchBarStyle: {newValue: 'classic'},
    }, 'local');
    timers.forEach(fn => fn());

    assert.equal(img.src, 'data:image/png;base64,AAA');
    assert.equal(img.style.objectPosition, 'top');
    assert.equal(element('#video-bg').style.objectPosition, 'top');
    assert.equal(context.document.documentElement.dataset.theme, 'dark');
    assert.equal(context.document.documentElement.dataset.searchbar, 'classic');
});

const bootSource = await readFile(new URL('../src/boot.js', import.meta.url), 'utf8');

function memoryStorage(initial = {}) {
    const data = {...initial};
    return {getItem: key => (key in data ? data[key] : null), setItem: (key, value) => { data[key] = String(value); }, data};
}

test('appearance is mirrored to localStorage and restored by boot.js before paint', () => {
    const storage = memoryStorage();
    const context = vm.createContext({localStorage: storage, document: {documentElement: {dataset: {}}}});
    vm.runInContext(settingsSource, context);
    context.SimpliteSettings.applyAppearance(context.SimpliteSettings.withDefaults({theme: 'light', searchBarStyle: 'classic'}));
    assert.equal(storage.data['simplite.searchBarStyle'], 'classic');

    const page = vm.createContext({localStorage: storage, document: {documentElement: {dataset: {}}}});
    vm.runInContext(bootSource, page);
    assert.equal(page.document.documentElement.dataset.searchbar, 'classic');
    assert.equal(page.document.documentElement.dataset.theme, 'light');
});

test('boot.js defaults to the modern bar when nothing is stored or storage is blocked', () => {
    const empty = vm.createContext({localStorage: memoryStorage(), document: {documentElement: {dataset: {}}}});
    vm.runInContext(bootSource, empty);
    assert.equal(empty.document.documentElement.dataset.searchbar, 'modern');
    assert.equal(empty.document.documentElement.dataset.theme, undefined);

    const blocked = vm.createContext({get localStorage() { throw new Error('blocked'); }, document: {documentElement: {dataset: {}}}});
    vm.runInContext(bootSource, blocked);
    assert.equal(blocked.document.documentElement.dataset.searchbar, 'modern');
});

test('both search bar stylesheets are loaded and scoped to their style', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /<script src="src\/boot\.js"><\/script>[\s\S]*<\/head>/);
    for (const [file, scope] of [['classic', ':root[data-searchbar="classic"]'], ['modern', ':root:not([data-searchbar="classic"])']]) {
        assert.match(html, new RegExp(`href="src/searchbar-${file}\\.css"`));
        const css = await readFile(new URL(`../src/searchbar-${file}.css`, import.meta.url), 'utf8');
        const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/^[^\s{}][^{]*(?=\{)/gm);
        assert.ok(selectors.length > 0);
        for (const group of selectors) for (const sel of group.split(',')) assert.ok(sel.trim().startsWith(scope), `${file}: ${sel}`);
    }
});
