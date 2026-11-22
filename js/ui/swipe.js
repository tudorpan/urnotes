/* urNotes · Glisări (ca pe iPhone): tragi un lucru într-o parte ca să-l închizi sau ca să faci acțiunea lui.
   - mesajele de jos (toast): în orice parte sau în jos → pleacă (și cu mouse-ul)
   - o notificare din clopoțel: stânga / dreapta → o ascunde (cu „Anulează”)
   - un eveniment trecut din Calendar: dreapta → Făcut / Fără notă, stânga → Notă
   - o materie din Note: stânga → notă nouă la ea
   - panoul de notificări: spre dreapta → se închide
   - calendarul (Zi, 3 zile, Săptămână, Lună): stânga / dreapta → următoarea / anterioara
   Sub ce tragi apare culoarea și numele acțiunii; peste prag, telefonul vibrează scurt (unde se poate).
   Pe calculator, cu mouse-ul, merg doar mesajele de jos (restul au butoane). */
"use strict";

const SWIPES = [
    {
        sel: ".toast", mouse: true, down: true,
        left: { act: el => el.leave?.(), away: true },
        right: { act: el => el.leave?.(), away: true }
    },
    {
        sel: ".alert-card", when: el => el.querySelector('[data-action="dismiss-alert"]'),
        left: { label: "Ascunde", icon: "x", tone: "risk", away: true, act: el => el.querySelector('[data-action="dismiss-alert"]').click() },
        right: { label: "Ascunde", icon: "x", tone: "risk", away: true, act: el => el.querySelector('[data-action="dismiss-alert"]').click() }
    },
    {
        sel: ".cal-att-row",
        right: { label: el => el.querySelector('[data-action="event-done"]')?.textContent.trim() || "Făcut", icon: "check", tone: "ok", away: true,
            act: el => el.querySelector('[data-action="event-done"]')?.click() },
        left: { label: "Notă", icon: "plus", tone: "tint", when: el => el.querySelector('[data-action="event-grade"]'),
            act: el => el.querySelector('[data-action="event-grade"]')?.click() }
    },
    {
        sel: ".cat-row-wrap",
        left: { label: "Notă nouă", icon: "plus", tone: "tint", act: el => el.querySelector(".cat-quick")?.click() }
    },
    {
        sel: "#notif-panel .drawer-card", whole: true,
        right: { act: () => closeNotifPanel(), away: true }
    }
];

const swipeHaptic = () => { try { navigator.vibrate?.(8); } catch (_) { /* fără vibrații */ } };

let swipeSwallow = false; // după o glisare, atingerea nu mai „apasă” ce era dedesubt
const swallowNextClick = () => { swipeSwallow = true; setTimeout(() => { swipeSwallow = false; }, 120); };

function bindSwipes() {
    let s = null;            // glisarea în curs

    const configFor = target => {
        for (const c of SWIPES) {
            const el = target.closest?.(c.sel);
            if (el && (!c.when || c.when(el))) return { c, el };
        }
        return null;
    };
    const sideOf = (c, el, dir) => {
        const side = c[dir];
        return side && (!side.when || side.when(el)) ? side : null;
    };

    document.addEventListener("pointerdown", event => {
        if (s || event.button > 0) return;
        if (event.target.closest?.("input, textarea, select, [contenteditable='true'], .gc-ghost")) return;
        const hit = configFor(event.target);
        if (!hit) return;
        if (event.pointerType === "mouse" && !hit.c.mouse) return;
        s = { ...hit, x0: event.clientX, y0: event.clientY, dx: 0, dy: 0, t0: Date.now(), on: false, armed: false, id: event.pointerId };
    }, true);

    window.addEventListener("pointermove", event => {
        if (!s || event.pointerId !== s.id) return;
        const dx = event.clientX - s.x0, dy = event.clientY - s.y0;
        if (!s.on) {
            const horiz = Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.3;
            const down = s.c.down && dy > 12 && dy > Math.abs(dx) * 1.3;
            if (!horiz && !down) {
                if (Math.abs(dy) > 12 || Math.abs(dx) > 30) s = null; // derulare: nu e glisare
                return;
            }
            s.mode = horiz ? "x" : "y";
            if (s.mode === "x" && !sideOf(s.c, s.el, dx < 0 ? "left" : "right")) { s = null; return; }
            s.on = true;
            s.el.classList.add("sw-active");
            s.el.style.transition = "none";
            try { s.el.setPointerCapture?.(event.pointerId); } catch (_) { /* fără captură */ }
        }
        event.preventDefault();
        if (s.mode === "y") {
            s.dy = Math.max(0, dy);
            s.el.style.transform = `translateY(${s.dy}px)`;
            s.el.style.opacity = String(Math.max(0.2, 1 - s.dy / 140));
            return;
        }
        const dir = dx < 0 ? "left" : "right";
        const side = sideOf(s.c, s.el, dir);
        // în partea fără acțiune, elementul abia se mișcă (ca un elastic)
        s.dx = side ? dx : dx / 6;
        s.el.style.transform = `translateX(${s.dx}px)`;
        const w = s.el.offsetWidth || 300;
        const passed = side && Math.abs(s.dx) > Math.min(110, w * 0.35);
        if (passed !== s.armed) { s.armed = passed; if (passed) swipeHaptic(); }
        if (side && !s.c.whole && side.label) drawSwipeBg(s, side, dir, passed);
        if (s.c.whole || (!side?.label && side)) s.el.style.opacity = String(Math.max(0.3, 1 - Math.abs(s.dx) / w));
    }, { passive: false });

    const finish = event => {
        if (!s || (event && event.pointerId !== s.id)) return;
        const st = s;
        s = null;
        if (!st.on) return;
        swallowNextClick();
        const el = st.el;
        const w = el.offsetWidth || 300;
        const fast = (Math.abs(st.mode === "y" ? st.dy : st.dx) / Math.max(1, Date.now() - st.t0)) > 0.6;
        const done = side => {
            el.style.transition = "transform .22s cubic-bezier(.3, .6, .4, 1), opacity .22s ease";
            if (side.away) {
                el.style.transform = st.mode === "y" ? `translateY(${el.offsetHeight + 40}px)` : `translateX(${Math.sign(st.dx) * (w + 40)}px)`;
                el.style.opacity = "0";
                setTimeout(() => { clearSwipe(el); side.act(el); }, 200);
            } else {
                el.style.transform = "";
                el.style.opacity = "";
                setTimeout(() => clearSwipe(el), 230);
                // după fereastra în care se înghite atingerea de la ridicarea degetului
                setTimeout(() => side.act(el), 140);
            }
        };
        if (st.mode === "y") {
            if (st.dy > 60 || (fast && st.dy > 24)) return done(st.c.left || st.c.right);
        } else {
            const side = sideOf(st.c, el, st.dx < 0 ? "left" : "right");
            if (side && (Math.abs(st.dx) > Math.min(110, w * 0.35) || (fast && Math.abs(st.dx) > 40))) return done(side);
        }
        el.style.transition = "transform .3s cubic-bezier(.2, 1.3, .4, 1), opacity .2s ease";
        el.style.transform = "";
        el.style.opacity = "";
        setTimeout(() => clearSwipe(el), 320);
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    document.addEventListener("click", event => {
        if (swipeSwallow) { event.stopPropagation(); event.preventDefault(); swipeSwallow = false; }
    }, true);

    bindCalendarSwipe();
}

/** Culoarea și numele acțiunii, chiar sub elementul tras. */
function drawSwipeBg(s, side, dir, passed) {
    const el = s.el;
    let bg = el.previousElementSibling?.classList.contains("sw-bg") ? el.previousElementSibling : null;
    if (!bg) {
        bg = document.createElement("div");
        bg.className = "sw-bg";
        bg.setAttribute("aria-hidden", "true");
        const parent = el.parentElement;
        if (getComputedStyle(parent).position === "static") { parent.style.position = "relative"; parent.dataset.swRel = "1"; }
        parent.insertBefore(bg, el);
    }
    Object.assign(bg.style, { top: `${el.offsetTop}px`, left: `${el.offsetLeft}px`, width: `${el.offsetWidth}px`, height: `${el.offsetHeight}px` });
    const label = typeof side.label === "function" ? side.label(el) : side.label;
    bg.className = `sw-bg sw-${side.tone || "tint"} sw-${dir}${passed ? " is-armed" : ""}`;
    const html = `<span>${side.icon ? icon(side.icon) : ""}${escapeHTML(label)}</span>`;
    if (bg.dataset.html !== html) { bg.innerHTML = html; bg.dataset.html = html; }
}

function clearSwipe(el) {
    el.classList.remove("sw-active");
    el.style.transition = el.style.transform = el.style.opacity = "";
    const bg = el.previousElementSibling;
    if (bg?.classList.contains("sw-bg")) bg.remove();
    const parent = el.parentElement;
    if (parent?.dataset.swRel) { parent.style.position = ""; delete parent.dataset.swRel; }
}

/* calendarul: glisezi stânga / dreapta ca să mergi la ziua, săptămâna sau luna următoare (ca în aplicația Google) */
function bindCalendarSwipe() {
    const body = $("cal-body");
    if (!body) return;
    let g = null;
    body.addEventListener("pointerdown", event => {
        if (event.pointerType !== "touch" || ui.cal.view === "schedule" || (typeof qc !== "undefined" && qc.open)) return;
        if (event.target.closest(".gc-ghost")) return;
        g = { x0: event.clientX, y0: event.clientY, id: event.pointerId };
    });
    body.addEventListener("pointermove", event => {
        if (!g || event.pointerId !== g.id) return;
        const dx = event.clientX - g.x0, dy = event.clientY - g.y0;
        if (!g.on) {
            if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { g = null; return; }
            if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
            g.on = true;
        }
        const inner = body.firstElementChild;
        if (inner) { inner.style.transition = "none"; inner.style.transform = `translateX(${dx * 0.35}px)`; inner.style.opacity = String(1 - Math.min(0.4, Math.abs(dx) / 600)); }
        g.dx = dx;
    });
    const end = event => {
        if (!g || (event && event.pointerId !== g.id)) return;
        const st = g;
        g = null;
        const inner = body.firstElementChild;
        if (!st.on) return;
        swallowNextClick();
        if (Math.abs(st.dx) > 60) {
            const step = st.dx < 0 ? 1 : -1;
            swipeHaptic();
            calNavigate(step);
            if (typeof slideIn === "function") slideIn(body, step);
        } else if (inner) {
            inner.style.transition = "transform .25s ease, opacity .25s ease";
            inner.style.transform = "";
            inner.style.opacity = "";
        }
    };
    body.addEventListener("pointerup", end);
    body.addEventListener("pointercancel", end);
}
