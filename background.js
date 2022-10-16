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
    }),
    chrome.storage.local.get(['highQuality'], (res)=> {
        if (!res.highQuality) {
            chrome.storage.local.set({'highQuality':{checked: true}});
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

// chrome.runtime.onStartup.addListener(
//     chrome.storage.local.get(['backgroundType'], (res)=> {
//         if (res.backgroundType == 4) {
//             dynamicBg();
//         }
//     })
// );

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.dynamicBg) {
        dynamicBg(req.dynamicBg.force, req.dynamicBg.type);
        sendResponse();
    }
});

function dynamicBg(force, type) {
    // let querys = ['sea', 'building', 'architecture', 'bridge', 'river', 'city', 'car road', 'city traffic', 'modern%20architecture', 'sky', 'clouds'];
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
    console.log('fetchURL:', fetchURL);
    chrome.storage.local.get(['dynamicPhotoData', 'dynamicVideoData'], (res)=> {
        // verify if qTime is diferent
        let setqTime;
        chrome.storage.local.get(['backgroundType'], (resType)=> {
            if (resType.backgroundType == 4) {
                setqTime = res.dynamicPhotoData.qTime;
            }
            else if (resType.backgroundType == 5) {
                setqTime = res.dynamicVideoData.qTime;
            }
            // if qTime is diferent or force is true fetch photo or video
            if ((setqTime != qTime || force) && navigator.onLine) {
                const init = new Date();
                fetch(fetchURL, {
                    method: "GET",
                    headers: {
                        "Authorization": "563492ad6f91700001000001d70bb103205f402188390ac066212836"
                    }
                }).then(res=> {
                    res.json().then(json=> {
                        console.log('json request:', json);
                        const photos = json.media.filter(e=> e.type == 'Photo');
                        const videos = json.media.filter(e=> e.type == 'Video');
                        const media = [photos[Math.round(Math.random()*(photos.length - 1))], videos[Math.round(Math.random()*(videos.length - 1))]];
                        console.log('selected media', media);
                        if (media[0]) {
                            let photoURL = media[0].src.original;
                            let videoURL = media[1].video_files.find(e => e.height == 1080).link;
                            chrome.storage.local.get(['highQuality'], (res)=> {
                                // check high quality
                                if (!res.highQuality.checked) {
                                    console.log('No high quality');
                                    photoURL += '?auto=compress&w=1080';
                                    videoURL = media[1].video_files.find(e => e.height == 720).link;
                                }
                                fetch(photoURL).then(res=> {
                                    res.blob().then(blob=> {
                                        const end = new Date();
                                        let reader = new FileReader();
                                        reader.addEventListener('load', (e)=> {
                                            chrome.storage.local.set({'dynamicPhotoData':{
                                                dataURL: e.target.result,
                                                photographer_name: media[0].photographer,
                                                photographer_url: media[0].photographer_url,
                                                qTime: qTime
                                            }});
                                        });
                                        reader.readAsDataURL(blob);
                                        calcTime(init, end, 'dynamicBg');
                                    });
                                });
                                chrome.storage.local.set({'dynamicVideoData':{
                                    dataURL: videoURL,
                                    photographer_name: media[1].user.name,
                                    photographer_url: media[1].user.url,
                                    qTime: qTime
                                }});
                            }); 
                        }
                        else {
                            throw 'No found any photo or video file';
                        }
                    });
                }).catch(e=> {
                    console.log(e);
                });
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
	console.log(id, button);
	if (id == 'getPhotoDelay' && button == 0) {
		chrome.storage.local.set({'getPhotoDelay':false});
	}
	if (id == 'getPhotoDelay' && button == 1) {
		chrome.tabs.create({url: chrome.runtime.getURL('popup-options.html')});
	}
});

function calcTime(init, end, origin) {
    const timeResult = (end - init)/1000;
    console.log('the function took ' + timeResult + 's to get the image');
    chrome.storage.local.get(['getPhotoDelay'], (res)=> {
    	if (origin == 'dynamicBg' && timeResult > 3.600 && res.getPhotoDelay) {
    		chrome.notifications.create('getPhotoDelay', {
			type: 'basic',
			title:  chrome.i18n.getMessage('PhotoDelayNotificationTitle'),
			message: chrome.i18n.getMessage('PhotoDelayNotificationMessage'),
			buttons: [
				{
					title: chrome.i18n.getMessage('PhotoDelayNotificationPrimaryButton')
				},
				{
					title: chrome.i18n.getMessage('PhotoDelayNotificationSecondButton')
				}
			],
			iconUrl: 'chrome-extension://flppelaflhfipiamjimipnjcpfajdlao/resources/icon_x128.png'
    		});
    	}
    });
}