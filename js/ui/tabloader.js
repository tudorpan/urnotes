/* urNotes · Ecranul scurt dintre file (0,65 s): pe un fond plin, trei picături mici se rotesc una în jurul alteia,
   se unesc într-una și pocnesc; în clipa aceea pagina se deschide din mijloc spre margini.
   Pagina nouă se desenează dedesubt în tot acest timp: nu întârzie nimic și nu oprește atingerile.
   Nu apare la pornire, nici cu „reducere mișcare”, nici în testele automate. */
"use strict";

const TAB_LOADER_MS = 650;

function tabLoaderEl() {
    let el = document.getElementById("tab-loader");
    if (el) return el;
    el = document.createElement("div");
    el.id = "tab-loader";
    el.className = "tl";
    el.setAttribute("aria-hidden", "true");
    // filtrul lipește picăturile când se ating (ca apa), fără să le strice forma rotundă
    el.innerHTML = `
        <svg class="tl-svg" viewBox="-30 -30 60 60" width="84" height="84" focusable="false">
            <defs>
                <filter id="tl-goo" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/>
                    <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"/>
                </filter>
            </defs>
            <g class="tl-drops" filter="url(#tl-goo)">
                <g class="tl-orbit">
                    <g><circle class="tl-dot" r="4.6"/></g>
                    <g transform="rotate(120)"><circle class="tl-dot" r="4.6"/></g>
                    <g transform="rotate(240)"><circle class="tl-dot" r="4.6"/></g>
                </g>
            </g>
        </svg>`;
    document.body.appendChild(el);
    return el;
}

function showTabLoader() {
    if (/jsdom/i.test(navigator.userAgent || "") || reduceMotion()) return;
    const el = tabLoaderEl();
    // pornește de la capăt dacă elevul schimbă repede filele
    el.classList.remove("is-on");
    void el.offsetWidth;
    el.classList.add("is-on");
    document.body.classList.add("tl-on");
    clearTimeout(showTabLoader.t);
    showTabLoader.t = setTimeout(() => {
        el.classList.remove("is-on");
        document.body.classList.remove("tl-on");
    }, TAB_LOADER_MS);
}
