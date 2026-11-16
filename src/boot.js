// Runs synchronously in <head>, before first paint, to apply the last known
// theme and search bar style from the localStorage mirror kept by
// SimpliteSettings.applyAppearance(). chrome.storage is async, so without this
// the page would briefly render with the defaults.
(() => {
    const root = document.documentElement;
    let theme = null;
    let searchBar = null;
    try {
        theme = localStorage.getItem('simplite.theme');
        searchBar = localStorage.getItem('simplite.searchBarStyle');
    } catch {
        // Storage blocked: fall back to defaults until chrome.storage loads.
    }
    if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
    root.dataset.searchbar = searchBar === 'classic' ? 'classic' : 'modern';
})();
