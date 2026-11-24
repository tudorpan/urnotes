/* urNotes · Scena: cum se simte aplicația în mână (fără animații în pagină; singura tranziție e cea dintre file).
   Pe telefon glisezi între materii și tragi foaia „Adaugă” în jos ca s-o închizi; atingi fila activă ca să urci sus;
   fiecare pagină își ține minte locul; „Anulează” arată cât timp mai ai; ții apăsat pe o carte de pe raft ca să pui o notă.
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const scena = { scroll: {}, swallowClick: false };
const phoneWidth = () => matchMedia("(max-width: 900px)").matches;

/* ==================== fiecare pagină își ține minte locul; fila activă te duce sus ==================== */
if (typeof switchTab === "function") {
    const baseSwitch = switchTab;
    // eslint-disable-next-line no-global-assign
    switchTab = function (tabId) {
        const from = ui.activeTab;
        if (from && from !== tabId) scena.scroll[from] = window.scrollY;
        baseSwitch(tabId);
        if (from === tabId || !$(tabId)) return;
        const back = scena.scroll[tabId];
        if (back > 0) requestAnimationFrame(() => window.scrollTo({ top: Math.min(back, document.documentElement.scrollHeight - innerHeight) }));
    };
}
document.addEventListener("click", event => {
    const btn = event.target.closest?.(".mobile-nav-btn.active, .tab-btn.side-link.active");
    if (!btn || btn.dataset.tab !== ui.activeTab || window.scrollY < 40) return;
    window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
}, true);

/* ==================== „Anulează” arată cât timp mai ai ==================== */
if (typeof showToast === "function") {
    const baseToast = showToast;
    // eslint-disable-next-line no-global-assign
    showToast = function (msg, opts = {}) {
        const toast = baseToast(msg, opts);
        if (toast && opts.action) {
            const bar = document.createElement("i");
            bar.className = "toast-timer";
            bar.setAttribute("aria-hidden", "true");
            const run = ms => { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = `toastTimer ${ms}ms linear forwards`; };
            toast.appendChild(bar);
            run(opts.duration || 3000);
            toast.addEventListener("mouseenter", () => { bar.style.animationPlayState = "paused"; });
            toast.addEventListener("focusin", () => { bar.style.animationPlayState = "paused"; });
            toast.addEventListener("mouseleave", () => run(2000));
            toast.addEventListener("focusout", () => run(2000));
        }
        return toast;
    };
}

/* ==================== telefon: glisezi între materii ==================== */
(() => {
    let x0 = 0, y0 = 0, t0 = 0, ok = false;
    document.addEventListener("touchstart", e => {
        const box = e.target.closest?.("#cat-detail");
        ok = Boolean(box) && phoneWidth() && e.touches.length === 1 && e.touches[0].clientX > EDGE_BACK_PX
            && !e.target.closest("input, textarea, select, canvas, .cat-chips, .cat-subj-strip, [data-noswipe], .chart-wrap");
        if (!ok) return;
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
    }, { passive: true });
    document.addEventListener("touchend", e => {
        if (!ok) return;
        ok = false;
        const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
        if (Math.abs(dx) < 70 || Math.abs(dy) > 45 || Date.now() - t0 > 650) return;
        if (!document.querySelector("#cat-nav [data-action='cat-step']")) return;
        const dir = dx < 0 ? 1 : -1;
        stepCatalog(dir);
    }, { passive: true });
})();

/* ==================== telefon: din marginea stângă, înapoi la toate materiile ====================
   Ca în aplicațiile de iPhone (o aplicație pusă pe ecranul principal nu are gestul „înapoi” al browserului): pagina
   materiei urmează degetul spre dreapta, cu o umbră; dincolo de o treime (sau cu o aruncare rapidă) pleacă și apare
   lista, venind puțin din stânga. Altfel se întoarce la loc. */
const EDGE_BACK_PX = 22;
(() => {
    let g = null;
    const pane = () => document.querySelector("#tab-catalog .cat-detail-pane");
    const can = () => phoneWidth() && ui.activeTab === "tab-catalog" && ui.catalog.showDetail && pane()?.offsetParent !== null
        && !document.querySelector(".modal-overlay:not([hidden]), .sheet-open, #quick-grade");
    document.addEventListener("touchstart", e => {
        g = null;
        if (e.touches.length !== 1 || e.touches[0].clientX > EDGE_BACK_PX || !can()) return;
        const t = e.touches[0];
        g = { x0: t.clientX, y0: t.clientY, t0: performance.now(), on: false, dx: 0, v: 0, lx: t.clientX, lt: performance.now(), el: pane() };
    }, { passive: true });
    document.addEventListener("touchmove", e => {
        if (!g) return;
        const t = e.touches[0], dx = t.clientX - g.x0, dy = t.clientY - g.y0;
        if (!g.on) {
            if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { g = null; return; } // derulează: nu e gestul nostru
            if (dx < 8) return;
            g.on = true;
            g.el.classList.add("edge-dragging");
            document.body.classList.add("edge-back-on");
        }
        e.preventDefault();
        const now = performance.now();
        g.v = (t.clientX - g.lx) / Math.max(1, now - g.lt); g.lx = t.clientX; g.lt = now;
        g.dx = Math.max(0, dx);
        const w = window.innerWidth, k = Math.min(1, g.dx / w);
        g.el.style.transform = `translateX(${g.dx.toFixed(1)}px)`;
        document.body.style.setProperty("--edge-k", k.toFixed(3));
    }, { passive: false });
    const end = () => {
        if (!g) return;
        const st = g; g = null;
        if (!st.on) return;
        const w = window.innerWidth, el = st.el;
        if (performance.now() - st.lt > 90) st.v = 0; // degetul s-a oprit înainte să-l ridici: nu e o aruncare
        const go = st.dx > w * 0.33 || (st.v > 0.5 && st.dx > 40);
        const ms = Math.round(Math.max(140, Math.min(320, ((go ? w - st.dx : st.dx) / Math.max(0.6, Math.abs(st.v))))));
        el.classList.remove("edge-dragging");
        el.style.transition = `transform ${ms}ms cubic-bezier(.2, .8, .3, 1)`;
        el.style.transform = go ? `translateX(${w}px)` : "translateX(0)";
        document.body.style.setProperty("--edge-k", go ? "1" : "0");
        setTimeout(() => {
            el.style.transition = ""; el.style.transform = "";
            document.body.classList.remove("edge-back-on");
            document.body.style.removeProperty("--edge-k");
            if (!go) return;
            haptic?.();
            ACTIONS["cat-back"]?.();
            // lista vine puțin din stânga, ca stratul de dedesubt la iPhone
            const list = document.querySelector("#tab-catalog .cat-list-pane");
            if (list && !reduceMotion()) list.animate([{ transform: "translateX(-24%)", opacity: 0.6 }, { transform: "none", opacity: 1 }],
                { duration: 260, easing: "cubic-bezier(.2, .8, .3, 1)" });
        }, ms);
    };
    document.addEventListener("touchend", end, { passive: true });
    document.addEventListener("touchcancel", end, { passive: true });
})();

/* foaia „Adaugă” (Ce adaugi?) se trage în jos ca să se închidă: js/ui/phone.js (bindSheetDrag), ca toate foile */

/* ==================== ții apăsat pe o carte de pe raft: pui o notă direct ==================== */
(() => {
    let timer = 0, sx = 0, sy = 0;
    const fire = book => {
        scena.swallowClick = true;
        setTimeout(() => { scena.swallowClick = false; }, 600);
        navigator.vibrate?.(12);
        if (typeof openQuickGrade === "function") openQuickGrade(book.dataset.mat, book);
    };
    document.addEventListener("pointerdown", e => {
        const book = e.target.closest?.(".as-item[data-mat]");
        if (!book || e.button !== 0) return;
        sx = e.clientX; sy = e.clientY;
        clearTimeout(timer);
        timer = setTimeout(() => fire(book), 480);
    }, { passive: true });
    document.addEventListener("pointermove", e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 9) { clearTimeout(timer); timer = 0; } }, { passive: true });
    ["pointerup", "pointercancel", "scroll"].forEach(t => document.addEventListener(t, () => { clearTimeout(timer); timer = 0; }, { passive: true, capture: true }));
    document.addEventListener("contextmenu", e => {
        const book = e.target.closest?.(".as-item[data-mat]");
        if (!book) return;
        e.preventDefault();
        clearTimeout(timer); timer = 0;
        fire(book);
    });
    document.addEventListener("click", e => {
        if (scena.swallowClick && e.target.closest?.(".as-item[data-mat]")) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
})();
