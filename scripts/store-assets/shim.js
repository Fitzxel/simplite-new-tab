// Fake chrome.* API so the real extension pages render outside the extension.
(() => {
  const p = new URLSearchParams(location.search);
  const lang = p.get('lang') || 'en';
  const x = new XMLHttpRequest();
  x.open('GET', `_locales/${lang}/messages.json`, false); x.send();
  const msgs = JSON.parse(x.responseText);
  const mx = new XMLHttpRequest(); mx.open('GET', 'manifest.json', false); mx.send();
  const manifest = JSON.parse(mx.responseText);
  const bg = p.get('bg') || '';
  const type = p.get('type') || (bg ? 'photos' : 'default');
  const media = {dataURL: bg, photographer_name: p.get('credit') || '', photographer_url: '#', qTime: 'day'};
  const store = {
    backgroundType: type, backgroundAlign: 'center',
    backgroundColor: p.get('color') || '',
    backgroundImageData: type === 'custom' ? bg : '',
    theme: p.get('theme') || 'dark',
    searchBarStyle: p.get('style') || 'glass',
    searchBarRadius: Number(p.get('radius') || 28),
    showSupportPrompt: false,
    dynamicPhotoData: media, dynamicVideoData: media,
  };
  try { localStorage.clear(); } catch {}
  const noop = () => {};
  globalThis.chrome = {
    i18n: {
      getUILanguage: () => lang,
      getMessage(key, subs) {
        if (key === '@@bidi_dir') return 'ltr';
        let m = msgs[key]?.message || '';
        subs = [].concat(subs ?? []);
        return m.replace(/\$(\d)/g, (_, n) => subs[n - 1] ?? '');
      },
    },
    runtime: {getManifest: () => manifest, sendMessage: async () => ({ok: true}), lastError: null},
    storage: {local: {get: (k, cb) => { const r = {...store}; cb ? cb(r) : 0; return Promise.resolve(r); }, set: async () => {}}, onChanged: {addListener: noop}},
  };
  document.documentElement.dataset.theme = store.theme;
  document.documentElement.dataset.searchbar = store.searchBarStyle;
  document.documentElement.style.setProperty('--searchbar-radius', store.searchBarRadius + 'px');
  if (p.get('q')) addEventListener('DOMContentLoaded', () => {
    const i = document.querySelector('#search-input'); if (!i) return;
    i.value = p.get('q'); i.dispatchEvent(new Event('input'));
  });
  if (p.get('focus')) addEventListener('load', () => document.querySelector('#search-form')?.classList.add('input-focus'));
})();
// Screenshots: skip the fade-in so a captured frame never shows a half-faded background.
document.head.insertAdjacentHTML('beforeend', '<style>#img-bg,#video-bg{transition:none!important}</style>');
