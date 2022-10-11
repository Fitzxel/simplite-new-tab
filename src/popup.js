// popup scripts
let totalHeight = 0;
document.querySelectorAll('body > *').forEach(element => {
    totalHeight += element.offsetHeight;
});
if (totalHeight < innerHeight) {
    document.querySelector('footer').classList.add('fixed');
}

let Without_changes, Unsaved_changes, NotAImage, FillForm, SavedConfig, ParametersReset;

let lang = 'en';
if (["es", "pt"].includes(chrome.i18n.getUILanguage().split('-')[0])) {
    lang = chrome.i18n.getUILanguage().split('-')[0];
}
fetch(chrome.runtime.getURL(`_locales/${lang}/popup_content.json`)).then(res=> {
    res.json().then(json=> {
        // set variants of msg
        Without_changes = json[0].variants.Without_changes;
        Unsaved_changes = json[0].variants.Unsaved_changes;
        NotAImage = json[0].variants.NotAImage;
        FillForm = json[0].variants.FillForm;
        SavedConfig = json[0].variants.SavedConfig;
        ParametersReset = json[0].variants.ParametersReset;
        // for each element set content text
        json.forEach(obj => {
            const objElement = document.querySelector(obj.selector);
            if (objElement) {
                // textContent
                if (obj.txtContent) objElement.textContent = obj.txtContent;
                // placeholder
                if (obj.txtPlaceholder) objElement.placeholder = obj.txtPlaceholder;
                // innerHTML
                if (obj.txtInnerHTML) objElement.innerHTML = obj.txtInnerHTML;
                // title
                if (obj.txtTitle) objElement.title = obj.txtTitle;
            }
        });
    });
});

document.documentElement.addEventListener('submit', (event)=> {
    event.preventDefault();
});

const selector = id=> {
    return document.querySelector(`#select-${id}`);
}

// show message function
function showMSG(msg, type) {
    document.querySelector('#msg').textContent = msg;
    // error msg
    if (type == 0) {
        document.querySelector('#msg').style.background = '#ee0000';
        document.querySelector('#msg').style.color = 'var(--sl-color-text)';
    }
    // correct or confirm msg
    else if (type == 1) {
        document.querySelector('#msg').style.background = '#33ee00';
        document.querySelector('#msg').style.color = '';
    }
    // pending or alert msg
    else if (type == 2) {
        document.querySelector('#msg').style.background = '#eebb00';
        document.querySelector('#msg').style.color = '';
    }
    // 
    else {
        document.querySelector('#msg').style.background = '';
        document.querySelector('#msg').style.color = '';
    }
}

//
function verifyChanges() {
    chrome.storage.local.get(['searchEngines', 'selectedEngine', 'backgroundType', 'backgroundAlign', 'backgroundImageData'], (result)=> {
        if (result.selectedEngine == selector('search-engine').value && result.searchEngines.length == searchEngines.length && result.backgroundType == selector('bg-type').value && result.backgroundImageData == imgData && result.backgroundAlign == selector('bg-align').value) {
            showMSG(Without_changes);
        }
        else showMSG(Unsaved_changes, 2);
        // if backgroundType and the bg-type selector not have same value, the 3 value on specific
        // need verifiy if imgData have something value
        if (selector('bg-type').value == 3 && imgData.length <= 0) {
            showMSG(Without_changes);
        }
    });
}

let searchEngines = [];
chrome.storage.local.get(['searchEngines'], (result)=> {
    if (result.searchEngines) {
        searchEngines = result.searchEngines;
        result.searchEngines.forEach(engine => {
            let option = document.createElement('option');
            option.value = engine.value;
            option.textContent = engine.name;
            selector('search-engine').appendChild(option);
        });
    }
});

chrome.storage.local.get(['selectedEngine'], (result)=> {
    selector('search-engine').value = result.selectedEngine;
    if (result.selectedEngine > 3) {
        document.querySelector('#deleteEngineBtn').classList.add('show');
    }
});

selector('search-engine').addEventListener('input', ()=> {
    if (selector('search-engine').value == 0) {
        form.classList.add('text');
    }
    else {
        form.classList.remove('text');
        document.querySelector('#deleteEngineBtn').classList.remove('show');
        verifyChanges();
    }
    if (selector('search-engine').value > 3) {
        document.querySelector('#deleteEngineBtn').classList.add('show');
    }
});

const form = document.querySelector('#form');
const submitBtn = document.querySelector('#submit-btn');

// background align
chrome.storage.local.get(['backgroundAlign'], (result)=> {
    selector('bg-align').value = result.backgroundAlign;
});

selector('bg-align').addEventListener('input', ()=> {
    verifyChanges();
});

// background type
chrome.storage.local.get(['backgroundType'], (result)=> {
    selector('bg-type').value = result.backgroundType;
    if (selector('bg-type').value == 3) {
        form.classList.add('file');
        form.classList.remove('text');
    }
});

selector('bg-type').addEventListener('input', ()=> {
    if (selector('bg-type').value == 3) {
        form.classList.add('file');
    }
    else {
        form.classList.remove('file');
    }
    verifyChanges();
});

// file background
const imgInput = document.querySelector('#input-file');

let imgData;
chrome.storage.local.get(['backgroundImageData'], (result)=> {
    imgData = result.backgroundImageData;
});

// browse image file
document.querySelector('#browse-img-btn').addEventListener('click', ()=> {
    imgInput.click();
});

imgInput.addEventListener('input', (e)=> {
    readIMGFile(imgInput.files[0]);
});

// read file
function readIMGFile(file) {
    // declare reader
    let reader = new FileReader();
    reader.addEventListener('load', (e)=> {
        imgData = e.target.result;
        dropFile.style.background = '';
        setTimeout(() => {
            dropFile.querySelector('.progress-bar').style.display = `none`;
        }, 200);
        //
        verifyChanges();
    });
    reader.addEventListener('progress', (e)=> {
        dropFile.querySelector('.progress-bar').style.display = ``;
        dropFile.querySelector('.progress-bar').style.width = `${Math.round(e.loaded / file.size * 100)}%`;
    });
    // read file
    reader.readAsDataURL(file);
}

// drag & drop image file
const dropFile = document.querySelector('#drop-file');
dropFile.addEventListener('dragover', (e)=> {
    e.preventDefault();
    dropFile.style.background = 'var(--sl-opaque-background-elements)';
});
dropFile.addEventListener('dragleave', (e)=> {
    e.preventDefault();
    dropFile.style.background = '';
});
dropFile.addEventListener('drop', (e)=> {
   e.preventDefault();
   if (e.dataTransfer.files[0] && e.dataTransfer.files[0].type.includes('image')) {
    readIMGFile(e.dataTransfer.files[0]);
   }
   else {
    dropFile.querySelector('.progress-bar').style.transition = '0s';
    dropFile.querySelector('.progress-bar').style.background = '#f00';
    dropFile.querySelector('.progress-bar').style.width = `100%`;
    showMSG(NotAImage, 0);
   }
});

// add (temp) new engine
const nameInput = document.querySelector('#input-name');
const urlInput = document.querySelector('#input-url');

document.querySelector('#add-engine-btn').addEventListener('click', ()=> {
    if (selector('search-engine').value == 0 && nameInput.value.length > 0 && urlInput.value.length > 0) {
        searchEngines.push({name: nameInput.value, url: urlInput.value, value: selector('search-engine').length});
        // create option element on selectSearchEngine
        let option = document.createElement('option');
        option.value = selector('search-engine').length;
        option.textContent = nameInput.value;
        selector('search-engine').appendChild(option);
        // select new engine on selector
        selector('search-engine').value = selector('search-engine').length-1;
        document.querySelector('#deleteEngineBtn').classList.add('show');
        //
        verifyChanges();
    }
    else {
        showMSG(FillForm, 0);
    }
});

// delete user engine
document.querySelector('#deleteEngineBtn').addEventListener('click', ()=> {
    if(selector('search-engine').value > 3 && searchEngines.length > 3) {
        // select engine to delete
        let engineToDelete = selector('search-engine').querySelector(`option[value="${selector('search-engine').value}"]`);
        // let engineName = engineToDelete.textContent;
        // remove engine from searchEngines array with the index number
        searchEngines = searchEngines.splice(engineToDelete.value);
        // set default value to selectedEngine
        selector('search-engine').value = 1;
        document.querySelector('#deleteEngineBtn').classList.remove('show');
        // remove option element on selectSearchEngine element        
        engineToDelete.remove();
        //
        verifyChanges();
    }
});

// apply changes (all parameters)
submitBtn.addEventListener('click', ()=> {
    // set search engine array and selected
    chrome.storage.local.set({'searchEngines':searchEngines});
    if (selector('search-engine').value != 0) {
        chrome.storage.local.set({'selectedEngine':selector('search-engine').value});
    }
    // set background type
    if (selector('bg-type').value != 3) {
        chrome.storage.local.set({'backgroundType':selector('bg-type').value});
        if (selector('bg-type'.value == 4)) chrome.runtime.sendMessage({dPhotos:{force: false}});
    }
    // set background image data
    if (selector('bg-type').value == 3 && imgData.length > 0) {
        chrome.storage.local.set({'backgroundType':selector('bg-type').value});
        chrome.storage.local.set({'backgroundImageData':imgData});
    }
    // set background type
    chrome.storage.local.set({'backgroundAlign':selector('bg-align').value});
    //
    showMSG(SavedConfig, 1);
});

// alt hidden options
document.querySelector('#alt-hidden-options').addEventListener('click', ()=> {
    document.querySelector('#hidden-options').classList.toggle('show');
});

// reset parameters
document.querySelector('#reset-btn').addEventListener('click', ()=> {
    fetch(chrome.runtime.getURL('src/default-engines.json')).then(res=> {
        res.json().then(defEngines=> {
            chrome.storage.local.set({'searchEngines':defEngines});
        });
    });
    chrome.storage.local.set({'selectedEngine':1});
    chrome.storage.local.set({'backgroundType':2});
    chrome.storage.local.set({'backgroundImageData':''});
    chrome.storage.local.set({'backgroundAlign':'center'});
    chrome.storage.local.set({'dynamicPhotoData':{
        dataURL: '',
        photographer_name: '',
        photographer_url: '',
        qTime: ''
    }});
    //
    showMSG(ParametersReset, 1);
    setTimeout(() => {
        location.reload();
    }, 1000);
});