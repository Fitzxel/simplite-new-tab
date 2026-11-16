// Occasional, dismissible "buy me a coffee" card shown under the search bar.
// It never appears in the first days after installing or updating, then at
// most once every few days and only after a number of new tabs. Closing it
// or opening the link pushes the next appearance further away, and it can be
// turned off in Settings > Advanced.
(() => {
    const DAY = 24 * 60 * 60 * 1000;
    const RULES = Object.freeze({
        firstDelayDays: 3, // quiet period after install/update
        minTabs: 25,       // new tabs opened since it was last shown
        cooldownDays: 5,   // after being shown and left alone
        dismissDays: 21,   // after the close button
        clickDays: 60,     // after opening the link
    });
    const STATE_KEY = 'supportPromptState';
    const REVEAL_DELAY_MS = 700;

    // Decides for one new tab. `state` is {tabs, nextEligible} or undefined.
    function evaluate(state, now) {
        if (!state || typeof state.nextEligible !== 'number') {
            return {show: false, next: {tabs: 0, nextEligible: now + RULES.firstDelayDays * DAY}};
        }
        const tabs = (Number(state.tabs) || 0) + 1;
        if (now >= state.nextEligible && tabs >= RULES.minTabs) {
            return {show: true, next: {tabs: 0, nextEligible: now + RULES.cooldownDays * DAY}};
        }
        return {show: false, next: {tabs, nextEligible: state.nextEligible}};
    }

    function snooze(days, now) {
        return {tabs: 0, nextEligible: now + days * DAY};
    }

    globalThis.SimpliteSupport = Object.freeze({RULES, STATE_KEY, evaluate, snooze});

    // ---------- New tab wiring ----------
    const card = globalThis.document?.querySelector('#support');
    if (!card || !globalThis.chrome?.storage) return;

    const text = card.querySelector('#support-text');
    const link = card.querySelector('#support-link');
    const close = card.querySelector('#support-close');

    function reveal() {
        text.textContent = chrome.i18n.getMessage('supportPromptText');
        link.textContent = chrome.i18n.getMessage('footerDonate');
        close.setAttribute('aria-label', chrome.i18n.getMessage('supportPromptClose'));
        close.title = chrome.i18n.getMessage('supportPromptClose');
        card.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('show')));
    }

    function hide() {
        card.classList.remove('show');
        setTimeout(() => { card.hidden = true; }, 300);
    }

    close.addEventListener('click', () => {
        hide();
        chrome.storage.local.set({[STATE_KEY]: snooze(RULES.dismissDays, Date.now())});
    });
    link.addEventListener('click', () => {
        chrome.storage.local.set({[STATE_KEY]: snooze(RULES.clickDays, Date.now())});
        setTimeout(hide, 400);
    });

    // Turning the setting off hides a card that is already showing.
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.showSupportPrompt?.newValue === false && !card.hidden) hide();
    });

    // `index.html?support` previews the card without touching the schedule.
    if (new URLSearchParams(location.search).has('support')) {
        setTimeout(reveal, REVEAL_DELAY_MS);
        return;
    }

    chrome.storage.local.get(['showSupportPrompt', STATE_KEY], values => {
        if (values.showSupportPrompt === false) return;
        const {show, next} = evaluate(values[STATE_KEY], Date.now());
        chrome.storage.local.set({[STATE_KEY]: next});
        if (show) setTimeout(reveal, REVEAL_DELAY_MS);
    });
})();
