/* urNotes · Turul ghidat.
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

/* ==================== TUR GHIDAT (pentru cei noi) ==================== */
/*
 * Mascota îl plimbă pe elev prin aplicație: un „reflector” peste fiecare zonă importantă
 * și un bilețel cu explicația. Pornește singur o dată, după configurare; se poate relua din Setări,
 * din „Mai mult” sau din căutare. Pașii ale căror ținte nu sunt pe ecran (ex. pe telefon) se sar.
 */
const TOUR_DONE_KEY = "pro_tour_done_v4";
const tour = { open: false, i: 0, steps: [], returnFocus: null };
const isPhoneLayout = () => Boolean(window.matchMedia?.("(max-width: 900px)").matches);
const navSel = tab => isPhoneLayout() ? `.mobile-nav-btn[data-tab="${tab}"]` : `.side-link[data-tab="${tab}"]`;

function tourSteps() {
    const name = firstName();
    const hey = name ? `, ${name}` : "";
    const phone = isPhoneLayout();
    return [
        { text: MASCOT_ON ? `Salut${hey}! Eu sunt ${buddyName()}, colegul tău de bancă. În mai puțin de un minut îți arăt cum merge urNotes.` : `Salut${hey}! În mai puțin de un minut îți arăt cum merge urNotes.` },
        { target: ".azi-head-text", text: "Asta e pagina Azi: ce ai de făcut azi și ce urmează. Totul pornește de aici." },
        { target: "#azi-tiles", text: "Plăcile colorate îți arată dintr-o privire media, testele din săptămână și planul de azi. Atinge una ca să mergi acolo." },
        { target: navSel("tab-catalog"), text: "La „Note” ai toate materiile, fiecare cu culoarea ei. Tot acolo, în file, găsești Progresul și „Ce-ar fi dacă”." },
        { target: navSel("tab-calendar"), text: "Calendarul ține testele, tezele, temele și orarul. Când primești nota, o treci direct din test." },
        { target: navSel("tab-plan"), text: "La „Plan” îți fac programul de învățat pentru fiecare zi. Tot acolo sunt și examenele: Bac și Evaluarea Națională." },
        { target: phone ? ".mobile-add" : ".side-add", text: `Cu „+” pui o notă, un test, o temă sau o materie nouă.${phone ? "" : " Merge și tasta N."}` },
        ...(phone ? [{ target: "#me-btn", text: "Atinge-mă aici sus ca să ajungi la „Eu”: profilul, contul, setările și tema întunecată." }] : []),
        { target: "#notif-btn", text: "Clopoțelul te anunță când o materie intră în risc sau când un test își așteaptă nota." },
        { target: phone ? "#tour-none" : "#account-chip", text: cloud.user ? "Ești în cont: notele se salvează singure și apar pe orice telefon sau calculator." : "Intră în cont ca notele să te urmeze pe orice telefon sau calculator." },
        { target: "#azi-buddy", text: "Și eu stau aici, pe pagina Azi: îți spun ce contează și mă bucur de fiecare 10. Mă găsești și pe celelalte pagini, lângă titlu, cu câte un sfat: atinge-mă și îți spun altul. Numele noastre le schimbi din „Eu”." },
        { text: `Gata${hey}! Poți relua turul oricând din „Eu”. Spor la note mari!`, last: true }
    ];
}

const tourDone = () => { try { return localStorage.getItem(TOUR_DONE_KEY) === "1"; } catch (_) { return true; } };
function maybeStartTour() {
    if (!tourDone()) startTour();
}

function startTour() {
    if (!$("tour") || tour.open) return;
    if (!$("setup").hidden || ($("auth") && !$("auth").hidden)) return;
    closeActionModal();
    closeQuickAdd({ restoreFocus: false });
    closeNotifPanel({ restoreFocus: false });
    if (!$("action-modal").hidden) return; // o întrebare care cere răspuns (ex. sincronizarea) are prioritate
    switchTab("tab-dashboard");
    window.scrollTo(0, 0);
    tour.open = true;
    tour.steps = tourSteps();
    tour.returnFocus = document.activeElement;
    $("tour").hidden = false;
    document.body.classList.add("tour-open");
    window.addEventListener("resize", placeTour);
    window.addEventListener("scroll", placeTour, { passive: true });
    showTourStep(0, 1);
}

function endTour() {
    if (!tour.open) return;
    tour.open = false;
    $("tour").hidden = true;
    document.body.classList.remove("tour-open");
    window.removeEventListener("resize", placeTour);
    window.removeEventListener("scroll", placeTour);
    try { localStorage.setItem(TOUR_DONE_KEY, "1"); } catch (_) { /* fără stocare: tot nu insistăm */ }
    const back = tour.returnFocus;
    tour.returnFocus = null;
    if (back && document.contains(back) && back !== document.body) back.focus();
}

/** Elementul unui pas, doar dacă se vede pe ecran. */
function tourTarget(step) {
    if (!step?.target) return null;
    const el = document.querySelector(step.target);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden" ? el : null;
}
const tourVisible = (step, k, all) => k === 0 || k === all.length - 1 || Boolean(tourTarget(step));

/** Arată pasul `i`; dacă ținta lui nu e pe ecran, merge mai departe în direcția `dir`. */
function showTourStep(i, dir) {
    const steps = tour.steps;
    while (i > 0 && i < steps.length - 1 && !tourTarget(steps[i])) i += dir;
    tour.i = Math.max(0, Math.min(steps.length - 1, i));
    const step = steps[tour.i];
    const el = tourTarget(step);
    if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 70 || r.bottom > innerHeight - 70) el.scrollIntoView({ block: "center" });
    }
    const visible = steps.map(tourVisible);
    const pos = visible.slice(0, tour.i + 1).filter(Boolean).length;
    $("tour-buddy").innerHTML = buddySVG(step.last ? "giggle" : tour.i === 0 ? "happy" : "focused");
    $("tour-step").textContent = MASCOT_ON ? `${buddyName()} · ${pos} din ${visible.filter(Boolean).length}` : `Pasul ${pos} din ${visible.filter(Boolean).length}`;
    $("tour-text").textContent = step.text;
    $("tour-back").hidden = tour.i === 0;
    $("tour-next").textContent = step.last ? "Hai să începem!" : tour.i === 0 ? "Arată-mi" : "Mai departe";
    $("tour-skip").hidden = Boolean(step.last);
    placeTour();
    $("tour-next").focus({ preventScroll: true });
}

/** Reflectorul peste țintă și bilețelul lângă ea (dedesubt dacă încape, altfel deasupra). */
function placeTour() {
    if (!tour.open) return;
    const el = tourTarget(tour.steps[tour.i]);
    const hole = $("tour-hole");
    const card = $("tour-card");
    const pad = 8;
    const vw = document.documentElement.clientWidth || innerWidth;
    const vh = innerHeight;
    $("tour").classList.toggle("is-centered", !el);
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    if (!el) {
        hole.hidden = true;
        card.style.left = `${Math.max(12, (vw - cw) / 2)}px`;
        card.style.top = `${Math.max(12, (vh - ch) / 2)}px`;
        return;
    }
    const r = el.getBoundingClientRect();
    hole.hidden = false;
    Object.assign(hole.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const gap = 14;
    let top = r.bottom + pad + gap;
    if (top + ch > vh - 12) top = r.top - pad - gap - ch;
    if (top < 12) top = Math.max(12, vh - ch - 12); // nu încape nici sus, nici jos: îl ținem pe ecran
    const left = Math.max(12, Math.min(vw - cw - 12, r.left + r.width / 2 - cw / 2));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
}

const TOUR_ACTIONS = {
    "tour-start": () => startTour(),
    "tour-next": () => tour.i >= tour.steps.length - 1 ? endTour() : showTourStep(tour.i + 1, 1),
    "tour-back": () => showTourStep(tour.i - 1, -1),
    "tour-skip": () => endTour(),
    "buddy-poke": (el, event) => pokeBuddy(el, event)
};

/** Tastele cât timp e deschis turul: Escape îl închide, săgețile schimbă pasul, Tab rămâne în bilețel. */
function handleTourKey(event) {
    const k = event.key;
    if (k === "Escape") { event.preventDefault(); endTour(); return; }
    if (k === "ArrowRight") { event.preventDefault(); TOUR_ACTIONS["tour-next"](); return; }
    if (k === "ArrowLeft" && tour.i > 0) { event.preventDefault(); TOUR_ACTIONS["tour-back"](); return; }
    if (k === "Tab") trapFocusIn($("tour-card"), event);
}

const SETUP_ACTIONS = {
    "setup-open": () => openSetup(0),
    "programme-change": () => openSetup(1),
    "help": el => openHelp(el.dataset.key),
    "install-hide": () => { try { localStorage.setItem(IOS_HINT_KEY, "1"); } catch (_) { /* fără stocare */ } renderDashboard(); },
    "badge-allow": async () => {
        try { await Notification.requestPermission(); } catch (_) { /* refuzat */ }
        renderNotificationBadge();
        renderBadgeSetting();
    },
    "start-hide": () => { try { localStorage.setItem(START_HIDE_KEY, "1"); } catch (_) { /* fără stocare */ } renderDashboard(); },
    "setup-skip": () => {
        markSetupDone();
        closeSetup();
        setTimeout(maybeStartTour, 300);
        showToast("Poți porni configurarea oricând din „Eu” sau din căutare (Ctrl+K).");
    },
    "setup-next": () => setupNext(),
    "setup-back": () => setupBack(),
    "setup-goto": el => wzGo(el.dataset.step),
    "setup-import": () => {
        markSetupDone();
        closeSetup();
        $("backup-file-input")?.click();
    },
    "setup-class": el => {
        const st = ui.setup;
        const c = Number(el.dataset.cls);
        if (!ROMAN[c]) return;
        st.cls = c;
        if (c <= 8) { st.profile = "gimnaziu"; st.variant = ""; }
        else if (st.profile === "gimnaziu") { st.profile = ""; st.variant = ""; }
        st.rows = SETUP_PROFILES[st.profile] ? setupRowsFor(st.profile, st.cls, st.variant, st.lm2) : [];
        setupNext(); // o singură alegere: mergem direct mai departe
    },
    "setup-profile": el => {
        const st = ui.setup;
        const prof = SETUP_PROFILES[el.dataset.id];
        if (!prof || el.dataset.id === "gimnaziu") return;
        st.profile = el.dataset.id;
        if (prof.variants && !prof.variants.some(v => v.id === st.variant)) st.variant = prof.variants[0].id;
        if (!prof.variants) st.variant = "";
        st.rows = setupRowsFor(st.profile, st.cls, st.variant, st.lm2);
        if (!prof.variants) { setupNext(); return; }
        renderSetup(); // mai are de ales specializarea
        $("setup-body").querySelector(`[data-id="${st.profile}"]`)?.focus({ preventScroll: true });
        $("setup-body").querySelector(".wz-sub")?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    },
    "setup-variant": el => {
        const st = ui.setup;
        const prof = SETUP_PROFILES[st.profile];
        if (!prof?.variants?.some(v => v.id === el.dataset.variant)) return;
        st.variant = el.dataset.variant;
        st.rows = setupRowsFor(st.profile, st.cls, st.variant, st.lm2);
        renderSetup();
        $("setup-body").querySelector(`[data-variant="${st.variant}"]`)?.focus();
    },
    "setup-target": el => { ui.setup.target = clampNumber(el.dataset.v, 5, 10, 10); wzFixRisk(); rerenderSetupKeepFocus(el); },
    "setup-risk": el => {
        const v = Number(el.dataset.v);
        if (!wzRisks(ui.setup.target).some(r => r.v === v)) return;
        ui.setup.risk = v;
        rerenderSetupKeepFocus(el);
    },
    "setup-finish": el => finishSetup(el.dataset.timetable === "1")
};

/** Redesenează pasul curent și pune focusul înapoi pe butonul echivalent (pentru tastatură). */
function rerenderSetupKeepFocus(el) {
    const sel = `[data-action="${el.dataset.action}"][data-v="${el.dataset.v}"]`;
    renderSetup();
    $("setup-body").querySelector(sel)?.focus();
}

function bindSetupEvents() {
    const box = $("setup");
    if (!box) return;
    box.addEventListener("change", event => {
        const t = event.target;
        if (t.classList.contains("setup-check")) {
            const r = ui.setup?.rows[Number(t.dataset.i)];
            if (r) { r.on = t.checked; renderSetup(); $("setup-body").querySelector(`.setup-check[data-i="${t.dataset.i}"]`)?.focus(); }
        } else if (t.id === "setup-county" && ui.setup) {
            ui.setup.county = COUNTY_WEEK[t.value] ? t.value : "";
            // modulele urmează județul, afară de cazul în care elevul și-a scris singur datele
            if (COUNTY_WEEK[t.value] && ui.setup.preset !== "keep") ui.setup.preset = countyPreset(t.value);
        }
    });
    box.addEventListener("input", event => {
        const t = event.target;
        if (t.id === "setup-me-name") {
            // Se salvează pe loc: numele rămâne chiar dacă elevul sare peste restul configurării.
            state.settings.profile.name = cleanName(t.value, 40);
            saveState();
            return;
        }
        if (t.classList.contains("setup-opt-topic")) {
            const r = ui.setup?.rows[Number(t.dataset.i)];
            if (r) {
                r.topic = t.value;
            }
        }
    });
    box.addEventListener("change", event => {
        const t = event.target;
        if (!t.classList.contains("setup-lm2")) return;
        const r = ui.setup?.rows[Number(t.dataset.i)];
        if (!r || !LM2_CHOICES.includes(t.value)) return;
        r.name = t.value;
        ui.setup.lm2 = t.value;
        r.exists = Boolean(findSubjectName(r.name));
        r.shown = findSubjectName(r.name) || r.name;
        renderSetup();
        $("setup-body").querySelector(".setup-lm2")?.focus();
    });
}
