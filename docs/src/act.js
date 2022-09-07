const createElement = document.createElement.bind(document);

// set head info
// set page title
document.title = `${docData.title} - Fitzxel`;
// set page description
document.head.querySelector('meta[name="description"]').setAttribute('content', docData.desc);

// page theme
if (!localStorage.getItem('theme')) {
    localStorage.setItem('theme', 'auto');
}
let theme = localStorage.getItem('theme');
function setTheme() {
    if (theme == 'auto') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.querySelector('html').setAttribute('data-theme', 'dark');
        }
        else {
            document.querySelector('html').setAttribute('data-theme', 'light');
        }
    }
    else {
        document.querySelector('html').setAttribute('data-theme', theme);
    }
}
setTheme();

const swtThemeBtn = document.querySelector('#switch-theme-btn');
swtThemeBtn.querySelector('span').textContent = theme.replace(theme[0], theme[0].toLocaleUpperCase());

swtThemeBtn.addEventListener('click', ()=> {
    swtThemeBtn.parentElement.classList.toggle('act');
    swtThemeBtn.parentElement.querySelectorAll('.list button').forEach(button => {
        button.classList.toggle('tabindex');
    });
    setTabIndex();
});
const slctThemeBtns = document.querySelectorAll('.select-theme-btn');
slctThemeBtns.forEach(btn => {
    btn.addEventListener('click', ()=> {
        localStorage.setItem('theme', btn.getAttribute('name'));
        theme = btn.getAttribute('name');
        swtThemeBtn.querySelector('span').textContent = theme.replace(theme[0], theme[0].toLocaleUpperCase());
        setTheme();
    });
});

// page lang
if (!localStorage.getItem('lang')) {
    if (window.navigator.language.includes('es')) {
        localStorage.setItem('lang', 'es');
    }
    else {
        localStorage.setItem('lang', 'en');
    }
}
const lang = localStorage.getItem('lang');

const swtLangBtn = document.querySelector('#switch-lang-btn');
swtLangBtn.querySelector('span').textContent = lang.toLocaleUpperCase();

swtLangBtn.addEventListener('click', ()=> {
    swtLangBtn.parentElement.classList.toggle('act');
    swtLangBtn.parentElement.querySelectorAll('.list button').forEach(button => {
        button.classList.toggle('tabindex');
    });
    setTabIndex();
});
const slctLangBtns = document.querySelectorAll('.select-lang-btn');
slctLangBtns.forEach(btn => {
    // if (btn.getAttribute('name') == lang) {
    //     btn.parentElement.remove();
    // }
    btn.addEventListener('click', ()=> {
        localStorage.setItem('lang', btn.getAttribute('name'));
        location.replace(location.href.replace(`${document.querySelector('html').getAttribute('lang')}/`, `${btn.getAttribute('name')}/`));
    });
});

// close all switchs function
function closeSwitchs() {
    if (swtThemeBtn.parentElement.classList[1] == 'act') {
        swtThemeBtn.parentElement.classList.remove('act');
        swtThemeBtn.parentElement.querySelectorAll('.list button').forEach(button => {
            button.classList.remove('tabindex');
        });
        setTabIndex();
    }
    if (swtLangBtn.parentElement.classList[1] == 'act') {
        swtLangBtn.parentElement.classList.remove('act');
        swtLangBtn.parentElement.querySelectorAll('.list button').forEach(button => {
            button.classList.remove('tabindex');
        });
        setTabIndex();
    }
}

// set article metadata from docData.js
document.querySelector('.metadata').querySelector('.icon').alt = docData.tags;
document.querySelector('.metadata').querySelector('h1').textContent = docData.title;
document.querySelector('.metadata').querySelector('time').dateTime = `${docData.lastDate.getFullYear()}-${docData.lastDate.getMonth()+1}-${docData.lastDate.getDate()}`
document.querySelector('.metadata').querySelector('time').textContent = `Last modified: ${docData.lastDate.getDate()}-${docData.lastDate.getMonth()+1}-${docData.lastDate.getFullYear()}`;
document.querySelector('#docsite-banner').alt = docData.tags;
document.querySelector('#desc').textContent = `'${docData.desc}'`;
document.querySelector('#repo').href = docData.repo;
document.querySelector('#repo').innerHTML = docData.repo;
document.querySelector('#type').textContent = `'${docData.type}'`;
// set languages
let documentFragmentLangs = document.createDocumentFragment();
for (let i = 0; i < docData.programing_langs.length; i++) {
    let li = createElement('li');
    let p = createElement('p');
    p.classList.add('token', 'string');
    p.innerHTML = `'${docData.programing_langs[i].toLocaleUpperCase()}'`;
    li.appendChild(p);
    if (docData.programing_langs.length > i+1) {
        let tokenPunct = createElement('span');
        tokenPunct.classList.add('token', 'punctuation');
        tokenPunct.textContent = ',';
        li.appendChild(tokenPunct);
    }
    documentFragmentLangs.appendChild(li);
}
document.querySelector('#append-langs ul').appendChild(documentFragmentLangs);
// set getIts
let documentFragmentGetIt = document.createDocumentFragment();
for (let i = 0; i < docData.getIt.length; i++) {
    let li = document.createElement('li');
    let p = document.createElement('p');
    p.classList.add('token', 'string');
    p.innerHTML = `'<a href="${docData.getIt[i].url}" target="_blank">${docData.getIt[i].title}</a>'`;
    li.appendChild(p);
    if (docData.getIt.length > i+1) {
        let tokenPunct = document.createElement('span');
        tokenPunct.classList.add('token', 'punctuation');
        tokenPunct.textContent = ',';
        li.appendChild(tokenPunct);
    }
    documentFragmentGetIt.appendChild(li);
}
document.querySelector('#append-getIts ul').appendChild(documentFragmentGetIt);
// set licence text
document.querySelector('#licence').textContent = `'${docData.licence}'`;

// declare setTabIndex function
function setTabIndex() {
    // select all element with tabindex class
    const allE = document.querySelectorAll('.tabindex');
    // set tabIndex attribute for all elements with have tabindex class
    for (let i = 0; i < allE.length; i++) {
        allE[i].tabIndex = i+1;
    }
}

// create "li" elements for each "h2" element
const articleH2 = document.querySelectorAll('.article-body .content h2');

articleH2.forEach(h2 => {
    let li = createElement('li');
    let a = createElement('a');
    a.href = `#${h2.id}`;
    a.textContent = h2.textContent;
    a.classList.add('type-1', 'tabindex');
    li.appendChild(a);
    // append li in aside nav
    document.querySelector('.aside .nav').appendChild(li);
});

// callback for observer
let lastIntersectingScroll = 0;
// when im comment about "entry" im refer to h2 intersecting and to "a" element on the "aside"
function callback(entries, observer) {
    entries.forEach(entry => {
        // if entry is not intersecting and last intersecting scroll is higher to current scrollY, remove "act" class on this entry
        if (!entry.isIntersecting && entry.intersectionRatio < .5 && lastIntersectingScroll > window.scrollY) {
            // console.log(entry);
            // console.log(`salir de ${entry.target.id}`);
            document.querySelector(`.aside ul.nav li a[href="#${entry.target.id}"]`).classList.remove('act');
            // and if this entry have a previous element, add "act" class to this previous element
            if (document.querySelector(`.aside ul.nav li a[href="#${entry.target.id}"]`).parentElement.previousElementSibling) {
                document.querySelector(`.aside ul.nav li a[href="#${entry.target.id}"]`).parentElement.previousElementSibling.querySelector('a').classList.add('act');
            }
        }
        // if entry is intersecting add "act" class on this entry
        if (entry.isIntersecting && entry.intersectionRatio >= .5) {
            // console.log(entry);
            // console.log(`entrar a ${entry.target.id}`);
            // set current value of scrollY on lastIntersectionScroll
            lastIntersectingScroll = window.scrollY;
            document.querySelector(`.aside ul.nav li a[href="#${entry.target.id}"]`).classList.add('act');
            // and if this entry have a previous element, remove "act" class to this previous element
            if (document.querySelector(`.aside ul.nav li a[href="#${entry.target.id}"]`).parentElement.previousElementSibling) {
                document.querySelector(`.aside ul.nav li a[href="#${entry.target.id}"]`).parentElement.previousElementSibling.querySelector('a').classList.remove('act');
            }
            // if (document.querySelector(`.aside ul.nav li a[href="#${entry.target.id}"]`).parentElement.nextElementSibling) {
            //     document.querySelector(`.aside ul.nav li a[href="#${entry.target.id}"]`).parentElement.nextElementSibling.querySelector('a').parentElement.classList.remove('act');
            // }
        }
    });
}
// declare observer
const observer = new IntersectionObserver(callback, {
    rootMargin: "0px",
    threshold: .5
});
// observe h2 intersection
articleH2.forEach(h2 => {
    observer.observe(h2);
});

// dropdown (projects-nav and the aside)
let dropdownOpen = false;

document.querySelector('#menu-btn').addEventListener('click', ()=> {
    if (!dropdownOpen) {
        if (window.innerWidth <= 600) {
            document.querySelector('.projects-nav').style.transform = `translateY(${document.querySelector('.aside').offsetHeight}px)`;
        }
        else {
            document.querySelector('.aside').style.height = `${document.querySelector('.projects-nav').offsetHeight}px`;
        }
        document.querySelector('main').classList.add('dropdown-open');
        dropdownOpen = true;
    }
    else {
        document.querySelector('.projects-nav').style.transform = '';
        document.querySelector('main').classList.remove('dropdown-open');
        dropdownOpen = false;
    }
});

// declare indexData variable
let indexData;

// events and actions on the document and the body
document.addEventListener('DOMContentLoaded', ()=> {
    setTabIndex();

    //if is on line
    if (window.navigator.onLine == true) {
        // apply an icon to all "a" items that open in a new tab
        document.querySelectorAll('a[target="_blank"]').forEach(a => {
            let icon = createElement('span');
            icon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="ionicon a-icon" viewBox="0 0 512 512">
                <title>Open</title>
                <path d="M384 224v184a40 40 0 01-40 40H104a40 40 0 01-40-40V168a40 40 0 0140-40h167.48M336 64h112v112M224 288L440 72" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
            </svg>`
            a.appendChild(icon);
        });
        // get index.json
        fetch('https://fitzxel.github.io/data/fx-index.json').then(res=> {
            if (res.status >= 200 && res.status <= 299) {
                res.json().then(res=> {
                    indexData = res;
                    // create and get search.js script
                    let searchScript = createElement('script');
                    searchScript.src = 'https://fitzxel.github.io/src/js/search.js';
                    document.body.appendChild(searchScript);
                    // create and get projects-nav.js script
                    let projectsNavScript = createElement('script');
                    projectsNavScript.src = 'https://fitzxel.github.io/src/js/projects-nav.js';
                    document.body.appendChild(projectsNavScript);
                });
            }
            else if (res.status >= 400 && res.status <= 499) {
                document.querySelector('#search-input').placeholder = `An error has occurred (${res.status})`;
            }
        });
    }
    else console.log('not online');
});
document.body.addEventListener('keydown', (e)=>{
    if (e.key == 'Escape') {
        e.preventDefault();
        closeSwitchs();
    }
});
document.body.addEventListener('click', (e)=>{
    if (!e.composedPath().find(element => element.nodeName == 'NAV') && !e.composedPath().find(element => element.nodeName == 'ASIDE') && dropdownOpen && !e.composedPath().find(element => element.nodeName == 'HEADER')) {
        document.querySelector('main').classList.remove('dropdown-open');
    }
    if (!e.composedPath().find(element => element.nodeName == 'BUTTON')) {
        closeSwitchs();
    }
});

// window events
window.addEventListener('resize', ()=> {
    if (window.innerWidth <= 600 && dropdownOpen) {
        document.querySelector('.projects-nav').style.transform = `translateY(${document.querySelector('.aside').offsetHeight}px)`;
        document.querySelector('.aside').style.height = '';
    }
    else if (window.innerWidth > 600) {
        document.querySelector('.projects-nav').style.transform = '';
        document.querySelector('.aside').style.height = `${document.querySelector('.projects-nav').offsetHeight}px`;
    }
    if (window.innerWidth > 910) {
        document.querySelector('.aside').style.height = ``;
    }
});