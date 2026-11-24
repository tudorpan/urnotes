/* urNotes · Nota rapidă: „+” pe rândul unei materii → tipul și notele 1–10, o atingere și nota e pusă.
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

/* ==================== NOTĂ RAPIDĂ ==================== */
/* Butonul „+” de pe rândul unei materii: o mică fereastră lipită de rând, cu tipul (ținut minte) și notele 1–10.
   O atingere pe notă o adaugă pe loc (azi), cu „Anulează” în mesaj. „Mai multe” deschide formularul întreg (data, legătura cu un test). */
const QUICK_TYPE_KEY = "urn_quick_grade_type_v1";
const quickGrade = { mat: "", anchor: null, type: "Test" };
try { const t = localStorage.getItem(QUICK_TYPE_KEY); if (GRADE_TYPES.includes(t)) quickGrade.type = t; } catch (_) { /* fără stocare */ }

function openQuickGrade(mat, anchor) {
    if (!state.subjects[mat]) return;
    if (!requireAccount()) return;
    closeQuickGrade();
    Object.assign(quickGrade, { mat, anchor });
    const pop = document.createElement("div");
    pop.id = "quick-grade";
    pop.className = "quick-grade";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", `Notă nouă la ${mat}`);
    pop.innerHTML = quickGradeHTML();
    document.body.append(pop);
    anchor?.classList.add("is-open");
    placeQuickGrade();
    pop.querySelector(".qg-val[data-val='10']")?.focus({ preventScroll: true });
    qgMark(null); // focusul de deschidere nu e o alegere: arătăm îndemnul, nu o previzualizare
}

function quickGradeHTML() {
    const d = metrics.subjects[quickGrade.mat];
    return `
        <div class="qg-head"><b>${escapeHTML(quickGrade.mat)}</b><small>${d && state.subjects[quickGrade.mat].grades.length ? `media ${d.exactAvg.toFixed(2)} · ` : ""}azi</small></div>
        <div class="qg-types" role="radiogroup" aria-label="Tipul">
            ${GRADE_TYPES.map(t => `<button type="button" class="qg-type" data-action="quick-grade-type" data-type="${escapeHTML(t)}" role="radio" aria-checked="${t === quickGrade.type}">${escapeHTML(t)}</button>`).join("")}
        </div>
        <p class="qg-preview" id="qg-preview" aria-live="polite">${quickGradeIdleText()}</p>
        <div class="qg-vals" role="group" aria-label="Nota">
            ${Array.from({ length: 10 }, (_, i) => 10 - i).map(n => `<button type="button" class="qg-val tone-${gradeTone(n)}" data-action="quick-grade-add" data-val="${n}">${n}</button>`).join("")}
        </div>
        <button type="button" class="qg-more" data-action="quick-grade-more">Mai multe (altă zi, alt test)…</button>`;
}

/* ---------- ce s-ar întâmpla: media înainte să pui nota ---------- */
function quickGradeIdleText() {
    const sub = state.subjects[quickGrade.mat];
    if (!sub) return "";
    return sub.grades.length ? (matchMedia?.("(hover: hover)").matches ? "Treci peste o notă ca să vezi noua medie." : "Ține degetul pe o notă (și alunecă) ca să vezi noua medie.")
        : "Prima notă la materia asta.";
}
/** Media materiei, cea finală și media generală, dacă ai pune nota val (fără să schimbe nimic). */
function quickGradePreview(val) {
    const mat = quickGrade.mat, sub = state.subjects[mat];
    if (!sub) return null;
    const dec = Number(state.settings.calc.rounding);
    const vals = sub.grades.map(g => URN_RULES.clampNumber(g.val, 1, 10, 1));
    const n = vals.length, sum = vals.reduce((a, b) => a + b, 0);
    const before = n ? roundValue(sum / n, dec) : null;
    const after = roundValue((sum + val) / (n + 1), dec);
    const finalBefore = n ? roundValue(sum / n, 0) : null, finalAfter = roundValue((sum + val) / (n + 1), 0);
    let gpaBefore = metrics.globalAvg || 0, gpaAfter = gpaBefore;
    if (!sub.excludeFromGPA) {
        const copy = { ...state.subjects, [mat]: { ...sub, grades: [...sub.grades, { val, type: quickGrade.type, date: getLocalDateKey() }] } };
        gpaAfter = calculateMetrics(copy).globalAvg || 0;
    }
    return { before, after, finalBefore, finalAfter, gpaBefore, gpaAfter, target: sub.target };
}
function showQuickGradePreview(val) {
    const box = $("qg-preview");
    if (!box) return;
    if (!val) { box.className = "qg-preview"; box.textContent = quickGradeIdleText(); return; }
    const p = quickGradePreview(val);
    if (!p) return;
    const fmt = v => v.toFixed(2);
    const dir = p.before === null ? "" : p.after > p.before ? "is-up" : p.after < p.before ? "is-down" : "is-same";
    const delta = p.before === null ? "" : p.after === p.before ? "la fel" : `${p.after > p.before ? "▲" : "▼"} ${fmt(Math.abs(p.after - p.before))}`;
    const finalPart = p.finalBefore !== null && p.finalAfter !== p.finalBefore
        ? `<span class="qg-final is-change">finală ${p.finalBefore} → <b>${p.finalAfter}</b></span>`
        : `<span class="qg-final">finală <b>${p.finalAfter}</b></span>`;
    const gpaPart = p.gpaBefore > 0 && Math.abs(p.gpaAfter - p.gpaBefore) >= 0.005
        ? `<span class="qg-gpa">generală ${fmt(p.gpaBefore)} → ${fmt(p.gpaAfter)}</span>` : "";
    const hits = p.target && p.finalBefore !== null && p.finalBefore < p.target && p.finalAfter >= p.target;
    box.className = `qg-preview is-live ${dir}`;
    box.innerHTML = `
        <span class="qg-avg">${p.before === null ? "media" : `${fmt(p.before)} →`} <b>${fmt(p.after)}</b>${delta ? ` <em>${delta}</em>` : ""}</span>
        ${finalPart}${gpaPart}${hits ? `<span class="qg-hit">${icon("target")} atingi ținta</span>` : ""}`;
}

/* alunecă degetul peste note: vezi media pentru fiecare, iar unde îl ridici, acolo pui nota */
const qgScrub = { id: null, start: null, cur: null, moved: false };
function qgValAt(x, y) { return document.elementFromPoint(x, y)?.closest?.("#quick-grade .qg-val") || null; }
function qgMark(btn) {
    if (qgScrub.cur === btn) return;
    qgScrub.cur?.classList.remove("is-scrub");
    qgScrub.cur = btn;
    btn?.classList.add("is-scrub");
    showQuickGradePreview(btn ? Number(btn.dataset.val) : 0);
}
document.addEventListener("pointerdown", event => {
    const btn = event.target.closest?.("#quick-grade .qg-val");
    if (!btn) return;
    Object.assign(qgScrub, { id: event.pointerId, start: btn, moved: false });
    qgMark(btn);
    if (event.pointerType !== "mouse") btn.releasePointerCapture?.(event.pointerId);
});
document.addEventListener("pointermove", event => {
    if (qgScrub.id === null || event.pointerId !== qgScrub.id) {
        // cu mouse-ul: doar trecând peste
        if (event.pointerType === "mouse" && $("quick-grade")) {
            const over = event.target.closest?.("#quick-grade .qg-val");
            if (over !== qgScrub.cur) qgMark(over);
        }
        return;
    }
    const btn = qgValAt(event.clientX, event.clientY);
    if (btn && btn !== qgScrub.start) qgScrub.moved = true;
    if (btn) qgMark(btn);
}, { passive: true });
document.addEventListener("pointerup", event => {
    if (qgScrub.id === null || event.pointerId !== qgScrub.id) return;
    const end = qgValAt(event.clientX, event.clientY);
    const moved = qgScrub.moved;
    qgScrub.id = null;
    if (moved && end) {
        // ridicat pe altă notă decât cea apăsată: punem nota de sub deget (clicul obișnuit n-ar ajunge acolo)
        event.preventDefault();
        quickGrade.swallow = true;
        setTimeout(() => { quickGrade.swallow = false; }, 400);
        ACTIONS["quick-grade-add"](end);
    } else if (!end) {
        qgMark(null);
    }
});
document.addEventListener("pointercancel", () => { qgScrub.id = null; qgMark(null); });
document.addEventListener("click", event => {
    if (quickGrade.swallow && event.target.closest?.("#quick-grade, .qg-val")) { event.stopImmediatePropagation(); event.preventDefault(); }
}, true);
document.addEventListener("focusin", event => {
    const btn = event.target.closest?.("#quick-grade .qg-val");
    if (btn && qgScrub.id === null) qgMark(btn);
});

function placeQuickGrade() {
    const pop = $("quick-grade"), a = quickGrade.anchor;
    if (!pop || !a || !document.contains(a)) return closeQuickGrade();
    const r = a.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w));
    const below = r.bottom + 6 + h <= window.innerHeight - 8;
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(below ? r.bottom + 6 : Math.max(8, r.top - h - 6))}px`;
}

function closeQuickGrade({ focus = false } = {}) {
    const pop = $("quick-grade");
    if (!pop) return;
    qgScrub.cur = null;
    qgScrub.id = null;
    leaveRemove(pop);
    quickGrade.anchor?.classList.remove("is-open");
    if (focus && quickGrade.anchor && document.contains(quickGrade.anchor)) quickGrade.anchor.focus();
}

Object.assign(ACTIONS, {
    "quick-grade": el => ($("quick-grade") && quickGrade.mat === el.dataset.mat ? closeQuickGrade() : openQuickGrade(el.dataset.mat, el)),
    "quick-grade-type": el => {
        quickGrade.type = el.dataset.type;
        try { localStorage.setItem(QUICK_TYPE_KEY, quickGrade.type); } catch (_) { /* fără stocare */ }
        document.querySelectorAll(".qg-type").forEach(b => b.setAttribute("aria-checked", String(b === el)));
    },
    "quick-grade-add": el => {
        const mat = quickGrade.mat, val = Number(el.dataset.val), type = quickGrade.type;
        if (!state.subjects[mat] || !(val >= 1 && val <= 10)) return closeQuickGrade();
        const date = lastSchoolDay();
        if (!allowGrade(mat, { val, date })) return;
        closeQuickGrade({ focus: true });
        withUndo(`✅ Ai pus ${val} (${type}) la ${mat}.`, () => {
            state.subjects[mat].grades.push({ id: uid(), val, type, date });
            addActivity(`Ai adăugat nota ${val} (${type}) la ${mat}.`);
        });
        celebrateGrade(val);
    },
    "quick-grade-more": () => {
        const mat = quickGrade.mat;
        closeQuickGrade();
        openAddGradeModal(mat);
    }
});

document.addEventListener("pointerdown", event => {
    if ($("quick-grade") && !event.target.closest("#quick-grade, .cat-quick")) closeQuickGrade();
}, true);
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && $("quick-grade")) { event.stopPropagation(); closeQuickGrade({ focus: true }); return; }
    // o cifră cât e deschisă: 1–9, iar 0 = 10
    if ($("quick-grade") && /^[0-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        $("quick-grade").querySelector(`.qg-val[data-val='${event.key === "0" ? 10 : event.key}']`)?.click();
    }
}, true);
window.addEventListener("resize", () => closeQuickGrade());
document.addEventListener("scroll", () => placeQuickGrade(), true);
