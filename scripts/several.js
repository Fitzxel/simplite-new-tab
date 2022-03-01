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
    if (selectBackgroundType.value == 3 || selectBackgroundType.value == 4) {
        document.querySelector('#custom-background-container').classList.add('show');
    }
})

selectBackgroundType.addEventListener('change', ()=> {
    if (selectBackgroundType.value == 3 || selectBackgroundType.value == 4) {
        document.querySelector('#custom-background-container').classList.add('show');
    }
    else {
        chrome.storage.local.set({'backgroundType':selectBackgroundType.value});
        document.querySelector('#custom-background-container').classList.remove('show');
    }
})

// url background
const urlInput = document.querySelector('#url-input');
const urlButton = document.querySelector('#url-button');

urlInput.addEventListener('focus', ()=> {
    document.querySelector('#custom-bg-form').classList.add('input-focus');
})

urlInput.addEventListener('blur', ()=> {
    document.querySelector('#custom-bg-form').classList.remove('input-focus');
})

urlButton.addEventListener('click', ()=> {
    chrome.storage.local.set({'backgroundType':4});
    chrome.storage.local.set({'backgroundImageData':urlInput.value});
})

// file background
// const inputFile = document.querySelector('#input-file');

// inputFile.addEventListener('change', ()=> {
//     change();
// })

// const data = {
//     file: null,
//     compress_file: null,
//     runtime: null
// }

// async function change() {
//     document.querySelector('.progress-div').classList.add('show');
//     document.querySelector('.progress-div').textContent = 'Uploading...';
//     const file = inputFile.files[0];
//     data.file = file;
//     const image = await filetoImage(file);
//     showMessageInput(file, image);
// }

// function showMessageInput(file, image) {
//     console.log('original image:');
//     const size = (file.size / 1024).toFixed(2);
//     console.log('size: ' + size + " KB");
//     console.log('name: ' + file.name);
//     document.querySelector('#file-name').textContent = file.name || 'Choose file';
//     console.log('type: ' + file.type);
//     console.log('width: ' + image.width + 'px');
//     console.log('height: ' + image.height + 'px');
//     if (file.size > 4000) {
//         compress();
//     }
//     else {
//         chrome.storage.local.set({'backgroundType':3});
//         chrome.storage.local.set({'backgroundImageData':image.src});
//         document.querySelector('.progress-div').textContent = 'Done';
//         setTimeout(() => {
//             document.querySelector('.progress-div').classList.remove('show');
//         }, 1000);
//     }
// }

// compress image script

// async function compress() {
//     console.log('compress...');
//     document.querySelector('.progress-div').textContent = 'Compressing...';
//     const file = data.file;
//     const size = 4000;
//     const startTime = Date.now();
//     const compress_file = await imageConversion.compressAccurately(file, {
//         size
//     });
//     data.runtime = Date.now() - startTime;
//     const compress_image = await filetoImage(compress_file);
//     data.compress_file = compress_file;
//     showMessageCompress(compress_file, compress_image);
// }

// async function filetoImage(file) {
//     console.log('file to image');
//     document.querySelector('.progress-div').textContent = 'Processing...';
//     const dataURL = await imageConversion.filetoDataURL(file);
//     return await imageConversion.dataURLtoImage(dataURL);
// }

// function showMessageCompress(file, image) {
//     console.log('compressed image:');
//     document.querySelector('.progress-div').textContent = 'Compressed...';
//     const size = (file.size / 1024).toFixed(2);
//     const origin_size = 4000;
//     console.log('size: ' + size + " KB (accuracy:" + ((1 - Math.abs(1 - size / origin_size)) * 100).toFixed(2) + "%)");
//     console.log('type: ' + file.type);
//     console.log('width: ' + image.width + 'px');
//     console.log('height: ' + image.height + 'px');
//     console.log('runtime: ' + data.runtime + " ms");
//     chrome.storage.local.set({'backgroundType':3});
//     chrome.storage.local.set({'backgroundImageData':image.src});
//     document.querySelector('.progress-div').textContent = 'Done';
//     setTimeout(() => {
//         document.querySelector('.progress-div').classList.remove('show');
//     }, 1000);
// }