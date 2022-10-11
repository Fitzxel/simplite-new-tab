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

// set or not background
function createImgElement() {
    chrome.storage.local.get(['backgroundType', 'backgroundAlign', 'backgroundImageData', 'dynamicPhotoData'], res=> {
        if (res.backgroundType == 1) {
            //nothing
        }
        else {
            const fragment = document.createDocumentFragment();
            const img = document.createElement('img');
            img.id = 'img-bg';
            img.addEventListener('load', ()=> {
                img.style.opacity = '1';
            });
            img.style.objectPosition = res.backgroundAlign;
            fragment.appendChild(img);
            const a = document.createElement('a');
            a.id = 'photographer';
	    a.style.display = 'none'
            fragment.appendChild(a);
            if (res.backgroundType == 2) {
                img.src = 'resources/default_wallpaper.jpg';
            }
            else if (res.backgroundType == 3) {
                img.src = res.backgroundImageData;
            }
            else if (res.backgroundType == 4) {
                img.src = res.dynamicPhotoData.dataURL;
                a.textContent = res.dynamicPhotoData.photographer_name;
                a.title = `${chrome.i18n.getMessage('photographer')}: ${res.dynamicPhotoData.photographer_name}`;
                a.href = res.dynamicPhotoData.photographer_url;
	    	a.style.display = ''
                chrome.runtime.sendMessage({dPhotos:{force: false}});
            }
            document.body.appendChild(fragment);
        }
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
    const a = document.querySelector('#photographer');
    if (e.backgroundType) {
        if (e.backgroundType.oldValue == 4) {
            a.style.display = 'none';
        }
        if (e.backgroundType.newValue == 1) {
            img.style.opacity = '0';
            a.style.display = 'none';
            setTimeout(() => {
                img.style.display = 'none';
            }, 300);
        }
        else if (e.backgroundType.newValue == 2) {
            if (e.backgroundType.oldValue == 1) {
                createImgElement();
            }
            else {
                img.style.opacity = '0';
                setTimeout(() => {
                    img.src = 'resources/default_wallpaper.jpg';
                }, 300);
            }
        }
        else if (e.backgroundType.newValue == 3) {
            if (e.backgroundType.oldValue == 1) {
                createImgElement();
            }
            else {
                img.style.opacity = '0';
                setTimeout(() => {
                    chrome.storage.local.get(['backgroundImageData'], res=> {
                        img.src = res.backgroundImageData;
                    });
                }, 300);
            }
        }
        else if (e.backgroundType.newValue == 4) {
            if (e.backgroundType.oldValue == 1) {
                createImgElement();
            }
            else {
                img.style.opacity = '0';
                a.style.display = '';
                chrome.storage.local.get(['dynamicPhotoData'], res=> {
                    if (res.dynamicPhotoData.dataURL.length > 0) {
                        img.src = res.dynamicPhotoData.dataURL;
                        a.textContent = res.dynamicPhotoData.photographer_name;
                        a.title = `${chrome.i18n.getMessage('photographer')}: ${res.dynamicPhotoData.photographer_name}`;
                        a.href = res.dynamicPhotoData.photographer_url;
                    }
                    else {
                        chrome.runtime.sendMessage({dPhotos:{force: false}});
                    }
                });
            }
        }
    }
    if (e.backgroundAlign && img) {
        img.style.objectPosition = e.backgroundAlign.newValue;
    }
    // only change backgroundImageData
    if (e.backgroundImageData) {
        img.style.opacity = '0';
        setTimeout(() => {
            img.src = e.backgroundImageData.newValue;
        }, 300);
    }
    // only change dynamicPhotoData
    if (e.dynamicPhotoData) {
        if (e.dynamicPhotoData.newValue.dataURL.length > 0) {
            img.style.opacity = '0';
            setTimeout(() => {
                img.src = e.dynamicPhotoData.newValue.dataURL;
                a.textContent = e.dynamicPhotoData.newValue.photographer_name;
                a.title = `${chrome.i18n.getMessage('photographer')}: ${e.dynamicPhotoData.newValue.photographer_name}`;
                a.href = e.dynamicPhotoData.newValue.photographer_url;
            }, 300);
        }
    }
});

addEventListener('keydown', (e)=> {
    if (!isFocus && e.key == 'k' && e.ctrlKey) {
        e.preventDefault();
        searchInput.focus();
        isFocus = true;
    }
    if (e.key == 'f' && e.ctrlKey) {
        e.preventDefault();
        chrome.runtime.sendMessage({dPhotos:{force: true}});
    }
});