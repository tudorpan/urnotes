/* urNotes · Pagina Azi, așa cum o vrei: ce carduri vezi și în ce ordine (Eu › Pagina Azi).
   Cardurile se desenează ca de obicei (js/azi/azi.js); aici doar se ascund și se reordonează, după ce s-au desenat.
   Primele două (Pe scurt, Materiile tale) stau mereu sus: se pot doar ascunde. Celelalte se mută între ele.
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const AZI_CARDS = [
    { id: "azi-tiles", name: "Pe scurt (cifrele zilei)", fixed: true },
    { id: "azi-subjects", name: "Materiile tale", fixed: true },
    { id: "azi-next", name: "Acum (următorul lucru)" },
    { id: "azi-day", name: "Orele zilei" },
    { id: "azi-todo", name: "De făcut" },
    { id: "azi-plan", name: "Planul de azi" },
    { id: "azi-focus", name: "La note" },
    { id: "azi-week", name: "Săptămâna" },
    { id: "azi-year", name: "Anul școlar" }
];
const AZI_MOVABLE = AZI_CARDS.filter(c => !c.fixed).map(c => c.id);

function sanitizeAziLayout(v) {
    const ids = new Set(AZI_CARDS.map(c => c.id));
    const o = isPlainObject(v) ? v : {};
    const order = Array.isArray(o.order) ? [...new Set(o.order.filter(id => AZI_MOVABLE.includes(id)))] : [];
    const hidden = Array.isArray(o.hidden) ? [...new Set(o.hidden.filter(id => ids.has(id)))] : [];
    return { order, hidden };
}
/** Ordinea cardurilor mutabile: cea aleasă, apoi cele noi la coadă, în ordinea lor obișnuită. */
function aziOrder() {
    const saved = sanitizeAziLayout(state.settings.aziLayout).order;
    return [...saved, ...AZI_MOVABLE.filter(id => !saved.includes(id))];
}

/** După ce Azi s-a desenat: ascunde ce ai ascuns și pune cardurile în ordinea ta. */
function applyAziLayout() {
    const L = sanitizeAziLayout(state.settings.aziLayout);
    AZI_CARDS.forEach(c => $(c.id)?.classList.toggle("is-user-off", L.hidden.includes(c.id)));
    const custom = L.order.length > 0;
    aziOrder().forEach((id, i) => {
        const el = $(id);
        if (!el) return;
        // pe ecrane mari fiecare coloană își păstrează cardurile; pe telefon e o singură coloană, în ordinea ta
        el.style.order = custom ? String(10 + i) : "";
    });
}

function renderAziLayoutSetting() {
    const box = $("azi-layout-setting");
    if (!box) return;
    const L = sanitizeAziLayout(state.settings.aziLayout);
    const order = aziOrder();
    const row = (c, i, n) => {
        const off = L.hidden.includes(c.id);
        return `<li class="al-row ${off ? "is-off" : ""}">
            <label class="al-check"><input type="checkbox" data-action="azi-card-toggle" data-card="${c.id}" ${off ? "" : "checked"}> <span>${escapeHTML(c.name)}</span></label>
            ${c.fixed ? `<span class="al-pin">sus</span>` : `
            <span class="al-moves">
                <button type="button" class="icon-btn al-move" data-action="azi-card-move" data-card="${c.id}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="${escapeHTML(c.name)}: mai sus">${icon("arrow-up")}</button>
                <button type="button" class="icon-btn al-move" data-action="azi-card-move" data-card="${c.id}" data-dir="1" ${i === n - 1 ? "disabled" : ""} aria-label="${escapeHTML(c.name)}: mai jos">${icon("arrow-down")}</button>
            </span>`}
        </li>`;
    };
    const movable = order.map(id => AZI_CARDS.find(c => c.id === id));
    box.innerHTML = `<ul class="al-list">${AZI_CARDS.filter(c => c.fixed).map(c => row(c, 0, 1)).join("")}${movable.map((c, i) => row(c, i, movable.length)).join("")}</ul>
        ${L.order.length || L.hidden.length ? `<button type="button" class="btn btn-text btn-sm mt-2" data-action="azi-layout-reset">Ca la început</button>` : ""}`;
}

function setAziCard(id, { toggle = false, move = 0, reset = false } = {}) {
    if (!requireAccount()) { renderAziLayoutSetting(); return; }
    const L = sanitizeAziLayout(state.settings.aziLayout);
    if (reset) { L.order = []; L.hidden = []; }
    if (toggle) L.hidden = L.hidden.includes(id) ? L.hidden.filter(x => x !== id) : [...L.hidden, id];
    if (move) {
        const order = aziOrder(), i = order.indexOf(id), j = i + move;
        if (i >= 0 && j >= 0 && j < order.length) { [order[i], order[j]] = [order[j], order[i]]; L.order = order; }
    }
    state.settings.aziLayout = L;
    saveState();
    // lista din Eu alunecă în noua ordine (js/ui/fluid.js)
    flipMove("#azi-layout-setting .al-row", el => el.querySelector("[data-card]")?.dataset.card || "", () => renderAziLayoutSetting(), { land: move ? id : null });
    if (move) document.querySelector(`#azi-layout-setting [data-card="${id}"][data-dir="${move}"]:not([disabled])`)?.focus({ preventScroll: true })
        || document.querySelector(`#azi-layout-setting [data-card="${id}"][data-dir="${-move}"]`)?.focus({ preventScroll: true });
    applyAziLayout();
    haptic();
}
