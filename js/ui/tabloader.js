/* urNotes · Ecranul scurt dintre file: fond plin și un inel subțire, cu o coadă care se stinge, care se rotește o dată (~0,6 s).
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
    el.innerHTML = `<span class="tl-ring"></span>`;
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
