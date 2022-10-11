chrome.runtime.onInstalled.addListener(
    chrome.storage.local.get(['searchEngines'], (res)=> {
        if (!res.searchEngines) {
            fetch(chrome.runtime.getURL('src/default-engines.json')).then(res=> {
                res.json().then(defEngines=> {
                    chrome.storage.local.set({'searchEngines':defEngines});
                });
            });
        }
    }),
    chrome.storage.local.get(['selectedEngine'], (res)=> {
        if (!res.selectedEngine) {
            chrome.storage.local.set({'selectedEngine':1});
        }
    }),
    chrome.storage.local.get(['backgroundType'], (res)=> {
        if (!res.backgroundType) {
            chrome.storage.local.set({'backgroundType':2});
        }
    }),
    chrome.storage.local.get(['backgroundAlign'], (res)=> {
        if (!res.backgroundAlign) {
            chrome.storage.local.set({'backgroundAlign':'center'});
        }
    }),
    chrome.storage.local.get(['backgroundImageData'], (res)=> {
        if (!res.backgroundImageData) {
            chrome.storage.local.set({'backgroundImageData':''});
        }
    })
);

chrome.runtime.onStartup.addListener(
    chrome.storage.local.get(['backgroundType'], (res)=> {
        if (res.backgroundType == 4) {
            dPhotos();
        }
    })
);

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.dPhotos) {
        dPhotos(req.dPhotos.force);
        sendResponse();
    }
});

function dPhotos(force) {
    let querys = ['sea', 'building', 'architecture', 'bridge', 'river', 'city', 'car road', 'city traffic', 'modern%20architecture', 'sky', 'clouds'];
    let qTime;
    
    const hour = new Date().getHours();
    if ((hour >= 23 || hour >= 0) && hour < 7) {
        qTime = 'midnight';
    }
    else if (hour >= 7 && hour < 10) {
        qTime = 'sunrise';
    }
    else if (hour >= 10 && hour < 18) {
        qTime = 'day';
    }
    else if (hour >= 18 && hour < 21) {
        qTime = 'sunset';
    }
    else if (hour >= 21 && hour < 23) {
        qTime = 'night';
        querys.push('light', 'dark');
    }

    const fetchURL = `https://api.pexels.com/v1/search?query=${qTime}%20${querys[Math.round(Math.random()*querys.length)]}&per_page=15`;
    console.log(fetchURL);
    chrome.storage.local.get(['dynamicPhotoData'], (res)=> {
        if (!res.dynamicPhotoData || res.dynamicPhotoData.qTime != qTime || force) {
            fetch(fetchURL, {
                method: "GET",
                headers: {
                    "Authorization": "563492ad6f91700001000001d70bb103205f402188390ac066212836"
                }
            }).then(res=> {
                res.json().then(json=> {
                    const photo = json.photos[Math.round(Math.random()*14)];
                    fetch(photo.src.original).then(res=> {
                        res.blob().then(blob=> {
                            let reader = new FileReader();
                            reader.addEventListener('load', (e)=> {
                                chrome.storage.local.set({'dynamicPhotoData':{
                                    dataURL: e.target.result,
                                    photographer_name: photo.photographer,
                                    photographer_url: photo.photographer_url,
                                    qTime: qTime
                                }});
                            });
                            reader.readAsDataURL(blob);
                        });
                    });
                });
            }).catch(e=> {
                console.log(e);
            });
        }
    });
}