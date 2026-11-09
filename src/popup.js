// popup scripts
const langData = JSON.parse(chrome.i18n.getMessage('options_html'));

const Without_changes = langData[0].variants.Without_changes;
const Unsaved_changes = langData[0].variants.Unsaved_changes;
const NotAImage = langData[0].variants.NotAImage;
const FillForm = langData[0].variants.FillForm;
const SavedConfig = langData[0].variants.SavedConfig;
const ParametersReset = langData[0].variants.ParametersReset;

langData.forEach(obj => {
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
    chrome.storage.local.get(['backgroundType', 'backgroundAlign', 'backgroundImageData', 'backgroundQuality'], (result)=> {
        if (result.backgroundType == selector('bg-type').value && result.backgroundImageData == imgData && result.backgroundAlign == selector('bg-align').value && result.backgroundQuality == selector('bg-quality').value) {
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

// background quality
chrome.storage.local.get(['backgroundQuality'], (result)=> {
    selector('bg-quality').value = result.backgroundQuality;
});

selector('bg-quality').addEventListener('input', ()=> {
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

// apply changes (all parameters)
submitBtn.addEventListener('click', ()=> {
    // set background type
    if (selector('bg-type').value != 3) {
        chrome.storage.local.set({'backgroundType':selector('bg-type').value});
        if (selector('bg-type').value == 4) chrome.runtime.sendMessage({dynamicBg:{force: false, type: 'photos'}});
        if (selector('bg-type').value == 5) chrome.runtime.sendMessage({dynamicBg:{force: false, type: 'videos'}});
    }
    // set background image data
    if (selector('bg-type').value == 3 && imgData.length > 0) {
        chrome.storage.local.set({'backgroundType':selector('bg-type').value});
        chrome.storage.local.set({'backgroundImageData':imgData});
    }
    // set background type
    chrome.storage.local.set({'backgroundAlign':selector('bg-align').value});
    // set background quality
    chrome.storage.local.set({'backgroundQuality':selector('bg-quality').value});
    //
    showMSG(SavedConfig, 1);
});

// alt hidden options
document.querySelector('#alt-hidden-options').addEventListener('click', ()=> {
    document.querySelector('#hidden-options').classList.toggle('show');
});

// reset parameters
document.querySelector('#reset-btn').addEventListener('click', ()=> {
    chrome.storage.local.set({'backgroundType':2});
    chrome.storage.local.set({'backgroundImageData':''});
    chrome.storage.local.set({'backgroundAlign':'center'});
    chrome.storage.local.set({'backgroundQuality':'med'});
    chrome.storage.local.set({'dynamicPhotoData':{
        dataURL: '',
        photographer_name: '',
        photographer_url: '',
        qTime: ''
    }});
    chrome.storage.local.set({'dynamicVideoData':{
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