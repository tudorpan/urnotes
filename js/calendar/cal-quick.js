/* urNotes · Adăugarea din Calendar, ca în Google Calendar: o fereastră mică lângă locul atins (pe telefon, o foaie de jos)
   cu titlul, tipul, ziua și ora (sau „toată ziua”), materia și repetarea. „Mai multe opțiuni” deschide formularul întreg.
   În grilă apare un bloc „(Fără titlu)” chiar unde va sta evenimentul și se schimbă pe măsură ce scrii.
   Butonul „+” din bara de jos rămâne foaia obișnuită de adăugat (note, teste, teme) din toată aplicația. */
"use strict";

const QC_TYPES = ["Test", "Temă", "Proiect", "Examen", "Prezentare", "Personal"];
const qc = { open: false, date: "", time: "", end: "", allDay: true, type: "Test", subject: "", title: "", repeat: "", anchor: null };

/** Deschide fereastra: `time` / `end` vin din grilă (un loc atins sau tras cu mouse-ul); fără ele, e „toată ziua”. */
function openQuickCreate({ date = getLocalDateKey(), time = "", end = "", anchor = null, rect = null } = {}) {
    if (!DATE_KEY_RE.test(String(date))) return;
    closeEvPop(false);
    closeCalMenu();
    const s = hmToMin(time);
    Object.assign(qc, {
        open: true, date, anchor, rect,
        time: s === null ? "" : minToHM(s),
        end: s === null ? "" : minToHM(hmToMin(end) ?? s + EV_MIN_DEFAULT),
        allDay: s === null,
        type: "Personal", subject: "", title: "", repeat: ""
    });
    // materia se ghicește din orar: ora de curs care cade atunci (sau prima a zilei)
    if (s !== null) {
        const hit = calLessonsOn(date).find(({ i }) => { const sp = lessonSpan(i); return s >= sp.from && s < sp.to; });
        if (hit) qc.subject = hit.mat;
    }
    // la o oră de curs, de obicei e un test sau o temă la materia aceea; altfel un eveniment personal (merge doar cu un titlu)
    if (qc.subject) qc.type = qc.lastSchoolType || "Test";
    renderQuickCreate();
}

function qcSubjectsHTML() {
    const names = Object.keys(state.subjects).sort((a, b) => a.localeCompare(b, "ro"));
    return `<option value="">Fără materie</option>${names.map(n => `<option value="${escapeHTML(n)}" ${n === qc.subject ? "selected" : ""}>${escapeHTML(n)}</option>`).join("")}`;
}

function renderQuickCreate() {
    let box = $("gc-qc");
    if (!box) {
        box = document.createElement("div");
        box.id = "gc-qc";
        box.className = "gc-qc";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-label", "Eveniment nou");
        document.body.appendChild(box);
    }
    const d = parseDateKey(qc.date);
    const dayLabel = `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}`;
    box.className = `gc-qc gc-${EVENT_TYPE_CLASS[qc.type] || "personal"}`;
    box.innerHTML = `
        <div class="gc-qc-tools">
            <span class="gc-qc-grab" aria-hidden="true"></span>
            <button type="button" class="gc-ibtn" data-action="qc-close" aria-label="Închide">${icon("x")}</button>
        </div>
        <input type="text" id="qc-title" class="gc-qc-title" maxlength="100" autocomplete="off" placeholder="${escapeHTML(qc.subject ? autoEventTitle(qc.type, qc.subject) : "Adaugă titlu")}" value="${escapeHTML(qc.title)}" aria-label="Titlu">
        <div class="gc-qc-types" role="group" aria-label="Tipul">
            ${QC_TYPES.map(t => `<button type="button" class="gc-qc-type gc-${EVENT_TYPE_CLASS[t] || "personal"}" data-action="qc-type" data-type="${t}" aria-pressed="${qc.type === t}">${escapeHTML(t)}</button>`).join("")}
        </div>
        <div class="gc-qc-row">
            ${icon("clock")}
            <div class="gc-qc-when">
                <label class="gc-qc-field gc-qc-date"><span class="sr-only">Ziua</span><input type="date" id="qc-date" value="${qc.date}"><b>${escapeHTML(dayLabel)}</b></label>
                ${qc.allDay ? "" : `
                    <span class="gc-qc-times">
                        <label class="gc-qc-field"><span class="sr-only">De la</span><input type="time" id="qc-time" value="${qc.time}" step="900"></label>
                        <span aria-hidden="true">–</span>
                        <label class="gc-qc-field"><span class="sr-only">Până la</span><input type="time" id="qc-end" value="${qc.end}" step="900"></label>
                    </span>`}
                <label class="gc-qc-allday"><input type="checkbox" id="qc-allday" ${qc.allDay ? "checked" : ""}> Toată ziua</label>
            </div>
        </div>
        <div class="gc-qc-row">${icon("book")}<select id="qc-subject" class="gc-qc-select" aria-label="Materia">${qcSubjectsHTML()}</select></div>
        <div class="gc-qc-row gc-qc-repeat">${icon("repeat")}<select id="qc-repeat" class="gc-qc-select" aria-label="Repetare">
            <option value="" ${!qc.repeat ? "selected" : ""}>Nu se repetă</option>
            <option value="1" ${qc.repeat === "1" ? "selected" : ""}>În fiecare săptămână, ${escapeHTML(WEEKDAY_LONG[d.getDay()].toLowerCase())}</option>
            <option value="2" ${qc.repeat === "2" ? "selected" : ""}>La două săptămâni</option>
        </select></div>
        <div class="gc-qc-foot">
            <button type="button" class="btn btn-text btn-sm" data-action="qc-more">Mai multe opțiuni</button>
            <button type="button" class="btn btn-primary btn-sm" data-action="qc-save">Salvează</button>
        </div>`;
    placeQuickCreate(box);
    document.body.classList.add("qc-open");
    if (box.classList.contains("is-sheet") && typeof calFit === "function") calFit();
    drawQcGhost();
    // pe telefon foaia acoperă jumătatea de jos: grila se derulează ca blocul nou să rămână deasupra ei, la îndemână
    if (box.classList.contains("is-sheet")) {
        const g = document.querySelector(".gc-ghost-block"), sc = $("gc-scroll");
        if (g && sc) {
            // poziția finală a foii (cât urcă, animația o ține încă jos)
            const sheetTop = window.innerHeight - box.offsetHeight, gr = g.getBoundingClientRect(), sr = sc.getBoundingClientRect();
            const room = sheetTop - sr.top;
            if (gr.bottom > sheetTop - 12 || gr.top < sr.top) sc.scrollTop += gr.top - sr.top - Math.max(8, (room - gr.height) / 2);
        }
    }
    if (!box.contains(document.activeElement)) $("qc-title")?.focus({ preventScroll: true });
}

function placeQuickCreate(box) {
    box.classList.remove("is-sheet");
    box.style.left = box.style.top = "";
    const r = qc.rect || qc.anchor?.getBoundingClientRect?.();
    if (window.innerWidth <= 640 || !r) {
        if (window.innerWidth <= 640) { box.classList.add("is-sheet"); return; }
        box.style.left = `${Math.max(12, (window.innerWidth - 420) / 2)}px`;
        box.style.top = "96px";
        return;
    }
    const w = box.offsetWidth || 420, h = box.offsetHeight || 360;
    let left = r.right + 12;
    if (left + w > window.innerWidth - 12) left = r.left - w - 12;
    if (left < 12) left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left));
    const top = Math.min(Math.max(12, r.top - 20), window.innerHeight - h - 12);
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
}

/** Blocul „(Fără titlu)”: în grilă la oră, în rândul „toată ziua” sau în ziua din lună / listă.
    În grilă îl poți trage (mută ora sau ziua) și îl poți lungi de marginea de jos, din 15 în 15 minute. */
function drawQcGhost() {
    document.querySelectorAll(".gc-ghost").forEach(g => g.remove());
    if (!qc.open) return;
    const cls = `gc-${EVENT_TYPE_CLASS[qc.type] || "personal"}`;
    const s = hmToMin(qc.time);
    const col = document.querySelector(`#cal-body .gc-col[data-day="${qc.date}"]`);
    if (!qc.allDay && col && s !== null) {
        const g = document.createElement("div");
        g.className = `gc-ghost gc-ghost-block ${cls}`;
        g.innerHTML = `<b></b><span></span><i class="gc-ghost-grip" aria-hidden="true"></i>`;
        col.appendChild(g);
        placeQcGhost(g);
        return;
    }
    const cell = document.querySelector(`#cal-body .gc-adcell[data-day="${qc.date}"], #cal-body .gc-mcell[data-day="${qc.date}"] .gc-mevs, #cal-body .gc-sday[data-day="${qc.date}"] .gc-sitems`);
    if (cell) {
        const g = document.createElement("div");
        g.className = `gc-ghost gc-ghost-chip ${cls}`;
        g.innerHTML = `<b>${qcGhostLabel()}</b>`;
        cell.prepend(g);
    }
}
const qcGhostLabel = () => escapeHTML(qc.title.trim() || (qc.subject ? autoEventTitle(qc.type, qc.subject) : "(Fără titlu)"));
/** Așază blocul din grilă după ora de început și de sfârșit din fereastră (fără să-l refacă, ca să nu se piardă trasul). */
function placeQcGhost(g = document.querySelector(".gc-ghost-block")) {
    if (!g) return;
    const s = hmToMin(qc.time), e = hmToMin(qc.end);
    const end = e !== null && e > s ? e : s + EV_MIN_DEFAULT;
    g.style.top = `${s / 60 * HOUR_PX}px`;
    g.style.height = `${Math.max(20, (end - s) / 60 * HOUR_PX - 2)}px`;
    g.querySelector("b").innerHTML = qcGhostLabel();
    g.querySelector("span").textContent = `${minToHM(s)} – ${minToHM(end)}`;
    g.classList.toggle("is-short", end - s <= 30);
}

/* trasul blocului: mijlocul îl mută (și pe altă zi), marginea de jos îl lungește; totul din 15 în 15 minute */
let qcDrag = null;
function qcDragStart(event) {
    const g = event.target.closest?.(".gc-ghost-block");
    if (!g || !qc.open || event.button > 0) return;
    event.preventDefault();
    event.stopPropagation();
    const s0 = hmToMin(qc.time), e0 = hmToMin(qc.end) ?? s0 + EV_MIN_DEFAULT;
    qcDrag = { mode: event.target.closest(".gc-ghost-grip") ? "resize" : "move", y0: event.clientY, s0, e0, moved: false, scroller: $("gc-scroll") };
    g.classList.add("is-dragging");
}
function qcDragMove(event) {
    if (!qcDrag) return;
    event.preventDefault();
    const d = qcDrag;
    // aproape de marginea grilei, aceasta se derulează singură
    const sr = d.scroller?.getBoundingClientRect();
    if (sr) {
        if (event.clientY < sr.top + 28) d.scroller.scrollTop -= 10;
        else if (event.clientY > sr.bottom - 28) d.scroller.scrollTop += 10;
    }
    const col = document.querySelector(`#cal-body .gc-col[data-day="${qc.date}"]`);
    if (!col) return;
    const step = m => Math.round(m / 15) * 15;
    const y = event.clientY - col.getBoundingClientRect().top;
    const atMin = y / HOUR_PX * 60;
    if (d.mode === "resize") {
        const e = Math.min(24 * 60, Math.max(d.s0 + 15, step(atMin)));
        qc.end = minToHM(Math.min(e, 24 * 60 - 1));
    } else {
        const len = d.e0 - d.s0;
        if (d.grab === undefined) d.grab = (d.y0 - col.getBoundingClientRect().top) / HOUR_PX * 60 - d.s0;
        const s = Math.max(0, Math.min(24 * 60 - len, step(atMin - d.grab)));
        qc.time = minToHM(s);
        qc.end = minToHM(Math.min(24 * 60 - 1, s + len));
        // pe altă coloană: altă zi
        const under = document.elementsFromPoint(event.clientX, event.clientY).find(el => el.classList?.contains("gc-col"));
        if (under && under.dataset.day !== qc.date) {
            qc.date = under.dataset.day;
            under.appendChild(document.querySelector(".gc-ghost-block"));
        }
    }
    d.moved = true;
    placeQcGhost();
    // fereastra arată ora pe loc
    if ($("qc-time")) $("qc-time").value = qc.time;
    if ($("qc-end")) $("qc-end").value = qc.end;
}
function qcDragEnd() {
    if (!qcDrag) return;
    const moved = qcDrag.moved;
    qcDrag = null;
    const g = document.querySelector(".gc-ghost-block");
    g?.classList.remove("is-dragging");
    if (moved) {
        qc.rect = g?.getBoundingClientRect() || qc.rect;
        renderQuickCreate();
    }
}

function closeQuickCreate(restoreFocus = true) {
    const box = $("gc-qc");
    qc.open = false;
    if (document.body.classList.contains("qc-open")) {
        document.body.classList.remove("qc-open");
        if (typeof calFit === "function") calFit();
    }
    document.querySelectorAll(".gc-ghost").forEach(g => g.remove());
    if (!box) return;
    box.remove();
    if (restoreFocus && qc.anchor && document.contains(qc.anchor)) qc.anchor.focus({ preventScroll: true });
}

function readQuickCreate() {
    const t = $("qc-title"); if (t) qc.title = t.value;
    const d = $("qc-date"); if (d && DATE_KEY_RE.test(d.value)) qc.date = d.value;
    const a = $("qc-time"); if (a && /^\d{2}:\d{2}$/.test(a.value)) qc.time = a.value;
    const b = $("qc-end"); if (b && /^\d{2}:\d{2}$/.test(b.value)) qc.end = b.value;
    const s = $("qc-subject"); if (s) qc.subject = state.subjects[s.value] ? s.value : "";
    const r = $("qc-repeat"); if (r) qc.repeat = ["1", "2"].includes(r.value) ? r.value : "";
}

function saveQuickCreate() {
    readQuickCreate();
    const subject = qc.subject;
    const title = qc.title.trim().replace(/\s+/g, " ") || (subject ? autoEventTitle(qc.type, subject) : "");
    if (!title) {
        showToast("Scrie un titlu sau alege materia.");
        $("qc-title")?.focus();
        return;
    }
    const ev = { id: uid(), title, time: qc.allDay ? "" : qc.time, type: qc.type, subject, description: "" };
    if (!qc.allDay) {
        const len = hmToMin(qc.end) - hmToMin(qc.time);
        if (len > 0 && len !== EV_MIN_DEFAULT) ev.duration = len;
    }
    if (qc.repeat) ev.repeat = { every: Number(qc.repeat) };
    if (qc.type !== "Personal") qc.lastSchoolType = qc.type;
    const date = qc.date;
    if (!allowEvent(ev, date)) return;
    closeQuickCreate(false);
    withUndo(`✅ Am pus „${ev.title}”, ${relativeDayLabel(date)}.`, () => {
        (state.calendar[date] ||= []).push(ev);
        addActivity(`Ai adăugat „${ev.title}” pentru ${getDateLabel(date)}${ev.repeat ? " (se repetă)" : ""}.`);
    });
}

/** „Mai multe opțiuni”: formularul întreg, cu ce ai ales deja. */
function quickCreateMore() {
    readQuickCreate();
    const v = { date: qc.date, subject: qc.subject, type: qc.type, title: qc.title, time: qc.allDay ? "" : qc.time };
    closeQuickCreate(false);
    openEventModal(v);
}

function bindQuickCreate() {
    document.addEventListener("input", event => {
        if (!qc.open || !event.target.closest?.("#gc-qc")) return;
        readQuickCreate();
        drawQcGhost();
    });
    document.addEventListener("change", event => {
        const t = event.target;
        if (!qc.open || !t.closest?.("#gc-qc")) return;
        if (t.id === "qc-allday") {
            readQuickCreate();
            qc.allDay = t.checked;
            if (!qc.allDay && !qc.time) { qc.time = minToHM(lessonStartMin()); qc.end = minToHM(lessonStartMin() + EV_MIN_DEFAULT); }
            renderQuickCreate();
            $("qc-allday")?.focus();
            return;
        }
        if (t.id === "qc-time") {
            // ora de început mută și sfârșitul, păstrând durata (ca la Google)
            const len = Math.max(15, (hmToMin(qc.end) ?? 0) - (hmToMin(qc.time) ?? 0)) || EV_MIN_DEFAULT;
            readQuickCreate();
            qc.end = minToHM(Math.min(24 * 60 - 1, hmToMin(qc.time) + len));
            if ($("qc-end")) $("qc-end").value = qc.end;
        } else readQuickCreate();
        if (t.id === "qc-date" || t.id === "qc-subject") {
            renderQuickCreate();
            $(t.id)?.focus();
            return;
        }
        drawQcGhost();
    });
    document.addEventListener("keydown", event => {
        if (!qc.open) return;
        if (event.key === "Escape") { event.stopPropagation(); closeQuickCreate(); return; }
        if (event.key === "Enter" && event.target.id === "qc-title") { event.preventDefault(); saveQuickCreate(); }
    }, true);
    // un clic în afara ferestrei o închide (ca la Google), dar nu cel care a deschis-o
    document.addEventListener("pointerdown", event => {
        if (!qc.open || event.target.closest?.("#gc-qc, .gc-ghost, #cal-body .gc-col, #cal-body .gc-mcell, #cal-body .gc-adcell, [data-action='cal-create'], .gc-fab")) return;
        closeQuickCreate(false);
    });
    window.addEventListener("resize", () => { if (qc.open) placeQuickCreate($("gc-qc")); });
    document.addEventListener("pointerdown", qcDragStart, true);
    window.addEventListener("pointermove", qcDragMove, { passive: false });
    window.addEventListener("pointerup", qcDragEnd);
    window.addEventListener("pointercancel", qcDragEnd);
}
