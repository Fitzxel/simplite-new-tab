chrome.runtime.onInstalled.addListener(
    chrome.storage.local.get(['searchEngine'], (result)=> {
        chrome.storage.local.set({'searchEngine':'1'});
        // if (!result.searchEngine) {
        //     chrome.storage.local.set({'searchEngine':'1'});
        // }
    }),
    chrome.storage.local.get(['backgroundType'], (result)=> {
        chrome.storage.local.set({'backgroundType':'2'});
        // if (!result.backgroundType) {
        //     chrome.storage.local.set({'backgroundType':'2'});
        // }
    })
)