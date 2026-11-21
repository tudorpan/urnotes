/* urNotes · Adaugă: întâi alegi ce adaugi (plăci mari: Notă, Test, Temă, Proiect), apoi un formular scurt făcut pentru acel lucru.
   Se deschide peste pagină: pe calculator ca o fereastră în mijloc, pe telefon ca o foaie care urcă de jos.
   Intrări: „+” (telefon și bara laterală), tastele N/T/H, „+” de pe o zi sau o oră din calendar, „+” de lângă o materie,
   rândul „Adaugă” din Calendar. Cu tipul deja ales (N, T, H, „+” la o materie) sare direct la formular.
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const CC_GRADE = "Notă";
const CC_TYPES = [CC_GRADE, "Test", "Temă", "Proiect", "Examen", "Prezentare", "Personal"];
const CC_GTYPE_KEY = "urn_quick_grade_type_v1"; // același tip ținut minte ca la „+” de pe rândul materiei
/** Ce scrie pe fiecare tip: placa din primul pas, titlul formularului, butonul de adăugat. */
const CC_INFO = {
    Notă: { tile: "Ai primit o notă", title: "Notă nouă", add: "Adaugă nota", icon: "check-circle" },
    Test: { tile: "Urmează un test sau o lucrare", title: "Test nou", add: "Adaugă testul" },
    Temă: { tile: "Ai ceva de făcut acasă", title: "Temă nouă", add: "Adaugă tema" },
    Proiect: { tile: "Un proiect sau un referat", title: "Proiect nou", add: "Adaugă proiectul" },
    Examen: { label: "Examen", title: "Examen nou", add: "Adaugă examenul" },
    Prezentare: { label: "Prezentare", title: "Prezentare nouă", add: "Adaugă prezentarea" },
    Personal: { label: "Altceva", title: "Altceva", add: "Adaugă" }
};
const CC_BIG = [CC_GRADE, "Test", "Temă", "Proiect"];
const CC_SMALL = ["Examen", "Prezentare", "Personal"];

const cc = { open: false, step: "type", type: "Test", subject: "", date: "", time: "", val: 0, gtype: "Test", details: "", manual: new Set(), ctxDate: "", ctxMat: "", orderDate: "", returnFocus: null };

const ccToday = () => getLocalDateKey();
const ccIsGrade = () => cc.type === CC_GRADE;
const ccIcon = type => (type === CC_GRADE ? CC_INFO[CC_GRADE].icon : EVENT_TYPE_ICON[type] || "pin");
const ccTone = type => (type === CC_GRADE ? "is-grade" : `ev-${EVENT_TYPE_CLASS[type] || "personal"}`);
function ccSavedGType() { try { const t = localStorage.getItem(CC_GTYPE_KEY); return GRADE_TYPES.includes(t) ? t : "Test"; } catch (_) { return "Test"; } }

/* ---------- zile ---------- */
function ccDayLabel(d) {
    const n = daysBetween(ccToday(), d);
    if (n === 0) return "Azi";
    if (n === 1) return "Mâine";
    if (n === -1) return "Ieri";
    const dt = parseDateKey(d);
    return `${WEEKDAY_SHORT[dt.getDay()]} ${dt.getDate()}`;
}
/** Pentru o notă: azi și cele 7 zile dinainte; pentru un eveniment: azi și următoarele 7 (sau de la ziua aleasă din calendar). */
function ccDays() {
    if (ccIsGrade()) return Array.from({ length: 8 }, (_, i) => addDays(ccToday(), -i));
    const start = cc.ctxDate && cc.ctxDate > ccToday() ? cc.ctxDate : ccToday();
    return Array.from({ length: 8 }, (_, i) => addDays(start, i));
}
const ccHasLesson = (mat, d) => Boolean(mat) && (lessonsOn(d) || []).includes(mat);
function ccLongDay(d) {
    const dt = parseDateKey(d);
    return `${WEEKDAY_LONG[dt.getDay()].toLowerCase()}, ${dt.getDate()} ${MONTHS[dt.getMonth()].toLowerCase()}`;
}

/** Materiile: cele cu oră în ziua de referință întâi (de acolo vin de obicei notele și testele), apoi restul. Ordinea nu se schimbă cât e deschis. */
function ccSubjects() {
    const all = Object.keys(state.subjects).sort((a, b) => a.localeCompare(b, "ro"));
    const d = cc.orderDate || ccToday();
    const lessons = isSchoolDay(d) ? [...new Set(lessonsOn(d) || [])].filter(m => state.subjects[m]) : [];
    return { lessons, rest: all.filter(m => !lessons.includes(m)) };
}

/* ---------- desenarea ---------- */
/** Rândul din Calendar: patru butoane care deschid direct formularul. */
function renderCompose() {
    const box = $("cal-compose");
    if (!box) return;
    box.innerHTML = `
        <div class="cc-launch" role="group" aria-label="Adaugă în calendar">
            ${["Test", "Temă", "Proiect", CC_GRADE].map(t => `<button type="button" class="cc-launch-btn ${ccTone(t)}" data-action="cc-start" data-type="${t}">${icon(ccIcon(t))}<span>${t === CC_GRADE ? "Notă" : escapeHTML(t)}</span></button>`).join("")}
            <button type="button" class="cc-launch-btn is-more" data-action="cc-start">${icon("plus")}<span>Altceva</span></button>
        </div>`;
}

function ccHead() {
    const form = cc.step === "form";
    const ctx = [];
    if (!form) {
        if (cc.ctxDate) ctx.push(ccLongDay(cc.ctxDate));
        if (cc.ctxMat) ctx.push(shortSubjectName(cc.ctxMat));
    }
    return `
        <header class="cc-head">
            ${form ? `<button type="button" class="cc-round cc-back" data-action="cc-back" aria-label="Înapoi la tipuri">${icon("chevron")}</button>` : ""}
            ${form ? `<span class="cc-ico ${ccTone(cc.type)}" aria-hidden="true">${icon(ccIcon(cc.type))}</span>` : ""}
            <div class="cc-head-txt">
                <h2 class="cc-title" id="cc-title">${form ? escapeHTML(CC_INFO[cc.type].title) : "Ce adaugi?"}</h2>
                ${ctx.length ? `<p class="cc-ctx">${escapeHTML(ctx.join(", "))}</p>` : ""}
            </div>
            <button type="button" class="cc-round cc-x" data-action="cc-overlay-close" aria-label="Închide">${icon("x")}</button>
        </header>`;
}

function ccTypeStep() {
    return `
        <div class="cc-scroll">
            <div class="cc-tiles">
                ${CC_BIG.map(t => `
                <button type="button" class="cc-tile cc-type ${ccTone(t)}" data-action="cc-type" data-type="${t}">
                    <span class="cc-tile-ico" aria-hidden="true">${icon(ccIcon(t))}</span>
                    <b>${escapeHTML(t)}</b>
                    <small>${escapeHTML(CC_INFO[t].tile)}</small>
                </button>`).join("")}
            </div>
            <div class="cc-minor" role="group" aria-label="Alte lucruri">
                ${CC_SMALL.map(t => `<button type="button" class="cc-mini cc-type ${ccTone(t)}" data-action="cc-type" data-type="${t}">${icon(ccIcon(t))}<span>${escapeHTML(CC_INFO[t].label)}</span></button>`).join("")}
                <button type="button" class="cc-mini is-subject" data-action="cc-subject-new">${icon("plus")}<span>Materie nouă</span></button>
            </div>
        </div>`;
}

function ccFormStep() {
    const grade = ccIsGrade();
    const { lessons, rest } = ccSubjects();
    const lessonsWord = (cc.orderDate || ccToday()) === ccToday() ? "azi" : ccDayLabel(cc.orderDate).toLowerCase();
    const subj = m => `<button type="button" class="cc-subj ${cc.subject === m ? "is-on" : ""}" data-action="cc-subject" data-mat="${escapeHTML(m)}" style="${subjectStyle(m)}" aria-pressed="${cc.subject === m}"><i aria-hidden="true"></i><span>${escapeHTML(shortSubjectName(m))}</span>${lessons.includes(m) ? `<small>oră ${escapeHTML(lessonsWord)}</small>` : ""}</button>`;
    const days = ccDays();
    const otherDay = !days.includes(cc.date);
    const dayBtn = d => {
        const lesson = !grade && ccHasLesson(cc.subject, d);
        return `<button type="button" class="cc-day ${cc.date === d ? "is-on" : ""} ${lesson ? "has-lesson" : ""}" data-action="cc-day" data-date="${d}" aria-pressed="${cc.date === d}">${escapeHTML(ccDayLabel(d))}${lesson ? `<small>are oră</small>` : ""}</button>`;
    };
    const personal = cc.type === "Personal";
    return `
        <div class="cc-scroll">
            <section class="cc-sec" role="group" aria-labelledby="cc-q-subj">
                <h3 class="cc-q" id="cc-q-subj">${grade ? "La ce materie?" : personal ? "Ține de o materie?" : "La ce materie?"}</h3>
                <div class="cc-subjects">
                    ${lessons.map(subj).join("")}${rest.map(subj).join("")}
                    ${grade ? "" : `<button type="button" class="cc-subj is-none ${cc.subject ? "" : "is-on"}" data-action="cc-subject" data-mat="" aria-pressed="${!cc.subject}"><span>Fără materie</span></button>`}
                </div>
                ${!Object.keys(state.subjects).length ? `<p class="cc-hint">Nu ai încă materii. <button type="button" class="btn-link" data-action="cc-subject-new">Adaugă prima materie</button></p>` : ""}
            </section>
            ${grade ? `
            <section class="cc-sec" role="group" aria-labelledby="cc-q-val">
                <h3 class="cc-q" id="cc-q-val">Ce notă ai luat?</h3>
                <div class="cc-keys">${Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<button type="button" class="cc-val tone-${gradeTone(n)} ${cc.val === n ? "is-on" : ""}" data-action="cc-val" data-val="${n}" aria-pressed="${cc.val === n}">${n}</button>`).join("")}</div>
            </section>
            <section class="cc-sec" role="group" aria-labelledby="cc-q-gtype">
                <h3 class="cc-q" id="cc-q-gtype">Pentru ce?</h3>
                <div class="cc-seg">${GRADE_TYPES.map(t => `<button type="button" class="cc-chip ${cc.gtype === t ? "is-on" : ""}" data-action="cc-gtype" data-type="${escapeHTML(t)}" aria-pressed="${cc.gtype === t}">${escapeHTML(t)}</button>`).join("")}</div>
            </section>` : `
            <section class="cc-sec">
                <label class="cc-q" for="cc-text">${personal ? "Ce vrei să ții minte?" : "Ce anume? <span>(dacă vrei)</span>"}</label>
                <input type="text" id="cc-text" class="cc-input" maxlength="100" spellcheck="false" enterkeyhint="done" autocomplete="off"
                    placeholder="${personal ? "ex: adu fișa semnată" : cc.type === "Temă" ? "ex: exercițiile de la pagina 42" : "ex: capitolul 3, cinematică"}" value="${escapeHTML(cc.details)}">
            </section>`}
            <section class="cc-sec" role="group" aria-labelledby="cc-q-day">
                <h3 class="cc-q" id="cc-q-day">${grade ? "Când ai luat-o?" : "Când?"}</h3>
                <div class="cc-days">
                    ${days.map(dayBtn).join("")}
                    <label class="cc-day cc-pick ${otherDay ? "is-on" : ""}">${icon("calendar")}<span>${otherDay ? escapeHTML(shortDayLabel(cc.date)) : "Altă zi"}</span><input type="date" id="cc-date" value="${escapeHTML(cc.date)}" ${grade ? `max="${ccToday()}"` : ""} aria-label="Altă zi"></label>
                    ${grade ? "" : `<label class="cc-day cc-pick ${cc.time ? "is-on" : ""}">${icon("clock")}<span>${cc.time ? escapeHTML(cc.time) : "Ora"}</span><input type="time" id="cc-time" value="${escapeHTML(cc.time)}" aria-label="Ora"></label>`}
                    ${!grade && cc.time ? `<button type="button" class="cc-day cc-clear" data-action="cc-time-clear" aria-label="Fără oră">${icon("x")}</button>` : ""}
                </div>
            </section>
        </div>
        <footer class="cc-foot">
            <p class="cc-preview" id="cc-preview" aria-live="polite"></p>
            <div class="cc-foot-btns">
                ${grade ? "" : `<button type="button" class="btn btn-text btn-sm cc-more" data-action="cc-more">Repetă, notițe…</button>`}
                <button type="submit" class="btn btn-primary cc-add">${icon("plus")} <span>${escapeHTML(CC_INFO[cc.type].add)}</span></button>
            </div>
        </footer>`;
}

/** Ce element are focusul, ca să-l regăsim după redesenare. */
function ccFocusKey() {
    const a = document.activeElement;
    if (!a || !$("cc-overlay-host")?.contains(a)) return null;
    if (a.id) return `#${a.id}`;
    const d = a.dataset || {};
    if (!d.action) return null;
    const extra = ["type", "mat", "val", "date"].filter(k => k in d).map(k => `[data-${k}="${CSS.escape(d[k])}"]`).join("");
    return `[data-action="${d.action}"]${extra}`;
}

function ccRender({ focus = "" } = {}) {
    const host = $("cc-overlay-host");
    if (!host || !cc.open) return;
    if (!DATE_KEY_RE.test(cc.date)) cc.date = ccToday();
    const key = focus ? null : ccFocusKey();
    const scroller = host.querySelector(".cc-scroll");
    const top = scroller && host.querySelector(".cc-sheet")?.dataset.step === cc.step ? scroller.scrollTop : 0;
    host.innerHTML = `
        <form class="cc-sheet" id="cc-form" data-step="${cc.step}" data-type="${escapeHTML(cc.type)}" autocomplete="off" aria-labelledby="cc-title">
            ${ccHead()}
            ${cc.step === "form" ? ccFormStep() : ccTypeStep()}
        </form>`;
    const sc = host.querySelector(".cc-scroll");
    if (sc) sc.scrollTop = top;
    ccPreview();
    const target = (focus && host.querySelector(focus)) || (key && host.querySelector(key));
    if (target) target.focus({ preventScroll: true });
}

/** Ce se va adăuga, într-o propoziție. */
function ccPreview() {
    const el = $("cc-preview");
    if (!el) return;
    const n = daysBetween(ccToday(), cc.date);
    const when = `${relativeDayLabel(cc.date)}${Math.abs(n) > 1 ? `, ${shortDayLabel(cc.date)}` : ""}${!ccIsGrade() && cc.time ? ` la ${cc.time}` : ""}`;
    if (ccIsGrade()) {
        const missing = !state.subjects[cc.subject] ? "alege materia" : !cc.val ? "alege nota" : "";
        el.innerHTML = missing
            ? `${icon("info")} <span>${cc.val ? `Nota ${cc.val}` : "Nota"} (${escapeHTML(cc.gtype)}): ${escapeHTML(missing)}</span>`
            : `${icon("check")} <span><b>${cc.val} la ${escapeHTML(shortSubjectName(cc.subject))}</b> (${escapeHTML(cc.gtype)}), ${escapeHTML(when)}</span>`;
        el.classList.toggle("is-missing", Boolean(missing));
        return;
    }
    const missing = cc.type === "Personal" && !cc.details.trim() && !cc.subject;
    el.classList.toggle("is-missing", missing);
    el.innerHTML = missing
        ? `${icon("info")} <span>Scrie ce vrei să ții minte</span>`
        : `${icon("check")} <span><b>${escapeHTML(ccTitle())}</b>, ${escapeHTML(when)}</span>`;
}

/** Titlul evenimentului: „Test Fizică”, cu detaliile după două puncte („Test Fizică: cinematică”). */
function ccTitle() {
    const subject = state.subjects[cc.subject] ? cc.subject : "";
    const details = URN_RULES.cleanText(cc.details.trim().replace(/\s+/g, " "), URN_RULES.LIMITS.eventTitle);
    if (cc.type === "Personal") {
        if (details) return (details[0].toLocaleUpperCase("ro") + details.slice(1)).slice(0, 100);
        return subject ? `De ținut minte: ${subject}` : "Altceva";
    }
    const base = autoEventTitle(cc.type, subject);
    return (details ? `${base}: ${details}` : base).slice(0, 100);
}

/* ---------- deschis / închis ---------- */
function ccOpenGlobal({ type = "", mat = "", date = "" } = {}) {
    if (!requireAccount()) return;
    closeQuickAdd?.({ restoreFocus: false });
    if (!cc.open) cc.returnFocus = document.activeElement;
    Object.assign(cc, {
        open: true, step: "type", type: "Test", subject: "", date: ccToday(), time: "", val: 0, gtype: ccSavedGType(), details: "",
        manual: new Set(), ctxDate: DATE_KEY_RE.test(date) ? date : "", ctxMat: state.subjects[mat] ? mat : "", orderDate: DATE_KEY_RE.test(date) ? date : ccToday()
    });
    $("cc-overlay").hidden = false;
    document.body.classList.add("cc-overlay-open");
    if (CC_TYPES.includes(type)) ccChooseType(type);
    else ccRender({ focus: ".cc-tile" });
}

/** Din calendar: „+” pe o zi sau pe o oră din orar. */
function ccPreset({ date = "", mat = "", type = "" } = {}) {
    ccOpenGlobal({ type, mat, date });
}

/** Al doilea pas: formularul tipului ales, cu ce știm deja (ziua, materia). */
function ccChooseType(type) {
    cc.type = type;
    cc.step = "form";
    cc.val = 0;
    cc.subject = cc.ctxMat || (cc.manual.has("subject") ? cc.subject : "");
    if (ccIsGrade()) {
        cc.date = cc.ctxDate && cc.ctxDate <= ccToday() ? cc.ctxDate : ccToday();
        if (!state.subjects[cc.subject]) cc.subject = "";
    } else {
        cc.date = cc.ctxDate || (cc.subject && nextLessonDate(cc.subject)) || ccToday();
    }
    if (cc.ctxDate) cc.manual.add("date"); else cc.manual.delete("date");
    const first = !state.subjects[cc.subject] && Object.keys(state.subjects).length
        ? ".cc-subj"
        : ccIsGrade() ? ".cc-val" : "#cc-text";
    ccRender({ focus: first });
}

function ccCloseOverlay() {
    if (!cc.open) return;
    cc.open = false;
    $("cc-overlay").hidden = true;
    $("cc-overlay-host").innerHTML = "";
    document.body.classList.remove("cc-overlay-open");
    const back = cc.returnFocus;
    cc.returnFocus = null;
    if (back && document.contains(back)) back.focus();
}

/* ---------- adăugarea ---------- */
function ccSubmit() {
    if (!requireAccount()) return;
    if (cc.step !== "form") return;
    if (ccIsGrade()) return ccSubmitGrade();
    if (cc.type === "Personal" && !cc.details.trim() && !cc.subject) {
        showToast("Scrie ce vrei să ții minte.");
        $("cc-text")?.focus();
        return;
    }
    const subject = state.subjects[cc.subject] ? cc.subject : "";
    const ev = { id: uid(), title: ccTitle(), time: TIME_RE.test(cc.time) ? cc.time : "", type: cc.type, subject, description: "" };
    const date = cc.date;
    if (!allowEvent(ev, date)) return;
    withUndo(`✅ Am pus „${ev.title}”, ${relativeDayLabel(date)}.`, () => {
        (state.calendar[date] ||= []).push(ev);
        addActivity(`Ai adăugat „${ev.title}” pentru ${getDateLabel(date)}.`);
    });
    ccCloseOverlay();
    ccFlash(date, ev.id);
}

function ccSubmitGrade() {
    const mat = cc.subject;
    if (!state.subjects[mat]) {
        showToast("⚠️ Alege materia.");
        $("cc-overlay-host")?.querySelector(".cc-subj")?.focus();
        return;
    }
    if (!cc.val) {
        showToast("⚠️ Alege nota, de la 1 la 10.");
        $("cc-overlay-host")?.querySelector(".cc-val")?.focus();
        return;
    }
    const grade = { id: uid(), val: cc.val, type: cc.gtype, date: cc.date > ccToday() ? ccToday() : cc.date };
    // în weekend sau în vacanță nu se pun note: dacă n-ai ales tu ziua, nota merge pe ultima zi de școală
    const moved = !cc.manual.has("date") && !isSchoolDay(grade.date);
    if (moved) grade.date = lastSchoolDay(grade.date);
    if (!allowGrade(mat, grade)) return;
    try { localStorage.setItem(CC_GTYPE_KEY, cc.gtype); } catch (_) { /* fără stocare */ }
    withUndo(`✅ Am pus ${grade.val} (${grade.type}) la ${mat}${moved ? `, ${weekdayLabel(grade.date)} (ultima zi de școală)` : ""}.`, () => {
        state.subjects[mat].grades.push(grade);
        addActivity(`Ai adăugat nota ${grade.val} (${grade.type}) la ${mat}.`);
    });
    ccCloseOverlay();
    celebrateGrade(grade.val);
}

/** Arată unde a ajuns ce ai adăugat (dacă e pe ecran). */
function ccFlash(date, id) {
    const el = document.querySelector(`.cal-ev[data-id="${CSS.escape(id)}"]`) || document.querySelector(`[data-date-cell="${date}"]`);
    if (!el) return;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1500);
}

Object.assign(ACTIONS, {
    "cc-start": el => ccOpenGlobal({ type: el.dataset.type || "" }),
    "cc-type": el => ccChooseType(el.dataset.type),
    "cc-back": () => { cc.step = "type"; ccRender({ focus: `.cc-type[data-type="${CSS.escape(cc.type)}"]` }); },
    "cc-val": el => { cc.val = Number(el.dataset.val); ccRender(); },
    "cc-gtype": el => { cc.gtype = el.dataset.type; ccRender(); },
    "cc-subject": el => {
        cc.subject = el.dataset.mat || "";
        cc.manual.add("subject");
        // materia aleasă fără zi aleasă: ziua sare la următoarea ei oră (doar pentru evenimente)
        if (cc.subject && !ccIsGrade() && !cc.manual.has("date")) cc.date = nextLessonDate(cc.subject) || cc.date;
        ccRender();
    },
    "cc-day": el => {
        if (!$("cc-form")?.contains(el)) { ccPreset({ date: el.dataset.date }); return; } // „+” dintr-o zi a calendarului
        cc.date = el.dataset.date; cc.manual.add("date"); ccRender();
    },
    "cc-pick": el => ccPreset({ date: el.dataset.date, mat: el.dataset.mat, type: el.dataset.type }),
    "cc-time-clear": () => { cc.time = ""; ccRender({ focus: "#cc-time" }); },
    "cc-subject-new": () => { ccCloseOverlay(); promptAddMaterie(); },
    // formularul întreg (repetare, notițe), cu ce ai ales deja
    "cc-more": () => {
        const pre = { date: cc.date, subject: cc.subject, type: cc.type, time: cc.time, details: cc.details.trim() };
        ccCloseOverlay();
        openEventModal({ date: pre.date, subject: pre.subject, type: pre.type });
        const t = $("ev-title");
        if (t && pre.details) t.value = pre.details;
        if (pre.time && $("ev-time")) $("ev-time").value = pre.time;
        if (typeof syncEventForm === "function") syncEventForm();
    },
    "cc-overlay-close": () => ccCloseOverlay(),
    "cc-close": () => ccCloseOverlay()
});

document.addEventListener("submit", event => {
    if (event.target.id !== "cc-form") return;
    event.preventDefault();
    ccSubmit();
});
document.addEventListener("input", event => {
    if (event.target.id === "cc-text") { cc.details = event.target.value; ccPreview(); }
});
document.addEventListener("change", event => {
    if (event.target.id === "cc-date" && DATE_KEY_RE.test(event.target.value)) {
        cc.date = ccIsGrade() && event.target.value > ccToday() ? ccToday() : event.target.value;
        cc.manual.add("date"); ccRender({ focus: "#cc-date" });
    }
    if (event.target.id === "cc-time") { cc.time = TIME_RE.test(event.target.value) ? event.target.value : ""; ccRender({ focus: "#cc-time" }); }
});
document.addEventListener("keydown", event => {
    if (!cc.open) return;
    if (event.key === "Escape") {
        event.stopPropagation();
        ccCloseOverlay();
        return;
    }
    // Enter într-un buton alege butonul; Enter în câmpul de text adaugă (formularul se trimite singur)
    if (event.key === "Tab") trapFocusIn($("cc-overlay"), event);
}, true);
["cc-start", "cc-back", "cc-close", "cc-overlay-close"].forEach(a => GUEST_OK.add(a));
