import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const settingsSource = await readFile(new URL('../src/settings.js', import.meta.url), 'utf8');
const newtabSource = await readFile(new URL('../src/newtab.js', import.meta.url), 'utf8');

function styleStub() {
    const props = {};
    return {props, setProperty(name, value) { props[name] = value; }};
}

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
        document: {title: '', querySelector: element, addEventListener() {}, body: {style: {}}, documentElement: {dataset: {}, style: styleStub()}},
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
        searchBarStyle: {newValue: 'solid'},
    }, 'local');
    timers.forEach(fn => fn());

    assert.equal(img.src, 'data:image/png;base64,AAA');
    assert.equal(img.style.objectPosition, 'top');
    assert.equal(element('#video-bg').style.objectPosition, 'top');
    assert.equal(context.document.documentElement.dataset.theme, 'dark');
    assert.equal(context.document.documentElement.dataset.searchbar, 'solid');
});

const bootSource = await readFile(new URL('../src/boot.js', import.meta.url), 'utf8');

function memoryStorage(initial = {}) {
    const data = {...initial};
    return {getItem: key => (key in data ? data[key] : null), setItem: (key, value) => { data[key] = String(value); }, data};
}

test('appearance is mirrored to localStorage and restored by boot.js before paint', () => {
    const storage = memoryStorage();
    const context = vm.createContext({localStorage: storage, document: {documentElement: {dataset: {}, style: styleStub()}}});
    vm.runInContext(settingsSource, context);
    context.SimpliteSettings.applyAppearance(context.SimpliteSettings.withDefaults({theme: 'light', searchBarStyle: 'classic', searchBarRadius: 28}));
    assert.equal(storage.data['simplite.searchBarStyle'], 'classic');
    assert.equal(context.document.documentElement.style.props['--searchbar-radius'], '28px');

    const page = vm.createContext({localStorage: storage, document: {documentElement: {dataset: {}, style: styleStub()}}});
    vm.runInContext(bootSource, page);
    assert.equal(page.document.documentElement.dataset.searchbar, 'classic');
    assert.equal(page.document.documentElement.dataset.theme, 'light');
    assert.equal(page.document.documentElement.style.props['--searchbar-radius'], '28px');
});

test('corner radius only accepts the slider steps and defaults to a pill', () => {
    const S = loadSettings();
    assert.deepEqual([...S.SEARCHBAR_RADII], [0, 4, 10, 14, 20, 28]);
    assert.equal(S.withDefaults({}).searchBarRadius, 28);
    assert.equal(S.withDefaults({searchBarRadius: 4}).searchBarRadius, 4);
    assert.equal(S.withDefaults({searchBarRadius: 0}).searchBarRadius, 0);
    assert.equal(S.withDefaults({searchBarRadius: '20'}).searchBarRadius, 20);
    assert.equal(S.withDefaults({searchBarRadius: 13}).searchBarRadius, 28);
    assert.equal(S.withDefaults({searchBarRadius: 6}).searchBarRadius, 28);
    // The classic preset must be a reachable slider step.
    assert.ok(S.SEARCHBAR_RADII.includes(S.CLASSIC_RADIUS));
    assert.equal(S.CLASSIC_RADIUS, 4);

    const stray = vm.createContext({localStorage: memoryStorage({'simplite.searchBarRadius': '999'}), document: {documentElement: {dataset: {}, style: styleStub()}}});
    vm.runInContext(bootSource, stray);
    assert.equal(stray.document.documentElement.style.props['--searchbar-radius'], undefined);

    const square = vm.createContext({localStorage: memoryStorage({'simplite.searchBarRadius': '0'}), document: {documentElement: {dataset: {}, style: styleStub()}}});
    vm.runInContext(bootSource, square);
    assert.equal(square.document.documentElement.style.props['--searchbar-radius'], '0px');
});

test('boot.js defaults to the glass bar when nothing valid is stored or storage is blocked', () => {
    const empty = vm.createContext({localStorage: memoryStorage(), document: {documentElement: {dataset: {}, style: styleStub()}}});
    vm.runInContext(bootSource, empty);
    assert.equal(empty.document.documentElement.dataset.searchbar, 'glass');
    assert.equal(empty.document.documentElement.dataset.theme, undefined);

    const blocked = vm.createContext({get localStorage() { throw new Error('blocked'); }, document: {documentElement: {dataset: {}, style: styleStub()}}});
    vm.runInContext(bootSource, blocked);
    assert.equal(blocked.document.documentElement.dataset.searchbar, 'glass');

    for (const style of ['classic', 'glass', 'solid', 'none']) {
        const page = vm.createContext({localStorage: memoryStorage({'simplite.searchBarStyle': style}), document: {documentElement: {dataset: {}, style: styleStub()}}});
        vm.runInContext(bootSource, page);
        assert.equal(page.document.documentElement.dataset.searchbar, style);
    }
});

test('search bar style accepts the four styles and maps the pre-release name', () => {
    const S = loadSettings();
    assert.deepEqual([...S.SEARCHBAR_STYLES], ['classic', 'glass', 'solid', 'none']);
    assert.equal(S.withDefaults({}).searchBarStyle, 'glass');
    assert.equal(S.withDefaults({searchBarStyle: 'modern'}).searchBarStyle, 'glass');
    assert.equal(S.withDefaults({searchBarStyle: 'solid'}).searchBarStyle, 'solid');
    assert.equal(S.withDefaults({searchBarStyle: 'fancy'}).searchBarStyle, 'glass');
    assert.equal(S.withDefaults({}).searchBarIntroPending, false);
});

test('both search bar stylesheets are loaded and scoped to their style', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /<script src="src\/boot\.js"><\/script>[\s\S]*<\/head>/);
    for (const file of ['classic', 'glass', 'solid']) {
        const scope = `:root[data-searchbar="${file}"]`;
        assert.match(html, new RegExp(`href="src/searchbar-${file}\\.css"`));
        const css = await readFile(new URL(`../src/searchbar-${file}.css`, import.meta.url), 'utf8');
        const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/^[^\s{}@][^{]*(?=\{)/gm);
        assert.ok(selectors.length > 0);
        for (const group of selectors) for (const sel of group.split(',')) assert.ok(sel.trim().startsWith(scope), `${file}: ${sel}`);
    }
});
