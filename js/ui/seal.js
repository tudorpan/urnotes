/* urNotes · Sigiliul tău: avatarul din aplicație, făcut de tine în „Atelierul sigiliului”.
   Un sigiliu are o formă, o ceară, o margine și ceva gravat în mijloc (1–2 litere, pictograma unei materii sau un simbol).
   Formele, marginile, cerurile și simbolurile mai rare se deblochează pe măsură ce strângi sigilii (realizări).
   Același desen apare pe butonul Eu, în profil, lângă salutul din Azi, la momentele bune și în colecție.
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

/* ---------- ce poți alege; `at` = câte sigilii îți trebuie ca să se deblocheze ---------- */
const SEAL_SHAPES = {
    ceara: { name: "Ceară", at: 0 },
    floare: { name: "Floare", at: 1 },
    hexagon: { name: "Hexagon", at: 2 },
    scut: { name: "Scut", at: 4 },
    stea: { name: "Stea", at: 6 }
};
// lamp = culoarea lămpii tale (se schimbă cu ea); dark = ceară închisă, cu gravura deschisă
const SEAL_WAX = {
    lamp: { name: "Lampa", at: 0 },
    aur: { name: "Aur", c: "#E3AE4E", at: 0 },
    trandafir: { name: "Trandafir", c: "#E39A8C", at: 0 },
    luna: { name: "Lună", c: "#AFC2EC", at: 0 },
    jad: { name: "Jad", c: "#84C9A6", at: 0 },
    cerneala: { name: "Cerneală", c: "#2E3F78", dark: true, at: 2 },
    visiniu: { name: "Vișiniu", c: "#8C2D46", dark: true, at: 3 }
};
const SEAL_RIMS = {
    simplu: { name: "Simplă", at: 0 },
    punctat: { name: "Punctată", at: 1 },
    dublu: { name: "Dublă", at: 2 },
    franghie: { name: "Frânghie", at: 3 },
    lauri: { name: "Lauri", at: 5 }
};
// simbolurile: desenate pe grila de 24, ca pictogramele materiilor
const SEAL_SYMBOLS = {
    stea: { name: "Stea", at: 0, d: `<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>` },
    luna: { name: "Lună", at: 0, d: `<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>` },
    scanteie: { name: "Scânteie", at: 0, d: `<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M18.5 16.5c.2 1.4.8 2 2.2 2.2-1.4.2-2 .8-2.2 2.2-.2-1.4-.8-2-2.2-2.2 1.4-.2 2-.8 2.2-2.2z"/>` },
    inima: { name: "Inimă", at: 1, d: `<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>` },
    pana: { name: "Pană", at: 1, d: `<path d="M19.5 4.5c-6 0-11 4-11.5 11l-2.5 4"/><path d="M19.5 4.5C19 11 15 15 9 15.5"/><path d="M11 11.5h4M10 14l3.5-.2"/>` },
    flacara: { name: "Flacără", at: 2, d: `<path d="M12 20.5a6 6 0 0 1-6-6c0-3.5 2.5-5.5 3.5-9 2 1.5 3 3.5 3 5.5 1-.5 1.8-1.5 2-3 1.8 1.6 3.5 4 3.5 6.5a6 6 0 0 1-6 6z"/><path d="M12 20.5a2.5 2.5 0 0 1-2.5-2.5c0-1.6 1.2-2.4 2.5-4 1.3 1.6 2.5 2.4 2.5 4a2.5 2.5 0 0 1-2.5 2.5z"/>` },
    fulger: { name: "Fulger", at: 2, d: `<path d="M13.5 3L5.5 13.5h6L10.5 21l8-10.5h-6z"/>` },
    cheie: { name: "Cheie", at: 3, d: `<circle cx="8" cy="8.5" r="4"/><path d="M11 11.5l8.5 8.5M16 16.5l2-2M18 18.5l2-2"/>` },
    ancora: { name: "Ancoră", at: 3, d: `<circle cx="12" cy="5.5" r="2"/><path d="M12 7.5v13M8.5 11h7"/><path d="M4.5 13.5a7.5 7.5 0 0 0 15 0"/><path d="M4.5 13.5l-1 1.8M4.5 13.5l1.9.6M19.5 13.5l1 1.8M19.5 13.5l-1.9.6"/>` },
    soare: { name: "Soare", at: 4, d: `<circle cx="12" cy="12" r="4"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>` },
    infinit: { name: "Infinit", at: 4, d: `<path d="M12 12c-2-2.8-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.2 5.5-4zm0 0c2 2.8 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.2-5.5 4z"/>` },
    coroana: { name: "Coroană", at: 5, d: `<path d="M4 17.5L3 7.5l5 4 4-6.5 4 6.5 5-4-1 10z"/><path d="M4.5 20.5h15"/>` }
};

const SEAL_DEFAULT = { shape: "ceara", wax: "lamp", rim: "simplu", kind: "letters", letters: "", icon: "", symbol: "stea" };

/** Câte sigilii (realizări) ai: de ele depind deblocările din atelier. */
const sealCount = () => (typeof ACHIEVEMENTS !== "undefined" ? ACHIEVEMENTS.filter(a => state.achievements?.[a.key]).length : 0);
const sealOpen = (item, n = sealCount()) => (item?.at || 0) <= n;

/** Sigiliul salvat (curățat): ce nu există sau nu e încă deblocat revine la implicit. */
function userSeal() {
    const s = isPlainObject(state.settings.seal) ? state.settings.seal : {};
    const n = sealCount();
    const pick = (map, key, def) => (map[key] && sealOpen(map[key], n) ? key : def);
    return {
        shape: pick(SEAL_SHAPES, s.shape, "ceara"),
        wax: pick(SEAL_WAX, s.wax, "lamp"),
        rim: pick(SEAL_RIMS, s.rim, "simplu"),
        kind: ["letters", "icon", "symbol"].includes(s.kind) ? s.kind : "letters",
        letters: typeof s.letters === "string" ? s.letters.replace(/\s+/g, "").slice(0, 2) : "",
        icon: typeof s.icon === "string" && typeof SUBJECT_ICONS !== "undefined" && SUBJECT_ICONS[s.icon] ? s.icon : "",
        symbol: pick(SEAL_SYMBOLS, s.symbol, "stea")
    };
}
/** Curăță un sigiliu venit din salvare / din alt dispozitiv (fără verificarea deblocărilor: aia se face la afișare). */
function sanitizeSeal(s) {
    if (!isPlainObject(s)) return { ...SEAL_DEFAULT };
    const pick = (map, key, def) => (typeof key === "string" && map[key] ? key : def);
    return {
        shape: pick(SEAL_SHAPES, s.shape, "ceara"),
        wax: pick(SEAL_WAX, s.wax, "lamp"),
        rim: pick(SEAL_RIMS, s.rim, "simplu"),
        kind: ["letters", "icon", "symbol"].includes(s.kind) ? s.kind : "letters",
        letters: typeof s.letters === "string" ? s.letters.replace(/[\s<>"'&]+/g, "").slice(0, 2) : "",
        icon: typeof s.icon === "string" ? s.icon.slice(0, 20) : "",
        symbol: pick(SEAL_SYMBOLS, s.symbol, "stea")
    };
}

/* ---------- desenul ---------- */
let sealArtSeq = 0;
function sealOutline(shape, seedText) {
    let seed = [...String(seedText || "u")].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const smooth = pts => {
        const N = pts.length, mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        let d = `M${mid(pts[N - 1], pts[0]).map(n => n.toFixed(1)).join(" ")}`;
        for (let i = 0; i < N; i++) {
            const m = mid(pts[i], pts[(i + 1) % N]);
            d += `Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
        }
        return `${d}Z`;
    };
    const ring = (N, r0, f) => Array.from({ length: N }, (_, i) => { const a = (i / N) * Math.PI * 2 - Math.PI / 2; const r = f(i, r0); return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r]; });
    if (shape === "floare") return smooth(ring(24, 47, (i, r) => (i % 2 ? r - 5.5 : r)));
    if (shape === "stea") return smooth(ring(16, 48, (i, r) => (i % 2 ? r - 11 : r + 1)));
    if (shape === "hexagon") {
        // colțuri rotunjite: câte două puncte lângă fiecare colț
        const pts = [];
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2, b = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
            const P = [50 + Math.cos(a) * 47, 50 + Math.sin(a) * 47], Q = [50 + Math.cos(b) * 47, 50 + Math.sin(b) * 47];
            pts.push([P[0] + (Q[0] - P[0]) * 0.12, P[1] + (Q[1] - P[1]) * 0.12], [P[0] + (Q[0] - P[0]) * 0.88, P[1] + (Q[1] - P[1]) * 0.88]);
        }
        return smooth([pts.at(-1), ...pts.slice(0, -1)].map((p, i, arr) => p)).replace(/^/, "");
    }
    if (shape === "scut") return "M50 4C62 10 76 12 88 12c0 36-8 64-38 84C20 76 12 48 12 12c12 0 26-2 38-8z";
    // ceară: margine curgătoare, neregulată (aceeași pentru același text)
    return smooth(ring(18, 46, (i, r) => r + rnd() * 3.2 - (i % 2 ? 2.6 : 0)));
}
function sealRim(rim, shape, stroke, light) {
    const inner = shape === "scut" ? 28 : 33;
    const cy = shape === "scut" ? 46 : 50;
    const ring = (r, extra = "") => `<circle cx="50" cy="${cy}" r="${r}" fill="none" style="stroke:${stroke}" stroke-opacity=".5" stroke-width="2.2" ${extra}/>`;
    const shine = r => `<circle cx="50" cy="${cy + 0.8}" r="${r}" fill="none" stroke="${light}" stroke-opacity=".28" stroke-width=".9"/>`;
    if (rim === "punctat") return `<circle cx="50" cy="${cy}" r="${inner}" fill="none" style="stroke:${stroke}" stroke-opacity=".6" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 5.2"/>`;
    if (rim === "dublu") return ring(inner) + shine(inner) + ring(inner - 4.5, `stroke-width="1.2"`);
    if (rim === "franghie") return `<circle cx="50" cy="${cy}" r="${inner}" fill="none" style="stroke:${stroke}" stroke-opacity=".55" stroke-width="3.2" stroke-dasharray="3 1.6"/>` + shine(inner + 1.6);
    if (rim === "lauri") {
        let leaves = "";
        for (let i = 0; i < 20; i++) {
            if (i === 0 || i === 10) continue; // goluri sus și jos, ca o cunună
            const a = (i / 20) * Math.PI * 2 - Math.PI / 2, x = 50 + Math.cos(a) * inner, y = cy + Math.sin(a) * inner;
            const rot = (a * 180) / Math.PI + (i < 10 ? 120 : 60);
            leaves += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="1.6" ry="3.4" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" style="fill:${stroke}" fill-opacity=".55"/>`;
        }
        return leaves;
    }
    return ring(inner) + shine(inner);
}
/**
 * Desenează un sigiliu. `design` = { shape, wax, rim, kind, letters, icon, symbol }; `text` (opțional) înlocuiește
 * ce e gravat (ex. „10” la un moment bun), păstrând forma, ceara și marginea tale.
 */
function sealArt(design = userSeal(), { text = null, cls = "", label = "" } = {}) {
    const id = `sa${++sealArtSeq}`;
    const wax = SEAL_WAX[design.wax] || SEAL_WAX.lamp;
    const base = wax.c || "var(--lamp-fill)";
    const engrave = wax.dark ? `color-mix(in srgb, ${base} 40%, #fff)` : `color-mix(in srgb, ${base} 48%, #000)`;
    const rimInk = wax.dark ? `color-mix(in srgb, ${base} 45%, #fff)` : `color-mix(in srgb, ${base} 55%, #000)`;
    const light = wax.dark ? "#fff" : "#fff";
    const cy = design.shape === "scut" ? 46 : 50;
    let mark = "";
    const glyph = (inner, scale) => `<g transform="translate(50 ${cy}) scale(${scale}) translate(-12 -12)" fill="none" style="stroke:${engrave}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner.replace(/currentColor/g, engrave)}</g>`;
    const letters = t => {
        const size = t.length > 2 ? 26 : t.length === 2 ? 32 : 42;
        return `<text x="50" y="${cy + 1}" text-anchor="middle" dominant-baseline="central" class="seal-t" font-size="${size}" fill="${light}" fill-opacity=".32" transform="translate(0 1.1)">${escapeHTML(t)}</text>
            <text x="50" y="${cy + 1}" text-anchor="middle" dominant-baseline="central" class="seal-t" font-size="${size}" style="fill:${engrave}">${escapeHTML(t)}</text>`;
    };
    if (text !== null) mark = letters(String(text));
    else if (design.kind === "icon" && design.icon && typeof SUBJECT_ICONS !== "undefined" && SUBJECT_ICONS[design.icon]) mark = glyph(SUBJECT_ICONS[design.icon].d, 1.7);
    else if (design.kind === "symbol" && SEAL_SYMBOLS[design.symbol]) mark = glyph(SEAL_SYMBOLS[design.symbol].d, 1.7);
    else mark = letters(design.letters || sealLetter());
    return `<svg class="seal ${cls}" viewBox="0 0 100 100" ${label ? `role="img" aria-label="${escapeHTML(label)}"` : `aria-hidden="true"`}>
        <defs><radialGradient id="${id}g" cx="38%" cy="30%" r="78%">
            <stop offset="0" style="stop-color: color-mix(in srgb, ${base} ${wax.dark ? 70 : 55}%, #fff)"/>
            <stop offset=".55" style="stop-color: ${base}"/>
            <stop offset="1" style="stop-color: color-mix(in srgb, ${base} 60%, #000)"/>
        </radialGradient></defs>
        <path d="${sealOutline(design.shape, design.letters || design.icon || design.symbol || "u")}" fill="url(#${id}g)"/>
        ${sealRim(design.rim, design.shape, rimInk, light)}
        ${mark}
    </svg>`;
}

/* ---------- atelierul ---------- */
let sealDraft = null;
function openSealWorkshop() {
    if (!requireAccount()) return;
    sealDraft = userSeal();
    if (!sealDraft.letters) sealDraft.letters = defaultSealLetters();
    openModal({
        layout: "panel",
        title: "Atelierul sigiliului",
        confirmText: "Ștampilează",
        cancelText: "Renunț",
        body: `<div class="sw" id="seal-workshop">${sealWorkshopHTML()}</div>`,
        onConfirm: saveSealWorkshop
    });
}
/** Inițialele tale (prenume + nume), pentru gravura implicită. */
function defaultSealLetters() {
    const w = String(state.settings.profile?.name || "").trim().split(/\s+/).filter(Boolean);
    return w.length ? (w[0][0] + (w[1]?.[0] || "")).toLocaleUpperCase("ro") : "U";
}
function sealWorkshopHTML() {
    const d = sealDraft, n = sealCount();
    const lock = item => `${icon("lock")}<small>${item.at} ${item.at === 1 ? "sigiliu" : "sigilii"}</small>`;
    const opt = (group, key, item, inner) => {
        const open = sealOpen(item, n), on = d[group] === key;
        return `<button type="button" class="sw-opt ${on ? "is-on" : ""}" data-action="seal-set" data-group="${group}" data-key="${key}" role="radio" aria-checked="${on}" ${open ? "" : "disabled"}
            aria-label="${escapeHTML(open ? item.name : `${item.name}: se deblochează la ${item.at} sigilii`)}">${inner}<span>${open ? escapeHTML(item.name) : lock(item)}</span></button>`;
    };
    const mini = patch => sealArt({ ...d, ...patch }, { cls: "sw-mini" });
    const kinds = { letters: "Litere", icon: "Materie", symbol: "Simbol" };
    const nextAt = [...Object.values(SEAL_SHAPES), ...Object.values(SEAL_WAX), ...Object.values(SEAL_RIMS), ...Object.values(SEAL_SYMBOLS)].map(x => x.at).filter(a => a > n).sort((a, b) => a - b)[0];
    return `
        <div class="sw-stage">
            <div class="sw-preview" id="sw-preview">${sealArt(d, { cls: "sw-big", label: "Sigiliul tău" })}</div>
            <p class="sw-count">${n} ${n === 1 ? "sigiliu strâns" : "sigilii strânse"}${nextAt ? ` · următoarea deblocare la ${nextAt}` : " · ai deblocat tot"}</p>
        </div>
        <h4 class="sw-h">Formă</h4>
        <div class="sw-row" role="radiogroup" aria-label="Forma">${Object.entries(SEAL_SHAPES).map(([k, it]) => opt("shape", k, it, mini({ shape: k }))).join("")}</div>
        <h4 class="sw-h">Ceară</h4>
        <div class="sw-row" role="radiogroup" aria-label="Ceara">${Object.entries(SEAL_WAX).map(([k, it]) => opt("wax", k, it, mini({ wax: k }))).join("")}</div>
        <h4 class="sw-h">Margine</h4>
        <div class="sw-row" role="radiogroup" aria-label="Marginea">${Object.entries(SEAL_RIMS).map(([k, it]) => opt("rim", k, it, mini({ rim: k }))).join("")}</div>
        <h4 class="sw-h">Ce e gravat</h4>
        <div class="seg sw-kinds" role="radiogroup" aria-label="Ce e gravat">${Object.entries(kinds).map(([k, l]) => `<button type="button" class="sw-kind ${d.kind === k ? "is-on" : ""}" data-action="seal-set" data-group="kind" data-key="${k}" role="radio" aria-checked="${d.kind === k}">${l}</button>`).join("")}</div>
        ${d.kind === "letters" ? `
            <div class="form-group sw-letters"><label for="sw-letters">Una sau două litere</label>
                <input type="text" id="sw-letters" class="glass-input" maxlength="2" autocomplete="off" autocapitalize="characters" value="${escapeHTML(d.letters)}"></div>`
        : d.kind === "icon" ? `
            <div class="sw-grid" role="radiogroup" aria-label="Pictograma unei materii">${Object.entries(SUBJECT_ICONS).map(([k, ic]) => `<button type="button" class="sw-ico ${d.icon === k ? "is-on" : ""}" data-action="seal-set" data-group="icon" data-key="${k}" role="radio" aria-checked="${d.icon === k}" aria-label="${escapeHTML(ic.label)}" title="${escapeHTML(ic.label)}">${subjectIconSVG(k)}</button>`).join("")}</div>`
        : `
            <div class="sw-grid" role="radiogroup" aria-label="Simbol">${Object.entries(SEAL_SYMBOLS).map(([k, it]) => {
                const open = sealOpen(it, n);
                return `<button type="button" class="sw-ico ${d.symbol === k ? "is-on" : ""}" data-action="seal-set" data-group="symbol" data-key="${k}" role="radio" aria-checked="${d.symbol === k}" ${open ? "" : "disabled"} aria-label="${escapeHTML(open ? it.name : `${it.name}: se deblochează la ${it.at} sigilii`)}" title="${escapeHTML(open ? it.name : `${it.at} sigilii`)}">${open ? `<svg class="sic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${it.d}</svg>` : icon("lock")}</button>`;
            }).join("")}</div>`}
        <p class="subtitle sw-hint">Sigiliul tău apare pe butonul Eu, în profil, pe pagina Azi și la fiecare moment bun.</p>`;
}
function renderSealWorkshop(focusSel) {
    const box = $("seal-workshop");
    if (!box) return;
    const scroller = box.closest(".modal-body, #action-modal-body") || box;
    const keep = scroller.scrollTop;
    box.innerHTML = sealWorkshopHTML();
    scroller.scrollTop = keep;
    if (focusSel) box.querySelector(focusSel)?.focus({ preventScroll: true });
    const p = $("sw-preview");
    if (p?.animate && !reduceMotion()) p.animate([{ transform: "scale(.94)" }, { transform: "scale(1.03)" }, { transform: "none" }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
}
function setSealDraft(group, key) {
    if (!sealDraft) return;
    if (group === "kind") {
        sealDraft.kind = key;
        if (key === "icon" && !sealDraft.icon) sealDraft.icon = Object.keys(SUBJECT_ICONS)[0];
    } else sealDraft[group] = key;
    renderSealWorkshop(`[data-group="${group}"][data-key="${key}"]`);
    haptic();
}
function saveSealWorkshop() {
    if (!sealDraft) return;
    state.settings.seal = sanitizeSeal(sealDraft);
    sealDraft = null;
    saveState();
    closeActionModal();
    renderSealChrome(true);
    renderAziSeal(true);
    renderMeInitials?.();
    renderIdentitySettings();
    stampMoment({ title: "Sigiliul tău e gata", sub: "Îl vezi pe butonul Eu și pe pagina Azi.", own: true });
}
document.addEventListener("input", event => {
    if (event.target.id !== "sw-letters" || !sealDraft) return;
    sealDraft.letters = event.target.value.replace(/[\s<>"'&]+/g, "").slice(0, 2).toLocaleUpperCase("ro");
    const p = $("sw-preview");
    if (p) p.innerHTML = sealArt(sealDraft, { cls: "sw-big", label: "Sigiliul tău" });
});
