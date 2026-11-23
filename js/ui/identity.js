/* urNotes · Identitatea: o cameră de studiu, seara.
   - Lampa: o lumină caldă în capul fiecărui ecran, care se schimbă cu ora (dimineața, ziua, seara, noaptea).
     Culoarea ei e a ta (Aur, Trandafir, Lună, Jad) și dă și accentul aplicației.
   - Sigiliul: inițiala ta într-un sigiliu de ceară, în culoarea lămpii. E semnul tău în aplicație (butonul Eu, profilul)
     și se „ștampilează” la momentele bune: un 10, o țintă atinsă, o realizare nouă.
   - Momentele bune vin cu o vibrație scurtă (și pe iPhone) și un clinchet discret, care se poate opri din Eu. */

/* ---------- lampa ---------- */
// [umplutură, text de accent, text pe umplutură] pentru temă luminoasă / întunecată, plus lumina (r,g,b)
const LAMPS = {
    aur: { name: "Aur", light: ["#D9A040", "#7E5410", "#14193A"], dark: ["#E9B85C", "#F2C879", "#0B1226"], glow: "233, 184, 92" },
    trandafir: { name: "Trandafir", light: ["#E0907E", "#953A2A", "#14193A"], dark: ["#EDA394", "#F4B8AB", "#0B1226"], glow: "237, 163, 148" },
    luna: { name: "Lună", light: ["#8EA6DE", "#2F4C8C", "#0B1226"], dark: ["#B3C6F0", "#C6D5F6", "#0B1226"], glow: "179, 198, 240" },
    jad: { name: "Jad", light: ["#6DBB95", "#1C6646", "#0B1226"], dark: ["#8ED1AF", "#A8DEC3", "#0B1226"], glow: "142, 209, 175" }
};
const lampKey = () => (LAMPS[state.settings.appearance?.lamp] ? state.settings.appearance.lamp : "aur");

/** Momentul zilei, după ora telefonului. */
function lampPhase(hour = new Date().getHours()) {
    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 17) return "day";
    if (hour >= 17 && hour < 22) return "evening";
    return "night";
}
/** „După lampă”: luminos ziua, întunecat de seara până dimineața. */
const lampWantsDark = (hour = new Date().getHours()) => hour >= 18 || hour < 7;

/** Pune culoarea lămpii și momentul zilei pe pagină (chemată din applyAppearanceSettings și la fiecare câteva minute). */
function applyLamp(dark = document.body.classList.contains("dark-mode")) {
    const L = LAMPS[lampKey()];
    const [fill, text, on] = dark ? L.dark : L.light;
    const root = document.documentElement.style;
    root.setProperty("--lamp-fill", fill);
    root.setProperty("--lamp-text", text);
    root.setProperty("--lamp-on", on);
    root.setProperty("--lamp-glow", L.glow);
    root.setProperty("--lamp-night", L.dark[1]); // pe fundaluri mereu întunecate (mesajele de jos)
    document.body.dataset.lamp = lampPhase();
    document.body.dataset.lampColor = lampKey();
}
function bindLamp() {
    const tick = () => {
        const a = state.settings.appearance;
        // tema „după lampă” se schimbă singură seara și dimineața
        if (a.theme === "lamp" && lampWantsDark() !== document.body.classList.contains("dark-mode")) applyAppearanceSettings();
        else applyLamp();
    };
    if (!/jsdom/i.test(navigator.userAgent || "")) setInterval(tick, 5 * 60 * 1000); // (în teste ar ține procesul deschis)
    document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
}

/* ---------- sigiliul ---------- */
let sealSeq = 0;
/** Inițiala (sau un număr scurt) dintr-un nume. */
function sealLetter(name = state.settings.profile?.name || "") {
    const w = String(name).trim();
    return w ? w[0].toLocaleUpperCase("ro") : "u";
}
/** Un sigiliu cu textul dat, în forma, ceara și marginea alese de tine (js/ui/seal.js). */
function sealSVG(text = null, { cls = "", label = "" } = {}) {
    return sealArt(userSeal(), { text, cls, label });
}

/** Sigiliul tău pe butonul Eu (bara de sus) și în profil. */
const sealKey = () => JSON.stringify(userSeal()) + sealLetter();
function renderSealChrome(force = false) {
    const key = sealKey();
    const face = document.querySelector("#me-btn > .me-btn-face");
    if (face && (force || face.dataset.seal !== key)) { face.dataset.seal = key; face.innerHTML = sealArt(userSeal(), { cls: "me-seal" }); }
    const me = $("me-initials");
    if (me && (force || me.dataset.seal !== key)) { me.dataset.seal = key; me.innerHTML = sealArt(userSeal(), { cls: "me-seal-big" }); }
}

/** Azi: sigiliul tău lângă salut, cu câte sigilii ai strâns. Atins, te duce la colecție (Eu). */
function renderAziSeal(force = false) {
    const el = $("azi-seal");
    if (!el) return;
    const got = ACHIEVEMENTS.filter(a => state.achievements[a.key]).length;
    el.hidden = false;
    el.setAttribute("aria-label", `Sigiliile tale: ${got} din ${ACHIEVEMENTS.length}`);
    const key = `${sealKey()}|${got}`;
    if (!force && el.dataset.key === key) return;
    el.dataset.key = key;
    el.innerHTML = `${sealArt(userSeal(), { cls: "azi-seal-svg" })}<span class="azi-seal-n">${got}<small>/${ACHIEVEMENTS.length}</small></span>`;
}

/* ---------- vibrația și clinchetul ---------- */
let hapticEl = null;
/** O vibrație scurtă. Pe Android: navigator.vibrate; pe iPhone (Safari 18+): un comutator nativ ascuns, care vibrează când e atins. */
function haptic() {
    if (state.settings.appearance?.haptics === false) return;
    if (navigator.userActivation && !navigator.userActivation.isActive) return; // vibrația merge doar imediat după o atingere
    try {
        if (navigator.vibrate && navigator.vibrate(12)) return;
        if (!hapticEl) {
            hapticEl = document.createElement("label");
            hapticEl.className = "haptic-switch";
            hapticEl.setAttribute("aria-hidden", "true");
            hapticEl.innerHTML = `<input type="checkbox" switch tabindex="-1">`;
            document.body.appendChild(hapticEl);
            // apăsarea lui e falsă: nu are voie să ajungă la restul aplicației (ar închide meniuri și ferestre
            // „la un clic în afară” sau ar fi luată drept o alegere)
            const stop = event => { if (hapticEl.contains(event.target)) event.stopImmediatePropagation(); };
            ["click", "change", "input", "focusin", "pointerdown"].forEach(t => window.addEventListener(t, stop, true));
        }
        hapticEl.click();
    } catch (_) { /* fără vibrații pe acest dispozitiv */ }
}
let chimeCtx = null;
/** Un clinchet scurt și moale (două tonuri ca de clopoțel), doar dacă sunetele sunt pornite. */
function chime(kind = "soft") {
    if (state.settings.appearance?.sounds === false) return;
    try {
        chimeCtx = chimeCtx || new (window.AudioContext || window.webkitAudioContext)();
        const ctx = chimeCtx, t0 = ctx.currentTime + 0.01;
        const notes = kind === "big" ? [880, 1318.5, 1760] : [1046.5, 1568];
        notes.forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = "sine";
            o.frequency.value = f;
            const t = t0 + i * 0.07;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.055 / (i + 1), t + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
            o.connect(g).connect(ctx.destination);
            o.start(t);
            o.stop(t + 1);
        });
    } catch (_) { /* fără sunet */ }
}

/* ---------- momentele bune: sigiliul se ștampilează ---------- */
const celebrations = [];
let celebrating = false;
/** stampMoment({ seal: "10", title: "Un 10 la Fizică", sub: "…", big }) — se pun la coadă, câte unul. */
function stampMoment(c) {
    if (typeof guest !== "undefined" && guest.on) return;
    celebrations.push(c);
    if (!celebrating) setTimeout(nextCelebration, 450); // puțin după acțiune, ca fereastra să se fi închis
}
function nextCelebration() {
    const c = celebrations.shift();
    if (!c) { celebrating = false; return; }
    celebrating = true;
    const box = document.createElement("div");
    box.className = `moment${c.big ? " is-big" : ""}`;
    box.setAttribute("role", "status");
    box.innerHTML = `
        <div class="moment-card">
            <div class="moment-seal">${c.own ? sealArt(userSeal(), { cls: "moment-svg" }) : sealSVG(c.seal, { cls: "moment-svg" })}<i class="moment-ring" aria-hidden="true"></i></div>
            <div class="moment-text"><b>${escapeHTML(c.title)}</b>${c.sub ? `<span>${escapeHTML(c.sub)}</span>` : ""}</div>
        </div>`;
    document.body.appendChild(box);
    setTimeout(() => { haptic(); chime(c.big ? "big" : "soft"); }, reduceMotion() ? 0 : 260); // în clipa în care sigiliul atinge hârtia
    let gone = false;
    const away = () => {
        if (gone) return;
        gone = true;
        box.classList.add("is-out");
        setTimeout(() => { box.remove(); nextCelebration(); }, 320);
    };
    // nu oprește nimic: orice atingere (oriunde) îl închide și ajunge mai departe la ce ai atins
    const anyTouch = () => { window.removeEventListener("pointerdown", anyTouch, true); away(); };
    setTimeout(() => window.addEventListener("pointerdown", anyTouch, true), 350);
    setTimeout(away, c.big ? 3200 : 2400);
}

/* Ce s-a schimbat de la ultimul calcul: note noi de 10, ținte atinse. Prima dată doar ține minte. */
let momentsSeen = null;
function noticeMoments() {
    const now = { grades: new Set(), avg: {} };
    Object.entries(state.subjects || {}).forEach(([mat, sub]) => {
        (sub.grades || []).forEach(g => now.grades.add(g.id));
        now.avg[mat] = metrics.subjects?.[mat]?.exactAvg || 0;
    });
    const prev = momentsSeen;
    momentsSeen = now;
    if (!prev || (typeof cloud !== "undefined" && cloud.applying)) return;
    const fresh = [];
    Object.entries(state.subjects || {}).forEach(([mat, sub]) => (sub.grades || []).forEach(g => { if (!prev.grades.has(g.id)) fresh.push({ mat, g }); }));
    if (fresh.length > 3) return; // un import sau o sincronizare, nu o notă pusă de tine
    fresh.filter(f => Number(f.g.val) >= 10).forEach(f => stampMoment({ seal: "10", title: `Un 10 la ${f.mat}`, sub: "Sigiliul tău e pe el." }));
    Object.entries(state.subjects || {}).forEach(([mat, sub]) => {
        const target = Number(sub.target);
        if (!target || !fresh.some(f => f.mat === mat)) return;
        if ((prev.avg[mat] || 0) < target && now.avg[mat] >= target) {
            stampMoment({ seal: String(target).replace(".", ","), title: `Ai atins ținta la ${mat}`, sub: `Media e acum ${now.avg[mat].toFixed(2)}.`, big: true });
        }
    });
}

/* ---------- Eu: lampa ta, sigiliile tale ---------- */
const SEAL_MARKS = { first_grade: "1", five_tens: "5×", high_avg: "9+", perfect_10: "10", ten_evals: "10", twenty_tens: "20", no_risk: "✓", plan_10: "P", plan_50: "50", exam_first: "E", year_done: "An" };
function renderIdentitySettings() {
    const lamp = $("lamp-setting");
    if (lamp) {
        const cur = lampKey();
        lamp.innerHTML = `<div class="lamp-picks" role="radiogroup" aria-label="Culoarea lămpii">${Object.entries(LAMPS).map(([k, L]) => `
            <button type="button" class="lamp-pick" data-action="set-lamp" data-lamp="${k}" role="radio" aria-checked="${k === cur}" style="--pick:${L.dark[0]}">
                <i aria-hidden="true"></i><span>${L.name}</span></button>`).join("")}</div>
            <label class="lamp-toggle"><input type="checkbox" id="set-sounds" ${state.settings.appearance.sounds === false ? "" : "checked"}> Clinchet la momentele bune</label>
            <label class="lamp-toggle"><input type="checkbox" id="set-haptics" ${state.settings.appearance.haptics === false ? "" : "checked"}> Vibrație</label>`;
    }
    const seals = $("seal-collection");
    if (seals) {
        const got = ACHIEVEMENTS.filter(a => state.achievements[a.key]).length;
        seals.innerHTML = `
            <p class="subtitle">${got ? `${got} din ${ACHIEVEMENTS.length}. Fiecare moment bun își lasă sigiliul aici.` : "Primul sigiliu vine cu prima notă."}</p>
            <ul class="seal-grid">${ACHIEVEMENTS.map(a => {
                const on = Boolean(state.achievements[a.key]);
                return `<li class="${on ? "is-on" : ""}">${on ? sealSVG(SEAL_MARKS[a.key] || "★", { cls: "seal-item" }) : `<span class="seal-empty" aria-hidden="true"></span>`}<span>${escapeHTML(a.label)}</span><span class="sr-only">${on ? "obținut" : "încă nu"}</span></li>`;
            }).join("")}</ul>`;
    }
}
function bindIdentity() {
    bindLamp();
    document.addEventListener("change", event => {
        const id = event.target.id;
        if (id !== "set-sounds" && id !== "set-haptics") return;
        if (!requireAccount()) { event.target.checked = !event.target.checked; return; }
        state.settings.appearance[id === "set-sounds" ? "sounds" : "haptics"] = event.target.checked;
        saveState();
        if (event.target.checked) { if (id === "set-sounds") chime(); else haptic(); }
    });
}

/* ---------- logo-ul: lampa care desenează N-ul, vie ----------
   Atinge lampa (lângă numele aplicației): se aprinde sau se stinge. Aprinsă = tema de seară, stinsă = tema de zi;
   schimbarea se întinde pe ecran pornind din lampă. Cu mouse-ul deasupra, capul se apleacă puțin spre masă. */
function lampLogoSVG() {
    return `<svg class="lamp-logo" viewBox="0 0 512 512" aria-hidden="true" focusable="false">
        <g class="ll-light"><path d="M277 227 L287 412 L475 412 L394 202 Z"/><ellipse cx="381" cy="412" rx="75" ry="11"/></g>
        <path class="ll-arm" d="M152 410 V160 L322 330 V150" fill="none" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
        <rect class="ll-arm-fill" x="100" y="398" width="104" height="24" rx="12"/>
        <g class="ll-head"><path class="ll-arm-fill" d="M300 132 H344 L382 216 H262 Z" transform="rotate(-12 322 150)"/>
            <ellipse class="ll-bulb" cx="318" cy="222" rx="30" ry="11" transform="rotate(-12 322 150)"/></g>
    </svg>`;
}
function renderLampLogos() {
    document.querySelectorAll("[data-lamp-logo]").forEach(el => { if (!el.firstElementChild) el.innerHTML = lampLogoSVG(); });
    const on = document.body.classList.contains("dark-mode");
    document.querySelectorAll(".lamp-btn").forEach(b => {
        b.setAttribute("aria-pressed", String(on));
        b.setAttribute("aria-label", on ? "Stinge lampa (tema de zi)" : "Aprinde lampa (tema de seară)");
        b.title = on ? "Stinge lampa" : "Aprinde lampa";
    });
}
/** Atingerea lămpii: tema se schimbă, întinzându-se ca o lumină din lampă (unde se poate), cu o pâlpâire scurtă. */
function toggleLamp(btn) {
    const goDark = !document.body.classList.contains("dark-mode");
    const apply = () => {
        state.settings.appearance.theme = goDark ? "dark" : "light";
        saveState();
        applyAppearanceSettings();
        renderLampLogos();
        const sel = $("set-theme");
        if (sel) sel.value = state.settings.appearance.theme;
    };
    haptic();
    btn?.classList.remove("is-flick");
    if (btn && !reduceMotion()) { void btn.offsetWidth; btn.classList.add("is-flick"); }
    const r = btn?.getBoundingClientRect();
    if (!document.startViewTransition || reduceMotion() || !r) { apply(); return; }
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
        document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
            { duration: 520, easing: "cubic-bezier(.4, 0, .2, 1)", pseudoElement: "::view-transition-new(root)" });
    }).catch(() => {});
}
