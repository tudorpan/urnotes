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
        ok = Boolean(box) && phoneWidth() && e.touches.length === 1
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

/* ==================== telefon: foaia „Adaugă” se trage în jos ca să se închidă ==================== */
(() => {
    let y0 = 0, dy = 0, t0 = 0, host = null;
    document.addEventListener("pointerdown", e => {
        if (e.pointerType === "mouse" || !phoneWidth()) return;
        const head = e.target.closest?.(".cc-head, .cc-grab");
        if (!head || e.target.closest("button")) return;
        host = $("cc-overlay-host");
        y0 = e.clientY; dy = 0; t0 = Date.now();
        host.style.transition = "none";
    }, { passive: true });
    document.addEventListener("pointermove", e => {
        if (!host) return;
        dy = Math.max(0, e.clientY - y0);
        host.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    const end = () => {
        if (!host) return;
        const h = host, fast = dy / Math.max(1, Date.now() - t0) > 0.6;
        host = null;
        h.style.transition = "transform .22s cubic-bezier(.2, .8, .2, 1)";
        if (dy > 120 || (fast && dy > 40)) {
            h.style.transform = "translateY(110%)";
            setTimeout(() => { h.style.transform = ""; h.style.transition = ""; ccCloseOverlay(); }, 200);
        } else {
            h.style.transform = "";
            setTimeout(() => { h.style.transition = ""; }, 230);
        }
    };
    document.addEventListener("pointerup", end, { passive: true });
    document.addEventListener("pointercancel", end, { passive: true });
})();

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
