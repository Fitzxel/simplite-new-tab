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

let typeDynamicBg;
// set or not background
function createImgElement() {
    chrome.storage.local.get(['backgroundType', 'backgroundAlign', 'backgroundImageData', 'dynamicPhotoData', 'dynamicVideoData', 'highQuality'], res=> {
        const fragment = document.createDocumentFragment();
        const img = document.createElement('img');
        const a = document.createElement('a');
        img.id = 'img-bg';
        img.addEventListener('load', ()=> {
            img.style.opacity = '1';
        });
        img.style.objectPosition = res.backgroundAlign;
        fragment.appendChild(img);

        const video = document.createElement('video');
        video.id = 'video-bg';
        video.addEventListener('loadeddata', ()=> {
            video.playbackRate = 0.8;
            video.style.opacity = '1';
        });
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        fragment.appendChild(video);

        a.id = 'photographer';
        a.style.display = 'none';
        fragment.appendChild(a);
        if (res.backgroundType == 2) {
            img.src = 'resources/default_wallpaper.jpg';
        }
        else if (res.backgroundType == 3) {
            img.src = res.backgroundImageData;
        }
        else if (res.backgroundType == 4 || (res.backgroundType == 5 && !navigator.onLine)) {
            typeDynamicBg = 'photos';
            img.src = res.dynamicPhotoData.dataURL;
            a.textContent = res.dynamicPhotoData.photographer_name;
            a.title = `${chrome.i18n.getMessage('photographer')}: ${res.dynamicPhotoData.photographer_name}`;
            a.href = res.dynamicPhotoData.photographer_url;
            a.style.display = '';
            chrome.runtime.sendMessage({dynamicBg:{force: false, type: 'photos'}});
        }
        else if (res.backgroundType == 5) {
            typeDynamicBg = 'videos';
            video.src = res.dynamicVideoData.dataURL;
            a.textContent = res.dynamicVideoData.photographer_name;
            a.title = `${chrome.i18n.getMessage('photographer')}: ${res.dynamicVideoData.photographer_name}`;
            a.href = res.dynamicVideoData.photographer_url;
            a.style.display = '';
            chrome.runtime.sendMessage({dynamicBg:{force: false, type: 'videos'}});
        }
        document.body.appendChild(fragment);
    });
}
createImgElement();

// update page on change parameters
chrome.storage.onChanged.addListener(e=> {
    // on change selected search engine
    // no need listen searchEngines change
    if (e.selectedEngine) {
        chrome.storage.local.get(['searchEngines', 'selectedEngine'], res=> {
            searchURL = res.searchEngines[res.selectedEngine -1].url;
            searchInput.placeholder = `${chrome.i18n.getMessage('search_engine')} ${res.searchEngines[res.selectedEngine -1].name}`;
        });
    }
    // on change background
    const img = document.querySelector('#img-bg');
    const video = document.querySelector('#video-bg');
    const a = document.querySelector('#photographer');
    if (e.backgroundType) {
        if (e.backgroundType.oldValue == 4 || e.backgroundType.oldValue == 5) {
            a.style.display = 'none';
        }
        if (e.backgroundType.oldValue == 5) {
            video.style.opacity = '';
            setTimeout(() => {
                video.src = '';
            }, 300);
        }
        // new value
        if (e.backgroundType.newValue == 1) {
            img.style.opacity = '';
            // setTimeout(() => {
            //     img.style.display = 'none';
            // }, 300);
        }
        else if (e.backgroundType.newValue == 2) {
            img.style.opacity = '';
            img.src = 'resources/default_wallpaper.jpg';
        }
        else if (e.backgroundType.newValue == 3) {
            img.style.opacity = '';
            chrome.storage.local.get(['backgroundImageData'], (res)=> {
                img.src = res.backgroundImageData;
            });
        }
        else if (e.backgroundType.newValue == 4) {
            typeDynamicBg = 'photos';
            img.style.opacity = '';
            chrome.storage.local.get(['dynamicPhotoData'], (res)=> {
                img.src = res.dynamicPhotoData.dataURL;
                a.textContent = res.dynamicPhotoData.photographer_name;
                a.title = `${chrome.i18n.getMessage('photographer')}: ${res.dynamicPhotoData.photographer_name}`;
                a.href = res.dynamicPhotoData.photographer_url;
                a.style.display = '';
            });
        }
        else if (e.backgroundType.newValue == 5) {
            typeDynamicBg = 'videos';
            img.style.opacity = '';
            chrome.storage.local.get(['dynamicVideoData'], (res)=> {
                video.src = res.dynamicVideoData.dataURL;
                a.textContent = res.dynamicVideoData.photographer_name;
                a.title = `${chrome.i18n.getMessage('photographer')}: ${res.dynamicVideoData.photographer_name}`;
                a.href = res.dynamicVideoData.photographer_url;
                a.style.display = '';
            });
        }
    }
    // only change backgroundImageData
    if (e.backgroundImageData) {
        img.style.opacity = '';
        img.poster = e.backgroundImageData.newValue;
    }
    chrome.storage.local.get(['backgroundType'], res=> {
        // only change dynamicPhotoData
        if (e.dynamicPhotoData && (res.backgroundType != 5 || !navigator.onLine)) {
            if (e.dynamicPhotoData.newValue.dataURL.length > 0) {
                img.style.opacity = '';
                setTimeout(() => {
                    img.src = e.dynamicPhotoData.newValue.dataURL;
                    a.textContent = e.dynamicPhotoData.newValue.photographer_name;
                    a.title = `${chrome.i18n.getMessage('photographer')}: ${e.dynamicPhotoData.newValue.photographer_name}`;
                    a.href = e.dynamicPhotoData.newValue.photographer_url;
                    a.style.display = '';
                }, 300);
            }
        }
        // only change dynamicVideoData
        if (e.dynamicVideoData && res.backgroundType != 4) {
            if (e.dynamicVideoData.newValue.dataURL.length > 0) {
                img.style.opacity = '';
                video.style.opacity = '';
                setTimeout(() => {
                    video.src = e.dynamicVideoData.newValue.dataURL;
                    a.textContent = e.dynamicVideoData.newValue.photographer_name;
                    a.title = `${chrome.i18n.getMessage('photographer')}: ${e.dynamicVideoData.newValue.photographer_name}`;
                    a.href = e.dynamicVideoData.newValue.photographer_url;
                    a.style.display = '';
                }, 300);
            }
        }
    });
    if (e.backgroundAlign && img) {
        img.style.objectPosition = e.backgroundAlign.newValue;
    }
});

let dynamicBgStatus = 1;

chrome.runtime.onMessage.addListener(req=> {
    if (req.dynamicBgStatus != undefined) {
        dynamicBgStatus = req.dynamicBgStatus;
        // console.log('dynamicBgStatus: ', req.dynamicBgStatus);
    }
});

addEventListener('keydown', (e)=> {
    if (!isFocus && e.key == 'k' && e.ctrlKey) {
        e.preventDefault();
        searchInput.focus();
        isFocus = true;
    }
    if (e.key == 'f' && e.ctrlKey && dynamicBgStatus == 1) {
        e.preventDefault();
        chrome.runtime.sendMessage({dynamicBg:{force: true, type: typeDynamicBg}});
    }
});

document.addEventListener('visibilitychange', ()=> {
    if (typeDynamicBg == 'videos') {
        if (document.hidden) {
            document.querySelector('#video-bg').pause();
        }
        else document.querySelector('#video-bg').play();
    }
});