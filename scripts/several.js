// popup scripts
const selectSearchEngine = document.querySelector('#select-search-engine');

chrome.storage.local.get(['searchEngine'], (result)=> {
    selectSearchEngine.value = result.searchEngine;
})

selectSearchEngine.addEventListener('change', ()=> {
    chrome.storage.local.set({'searchEngine':selectSearchEngine.value});
})

const selectBackgroundType = document.querySelector('#select-background-type');

chrome.storage.local.get(['backgroundType'], (result)=> {
    selectBackgroundType.value = result.backgroundType;
})

selectBackgroundType.addEventListener('change', ()=> {
    chrome.storage.local.set({'backgroundType':selectBackgroundType.value});
})