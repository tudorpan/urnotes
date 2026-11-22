/* urNotes · Ecranul scurt dintre file (1 s).
   0–0,5 s: pe un fond plin apare o pată moale, organică (albastru spre violet), care își schimbă încet forma și se rotește puțin.
   0,5–1 s: pata se deschide din mijloc și crește peste tot ecranul; pagina nouă (deja desenată dedesubt) se vede prin ea,
   iar marginea colorată trece spre colțuri ca un val.
   Animația e SMIL (merge și în Safari, care nu animă forma unui drum din CSS). Nu întârzie nimic și nu oprește atingerile;
   nu apare la pornire, nici cu „reducere mișcare”, nici în testele automate. */
"use strict";

const TAB_LOADER_MS = 1000;
/* Forma petei: șase puncte pe un cerc, la raze diferite, unite cu curbe line (Catmull-Rom → Bézier).
   Toate formele au aceleași puncte, deci trec lin una în alta. */
function tlBlob(radii) {
    const n = radii.length;
    const pts = radii.map((r, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return [Math.cos(a) * r, Math.sin(a) * r]; });
    const f = v => v.toFixed(1);
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
    }
    return `${d}Z`;
}
const TL_BLOBS = [
    [49, 49, 49, 49, 49, 49],
    [53, 48, 51, 55, 47, 51],
    [48, 54, 50, 47, 54, 49],
    [52, 50, 55, 49, 48, 53]
].map(tlBlob);

function tabLoaderEl() {
    let el = document.getElementById("tab-loader");
    if (el) return el;
    el = document.createElement("div");
    el.id = "tab-loader";
    el.className = "tl";
    el.setAttribute("aria-hidden", "true");
    const morph = `<animate class="tl-anim" attributeName="d" begin="indefinite" dur="1s" fill="freeze" calcMode="spline"
        values="${TL_BLOBS[0]};${TL_BLOBS[1]};${TL_BLOBS[2]};${TL_BLOBS[3]};${TL_BLOBS[1]}" keyTimes="0;.22;.45;.7;1"
        keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1;.45 0 .55 1"/>`;
    const turn = `<animateTransform class="tl-anim" attributeName="transform" type="rotate" begin="indefinite" dur="1s" fill="freeze"
        values="-20;55" keyTimes="0;1" calcMode="spline" keySplines=".4 0 .3 1"/>`;
    el.innerHTML = `
        <svg class="tl-svg" width="100%" height="100%" focusable="false">
            <defs>
                <path id="tl-blob" d="${TL_BLOBS[0]}">${morph}</path>
                <linearGradient id="tl-fill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" class="tl-c1"/><stop offset="1" class="tl-c2"/>
                </linearGradient>
                <mask id="tl-mask" maskUnits="userSpaceOnUse" x="-20000" y="-20000" width="40000" height="40000">
                    <rect x="-20000" y="-20000" width="40000" height="40000" fill="#fff"/>
                    <g class="tl-center"><g>${turn}<g>
                        <animateTransform class="tl-anim tl-hole" attributeName="transform" type="scale" begin="indefinite" dur="1s" fill="freeze"
                            values="0;0;1" keyTimes="0;.52;1" calcMode="spline" keySplines="0 0 1 1;.5 0 .45 1"/>
                        <use href="#tl-blob" fill="#000"/>
                    </g></g></g>
                </mask>
            </defs>
            <g mask="url(#tl-mask)">
                <rect class="tl-bg" x="-20000" y="-20000" width="40000" height="40000"/>
                <g class="tl-center"><g>${turn}<g>
                    <animateTransform class="tl-anim tl-grow" attributeName="transform" type="scale" begin="indefinite" dur="1s" fill="freeze"
                        values="0;1.12;1;1;1" keyTimes="0;.17;.28;.52;1" calcMode="spline" keySplines=".3 .7 .4 1;.4 0 .6 1;0 0 1 1;.5 0 .45 1"/>
                    <use href="#tl-blob" fill="url(#tl-fill)"/>
                </g></g></g>
            </g>
        </svg>`;
    document.body.appendChild(el);
    return el;
}

function showTabLoader() {
    if (/jsdom/i.test(navigator.userAgent || "") || reduceMotion()) return;
    const el = tabLoaderEl();
    // pata pornește din mijlocul ecranului și, la final, trebuie să-l acopere cu totul
    const w = window.innerWidth, h = window.innerHeight;
    const reach = Math.ceil(Math.hypot(w, h) / 2 / 42 * 1.04);
    el.querySelectorAll(".tl-center").forEach(g => g.setAttribute("transform", `translate(${w / 2} ${h / 2})`));
    el.querySelector(".tl-grow").setAttribute("values", `0;1.12;1;1;${Math.round(reach * 1.12)}`);
    el.querySelector(".tl-hole").setAttribute("values", `0;0;${reach}`);
    el.classList.remove("is-on");
    void el.offsetWidth;
    el.classList.add("is-on");
    document.body.classList.add("tl-on");
    el.querySelectorAll(".tl-anim").forEach(a => { try { a.beginElement(); } catch (_) { /* fără SMIL: rămâne doar fondul, care pleacă */ } });
    clearTimeout(showTabLoader.t);
    showTabLoader.t = setTimeout(() => {
        el.classList.remove("is-on");
        document.body.classList.remove("tl-on");
    }, TAB_LOADER_MS);
}
