import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/support-prompt.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);
const {RULES, evaluate, snooze} = context.SimpliteSupport;
const DAY = 24 * 60 * 60 * 1000;

// Opens `count` new tabs, `hoursApart` hours apart; returns the tab indexes that showed the card.
function simulate(state, start, count, hoursApart) {
    const shown = [];
    for (let i = 0; i < count; i++) {
        const result = evaluate(state, start + i * hoursApart * 60 * 60 * 1000);
        if (result.show) shown.push(i);
        state = result.next;
    }
    return {shown, state};
}

test('never shows on the first run or during the first days', () => {
    const first = evaluate(undefined, 0);
    assert.equal(first.show, false);
    assert.equal(first.next.nextEligible, RULES.firstDelayDays * DAY);

    // 100 tabs within the quiet period: nothing.
    const {shown} = simulate(first.next, 1, 100, 0.5);
    assert.deepEqual(shown, []);
});

test('after the quiet period it needs enough new tabs, then cools down', () => {
    const start = evaluate(undefined, 0).next;
    // One tab every 2 hours for 30 days.
    const {shown} = simulate(start, RULES.firstDelayDays * DAY, 360, 2);
    assert.ok(shown.length > 0, 'shows at some point');
    assert.ok(shown[0] >= RULES.minTabs - 1, 'not before enough tabs');
    for (let i = 1; i < shown.length; i++) {
        const gapHours = (shown[i] - shown[i - 1]) * 2;
        assert.ok(gapHours >= RULES.cooldownDays * 24, `cooldown respected (${gapHours}h)`);
    }
});

test('closing or opening the link snoozes it for longer', () => {
    const now = 1_000 * DAY;
    assert.equal(snooze(RULES.dismissDays, now).nextEligible, now + RULES.dismissDays * DAY);
    assert.ok(RULES.clickDays > RULES.dismissDays && RULES.dismissDays > RULES.cooldownDays);

    const {shown} = simulate(snooze(RULES.dismissDays, now), now, 200, 2);
    assert.ok(shown.length === 0 || shown[0] * 2 >= RULES.dismissDays * 24);
});

test('the new tab loads the card script and keeps it inside the search container', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /<script src="src\/support-prompt\.js"><\/script>/);
    assert.match(html, /<div class="search-container">[\s\S]*<aside class="support" id="support" hidden>[\s\S]*<\/aside>\s*<\/div>/);
});
