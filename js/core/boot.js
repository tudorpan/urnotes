/* urNotes · Pornirea aplicației.
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

/* ==================== PORNIRE ==================== */
function init() {
    loadState();
    applyAppearanceSettings();
    bindEvents();
    initAppBar();
    bindStatsNav();
    initCustomSelects();
    bindHoverTips();

    if (!localStorage.getItem(KEYS.firstRun)) {
        try {
            localStorage.setItem(KEYS.firstRun, "true");
        } catch (_) { /* ignorăm */ }
    }

    refresh();
    bindSetupEvents();
    bindAuthEvents();
    bindCatMenu();
    bindCatalogNav();
    bindPhoneHelpers();
    bindSheetDrag();
    initBuddyLook();
    initCloud();
    initReminders();
    // pagina de la pornire e deja „pe ecran”: prima schimbare de filă are tranziția și ecranul scurt, ca toate celelalte
    if (!document.body.dataset.page) document.body.dataset.page = ui.activeTab;
    hideSplash();
    scheduleChartJs();
    // Cu conturi, configurarea vine după alegerea de pe ecranul de autentificare.
    if (!cloud.configured && shouldOfferSetup()) openSetup(0);
}

/** Intro-ul pleacă după ce aplicația e gata și după ce s-a jucat (numărat de la deschidere). */
function hideSplash() {
    const el = $("splash");
    if (!el) return;
    try { sessionStorage.setItem("urn_splash_seen", "1"); } catch (_) { /* fără stocare */ }
    // intro-ul (identity.css): întreg ~2,3 s, scurt ~0,7 s, fără mișcare imediat; o atingere îl sare
    const still = el.classList.contains("is-still") || matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const minMs = still ? 150 : el.classList.contains("is-quick") ? 700 : 2300;
    let done = false;
    const open = () => {
        if (done) return;
        done = true;
        // lumina se întinde din bec
        const b = el.querySelector(".in-bulb")?.getBoundingClientRect();
        if (b && b.width) { el.style.setProperty("--in-x", `${b.left + b.width / 2}px`); el.style.setProperty("--in-y", `${b.top + b.height / 2}px`); }
        el.classList.add("is-out");
        setTimeout(() => el.remove(), 900);
    };
    el.addEventListener("pointerdown", open, { once: true });
    setTimeout(open, Math.max(0, minMs - performance.now()));
}
