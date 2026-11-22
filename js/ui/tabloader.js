/* urNotes · Ecranul scurt dintre file: trei picături care se rotesc, se topesc într-una și dispar (~0,6 s).
   Pagina nouă se desenează dedesubt în tot acest timp: nu întârzie nimic și nu oprește atingerile.
   Nu apare la pornire, nici cu „reducere mișcare”, nici în testele automate. */
"use strict";

const TAB_LOADER_MS = 620;

function tabLoaderEl() {
    let el = document.getElementById("tab-loader");
    if (el) return el;
    el = document.createElement("div");
    el.id = "tab-loader";
    el.className = "tl";
    el.setAttribute("aria-hidden", "true");
    // filtrul „goo”: încețoșează picăturile și le taie marginea din nou, așa că se lipesc când se apropie
    el.innerHTML = `
        <svg class="tl-svg" viewBox="0 0 120 120" width="104" height="104" focusable="false">
            <defs>
                <filter id="tl-goo" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="blur"/>
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo"/>
                    <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
                </filter>
                <radialGradient id="tl-shine" cx="35%" cy="30%" r="70%">
                    <stop offset="0" stop-color="#fff" stop-opacity=".75"/>
                    <stop offset=".45" stop-color="#fff" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <g filter="url(#tl-goo)">
                <g class="tl-orbit">
                    <circle class="tl-d tl-d1" cx="60" cy="28" r="13"/>
                    <circle class="tl-d tl-d2" cx="88" cy="76" r="13"/>
                    <circle class="tl-d tl-d3" cx="32" cy="76" r="13"/>
                </g>
                <circle class="tl-core" cx="60" cy="60" r="11"/>
            </g>
            <circle class="tl-shine" cx="60" cy="60" r="11" fill="url(#tl-shine)"/>
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
