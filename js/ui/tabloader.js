/* urNotes · Ecranul scurt dintre file (0,9 s), în felul iOS:
   pagina se topește într-o ceață adâncă, pe marginile ecranului curge o lumină moale (albastru, violet, roz, chihlimbar),
   apoi ceața se risipește și pagina nouă, deja gata dedesubt, intră în focus.
   Nu întârzie nimic și nu oprește atingerile; nu apare la pornire, nici cu „reducere mișcare”, nici în testele automate. */
"use strict";

const TAB_LOADER_MS = 900;

function tabLoaderEl() {
    let el = document.getElementById("tab-loader");
    if (el) return el;
    el = document.createElement("div");
    el.id = "tab-loader";
    el.className = "tl";
    el.setAttribute("aria-hidden", "true");
    // două straturi de lumină: o aură largă și moale, și un fir subțire, mai clar, chiar pe margine
    el.innerHTML = `<i class="tl-glow tl-glow-wide"></i><i class="tl-glow tl-glow-line"></i>`;
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
