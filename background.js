const DEFAULT_ENGINES = [
    {
        "name": "Google",
        "url": "https://google.com/search?q=%s"
    },
    {
        "name": "Bing",
        "url": "https://bing.com/search?q=%s"
    },
    {
        "name": "DuckDuckGo",
        "url": "https://duckduckgo.com/?q=%s"
    },
    {
        "name": "You.com",
        "url": "https://you.com/search?q=%s"
    },
    {
        "name": "YouCode",
        "url": "https://you.com/search?q=%s&tbm=youcode"
    }
]

chrome.runtime.onInstalled.addListener(
    chrome.storage.local.get(['searchEngines'], (res)=> {
        if (!res.searchEngines) {
            chrome.storage.local.set({'searchEngines':DEFAULT_ENGINES});
            // fetch(chrome.runtime.getURL('src/default-engines.json')).then(res=> {
            //     res.json().then(defEngines=> {
            //         chrome.storage.local.set({'searchEngines':defEngines});
            //     });
            // });
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
    }),
    chrome.storage.local.get(['backgroundQuality'], (res)=> {
        if (!res.backgroundQuality) {
            chrome.storage.local.set({'backgroundQuality':'med'});
        }
    }),
    chrome.storage.local.get(['getPhotoDelay'], (res)=> {
        if (!res.getPhotoDelay) {
            chrome.storage.local.set({'getPhotoDelay':true});
        }
    }),
    chrome.storage.local.get(['dynamicPhotoData'], (res)=> {
        if (!res.dynamicPhotoData) {
            chrome.storage.local.set({'dynamicPhotoData':{
                dataURL: '',
                photographer_name: '',
                photographer_url: '',
                qTime: ''
            }});
        }
    }),
    chrome.storage.local.get(['dynamicVideoData'], (res)=> {
        if (!res.dynamicVideoData) {
            chrome.storage.local.set({'dynamicVideoData':{
                dataURL: '',
                photographer_name: '',
                photographer_url: '',
                qTime: ''
            }});
        }
    })
);

chrome.runtime.onMessage.addListener(req=> {
    if (req.dynamicBg) {
        dynamicBg(req.dynamicBg.force, req.dynamicBg.type);
    }
    if (req.dynamicBgStatus != undefined) {
        // console.log('dynamicBgStatus: ', req.dynamicBgStatus);
    }
});

function dynamicBg(force) {
    let qTime = 'bwwklrz';
    
    const hour = new Date().getHours();
    if (hour >= 23 || hour >= 0 && hour < 7) {
        qTime = 'fq1cqrr';
    }
    else if (hour >= 7 && hour < 10) {
        qTime = 'pomtf5c';
    }
    else if (hour >= 10 && hour < 18) {
        qTime = 'bwwklrz';
    }
    else if (hour >= 18 && hour < 21) {
        qTime = 'lwjmt2w';
    }
    else if (hour >= 21 && hour < 23) {
        qTime = 'kbjvhc4';
    }
    
    const fetchURL = `https://api.pexels.com/v1/collections/${qTime}?per_page=80`;
    // console.log('fetchURL:', fetchURL);
    chrome.storage.local.get(['dynamicPhotoData', 'dynamicVideoData'], (res)=> {
        // verify if qTime is diferent
        let setqTime;
        chrome.storage.local.get(['backgroundType'], async (resType)=> {
            if (resType.backgroundType == 4) {
                setqTime = res.dynamicPhotoData.qTime;
            }
            else if (resType.backgroundType == 5) {
                setqTime = res.dynamicVideoData.qTime;
            }
            // if qTime is diferent or force is true fetch photo or video
            if ((setqTime != qTime || force) && navigator.onLine) {
                chrome.runtime.sendMessage({dynamicBgStatus: 0}); // status 0 = in progress

                let results = [];

                const getCollection = async (url)=> {
                    const res = await fetch(url, {
                        method: "GET",
                        headers: {
                            "Authorization": "563492ad6f91700001000001d70bb103205f402188390ac066212836"
                        }
                    });
                    const resJson = await res.json();

                    if (res.ok) {
                        results.push(...resJson.media);
    
                        if (resJson.next_page) await getCollection(resJson.next_page);
                        else return;
                    }
                    else throw 'Fallo al solicitar recursos';
                }

                try {
                    await getCollection(fetchURL);
                    // console.log('all', results);

                    const init = new Date();

                    const photos = results.filter(e=> e.type == 'Photo');
                    const videos = results.filter(e=> e.type == 'Video');
                    const selected = [photos[Math.round(Math.random()*photos.length) - 1], videos[Math.round(Math.random()*(videos.length))  - 1]];
                    // console.log('selected media', selected);
    
                    if (selected[0]) {
                        let photoURL = selected[0].src.original;
                        // set quality
                        chrome.storage.local.get(['backgroundQuality'], res=> {
                            if (res.backgroundQuality === 'low') {
                                photoURL += '?auto=compress&w=480';
                                videoURL = selected[1].video_files.find(e=> e.quality == 'sd' && (e.height < 720 || e.width < 720)).link;
                            }
                            if (res.backgroundQuality === 'med') {
                                photoURL += '?auto=compress&w=1080';
                                videoURL = selected[1].video_files.find(e=> e.quality == 'hd' && ((e.height == 720 || e.width == 720) || (e.height == 1080 || e.width == 1080))).link;
                            }
                            if (res.backgroundQuality === 'high') {
                                videoURL = selected[1].video_files.find(e=> e.quality == 'hd' && (e.height > 1080 || e.width > 1080)).link;
                            }
    
                            fetch(photoURL).then(res=> {
                                res.blob().then(blob=> {
                                    const end = new Date();
                                    let reader = new FileReader();
                                    reader.addEventListener('load', (e)=> {
                                        chrome.storage.local.set({'dynamicPhotoData':{
                                            dataURL: e.target.result,
                                            photographer_name: selected[0].photographer,
                                            photographer_url: selected[0].photographer_url,
                                            qTime: qTime
                                        }});
                                    });
                                    reader.readAsDataURL(blob);
                                    calcTime(init, end, 'dynamicBg');
                                });
                            });
                            chrome.storage.local.set({'dynamicVideoData':{
                                dataURL: videoURL,
                                photographer_name: selected[1].user.name,
                                photographer_url: selected[1].user.url,
                                qTime: qTime
                            }});
    
                            // console.log('photoURL: ', photoURL);
                            // console.log('videoURL', videoURL);
                            chrome.runtime.sendMessage({dynamicBgStatus: 1}); // status 1 = done
                        });
                    }
                    else {
                        throw 'No found any photo or video file';
                    }
                } catch (err) {
                    console.error(err);
                    chrome.runtime.sendMessage({dynamicBgStatus: 1}); // status 1 = done

                    chrome.notifications.create('getBgErrorNotification', {
                        type: 'basic',
                        title:  chrome.i18n.getMessage('getBgErrorNotificationTitle'),
                        message: chrome.i18n.getMessage('getBgErrorNotificationMessage'),
                        iconUrl: chrome.runtime.getURL(`resources/icon_x128.png`)
                    });
                }
            }
        });
    });
}

chrome.notifications.onClicked.addListener((id)=> {
	if (id == 'getPhotoDelay') {
		chrome.tabs.create({url: chrome.runtime.getURL('popup-options.html')});
	}
});
chrome.notifications.onButtonClicked.addListener((id, button)=> {
	// console.log(id, button);
	if (id == 'getPhotoDelay' && button == 0) {
		chrome.storage.local.set({'getPhotoDelay':false});
	}
	if (id == 'getPhotoDelay' && button == 1) {
		chrome.tabs.create({url: chrome.runtime.getURL('popup-options.html')});
	}
});

function calcTime(init, end, origin) {
    const timeResult = (end - init)/1000;
    // console.log('the function took ' + timeResult + 's to get the image');
    chrome.storage.local.get(['getPhotoDelay'], (res)=> {
    	if (origin == 'dynamicBg' && timeResult > 3.600 && res.getPhotoDelay) {
    		chrome.notifications.create('getPhotoDelay', {
                type: 'basic',
                title:  chrome.i18n.getMessage('photoDelayNotificationTitle'),
                message: chrome.i18n.getMessage('photoDelayNotificationMessage'),
                buttons: [
                    {
                        title: chrome.i18n.getMessage('photoDelayNotificationPrimaryButton')
                    },
                    {
                        title: chrome.i18n.getMessage('photoDelayNotificationSecondButton')
                    }
                ],
                iconUrl: chrome.runtime.getURL(`resources/icon_x128.png`)
    		});
    	}
    });
}