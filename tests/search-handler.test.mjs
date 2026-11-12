import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/newtab.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

function setup({browser, chromeSearch, value = '  cats  ', runtimeError} = {}) {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            value: id === '#search-input' ? value : '', hidden: id === '#search-error', textContent: '', style: {}, classList: {add() {}, remove() {}},
            handlers: {}, addEventListener(name, handler) { this.handlers[name] = handler; },
        });
        return elements.get(id);
    };
    const chrome = {
        i18n: {getMessage: key => key},
        storage: {local: {get(_keys, callback) { callback({}); }}, onChanged: {addListener() {}}},
        runtime: {sendMessage() {}, get lastError() { return runtimeError; }},
    };
    if (chromeSearch) chrome.search = chromeSearch;
    const context = {document: {title: '', querySelector: selector => element(selector), addEventListener() {}}, chrome,
        browser, navigator: {onLine: true}, addEventListener() {}, setTimeout() {}};
    context.globalThis = context;
    vm.runInNewContext(source, context);
    return {form: element('#search-form'), input: element('#search-input'), clear: element('#search-clear'), error: element('#search-error')};
}

function submit(ui) { ui.form.handlers.submit({preventDefault() {}}); }

test('unavailable and failed search APIs show accessible localized error feedback', async () => {
    const unavailable = setup();
    submit(unavailable);
    assert.equal(unavailable.error.textContent, 'searchUnavailable');
    assert.equal(unavailable.error.hidden, false);

    const rejected = setup({browser: {search: {query: () => Promise.reject(new Error('private detail'))}}});
    submit(rejected);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(rejected.error.textContent, 'searchFailed');
    assert.equal(rejected.error.hidden, false);
    assert.equal(rejected.error.textContent.includes('private detail'), false);

    const chromeFailure = setup({chromeSearch: {query(_options, callback) { callback(); }}, runtimeError: {message: 'private detail'}});
    submit(chromeFailure);
    assert.equal(chromeFailure.error.textContent, 'searchFailed');
    assert.equal(chromeFailure.error.hidden, false);

    const chromeThrown = setup({chromeSearch: {query() { throw new Error('private detail'); }}});
    submit(chromeThrown);
    assert.equal(chromeThrown.error.textContent, 'searchFailed');
    assert.equal(chromeThrown.error.hidden, false);

    const thrown = setup({browser: {search: {query() { throw new Error('private detail'); }}}});
    submit(thrown);
    assert.equal(thrown.error.textContent, 'searchFailed');
    assert.equal(thrown.error.hidden, false);
});

test('successful queries preserve provider priority, trimmed text, CURRENT_TAB and one invocation', async () => {
    let browserCalls = 0;
    let chromeCalls = 0;
    const ui = setup({browser: {search: {query(options) { browserCalls++; assert.deepEqual({...options}, {text: 'cats', disposition: 'CURRENT_TAB'}); return Promise.resolve(); }}},
        chromeSearch: {query() { chromeCalls++; }}});
    submit(ui);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(browserCalls, 1);
    assert.equal(chromeCalls, 0);
    assert.equal(ui.error.hidden, true);

    const chromeOnly = setup({chromeSearch: {query(options, callback) {
        chromeCalls++;
        assert.deepEqual({...options}, {text: 'cats', disposition: 'CURRENT_TAB'});
        callback();
    }}});
    submit(chromeOnly);
    assert.equal(chromeCalls, 1);
    assert.equal(chromeOnly.error.hidden, true);
});

test('inline error is structurally wired as a hidden alert', () => {
    assert.match(html, /<p class="search-error" id="search-error" role="alert" hidden><\/p>/);
});

test('blank submissions do not query; edits, clear, and retry clear stale feedback', async () => {
    let calls = 0;
    const unavailable = setup({value: 'query'});
    submit(unavailable);
    assert.equal(unavailable.error.hidden, false);
    unavailable.input.value = 'next';
    unavailable.input.handlers.input();
    assert.equal(unavailable.error.hidden, true);

    const clearable = setup({value: 'query'});
    submit(clearable);
    assert.equal(clearable.error.hidden, false);
    clearable.clear.handlers.click();
    assert.equal(clearable.error.hidden, true);

    let attempts = 0;
    const retry = setup({browser: {search: {query() {
        attempts++;
        return attempts === 1 ? Promise.reject(new Error('failed')) : Promise.resolve();
    }}}});
    submit(retry);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(retry.error.hidden, false);
    submit(retry);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(retry.error.hidden, true);
    assert.equal(attempts, 2);

    const ui = setup({value: '   ', browser: {search: {query() { calls++; }}}});
    submit(ui);
    assert.equal(calls, 0);
});
