/* urNotes · Tranzițiile dintre file: un panou pe tot ecranul, în culoarea filei, cu iconița și numele ei.
   Panoul urcă de jos și acoperă ecranul, pagina se schimbă dedesubt, apoi panoul pleacă în sus (sub o secundă).
   Doar când atingi o filă (meniu, bara de jos, legături); niciodată la pornire; dispare cu „reducere mișcare”.
   Stilurile sunt în motion.css (clasele pt-*).
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const pfx = { pending: null, swap: 0, end: 0, fromFx: false, el: null };

/** Fiecare filă: culoarea sistemului (ca iconițele aplicațiilor Apple) și iconița ei. */
const PT_TABS = {
    "tab-dashboard": { color: "#007AFF", icon: "home" },
    "tab-catalog": { color: "#FF9500", icon: "notebook" },
    "tab-statistici": { color: "#5856D6", icon: "chart" },
    "tab-simulator": { color: "#30B0C7", icon: "target" },
    "tab-calendar": { color: "#FF3B30", icon: "calendar" },
    "tab-plan": { color: "#34C759", icon: "timer" },
    "tab-examene": { color: "#AF52DE", icon: "graduation" },
    "tab-setari": { color: "#8E8E93", icon: "user" }
};
const PT_SWAP_MS = 320;
const PT_OUT_MS = 420;

function ptLabel(tabId) {
    const btn = document.querySelector(`.tab-btn.side-link[data-tab="${tabId}"] span, .mobile-nav-btn[data-tab="${tabId}"] span, .subnav-btn[data-tab="${tabId}"] span`);
    return (btn?.textContent || $(tabId)?.querySelector("h2")?.textContent || "").trim();
}

function ptCanPlay(tabId) {
    return Boolean($(tabId)) && ui.activeTab !== tabId && !reduceMotion() && !/jsdom/i.test(navigator.userAgent || "");
}

/** Atingi o filă: desenul acoperă ecranul, pagina se schimbă dedesubt, apoi desenul pleacă. */
function navigateWithFx(tabId) {
    if (!ptCanPlay(tabId)) { clearTimeout(pfx.swap); pfx.pending = null; switchTab(tabId); return; }
    // o atingere nouă cât încă se acoperă: aceeași acoperire, doar ținta se schimbă
    if (pfx.pending) { pfx.pending = tabId; return; }
    const tab = PT_TABS[tabId] || { color: "#8E8E93", icon: "home" };
    clearTimeout(pfx.end);
    pfx.el?.remove();
    const el = document.createElement("div");
    el.className = "pt is-in";
    el.setAttribute("aria-hidden", "true");
    el.style.setProperty("--pt-c", tab.color);
    el.innerHTML = `<div class="pt-panel"><span class="pt-icon">${icon(tab.icon)}</span><b class="pt-name">${escapeHTML(ptLabel(tabId))}</b></div>`;
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
    }, PT_SWAP_MS);
}

/** Navigare fără atingere de filă (căutare, înapoi în browser): pagina apare direct. */
function pageFx() {}
