document.addEventListener('submit', (e)=> {
    e.preventDefault();
});

document.querySelector('#search-input').parentElement.classList.remove('not-allowed');

const searchInput = document.querySelector('#search-input');
const searchResults = document.querySelector('#search-results');
let searchFocus = false;
let notBlur = false;

function showRelevantsResults() {
    let allA = searchResults.querySelectorAll('a');
    allA.forEach(element => {
        element.remove();
    });
    let documentFragment = document.createDocumentFragment();
    indexData.forEach(result => {
        if (result.search.relevant) {
            let a = createElement('a');
            a.href = result.url;
            a.textContent = result.title;
            let h3 = createElement('h3');
            h3.textContent = result.desc;
            a.appendChild(h3);
            documentFragment.appendChild(a);
        }
        searchResults.appendChild(documentFragment);
        searchResults.querySelector('a').classList.add('act');
    });
}

searchInput.addEventListener('focus', ()=> {
    searchFocus = true;
    searchResults.style.display = 'block';
    showRelevantsResults();
});
searchInput.addEventListener('blur', ()=> {
    searchFocus = false;
    if (notBlur == false) {
        searchResults.style.display = '';
    }
});

searchResults.addEventListener('mouseenter', ()=> {
    notBlur = true;
});
searchResults.addEventListener('mouseleave', ()=> {
    notBlur = false;
});
searchResults.addEventListener('mouseup', ()=> {
    searchResults.style.display = '';
});

searchInput.addEventListener('input', ()=> {
    let allA = searchResults.querySelectorAll('a');
    let string = searchInput.value;
    if (searchInput.value.length > 0) {
        let documentFragment = document.createDocumentFragment();
        indexData.forEach(result => {
            if (result.search.index) {
                if (result.title.toLocaleLowerCase().includes(string) || result.desc.toLocaleLowerCase().includes(string)) {
                    let a = document.createElement('a');
                    a.href = result.url;
                    let span = document.createElement('span');
                    span.textContent = result.title;
                    a.appendChild(span);
                    let h3 = document.createElement('h3');
                    h3.textContent = result.desc;
                    a.appendChild(h3);
                    documentFragment.appendChild(a);
                    
                }
                else {
                    searchResults.querySelector('.over-text').textContent = 'Not results';
                }
            }
        });
        allA.forEach(element => {
            element.remove();
        });
        searchResults.appendChild(documentFragment);
        searchResults.querySelector('a').classList.add('act');
    }
    else {
        searchResults.querySelector('.over-text').textContent = 'Results';
        showRelevantsResults();
    }
});


// searchInput.addEventListener('input', ()=> {
//     let allA = searchResults.querySelectorAll('a');
//     let string = searchInput.value;
//     if (searchInput.value.length > 0) {
//         let documentFragment = document.createDocumentFragment();
//         searchResultsList.forEach(searchResult => {
//             if (searchResult.name.toLocaleLowerCase().includes(string) || searchResult.desc.toLocaleLowerCase().includes(string)) {
//                 let a = document.createElement('a');
//                 a.href = searchResult.url;
//                 let span = document.createElement('span');
//                 span.textContent = searchResult.name;
//                 a.appendChild(span);
//                 let h3 = document.createElement('h3');
//                 h3.textContent = searchResult.desc;
//                 a.appendChild(h3);
//                 documentFragment.appendChild(a);
                
//             }
//             else {
//                 searchResults.querySelector('.over-text').innerHTML = 'Not results';
//             }

//             // NOT WORKING 100%
//             // if (searchResult.name != prevResult) {
//             //     searchInput.value.split(' ').forEach(string => {
//             //         string = string.toLocaleLowerCase();
//             //         if (searchResult.name.toLocaleLowerCase().includes(string) || searchResult.desc.toLocaleLowerCase().includes(string)) {
//             //             let name_pos = [
//             //                 searchResult.name.toLocaleLowerCase().indexOf(string),
//             //                 searchResult.name.toLocaleLowerCase().indexOf(string) + string.length
//             //             ];
//             //             let desc_pos = [
//             //                 searchResult.desc.toLocaleLowerCase().indexOf(string),
//             //                 searchResult.desc.toLocaleLowerCase().indexOf(string) + string.length
//             //             ];
//             //             let a = document.createElement('a');
//             //             a.href = searchResult.url;
//             //             let span = document.createElement('span');
//             //             span.innerHTML = searchResult.name.replaceAll(searchResult.name.slice(name_pos[0], name_pos[1]), `<b>${searchResult.name.slice(name_pos[0], name_pos[1])}</b>`);
//             //             // span.textContent = searchResultsList[i].name.toLocaleLowerCase().replaceAll(searchInput.value.toLocaleLowerCase(), `<b>${searchResultsList[i].name.slice(searchInput.value.toLocaleLowerCase(), searchInput.value.length)}</b>`);
//             //             a.appendChild(span);
//             //             let h3 = document.createElement('h3');
//             //             h3.innerHTML = searchResult.desc.replaceAll(searchResult.desc.slice(desc_pos[0], desc_pos[1]), `<b>${searchResult.desc.slice(desc_pos[0], desc_pos[1])}</b>`);
//             //             a.appendChild(h3);
//             //             documentFragment.appendChild(a);
                        
//             //         }
//             //         else {
//             //             searchResults.querySelector('.over-text').innerHTML = 'Not results';
//             //         }
//             //     });
//             // }
//         });
//         allA.forEach(element => {
//             element.remove();
//         });
//         searchResults.appendChild(documentFragment);
//         allA = searchResults.querySelectorAll('a');
//         allA[0].classList.add('act');
//     }
//     else {
//         searchResults.querySelector('.over-text').innerHTML = 'Results';
//         showRelevantsResults();
//     }
// });

searchInput.addEventListener('keydown', (e)=> {
    let allA = searchResults.querySelectorAll('a');
    let a = searchResults.querySelector('a.act');
    if (e.key == 'ArrowUp') {
        if (a.previousElementSibling.nodeName == 'A') {
            a.classList.remove('act');
            a.previousElementSibling.classList.add('act');
        }
        else {
            a.classList.remove('act');
            allA[allA.length-1].classList.add('act');
        }
    }
    if (e.key == 'ArrowDown') {
        if (a.nextElementSibling && a.nextElementSibling.nodeName == 'A') {
            a.classList.remove('act');
            a.nextElementSibling.classList.add('act');
        }
        else {
            a.classList.remove('act');
            allA[0].classList.add('act');
        }
    }
    if (e.key == 'Enter') {
        a.click();
    }
});