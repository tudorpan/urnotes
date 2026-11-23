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

/** Aplicația e gata: intro-ul (js/ui/intro.js) își termină povestea și lampa zboară la locul ei din antet. */
function hideSplash() {
    try { sessionStorage.setItem("urn_splash_seen", "1"); } catch (_) { /* fără stocare */ }
    if (typeof introReady === "function") introReady();
    else $("splash")?.remove();
}
