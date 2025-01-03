document.title = chrome.i18n.getMessage('newTabTitle');

// search
const searchInput = document.querySelector('#search-input');
const searchClear = document.querySelector('#search-clear');

let searchURL;
chrome.storage.local.get(['searchEngines', 'selectedEngine'], res=> {
    searchURL = res.searchEngines[res.selectedEngine -1].url;
    searchInput.placeholder = `${chrome.i18n.getMessage('search_engine')} ${res.searchEngines[res.selectedEngine -1].name}`;
});

// search action
document.querySelector('#search-form').addEventListener('submit', (e)=> {
    e.preventDefault();
    if (searchInput.value.length > 0) {
        window.location.href = searchURL.replace('%s', searchInput.value);
    }
});

searchInput.title = chrome.i18n.getMessage('searchForm');
searchClear.title = chrome.i18n.getMessage('deleteButton');
document.querySelector('#button-search').title = chrome.i18n.getMessage('search');

searchInput.addEventListener('input', ()=> {
    if (searchInput.value.length > 0) {
        searchClear.style.display = 'flex';
    }
    else if (searchInput.value.length == 0) {
        searchClear.style.display = '';
    }
});
searchClear.addEventListener('click', ()=> {
    searchInput.value = '';
    searchClear.style.display = '';
});

// on focus input
let isFocus = false;

searchInput.addEventListener('focus', ()=> {
    document.querySelector('#search-form').classList.add('input-focus');
    isFocus = true;
});
searchInput.addEventListener('blur', ()=> {
    document.querySelector('#search-form').classList.remove('input-focus');
    isFocus = false;
});

// set background
document.querySelector('#img-bg').addEventListener('load', e=> {
    e.target.style.opacity = '1';
});
document.querySelector('#video-bg').addEventListener('loadeddata', e=> {
    e.target.style.opacity = '1';
});

chrome.storage.local.get(['backgroundType', 'backgroundAlign', 'backgroundImageData', 'dynamicPhotoData', 'dynamicVideoData', 'highQuality'], res=> {
    const img = document.querySelector('#img-bg');
    const video = document.querySelector('#video-bg');
    const a = document.querySelector('#photographer');

    img.style.objectPosition = res.backgroundAlign;

    video.autoplay = true;
    video.loop = true;
    video.muted = true;

    if (res.backgroundType == 2) {// default
        img.src = 'resources/default_wallpaper.jpg';
    }
    else if (res.backgroundType == 3) {// custom
        img.src = res.backgroundImageData;
    }
    else if (res.backgroundType == 4 || (res.backgroundType == 5 && !navigator.onLine)) {// dynamic photo
        img.src = res.dynamicPhotoData.dataURL;
        a.textContent = res.dynamicPhotoData.photographer_name;
        a.title = `${chrome.i18n.getMessage('photographer')}: ${res.dynamicPhotoData.photographer_name}`;
        a.href = res.dynamicPhotoData.photographer_url;
        a.style.display = '';
        chrome.runtime.sendMessage({dynamicBg:{force: false}});
    }
    else if (res.backgroundType == 5) {// dynamic video
        video.src = res.dynamicVideoData.dataURL;
        a.textContent = res.dynamicVideoData.photographer_name;
        a.title = `${chrome.i18n.getMessage('photographer')}: ${res.dynamicVideoData.photographer_name}`;
        a.href = res.dynamicVideoData.photographer_url;
        a.style.display = '';
        chrome.runtime.sendMessage({dynamicBg:{force: false}});
    }
});

// update page on change parameters
chrome.storage.onChanged.addListener(e=> {
    const img = document.querySelector('#img-bg');
    const video = document.querySelector('#video-bg');
    const a = document.querySelector('#photographer');

    if (e.selectedEngine) {
        chrome.storage.local.get(['searchEngines'], res=> {
            searchURL = res.searchEngines[e.selectedEngine.newValue - 1].url;
            searchInput.placeholder = `${chrome.i18n.getMessage('search_engine')} ${res.searchEngines[e.selectedEngine.newValue - 1].name}`;
        });
    }
    else if (e.backgroundAlign) {
        img.style.objectPosition = e.backgroundAlign.newValue;
    }
    else if (e.backgroundType) {
        img.style.opacity = '';
        video.style.opacity = '';
        a.style.display = 'none';

        setTimeout(() => {
            img.removeAttribute('src');
            video.removeAttribute('src');

            if (e.backgroundType.newValue == 2) {// default
                img.src = 'resources/default_wallpaper.jpg';
            }
            else if (e.backgroundType.newValue == 3) {// custom
                chrome.storage.local.get(['backgroundImageData'], (res)=> {
                    img.src = res.backgroundImageData;
                });
            }
            else if (e.backgroundType.newValue == 4 || (e.backgroundType.newValue == 5 && !navigator.onLine)) {// dynamic photo
                chrome.storage.local.get(['dynamicPhotoData'], (res)=> {
                    img.src = res.dynamicPhotoData.dataURL;
                    a.textContent = res.dynamicPhotoData.photographer_name;
                    a.title = `${chrome.i18n.getMessage('photographer')}: ${res.dynamicPhotoData.photographer_name}`;
                    a.href = res.dynamicPhotoData.photographer_url;
                    a.style.display = '';
                });
            }
            else if (e.backgroundType.newValue == 5) {// dynamic video
                chrome.storage.local.get(['dynamicVideoData'], (res)=> {
                    video.src = res.dynamicVideoData.dataURL;
                    a.textContent = res.dynamicVideoData.photographer_name;
                    a.title = `${chrome.i18n.getMessage('photographer')}: ${res.dynamicVideoData.photographer_name}`;
                    a.href = res.dynamicVideoData.photographer_url;
                    a.style.display = '';
                });
            }
        }, 350);
    }
    else if (e.dynamicPhotoData) {
        // only change dynamicPhotoData
        img.style.opacity = '';
        
        setTimeout(() => {
            chrome.storage.local.get(['backgroundType'], res=> {
                if (e.dynamicPhotoData && (res.backgroundType == 4 || !navigator.onLine) && e.dynamicPhotoData.newValue.dataURL.length > 0) {
                    img.src = e.dynamicPhotoData.newValue.dataURL;
                    a.textContent = e.dynamicPhotoData.newValue.photographer_name;
                    a.title = `${chrome.i18n.getMessage('photographer')}: ${e.dynamicPhotoData.newValue.photographer_name}`;
                    a.href = e.dynamicPhotoData.newValue.photographer_url;
                    a.style.display = '';
                }
            });
        }, 350);
    }
    else if (e.dynamicVideoData) {
        // only change dynamicVideoData
        video.style.opacity = '';
        
        setTimeout(() => {
            chrome.storage.local.get(['backgroundType'], res=> {
                if (e.dynamicVideoData && res.backgroundType == 5 && e.dynamicVideoData.newValue.dataURL.length > 0) {
                    video.src = e.dynamicVideoData.newValue.dataURL;
                    a.textContent = e.dynamicVideoData.newValue.photographer_name;
                    a.title = `${chrome.i18n.getMessage('photographer')}: ${e.dynamicVideoData.newValue.photographer_name}`;
                    a.href = e.dynamicVideoData.newValue.photographer_url;
                    a.style.display = '';
                }
            });
        }, 350);
    }
});

addEventListener('keydown', (e)=> {
    if (!isFocus && e.key == 'k' && e.ctrlKey) {
        e.preventDefault();
        searchInput.focus();
        isFocus = true;
    }
    if ((e.key == 'f' || e.key == 'F') && e.ctrlKey) {
        e.preventDefault();
        chrome.runtime.sendMessage({dynamicBg:{force: true}});
    }
});

document.addEventListener('visibilitychange', ()=> {
    if (document.querySelector('#video-bg').src) {
        if (document.hidden) {
            document.querySelector('#video-bg').pause();
        }
        else document.querySelector('#video-bg').play();
    }
});