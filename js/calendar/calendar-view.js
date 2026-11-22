/* urNotes · Calendarul, în felul Google Calendar: Zi, Săptămână (cu orele zilei), Lună și Program (lista).
   În stânga (pe calculator): „Creează”, calendarul mic, ce a rămas neterminat și „Calendarele mele” (ce straturi vezi).
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const CAL_VIEWS = ["day", "3day", "week", "month", "schedule"];
const CAL_VIEW_LABEL = { day: "Zi", "3day": "3 zile", week: "Săptămână", month: "Lună", schedule: "Program" };
const CAL_VIEW_KEY = { day: "D", "3day": "X", week: "W", month: "M", schedule: "A" };
const CAL_WEEKENDS_KEY = "urn_cal_weekends_v1";
/** „Afișează weekendurile” (ca la Google): fără ele, săptămâna și luna au doar luni–vineri. */
function calWeekends() {
    if (ui.cal.weekends === undefined) {
        try { ui.cal.weekends = localStorage.getItem(CAL_WEEKENDS_KEY) !== "0"; } catch (_) { ui.cal.weekends = true; }
    }
    return ui.cal.weekends;
}
/** Zilele din grila cu ore, pentru modul curent. */
function calGridDays() {
    const v = ui.cal.view;
    if (v === "day") return [ui.cal.date];
    if (v === "3day") return [0, 1, 2].map(i => addDays(ui.cal.date, i));
    const ws = weekStart(ui.cal.date);
    return Array.from({ length: calWeekends() ? 7 : 5 }, (_, i) => addDays(ws, i));
}
/* vechile moduri (Agendă, Tabel, Panou) se deschid ca listă */
const calViewFrom = v => CAL_VIEWS.includes(v) ? v : v === "agenda" || v === "table" || v === "board" ? "schedule" : "week";

const HOUR_PX = 48;                 // înălțimea unei ore în grilă
const EV_MIN_DEFAULT = 50;          // un eveniment cu oră ține cât o oră de curs
const SCHEDULE_DAYS = 45;           // cât de departe se uită lista „Program”
/* Orele de curs: de la 8:00, 50 de minute plus 10 de pauză (orarul nu are ore scrise) */
const lessonStartMin = () => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(state.settings.school?.start || "");
    return m ? Number(m[1]) * 60 + Number(m[2]) : 8 * 60;
};
const lessonSpan = i => { const s = lessonStartMin() + i * 60; return { from: s, to: s + 50 }; };
const minToHM = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const hmToMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

/* Straturile din „Calendarele mele”: fiecare se poate ascunde */
const CAL_LAYERS = [
    { id: "test", label: "Teste și examene", types: ["Test", "Examen"] },
    { id: "tema", label: "Teme", types: ["Temă"] },
    { id: "proiect", label: "Proiecte și prezentări", types: ["Proiect", "Prezentare"] },
    { id: "personal", label: "Personal", types: ["Personal"] },
    { id: "orar", label: "Orarul" },
    { id: "plan", label: "Plan de învățat" },
    { id: "vacanta", label: "Vacanțe" }
];
const CAL_HIDDEN_KEY = "urn_cal_hidden_v1";
function calHidden() {
    if (!ui.cal.hidden) {
        try { ui.cal.hidden = new Set(JSON.parse(localStorage.getItem(CAL_HIDDEN_KEY) || "[]")); } catch (_) { ui.cal.hidden = new Set(); }
    }
    return ui.cal.hidden;
}
const layerOfType = type => CAL_LAYERS.find(l => l.types?.includes(type))?.id || "personal";
const layerOn = id => !calHidden().has(id);
const evClass = ev => `gc-${EVENT_TYPE_CLASS[ev.type] || "personal"}`;

function calOccurrences(from, to) {
    return occurrencesBetween(from, to).filter(o => layerOn(layerOfType(o.ev.type)));
}
const isHoliday = date => { const wd = parseDateKey(date).getDay(); return !isSchoolDay(date) && wd >= 1 && wd <= 5; };
function calLessonsOn(date) {
    if (!layerOn("orar") || !isSchoolDay(date)) return [];
    return (state.timetable[parseDateKey(date).getDay()] || []).map((m, i) => ({ mat: m, i })).filter(l => l.mat);
}

/* ==================== desenarea ==================== */
function renderCalendar() {
    const body = $("cal-body");
    if (!body) return;
    ui.cal.view = calViewFrom(ui.cal.view);
    renderCalToolbar();
    renderMiniMonth();
    renderCalLayers();
    renderCalOverview();
    // grila păstrează ora la care erai când schimbi ziua sau săptămâna (ca la Google); prima dată începe puțin înainte de 8
    const oldScroll = $("gc-scroll")?.scrollTop;
    const keepScroll = ui.cal.renderedKey ? oldScroll : null;
    calFit();
    if (ui.cal.view === "month") renderMonthView();
    else if (ui.cal.view === "schedule") renderScheduleView();
    else renderTimeGrid(calGridDays());
    const scroller = $("gc-scroll");
    if (scroller) scroller.scrollTop = keepScroll ?? calFirstScroll();
    ui.cal.renderedKey = `${ui.cal.view}|${ui.cal.date}`;
    if (typeof qc !== "undefined" && qc.open) drawQcGhost();
    if (typeof cc !== "undefined" && cc.open) document.querySelector(`#cal-body [data-day="${cc.date}"]`)?.classList.add("is-target");
}

/** Prima poziție a grilei: puțin înainte de prima oră sau primul eveniment (ca la Google, nu de la miezul nopții). */
function calFirstScroll() {
    return Math.max(0, (lessonStartMin() - 45) / 60 * HOUR_PX);
}

function renderCalToolbar() {
    const v = ui.cal.view;
    const d = parseDateKey(ui.cal.date);
    let title;
    if (v === "day") title = `${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
    else if (v === "week" || v === "3day") {
        const days = calGridDays();
        const a = parseDateKey(days[0]), b = parseDateKey(days.at(-1));
        title = a.getMonth() === b.getMonth() ? `${MONTHS[a.getMonth()]} ${a.getFullYear()}`
            : a.getFullYear() === b.getFullYear() ? `${MONTH_SHORT[a.getMonth()]} – ${MONTH_SHORT[b.getMonth()]} ${b.getFullYear()}`
            : `${MONTH_SHORT[a.getMonth()]} ${a.getFullYear()} – ${MONTH_SHORT[b.getMonth()]} ${b.getFullYear()}`;
        title = title.replace(/^./, c => c.toUpperCase());
    } else title = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    // pe telefon, ca în aplicația Google: fără anul curent, ca să încapă
    const phone = typeof matchMedia === "function" && matchMedia("(max-width: 640px)").matches;
    if (phone) title = title.replace(` ${new Date().getFullYear()}`, "");
    setText("cal-title", title);
    // pentru cititoarele de ecran: unde ești față de azi
    const today = getLocalDateKey();
    let cap = "";
    if (v === "week" || v === "day" || v === "3day") {
        const diff = Math.round(daysBetween(weekStart(today), weekStart(ui.cal.date)) / 7);
        cap = diff === 0 ? "Săptămâna aceasta" : diff === 1 ? "Săptămâna viitoare" : diff === -1 ? "Săptămâna trecută"
            : diff > 0 ? `Peste ${plural(diff, "săptămână", "săptămâni")}` : `Acum ${plural(-diff, "săptămână", "săptămâni")}`;
        if (v === "day") cap = relativeDayLabel(ui.cal.date);
    } else if (v === "month") {
        const md = (d.getFullYear() - parseDateKey(today).getFullYear()) * 12 + d.getMonth() - parseDateKey(today).getMonth();
        cap = md === 0 ? "Luna aceasta" : md === 1 ? "Luna viitoare" : md === -1 ? "Luna trecută" : "";
    } else cap = `Următoarele ${SCHEDULE_DAYS} de zile`;
    setText("cal-caption", cap);
    const btn = $("gc-viewbtn");
    if (btn) btn.querySelector("span").textContent = CAL_VIEW_LABEL[v];
    document.querySelectorAll("#gc-viewmenu [data-action='cal-view']").forEach(b => b.setAttribute("aria-checked", String(b.dataset.view === v)));
    const we = $("gc-weekends");
    if (we) we.setAttribute("aria-checked", String(calWeekends()));
    $("tab-calendar")?.setAttribute("data-view", v);
    const t = $("cal-title-btn");
    if (t) {
        t.setAttribute("aria-expanded", String(Boolean(ui.cal.miniOpen)));
        // pe ecran mare calendarul mic e mereu în stânga: titlul nu mai e buton
        const wide = typeof matchMedia === "function" && matchMedia("(min-width: 1001px)").matches;
        t.tabIndex = wide ? -1 : 0;
    }
    document.querySelector(".gcal")?.classList.toggle("is-mini-open", Boolean(ui.cal.miniOpen));
}

/* ---------- calendarul mic ---------- */
function renderMiniMonth() {
    const box = $("gc-mini");
    if (!box) return;
    const base = parseDateKey(ui.cal.mini || ui.cal.date);
    const first = getLocalDateKey(new Date(base.getFullYear(), base.getMonth(), 1));
    const last = getLocalDateKey(new Date(base.getFullYear(), base.getMonth() + 1, 0));
    const start = weekStart(first);
    const today = getLocalDateKey();
    const gd = ui.cal.view === "week" || ui.cal.view === "3day" ? calGridDays() : [ui.cal.date];
    const sel = [gd[0], gd.at(-1)];
    const marks = new Set(calOccurrences(start, addDays(start, 41)).map(o => o.date));
    const cells = [];
    for (let i = 0; i < 42; i++) {
        const date = addDays(start, i);
        if (i === 35 && date > last) break;
        const cls = ["gc-mini-d", date < first || date > last ? "is-out" : "", date === today ? "is-today" : "", date >= sel[0] && date <= sel[1] ? "is-sel" : "", marks.has(date) ? "has-ev" : ""].filter(Boolean).join(" ");
        cells.push(`<button type="button" class="${cls}" data-action="cal-mini-day" data-date="${date}" aria-label="${escapeHTML(getDateLabel(date))}">${parseDateKey(date).getDate()}</button>`);
    }
    box.innerHTML = `
        <div class="gc-mini-head">
            <b>${MONTHS[base.getMonth()]} ${base.getFullYear()}</b>
            <span>
                <button type="button" class="gc-ibtn" data-action="cal-mini" data-offset="-1" aria-label="Luna anterioară">${icon("chevron", "is-flip")}</button>
                <button type="button" class="gc-ibtn" data-action="cal-mini" data-offset="1" aria-label="Luna următoare">${icon("chevron")}</button>
            </span>
        </div>
        <div class="gc-mini-grid">
            ${[1, 2, 3, 4, 5, 6, 0].map(wd => `<span class="gc-mini-wd" aria-hidden="true">${WEEKDAY_SHORT[wd][0]}</span>`).join("")}
            ${cells.join("")}
        </div>`;
}

/* ---------- „Calendarele mele” ---------- */
function renderCalLayers() {
    const box = $("gc-layers");
    if (!box) return;
    box.innerHTML = `
        <p class="gc-side-title">Calendarele mele</p>
        ${CAL_LAYERS.map(l => `
            <label class="gc-layer gc-l-${l.id}">
                <input type="checkbox" data-action="cal-layer" data-layer="${l.id}" ${layerOn(l.id) ? "checked" : ""}>
                <i aria-hidden="true">${icon("check")}</i><span>${l.label}</span>
            </label>`).join("")}`;
}

/* ---------- ce a rămas neterminat ---------- */
function renderCalOverview() {
    const box = $("cal-overview");
    if (!box) return;
    const today = getLocalDateKey();
    const links = gradeLinks();
    // pentru o serie repetată: doar cea mai recentă apariție ratată (+ câte mai vechi)
    const attention = missedOccurrences(links, today);
    const out = [];
    if (attention.length) {
        out.push(`
            <div class="cal-attn" role="group" aria-labelledby="cal-attn-title">
                <p class="cal-attn-title" id="cal-attn-title">${icon("alert")} ${attention.length === 1 ? "Un eveniment trecut așteaptă" : `${attention.length} evenimente trecute așteaptă`}</p>
                <ul class="cal-attn-list">${attention.slice(0, 3).map(({ ev, date, older }) => `
                    <li class="cal-att-row">
                        <button type="button" class="cal-att-info" data-action="cal-goto" data-date="${date}">
                            <i class="gc-dot ${evClass(ev)}" aria-hidden="true"></i>
                            <b>${escapeHTML(ev.title)}</b>
                            <small>${escapeHTML([relativeDayLabel(date), older && `+${older} mai ${older === 1 ? "veche" : "vechi"}`].filter(Boolean).join(" · "))}</small>
                        </button>
                        <span class="cal-att-actions">
                            ${canGradeOccurrence(ev, date, links) && NEEDS_GRADE.has(ev.type) ? `<button type="button" class="btn btn-primary btn-sm" data-action="event-grade" data-id="${escapeHTML(ev.id)}" data-date="${date}">${icon("plus")} Notă</button>` : ""}
                            <button type="button" class="btn btn-glass btn-sm" data-action="event-done" data-id="${escapeHTML(ev.id)}" data-date="${date}"
                                title="${NEEDS_GRADE.has(ev.type) ? "Marchează ca încheiat fără notă" : "Marchează ca făcut"}">${icon("check")} ${NEEDS_GRADE.has(ev.type) ? "Fără notă" : "Făcut"}</button>
                        </span>
                    </li>`).join("")}</ul>
                ${attention.length > 3 ? `<p class="cal-attn-more">și încă ${attention.length - 3} în săptămânile trecute</p>` : ""}
            </div>`);
    }
    if (!Object.keys(state.timetable).length && Object.keys(state.subjects).length) {
        out.push(`<p class="cal-tip">${icon("calendar-days")} Cu orarul, orele tale apar în calendar și adaugi un test dintr-o atingere. <button type="button" class="btn btn-text btn-sm" data-action="timetable">Completează orarul</button></p>`);
    }
    box.innerHTML = out.join("");
    box.hidden = !out.length;
}

/* ---------- bucățile unui eveniment ---------- */
function evTimeLabel(ev) {
    const s = hmToMin(ev.time);
    if (s === null) return "Toată ziua";
    return `${minToHM(s)} – ${minToHM(s + (Number(ev.duration) || EV_MIN_DEFAULT))}`;
}
function evStateBits(ev, date, links) {
    const link = linkedGrade(links, ev, date);
    const done = isOccurrenceDone(ev, date, links);
    return { link, done };
}
/** Un eveniment, oriunde apare: un bloc pe care îl atingi ca să vezi detaliile (ca la Google). */
function calEvHTML({ ev, date }, links, { kind = "chip", style = "" } = {}) {
    const { link, done } = evStateBits(ev, date, links);
    const id = escapeHTML(ev.id);
    const timed = hmToMin(ev.time) !== null;
    const label = `${ev.title}, ${timed ? evTimeLabel(ev) : "toată ziua"}${ev.subject ? `, ${ev.subject}` : ""}${link ? `, nota ${link.grade.val}` : done ? ", făcut" : ""}`;
    const inner = kind === "block"
        ? `<b class="gc-ev-title">${escapeHTML(ev.title)}</b><span class="gc-ev-time">${escapeHTML(evTimeLabel(ev))}${ev.repeat ? " · ↻" : ""}</span>${link ? `<span class="gc-ev-grade">Nota ${escapeHTML(link.grade.val)}</span>` : ""}`
        : kind === "row"
        ? `<i class="gc-dot ${evClass(ev)}" aria-hidden="true"></i><span class="gc-row-time">${escapeHTML(evTimeLabel(ev))}</span><span class="gc-row-text"><b>${escapeHTML(ev.title)}</b>${ev.subject && ev.title !== autoEventTitle(ev.type, ev.subject) ? `<small>${escapeHTML(ev.subject)}</small>` : ""}</span>${link ? `<span class="gc-row-grade">Nota ${escapeHTML(link.grade.val)}</span>` : done ? `<span class="gc-row-done">${icon("check")} Făcut</span>` : ""}${ev.repeat ? `<span class="gc-row-rep" title="Se repetă">↻</span>` : ""}`
        : timed
        ? `<i class="gc-dot ${evClass(ev)}" aria-hidden="true"></i><span class="gc-chip-time">${escapeHTML(ev.time)}</span><b>${escapeHTML(ev.title)}</b>${link ? `<span class="gc-chip-grade">Nota ${escapeHTML(link.grade.val)}</span>` : ""}`
        : `<b>${escapeHTML(ev.title)}</b>${ev.repeat ? `<span class="gc-chip-rep" aria-hidden="true">↻</span>` : ""}${link ? `<span class="gc-chip-grade">Nota ${escapeHTML(link.grade.val)}</span>` : ""}`;
    const cls = ["cal-ev", `gc-ev-${kind}`, evClass(ev), timed && kind === "chip" ? "is-timed" : "", done ? "is-done" : ""].filter(Boolean).join(" ");
    return `<div class="${cls}" draggable="true" data-id="${id}" data-date="${date}" ${style ? `style="${style}"` : ""}>
        <button type="button" class="cal-ev-main" data-action="cal-ev" data-id="${id}" data-date="${date}" aria-label="${escapeHTML(label)}" aria-haspopup="dialog">${inner}</button>
    </div>`;
}

/* ---------- Zi și Săptămână: orele zilei, ca o grilă ---------- */
function renderTimeGrid(days) {
    const today = getLocalDateKey();
    const links = gradeLinks();
    const occ = calOccurrences(days[0], days.at(-1));
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const head = days.map(date => {
        const d = parseDateKey(date), wd = d.getDay();
        return `<div class="gc-dayhead ${date === today ? "is-today" : ""} ${date < today ? "is-past" : ""}">
            <span class="gc-wd">${WEEKDAY_SHORT[wd]}</span>
            <button type="button" class="gc-dnum" data-action="cal-day" data-date="${date}" aria-label="${escapeHTML(`${WEEKDAY_LONG[wd]}, ${getDateLabel(date)}: vezi ziua`)}">${d.getDate()}</button>
        </div>`;
    }).join("");

    const allDay = days.map(date => {
        const items = occ.filter(o => o.date === date && hmToMin(o.ev.time) === null);
        const holiday = layerOn("vacanta") && isHoliday(date);
        const plan = layerOn("plan") ? calPlanHTML(date) : "";
        return `<div class="gc-adcell ${date === today ? "is-today" : ""}" data-day="${date}" data-drop>
            ${holiday ? `<span class="gc-holiday">${icon("sun")} Vacanță</span>` : ""}
            ${items.map(o => calEvHTML(o, links)).join("")}
            ${plan}
        </div>`;
    }).join("");

    const hours = Array.from({ length: 23 }, (_, i) => `<span class="gc-hour" style="top:${(i + 1) * HOUR_PX}px">${i + 1}:00</span>`).join("");

    const cols = days.map(date => {
        const d = parseDateKey(date), wd = d.getDay();
        const timed = occ.filter(o => o.date === date && hmToMin(o.ev.time) !== null)
            .map(o => { const s = hmToMin(o.ev.time); return { o, s, e: s + (Number(o.ev.duration) || EV_MIN_DEFAULT) }; })
            .sort((a, b) => a.s - b.s || b.e - a.e);
        layoutLanes(timed);
        const lessons = calLessonsOn(date).map(({ mat, i }) => {
            const { from, to } = lessonSpan(i);
            return `<button type="button" class="cal-lesson gc-lesson" data-action="cc-pick" data-date="${date}" data-mat="${escapeHTML(mat)}" style="${subjectStyle(mat)}; top:${from / 60 * HOUR_PX}px; height:${(to - from) / 60 * HOUR_PX - 2}px"
                title="${escapeHTML(`Ora ${i + 1}: ${mat}, ${minToHM(from)}–${minToHM(to)}. Atinge ca să adaugi un test sau o temă.`)}"><span class="cal-lesson-n">${i + 1}</span><span class="cal-lesson-name">${escapeHTML(shortSubjectName(mat))}</span><span class="gc-lesson-time">${minToHM(from)}</span></button>`;
        }).join("");
        const evs = timed.map(({ o, s, e, lane, lanes }) => calEvHTML(o, links, {
            kind: "block",
            style: `top:${s / 60 * HOUR_PX}px; height:${Math.max(22, (e - s) / 60 * HOUR_PX - 2)}px; left:calc(${lane / lanes * 100}% + 2px); width:calc(${100 / lanes}% - ${lanes > 1 ? 4 : 10}px)`
        })).join("");
        const cls = ["cal-col", "gc-col", date === today && "is-today", date < today && "is-past", (wd === 0 || wd === 6) && "is-weekend", isHoliday(date) && "is-holiday"].filter(Boolean).join(" ");
        return `<div class="${cls}" role="group" data-date="${date}" data-day="${date}" data-drop aria-label="${escapeHTML(`${WEEKDAY_LONG[wd]}, ${getDateLabel(date)}`)}">
            ${lessons}${evs}
            ${date === today ? `<div class="gc-now" style="top:${nowMin / 60 * HOUR_PX}px" aria-hidden="true"></div>` : ""}
        </div>`;
    }).join("");

    $("cal-body").innerHTML = `
        <div class="gc-grid" style="--days:${days.length}">
            <div class="gc-gridhead">
                <div class="gc-gutter"></div>${head}
            </div>
            <div class="gc-allday">
                <div class="gc-gutter"><small>toată ziua</small></div>${allDay}
            </div>
            <div class="gc-scroll" id="gc-scroll" tabindex="0" aria-label="Orele zilei: derulează ca să vezi tot">
                <div class="gc-body" style="height:${24 * HOUR_PX}px">
                    <div class="gc-gutter gc-hours" aria-hidden="true">${hours}</div>${cols}
                </div>
            </div>
        </div>`;
}

/** Evenimentele care se suprapun stau unul lângă altul (ca la Google). */
function layoutLanes(items) {
    let cluster = [], end = -1;
    const flush = () => {
        const laneEnds = [];
        cluster.forEach(it => {
            let lane = laneEnds.findIndex(e => e <= it.s);
            if (lane < 0) { lane = laneEnds.length; laneEnds.push(it.e); } else laneEnds[lane] = it.e;
            it.lane = lane;
        });
        cluster.forEach(it => { it.lanes = laneEnds.length; });
        cluster = [];
    };
    items.forEach(it => {
        if (it.s >= end && cluster.length) flush();
        cluster.push(it);
        end = Math.max(end, it.e);
    });
    if (cluster.length) flush();
}

/** Sesiunile din plan, discrete, în rândul „toată ziua”. */
function calPlanHTML(date) {
    if (!state.plan.prefs.setup || !state.plan.prefs.calendar) return "";
    const items = planItemsOn(date);
    if (!items.length) return "";
    return `<div class="cal-plan" aria-label="Din plan">${items.map(it => `
        <button type="button" class="cal-plan-item ${it.done ? "is-done" : ""}" data-action="nav" data-tab="tab-plan" title="${escapeHTML(`${PLAN_KINDS[it.kind].label} · ${it.min} min${it.reason ? ` · ${it.reason}` : ""}`)}">
            ${icon(it.done ? "check" : PLAN_KINDS[it.kind].icon)}<span>${escapeHTML(it.mat)} · ${it.min}′</span></button>`).join("")}</div>`;
}

/* ---------- Lună ---------- */
function renderMonthView() {
    const anchor = parseDateKey(ui.cal.date);
    const first = getLocalDateKey(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    const last = getLocalDateKey(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
    const gridStart = weekStart(first);
    const gridEnd = addDays(weekStart(last), 6);
    const today = getLocalDateKey();
    const links = gradeLinks();
    const occ = calOccurrences(gridStart, gridEnd);
    const weekends = calWeekends();
    // câte bare încap într-o zi, după înălțimea reală a grilei (ca la Google: restul devin „încă N”)
    const rows = Math.round((daysBetween(gridStart, gridEnd) + 1) / 7);
    const bodyH = $("cal-body").clientHeight || 700;
    const cellH = (bodyH - 34) / rows;
    const SHOW = Math.max(1, Math.floor((cellH - 34) / 22));
    const cells = [];
    for (let date = gridStart; date <= gridEnd; date = addDays(date, 1)) {
        const d = parseDateKey(date);
        if (!weekends && (d.getDay() === 0 || d.getDay() === 6)) continue;
        const items = occ.filter(o => o.date === date).sort((a, b) => (hmToMin(a.ev.time) ?? -1) - (hmToMin(b.ev.time) ?? -1));
        const holiday = layerOn("vacanta") && isHoliday(date);
        const cls = ["gc-mcell", date < first || date > last ? "is-out" : "", date === today ? "is-today" : "", d.getDay() === 0 || d.getDay() === 6 ? "is-weekend" : "", holiday ? "is-holiday" : ""].filter(Boolean).join(" ");
        const shown = items.slice(0, holiday ? SHOW - 1 : SHOW);
        cells.push(`
            <div class="${cls}" data-day="${date}" data-drop>
                <button type="button" class="gc-mnum" data-action="cal-day" data-date="${date}" aria-label="${escapeHTML(`${getDateLabel(date)}${items.length ? `, ${plural(items.length, "eveniment", "evenimente")}` : ""}: vezi ziua`)}">${d.getDate() === 1 ? `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}` : d.getDate()}</button>
                <div class="gc-mevs">
                    ${holiday ? `<span class="gc-holiday">Vacanță</span>` : ""}
                    ${shown.map(o => calEvHTML(o, links)).join("")}
                    ${items.length > shown.length ? `<button type="button" class="gc-more" data-action="cal-day" data-date="${date}">încă ${items.length - shown.length}</button>` : ""}
                </div>
            </div>`);
    }
    const cols = weekends ? 7 : 5;
    $("cal-body").innerHTML = `
        <div class="gc-month" style="--rows:${cells.length / cols}; --cols:${cols}">
            <div class="gc-mhead" aria-hidden="true">${(weekends ? [1, 2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5]).map(wd => `<span>${WEEKDAY_SHORT[wd]}</span>`).join("")}</div>
            <div class="gc-mgrid">${cells.join("")}</div>
        </div>`;
}

/* ---------- Program: doar zilele cu ceva, una sub alta ---------- */
function renderScheduleView() {
    const today = getLocalDateKey();
    const start = ui.cal.date;
    const end = addDays(start, SCHEDULE_DAYS - 1);
    const links = gradeLinks();
    const occ = calOccurrences(start, end);
    let html = "", month = -1, any = false;
    for (let date = start; date <= end; date = addDays(date, 1)) {
        const d = parseDateKey(date), wd = d.getDay();
        const items = occ.filter(o => o.date === date).sort((a, b) => (hmToMin(a.ev.time) ?? -1) - (hmToMin(b.ev.time) ?? -1));
        const plan = layerOn("plan") ? calPlanHTML(date) : "";
        const holidayStart = layerOn("vacanta") && isHoliday(date) && !isHoliday(addDays(date, -1));
        if (!items.length && !plan && !holidayStart && date !== today) continue;
        any = any || items.length > 0;
        if (d.getMonth() !== month) {
            month = d.getMonth();
            html += `<h4 class="gc-smonth">${MONTHS[month]} ${d.getFullYear()}</h4>`;
        }
        html += `
            <section class="gc-sday ${date === today ? "is-today" : ""}" data-day="${date}" data-drop aria-label="${escapeHTML(`${WEEKDAY_LONG[wd]}, ${getDateLabel(date)}`)}">
                <button type="button" class="gc-sdate" data-action="cal-day" data-date="${date}" aria-label="${escapeHTML(`${getDateLabel(date)}: vezi ziua`)}"><b>${d.getDate()}</b><span>${WEEKDAY_SHORT[wd]}</span></button>
                <div class="gc-sitems">
                    ${holidayStart ? `<div class="gc-srow gc-srow-holiday">${icon("sun")} <span>Începe vacanța</span></div>` : ""}
                    ${items.map(o => calEvHTML(o, links, { kind: "row" })).join("")}
                    ${plan}
                    ${!items.length && !plan && !holidayStart ? `<button type="button" class="gc-sempty" data-action="cc-day" data-date="${date}">Nimic azi. Adaugă ceva</button>` : ""}
                </div>
            </section>`;
    }
    $("cal-body").innerHTML = `<div class="gc-schedule">${html}${any ? "" : `<p class="gc-snone">Nimic programat în următoarele ${SCHEDULE_DAYS} de zile.</p>`}</div>`;
}

/* ==================== detaliile unui eveniment (fereastra mică, ca la Google) ==================== */
function openEvPop(id, date, anchor) {
    const found = findEvent(id);
    if (!found) return;
    const { ev } = found;
    const links = gradeLinks();
    const { link, done } = evStateBits(ev, date, links);
    const d = parseDateKey(date);
    const canGrade = NEEDS_GRADE.has(ev.type) && !link && canGradeOccurrence(ev, date, links);
    closeEvPop(false);
    const pop = document.createElement("div");
    pop.id = "gc-pop";
    pop.className = "gc-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-labelledby", "gc-pop-title");
    pop.innerHTML = `
        <div class="gc-pop-tools">
            <button type="button" class="gc-ibtn" data-action="event-open" data-id="${escapeHTML(id)}" data-date="${date}" aria-label="Editează" title="Editează">${icon("pen")}</button>
            <button type="button" class="gc-ibtn" data-action="event-delete" data-id="${escapeHTML(id)}" data-date="${date}" aria-label="Șterge" title="Șterge">${icon("trash")}</button>
            <button type="button" class="gc-ibtn" data-action="gc-pop-close" aria-label="Închide" title="Închide">${icon("x")}</button>
        </div>
        <div class="gc-pop-row gc-pop-head">
            <i class="gc-sq ${evClass(ev)}" aria-hidden="true"></i>
            <div>
                <h4 id="gc-pop-title" class="${done ? "is-done" : ""}">${escapeHTML(ev.title)}</h4>
                <p>${escapeHTML(`${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ""}`)}${hmToMin(ev.time) !== null ? ` · ${escapeHTML(evTimeLabel(ev))}` : ""}</p>
                ${ev.repeat ? `<p>↻ ${ev.repeat.every === 2 ? "La două săptămâni" : "În fiecare săptămână"}${ev.repeat.until ? `, până pe ${escapeHTML(getDateLabel(ev.repeat.until))}` : ""}</p>` : ""}
            </div>
        </div>
        <div class="gc-pop-row">${icon(EVENT_TYPE_ICON[ev.type] || "pin")}<span>${escapeHTML(ev.type)}${ev.subject ? ` · ${escapeHTML(ev.subject)}` : ""}</span></div>
        ${ev.cls ? `<div class="gc-pop-row">${icon("graduation")}<span>Pus de profesor pentru ${escapeHTML(ev.cls)}</span></div>` : ""}
        ${ev.description ? `<div class="gc-pop-row">${icon("note")}<span class="gc-pop-notes">${escapeHTML(ev.description)}</span></div>` : ""}
        ${link ? `<div class="gc-pop-row">${icon("check-circle")}<span>Ai primit nota <b>${escapeHTML(link.grade.val)}</b></span></div>` : done ? `<div class="gc-pop-row">${icon("check-circle")}<span>${NEEDS_GRADE.has(ev.type) ? "Încheiat fără notă" : "Făcut"}</span></div>` : ""}
        <div class="gc-pop-actions">
            ${canGrade ? `<button type="button" class="btn btn-primary btn-sm" data-action="event-grade" data-id="${escapeHTML(id)}" data-date="${date}">${icon("plus")} Notă</button>` : ""}
            ${link ? `<button type="button" class="btn btn-glass btn-sm" data-action="edit-grade" data-mat="${escapeHTML(link.mat)}" data-index="${link.idx}">${icon("pen")} Nota ${escapeHTML(link.grade.val)}</button>`
                : `<button type="button" class="btn btn-glass btn-sm" data-action="event-done" data-id="${escapeHTML(id)}" data-date="${date}" aria-pressed="${done}">${icon(done ? "undo" : "check")} ${done ? "Marchează ca nefăcut" : NEEDS_GRADE.has(ev.type) ? "Fără notă" : "Făcut"}</button>`}
        </div>`;
    document.body.appendChild(pop);
    ui.cal.pop = { id, date, anchor };
    placeEvPop(pop, anchor);
    pop.querySelector(".gc-pop-actions button, .gc-pop-tools button")?.focus({ preventScroll: true });
}

function placeEvPop(pop, anchor) {
    if (window.innerWidth <= 640 || !anchor?.getBoundingClientRect) { pop.classList.add("is-sheet"); return; }
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth || 360, h = pop.offsetHeight || 220;
    let left = r.right + 10;
    if (left + w > window.innerWidth - 12) left = r.left - w - 10;
    if (left < 12) left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left));
    let top = Math.min(Math.max(12, r.top), window.innerHeight - h - 12);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
}

function closeEvPop(restoreFocus = true) {
    const pop = $("gc-pop");
    if (!pop) return;
    const back = ui.cal.pop?.anchor;
    pop.remove();
    ui.cal.pop = null;
    if (restoreFocus && back && document.contains(back)) back.focus({ preventScroll: true });
}

/* ==================== navigare ==================== */
function calNavigate(offset) {
    const d = parseDateKey(ui.cal.date);
    const v = ui.cal.view;
    ui.cal.date = v === "month" ? getLocalDateKey(new Date(d.getFullYear(), d.getMonth() + offset, 1))
        : addDays(ui.cal.date, offset * (v === "day" ? 1 : v === "3day" ? 3 : v === "week" ? 7 : 30));
    ui.cal.mini = null;
    renderCalendar();
}

function setCalView(view) {
    ui.cal.view = calViewFrom(view);
    try { localStorage.setItem("urn_cal_view_v1", ui.cal.view); } catch (_) { /* fără stocare */ }
    closeCalMenu();
    renderCalendar();
}

function calGoto(dateKey, { view = ui.cal.view } = {}) {
    if (!DATE_KEY_RE.test(String(dateKey))) return;
    ui.cal.date = dateKey;
    ui.cal.view = calViewFrom(view);
    ui.cal.mini = null;
    if (ui.activeTab !== "tab-calendar") switchTab("tab-calendar");
    else renderCalendar();
    const el = document.querySelector(`#cal-body [data-day="${dateKey}"]`);
    if (el) {
        el.scrollIntoView?.({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
        el.classList.add("flash");
        setTimeout(() => el.classList.remove("flash"), 1600);
    }
}

/** O zi anume, în modul Zi (din numărul zilei, ca la Google). */
function calJump(date) {
    calGoto(date, { view: "day" });
}

/** Folosită de Dashboard, Catalog și căutare. */
function showDateInCalendar(dateKey) {
    calGoto(dateKey);
}

function toggleCalMenu(force) {
    const menu = $("gc-viewmenu"), btn = $("gc-viewbtn");
    if (!menu || !btn) return;
    const open = force ?? menu.hidden;
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector('[aria-checked="true"]')?.focus();
}
const closeCalMenu = () => toggleCalMenu(false);

/** Creează (butonul din stânga, „+”-ul de pe telefon sau tasta C): ziua aleasă, dacă se vede; altfel azi. */
function calCreate(anchor = null) {
    const today = getLocalDateKey();
    const v = ui.cal.view;
    const days = v === "day" || v === "3day" || v === "week" ? calGridDays() : [ui.cal.date];
    openQuickCreate({ date: today >= days[0] && today <= days.at(-1) ? today : ui.cal.date, anchor });
}

/** Pagina Calendar nu se derulează: calendarul umple ecranul până la bara de jos, iar derularea e doar înăuntrul lui. */
function calFit() {
    const g = document.querySelector(".gcal");
    if (!g || !g.offsetParent) return;
    if (window.scrollY) window.scrollTo({ top: 0, behavior: "instant" });
    const nav = document.querySelector(".mobile-bottom-nav");
    const navTop = nav && getComputedStyle(nav).display !== "none" ? nav.getBoundingClientRect().top : window.innerHeight;
    const bottom = window.innerHeight - navTop + (navTop < window.innerHeight ? 10 : 16);
    const h = Math.max(380, Math.floor(window.innerHeight - g.getBoundingClientRect().top - bottom));
    g.style.height = `${h}px`;
    requestAnimationFrame(calFitSide);
}
/** Coloana din stânga trebuie să se vadă toată: dacă nu încape, scoate pe rând ce e dublat sau mai puțin important. */
function calFitSide() {
    const side = document.querySelector(".gcal-side");
    if (!side || !side.offsetParent) return;
    side.classList.remove("is-tight", "is-tighter");
    if (side.scrollHeight > side.clientHeight + 1) side.classList.add("is-tight");
    if (side.scrollHeight > side.clientHeight + 1) side.classList.add("is-tighter");
}
window.addEventListener("resize", () => { if (ui.activeTab === "tab-calendar") { calFit(); if (ui.cal.view === "month") renderMonthView(); } });

/* linia de „acum” se mută singură (doar într-un browser adevărat: în teste ar ține procesul deschis) */
if (!/jsdom/i.test(navigator.userAgent || "")) setInterval(() => {
    const line = document.querySelector("#cal-body .gc-now");
    if (!line) return;
    const n = new Date();
    line.style.top = `${(n.getHours() * 60 + n.getMinutes()) / 60 * HOUR_PX}px`;
}, 60000);

registerTab("tab-calendar", { render: renderCalendar, title: "Calendar", icon: "calendar", group: "calendar" });
