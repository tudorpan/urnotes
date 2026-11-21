/* urNotes · Tranzițiile dintre file: un desen mare acoperă tot ecranul, pagina se schimbă dedesubt, desenul pleacă.
   Fiecare filă are desenul ei, în stilul Raftului liniștit: Azi = un post-it uriaș, Note = un rând de cotoare de cărți,
   Progres = bare care urcă, Ce-ar fi dacă = o foaie de matematică, Calendar = o filă de calendar care se rupe,
   Plan = o fișă liniată, Examene = o foaie cu ștampila, Eu = permisul de cititor care se întoarce.
   Doar când atingi o filă (meniu, bara de jos, legături); niciodată la pornire. Durează sub o secundă și dispare
   complet cu „reducere mișcare”. Stilurile sunt în motion.css (clasele pt-*).
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const pfx = { pending: null, swap: 0, end: 0, fromFx: false, el: null };

const PT_KEY = {
    "tab-dashboard": "azi", "tab-catalog": "note", "tab-statistici": "prog", "tab-simulator": "sim",
    "tab-calendar": "cal", "tab-plan": "plan", "tab-examene": "exam", "tab-setari": "eu"
};
/** Cât durează acoperirea (ms), după care pagina se schimbă; plecarea durează PT_OUT_MS. */
const PT_SWAP = { note: 430, prog: 430, def: 330 };
const PT_OUT_MS = 560;
const PT_BOOKS = ["#7FA89A", "#C9956B", "#8C9AC4", "#C98C86", "#A4AE7C", "#A88FB6", "#7FAAB2"];

function ptLabel(tabId) {
    const btn = document.querySelector(`.tab-btn.side-link[data-tab="${tabId}"] span, .mobile-nav-btn[data-tab="${tabId}"] span, .subnav-btn[data-tab="${tabId}"] span`);
    return (btn?.textContent || $(tabId)?.querySelector("h2")?.textContent || "").trim();
}

/** Desenul fiecărei file (HTML simplu; mișcarea e în motion.css). */
function ptArt(key, label) {
    const now = new Date();
    const L = escapeHTML(label);
    switch (key) {
        case "azi": return `
            <div class="pt-postit"><div class="pt-postit-in"><span class="pt-tape"></span>
                <b class="pt-word">Azi</b><small class="pt-sub">${escapeHTML(`${WEEKDAY_LONG[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()].toLowerCase()}`)}</small></div></div>`;
        case "note": return `
            <div class="pt-books">${PT_BOOKS.map((c, i) => `<i style="--k:${i};--c:${c}"></i>`).join("")}</div>
            <b class="pt-label">${L}</b>`;
        case "prog": return `
            <div class="pt-bars">${Array.from({ length: 8 }, (_, i) => `<i style="--k:${i}" class="${i % 3 === 1 ? "is-y" : i % 3 === 2 ? "is-ink" : ""}"></i>`).join("")}</div>
            <b class="pt-label">${L}</b>`;
        case "sim": return `
            <div class="pt-graph"><span class="pt-q">?</span><b class="pt-word pt-word-sm">${L}</b></div>`;
        case "cal": return `
            <div class="pt-calpage"><div class="pt-calband"><span></span><span></span><em>${escapeHTML(WEEKDAY_LONG[now.getDay()])}</em></div>
                <b class="pt-calday">${now.getDate()}</b><small class="pt-sub">${escapeHTML(MONTHS[now.getMonth()].toLowerCase())}</small></div>`;
        case "plan": return `
            <div class="pt-lined"><div class="pt-lined-in"><b class="pt-word">${L}</b>
                <svg class="pt-check" viewBox="0 0 60 40" aria-hidden="true"><path d="M5 22 L22 35 L55 5" pathLength="1"/></svg></div></div>`;
        case "exam": return `
            <div class="pt-exampaper"><span class="pt-stamp">${L}</span></div>`;
        case "eu": return `
            <div class="pt-card"><div class="pt-cardband">Permis de cititor</div>
                <div class="pt-cardbody"><span class="pt-photo"></span><span class="pt-lines"><i></i><i></i><i></i></span></div>
                <span class="pt-barcode"></span></div>`;
        default: return `<div class="pt-wipe"></div><b class="pt-label">${L}</b>`;
    }
}

function ptCanPlay(tabId) {
    return Boolean($(tabId)) && ui.activeTab !== tabId && !reduceMotion() && !/jsdom/i.test(navigator.userAgent || "");
}

/** Atingi o filă: desenul acoperă ecranul, pagina se schimbă dedesubt, apoi desenul pleacă. */
function navigateWithFx(tabId) {
    if (!ptCanPlay(tabId)) { clearTimeout(pfx.swap); pfx.pending = null; switchTab(tabId); return; }
    // o atingere nouă cât încă se acoperă: aceeași acoperire, doar ținta se schimbă
    if (pfx.pending) { pfx.pending = tabId; return; }
    const key = PT_KEY[tabId] || "def";
    clearTimeout(pfx.end);
    pfx.el?.remove();
    const el = document.createElement("div");
    el.className = `pt pt-${key} is-in`;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = ptArt(key, ptLabel(tabId));
    document.body.appendChild(el);
    document.body.classList.add("pt-run");
    pfx.el = el;
    pfx.pending = tabId;
    pfx.swap = setTimeout(() => {
        const target = pfx.pending;
        pfx.pending = null;
        pfx.fromFx = true;
        switchTab(target);
        pfx.fromFx = false;
        el.classList.replace("is-in", "is-out");
        pfx.end = setTimeout(() => {
            el.remove();
            if (pfx.el === el) { pfx.el = null; document.body.classList.remove("pt-run"); }
        }, PT_OUT_MS);
    }, PT_SWAP[key] || PT_SWAP.def);
}

/** Navigare fără atingere de filă (căutare, înapoi în browser): pagina apare direct. */
function pageFx() {}
