/* urNotes · Acțiunile (delegare de evenimente).
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

/* ==================== EVENIMENTE (delegare) ==================== */
// Toate butoanele folosesc data-action în loc de onclick inline,
// așa că numele cu apostrof sau ghilimele nu mai pot strica nimic.
const ACTIONS = {
    "nav": el => {
        // fila pe care ești deja: ca pe iPhone, te duce la începutul ei (din pagina unei materii, înapoi la listă)
        if (el.dataset.tab === ui.activeTab) {
            if (ui.activeTab === "tab-catalog" && ui.catalog.showDetail && phoneWidth()) ACTIONS["cat-back"]();
            else window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
            return;
        }
        switchTab.tapped = true; // atingere: întâi se aprinde fila, pagina se desenează în cadrul următor
        switchTab(el.dataset.tab);
    },
    "add-grade": el => ccOpenGlobal({ type: "Notă", mat: el.dataset.mat || (ui.activeTab === "tab-catalog" ? ui.catalog.selected || "" : "") }),
    "add-subject": () => promptAddMaterie(),
    "add-event": el => openEventModal({ date: el.dataset.date, subject: el.dataset.mat, type: el.dataset.type }),
    "quick-test": () => {
        switchTab("tab-calendar");
        openEventModal({ type: "Test" });
    },
    "show-date": el => showDateInCalendar(el.dataset.date),
    "cal-nav": el => calNavigate(Number(el.dataset.offset)),
    "cal-today": () => {
        ui.cal.date = getLocalDateKey();
        ui.cal.mini = null;
        renderCalendar();
    },
    "cal-view": el => setCalView(el.dataset.view),
    "cal-viewmenu": () => toggleCalMenu(),
    "cal-day": el => calJump(el.dataset.date),
    "cal-ev": el => openEvPop(el.dataset.id, el.dataset.date, el),
    "gc-pop-close": () => closeEvPop(),
    "cal-create": el => calCreate(el),
    "cal-weekends": () => {
        ui.cal.weekends = !calWeekends();
        try { localStorage.setItem(CAL_WEEKENDS_KEY, ui.cal.weekends ? "1" : "0"); } catch (_) { /* fără stocare */ }
        renderCalendar();
    },
    "shortcuts": () => { closeCalMenu?.(); openShortcuts(); },
    // lampa din logo: aprinde / stinge (tema de seară / de zi)
    "lamp-toggle": el => toggleLamp(el),
    // Eu: atelierul sigiliului (js/ui/seal.js)
    "seal-workshop": () => openSealWorkshop(),
    "seal-set": el => setSealDraft(el.dataset.group, el.dataset.key),
    // Eu › Pagina Azi: arată / ascunde, mută un card (js/ui/personal.js)
    "azi-card-toggle": el => setAziCard(el.dataset.card, { toggle: true }),
    "azi-card-move": el => setAziCard(el.dataset.card, { move: Number(el.dataset.dir) }),
    "azi-layout-reset": () => setAziCard(null, { reset: true }),
    // Azi: sigiliul de lângă salut → Eu › Sigiliile tale
    "seals-open": () => {
        switchTab("tab-setari");
        requestAnimationFrame(() => document.querySelector(".seal-card")?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "center" }));
    },
    // Eu › Lampa ta: culoarea lămpii (lumina de sus, sigiliul, accentele)
    "set-lamp": el => {
        if (!requireAccount()) return;
        state.settings.appearance.lamp = el.dataset.lamp;
        saveState();
        applyAppearanceSettings();
        document.querySelectorAll(".lamp-pick").forEach(b => b.setAttribute("aria-checked", String(b === el)));
        haptic();
    },
    "qc-close": () => closeQuickCreate(),
    "qc-type": el => { if (!QC_TYPES.includes(el.dataset.type)) return; readQuickCreate(); qc.type = el.dataset.type; renderQuickCreate(); document.querySelector(`#gc-qc [data-type="${CSS.escape(qc.type)}"]`)?.focus(); },
    "qc-save": () => saveQuickCreate(),
    "qc-more": () => quickCreateMore(),
    "cal-mini": el => { const b = parseDateKey(ui.cal.mini || ui.cal.date); ui.cal.mini = getLocalDateKey(new Date(b.getFullYear(), b.getMonth() + Number(el.dataset.offset), 1)); renderMiniMonth(); },
    "cal-mini-day": el => { ui.cal.date = el.dataset.date; ui.cal.mini = el.dataset.date; ui.cal.miniOpen = false; renderCalendar(); },
    "cal-mini-toggle": () => { ui.cal.miniOpen = !ui.cal.miniOpen; ui.cal.mini = null; renderCalendar(); },
    "cal-layer": el => {
        const h = calHidden();
        if (el.checked) h.delete(el.dataset.layer); else h.add(el.dataset.layer);
        try { localStorage.setItem(CAL_HIDDEN_KEY, JSON.stringify([...h])); } catch (_) { /* fără stocare */ }
        renderCalendar();
    },
    "cal-goto": el => calGoto(el.dataset.date),
    "cal-jump": el => calJump(el.dataset.date),
    "event-open": el => openEventModal({ id: el.dataset.id, date: el.dataset.date }),
    "event-done": el => toggleEventDone(el.dataset.id, el.dataset.date),
    "event-grade": el => openGradeForEvent(el.dataset.id, el.dataset.date),
    "event-quick-grade": el => quickGradeForEvent(el.dataset.id, el.dataset.date, el.dataset.val),
    "event-delete": el => promptDeleteEvent(el.dataset.id, el.dataset.date),
    "event-delete-one": el => deleteOccurrence(el.dataset.id, el.dataset.date),
    "event-delete-all": el => deleteSeries(el.dataset.id),
    "np-open": el => npOpen(el.dataset.prop),
    "np-set": el => npSet(el.dataset.prop, el.dataset.value),
    "grade-pick-subject": el => {
        if (!$("modal-grade-mat")) return;
        $("modal-grade-mat").value = el.dataset.mat;
        syncGradeSubjectChips();
    },
    "cat-select": el => selectCatalogSubject(el.dataset.mat),
    "grade-pick": el => {
        const input = $("modal-grade-val");
        if (!input) return;
        input.value = el.dataset.val;
        document.querySelectorAll(".grade-pick-btn").forEach(b => b.setAttribute("aria-pressed", String(b === el)));
    },
    "grade-date": el => {
        const input = $("modal-grade-date");
        if (input) input.value = addDays(getLocalDateKey(), -Number(el.dataset.days || 0));
    },
    "cat-step": el => stepCatalog(Number(el.dataset.dir) === -1 ? -1 : 1),
    "cat-group": el => {
        const key = el.dataset.group;
        ui.catalog.collapsed[key] = el.getAttribute("aria-expanded") === "true";
        renderCatalogList();
        $("cat-list").querySelector(`[data-action="cat-group"][data-group="${key}"]`)?.focus();
    },
    "cat-back": () => {
        ui.catalog.showDetail = false;
        renderCatalog();
        document.querySelector("#cat-list .cat-row.selected")?.focus();
    },
    "cat-filter": el => {
        ui.catalog.filter = CATALOG_FILTERS[el.dataset.filter] ? el.dataset.filter : "all";
        renderCatalogFilters(catalogEntries());
        renderCatalogList();
    },
    "cat-clear-filters": () => {
        ui.catalog.filter = "all";
        ui.catalog.query = "";
        renderCatalog();
    },
    "open-subject": el => openSubjectInCatalog(el.dataset.mat),
    "home-day": el => {
        ui.home.day = el.dataset.day === "next" ? "next" : "today";
        renderDashboard();
        document.querySelector(`#azi-day [data-action="home-day"][data-day="${ui.home.day}"]`)?.focus();
    },
    "home-risk": () => {
        ui.catalog.filter = "risk";
        ui.catalog.query = "";
        ui.catalog.showDetail = false;
        switchTab("tab-catalog");
    },
    "stats-print": () => openReportPanel(),
    "stats-insights-more": () => {
        ui.statsAllInsights = !ui.statsAllInsights;
        renderStatsInsights(statsEntries());
        $("stats-insights").querySelector('[data-action="stats-insights-more"]')?.focus();
    },
    "stats-period": el => setStatsPeriod(el.dataset.period),
    "stats-jump": el => $(el.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    "open-in-sim": el => openSubjectInSimulator(el.dataset.mat),
    "edit-subject": el => openEditSubjectModal(el.dataset.mat),
    "purtare-edit": el => openPurtareModal(el.dataset.key),
    "purtare-reset": el => {
        const m = metrics.purtare.modules.find(x => x.key === el.dataset.key);
        if (m && m.val !== null) setPurtare(m, 10, "");
    },
    "purtare-toggle-gpa": () => {
        state.purtare.excludeFromGPA = !state.purtare.excludeFromGPA;
        addActivity(state.purtare.excludeFromGPA ? "Purtarea a fost exclusă din media generală." : "Purtarea a fost inclusă din nou în media generală.");
        refresh();
    },
    "edit-grade": el => openEditGradeModal(el.dataset.mat, Number(el.dataset.index)),
    "toggle-priority": el => togglePriority(el.dataset.mat),
    "toggle-exclude": el => toggleExclude(el.dataset.mat),
    "delete-grade": el => deleteGrade(el.dataset.mat, Number(el.dataset.index)),
    "delete-subject": el => deleteSubject(el.dataset.mat),
    "reset-menu": () => openResetMenu(),
    "reset-option": el => confirmResetOption(el.dataset.option),
    ...SIM_ACTIONS,
    ...SETUP_ACTIONS,
    "dismiss-alert": el => dismissAlert(el.dataset.id),
    "mark-alerts-read": () => markAllAlertsRead(),
    "alert-open": el => openAlertTarget(el.dataset.id),
    "save-settings": () => saveSettings(),
    "backup-export": () => exportBackup(),
    "backup-import": () => $("backup-file-input")?.click(),
    "backup-undo": () => undoImport(),
    "reset-settings": () => resetSettings(),
    "quick-add": el => openQuickAdd(el),
    "quick-add-close": () => closeQuickAdd(),
    "qa": el => runQuickAdd(el.dataset.kind),
    // clopoțelul deschide și închide notificările; dacă e deschisă altă fereastră lipită (ex. contul), o închide întâi
    "notif-open": () => {
        if ($("notif-panel") && !$("notif-panel").hidden) { closeNotifPanel(); return; }
        if (!$("action-modal").hidden && $("action-modal").classList.contains("is-modeless")) closeActionModal();
        openNotifPanel();
    },
    "theme-toggle": () => toggleTheme(),
    "notif-close": () => closeNotifPanel(),
    "modal-cancel": () => closeActionModal(),
    "guest-signin": () => { authUI.reason = ""; openAuth("signin"); },
    "none": () => {},
    ...ACCOUNT_ACTIONS,
    ...TOUR_ACTIONS,
    ...PLAN_ACTIONS,
    ...CAT_MENU_ACTIONS
};

function bindEvents() {
    document.addEventListener("click", event => {
        const el = event.target.closest("[data-action]");
        if (!el) return;
        // Fără cont: doar acțiunile care arată ceva; restul deschid autentificarea (și bifele nu se bifează)
        if (!canEdit() && !GUEST_OK.has(el.dataset.action) && ACTIONS[el.dataset.action]) {
            event.preventDefault();
            requireAccount();
            return;
        }
        try {
            ACTIONS[el.dataset.action]?.(el, event);
        } catch (err) {
            // o acțiune care eșuează nu blochează restul aplicației
            console.error(`Acțiunea „${el.dataset.action}” a eșuat.`, err);
            if (typeof reportRenderError === "function") reportRenderError(err);
        }
    });
    document.addEventListener("input", event => {
        if (event.target.id === "set-name") renderBuddyPreview();
        if (event.target.id === "modal-grade-val") {
            document.querySelectorAll(".grade-pick-btn").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.val === event.target.value.trim())));
        }
    });
    // Setările se salvează singure, imediat ce schimbi ceva (nu mai trebuie apăsat „Salvează”).
    document.addEventListener("change", event => {
        const el = event.target;
        if (!el.closest?.("#tab-setari") || !el.matches("input, select") || el.type === "file") return;
        if (el.id === "set-remind-on" || el.id === "set-remind-time" || el.id === "set-remind-ahead") {
            if (!canEdit()) { renderReminderSetting(); requireAccount(); return; }
            saveReminderSetting();
            return;
        }
        if (!(el.id in SETTINGS_FIELDS) && !el.closest("#set-modules") && el.id !== "set-module-preset" && el.id !== "set-county") return;
        if (!canEdit()) { loadSettingsIntoUI(); requireAccount(); return; }
        saveSettings({ quiet: true });
    });

    document.addEventListener("keydown", event => {
        const overlay = $("action-modal");

        if (event.key === "Escape") {
            if (!overlay.hidden) closeActionModal();
            return;
        }

        trapModalFocus(event);

        // Enter într-un câmp din dialog = confirmare.
        if (event.key === "Enter" && !overlay.hidden && event.target.matches("#action-modal-body input")) {
            event.preventDefault();
            const confirmBtn = $("action-modal-confirm");
            if (!confirmBtn.hidden) confirmBtn.click();
        }
    });

    // Click pe fundalul dialogului îl închide.
    $("action-modal").addEventListener("mousedown", event => {
        if (event.target.id === "action-modal") closeActionModal();
    });

    bindShellEvents();
    bindSimulatorEvents();
    bindBackupEvents();
    bindCatalogEvents();
    bindCalendarEvents();
    bindQuickCreate();
    bindIdentity(); // lampa după oră, clinchetul și vibrația (js/ui/identity.js)
    bindSwipes();
    bindPurtareEvents();
    $("stats-sort")?.addEventListener("change", event => {
        ui.statsSort = STATS_SORTS[event.target.value] ? event.target.value : "attention";
        const range = periodRange();
        const subs = periodSubjects(range);
        renderStatsSubjects(statsEntries(subs, range ? calculateMetrics(subs) : metrics), { range });
    });
    // Ctrl+P / Print din browser: același raport curat, nu pagina aplicației.
    window.addEventListener("beforeprint", buildPrintReport);

    // Tema „Sistem” urmărește schimbările sistemului de operare.
    darkQuery.addEventListener?.("change", () => {
        if (state.settings.appearance.theme !== "system") return;
        applyAppearanceSettings();
        renderActiveTab({ keepSettingsForm: true });
    });

    // O nouă zi poate aduce alerte/teste noi; recalculăm când utilizatorul revine în tab.
    let lastDay = getLocalDateKey();
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && getLocalDateKey() !== lastDay) {
            lastDay = getLocalDateKey();
            refresh();
        }
    });
}
