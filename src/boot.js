// Runs synchronously in <head>, before first paint, to apply the last known
// theme, search bar style and corner radius from the localStorage mirror kept
// by SimpliteSettings.applyAppearance(). chrome.storage is async, so without
// this the page would briefly render with the defaults.
(() => {
    const STYLES = ['classic', 'glass', 'solid', 'none'];
    const RADII = ['0', '4', '10', '14', '20', '28'];
    const root = document.documentElement;
    let theme = null;
    let searchBar = null;
    let radius = null;
    try {
        theme = localStorage.getItem('simplite.theme');
        searchBar = localStorage.getItem('simplite.searchBarStyle');
        radius = localStorage.getItem('simplite.searchBarRadius');
    } catch {
        // Storage blocked: fall back to defaults until chrome.storage loads.
    }
    if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
    root.dataset.searchbar = STYLES.includes(searchBar) ? searchBar : 'glass';
    if (RADII.includes(radius)) root.style.setProperty('--searchbar-radius', `${radius}px`);
})();
