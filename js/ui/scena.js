/* urNotes · Scena: cum se simte aplicația în mână.
   UX: glisezi între materii pe telefon, tragi foaia „Adaugă” în jos ca s-o închizi, atingi fila activă ca să urci sus,
   fiecare pagină își ține minte locul, „Anulează” arată cât timp mai ai, ții apăsat pe o carte de pe raft ca să pui o notă.
   Mișcare: cărțile cad pe raft, teancul se așază, ștampilele se apasă pe fișă, filele de calendar se rup, cifrele numără,
   markerul se trage sub titlu, cartea se deschide în copertă, tema se schimbă dintr-un cerc, colegul se uită după cursor.
   Totul e scurt și dispare complet cu „reducere mișcare” din sistem (atunci rămân doar îmbunătățirile de UX).
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const scena = { scroll: {}, swallowClick: false };
const motionOK = () => !reduceMotion() && !/jsdom/i.test(navigator.userAgent || "");
const phoneWidth = () => matchMedia("(max-width: 900px)").matches;

/* ==================== cifrele numără ==================== */
const COUNT_SEL = ".home-tile-value, .as-avg, .cat-row-avg b, .cat-sum-value, .cat-stat b, .stats-big, .kpi-value";
/** Un număr („8.57”, „10”, „27”) urcă de la zero la valoarea lui; textul final rămâne exact cel scris de aplicație. */
function countUp(el, ms = 650) {
    const text = el.textContent.trim();
    const m = /^(\d+)(?:[.,](\d+))?$/.exec(text);
    if (!m || el._counting) return;
    const to = Number(text.replace(",", ".")), dec = m[2]?.length || 0, sep = text.includes(",") ? "," : ".";
    if (!to) return;
    el._counting = true;
    const t0 = performance.now();
    const step = now => {
        const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        el.textContent = p < 1 ? (to * e).toFixed(dec).replace(".", sep) : text;
        if (p < 1) requestAnimationFrame(step); else el._counting = false;
    };
    requestAnimationFrame(step);
}

/* ==================== o pagină (sau o bucată din ea) intră în scenă ==================== */
const SCENA_LISTS = [".as-item", ".cat-row-wrap, .cat-row.is-purtare", ".ag-day", ".cat-grade", ".cc-tile", ".home-tile", ".pal-kind", ".azi-list > li, .azi-plan-list > li"];
/** Numerotează elementele din liste (pentru întârzieri pe rând) și pornește animațiile legate de clasa „scena-play”. */
function scenaPlay(root, { counts = true } = {}) {
    if (!root || !motionOK()) return;
    SCENA_LISTS.forEach(sel => root.querySelectorAll(sel).forEach((el, i) => el.style.setProperty("--i", Math.min(i, 14))));
    root.classList.remove("scena-play");
    void root.offsetWidth;
    root.classList.add("scena-play");
    clearTimeout(root._scenaT);
    root._scenaT = setTimeout(() => root.classList.remove("scena-play"), 1600);
    if (counts) root.querySelectorAll(COUNT_SEL).forEach(el => { if (el.getBoundingClientRect().top < innerHeight) countUp(el); });
    if (root.querySelector("#azi-buddy .buddy")) {
        const b = root.querySelector("#azi-buddy .buddy");
        setTimeout(() => { b.classList.add("is-hop"); setTimeout(() => b.classList.remove("is-hop"), 620); }, 450);
    }
}

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
        scenaPlay($(tabId));
    };
}
document.addEventListener("click", event => {
    const btn = event.target.closest?.(".mobile-nav-btn.active, .tab-btn.side-link.active");
    if (!btn || btn.dataset.tab !== ui.activeTab || window.scrollY < 40) return;
    window.scrollTo({ top: 0, behavior: motionOK() ? "smooth" : "auto" });
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
        if (typeof slideIn === "function") slideIn(document.querySelector("#cat-detail .cat-detail-card"), dir);
        scenaPlay($("cat-detail"), { counts: false });
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
        book.classList.add("is-lifted");
        setTimeout(() => book.classList.remove("is-lifted"), 500);
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

/* ==================== cartea se deschide în copertă; tema se schimbă dintr-un cerc (View Transitions) ==================== */
const VT_BOOK = new Set(["cat-select", "open-subject"]);
document.addEventListener("click", event => {
    const el = event.target.closest?.("[data-action]");
    if (!el || !document.startViewTransition || !motionOK() || el.dataset.vtGo) return;
    const a = el.dataset.action;
    if (VT_BOOK.has(a) && el.dataset.mat && el.matches(".cat-row, .as-item")) {
        event.preventDefault(); event.stopImmediatePropagation();
        el.style.viewTransitionName = "urn-book";
        document.documentElement.classList.add("vt-book");
        const vt = document.startViewTransition(() => {
            el.style.viewTransitionName = "";
            el.dataset.vtGo = "1"; el.click(); delete el.dataset.vtGo;
            const cover = document.querySelector("#cat-detail .cat-detail-head");
            if (cover) cover.style.viewTransitionName = "urn-book";
        });
        vt.finished.finally(() => {
            document.documentElement.classList.remove("vt-book");
            document.querySelectorAll(".cat-detail-head").forEach(c => { c.style.viewTransitionName = ""; });
            scenaPlay($("cat-detail"), { counts: true });
        });
        return;
    }
    if (a === "theme-toggle") {
        event.preventDefault(); event.stopImmediatePropagation();
        const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        document.documentElement.classList.add("vt-theme");
        const vt = document.startViewTransition(() => { el.dataset.vtGo = "1"; el.click(); delete el.dataset.vtGo; });
        vt.ready.then(() => document.documentElement.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
            { duration: 520, easing: "cubic-bezier(.4, 0, .2, 1)", pseudoElement: "::view-transition-new(root)" }
        )).catch(() => {});
        vt.finished.finally(() => document.documentElement.classList.remove("vt-theme"));
    }
}, true);

/* ==================== după acțiuni: ce s-a schimbat se mișcă ==================== */
document.addEventListener("click", event => {
    const el = event.target.closest?.("[data-action]");
    if (!el) return;
    const a = el.dataset.action;
    requestAnimationFrame(() => {
        if (a === "cal-nav" || a === "cal-view") scenaPlay($("cal-body"), { counts: false });
        else if (a === "cat-step" || ((a === "cat-select" || a === "open-subject") && !document.startViewTransition)) scenaPlay($("cat-detail"));
    });
});
/** O notă nouă: pe fișa materiei, ștampila ei se apasă cu putere. */
if (typeof celebrateGrade === "function") {
    const baseCelebrate = celebrateGrade;
    // eslint-disable-next-line no-global-assign
    celebrateGrade = function (val) {
        baseCelebrate(val);
        if (!motionOK()) return;
        requestAnimationFrame(() => {
            const first = document.querySelector("#cat-detail .cat-grades .cat-grade");
            if (!first || !isShown(first)) return;
            first.classList.add("is-new");
            setTimeout(() => first.classList.remove("is-new"), 1100);
        });
    };
}

/* ==================== colegul se uită după cursor ==================== */
(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    let frame = 0, px = 0, py = 0;
    const look = () => {
        frame = 0;
        if (!motionOK()) return;
        document.querySelectorAll("#azi-buddy .buddy, #side-pal .buddy, .pal-kind.is-on .buddy, .wr-preview .buddy").forEach(svg => {
            if (svg.classList.contains("is-glance") || !isShown(svg)) return;
            const pupils = svg.querySelector(".buddy-pupils");
            if (!pupils) return;
            const r = svg.getBoundingClientRect();
            const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height * 0.46), d = Math.hypot(dx, dy) || 1;
            const k = Math.min(1, d / 260) * 2.6;
            pupils.style.transform = `translate(${(dx / d * k).toFixed(2)}px, ${(dy / d * k).toFixed(2)}px)`;
        });
    };
    document.addEventListener("pointermove", e => { px = e.clientX; py = e.clientY; if (!frame) frame = requestAnimationFrame(look); }, { passive: true });
    document.addEventListener("pointerleave", () => document.querySelectorAll(".buddy-pupils").forEach(p => { p.style.transform = ""; }));
})();

/* ==================== pornire: prima pagină intră și ea în scenă ==================== */
(() => {
    const go = () => setTimeout(() => scenaPlay(document.querySelector(".tab-content.active")), 120);
    const splash = document.querySelector(".splash");
    if (splash && !splash.classList.contains("is-out") && typeof MutationObserver === "function") {
        const mo = new MutationObserver(() => { if (splash.classList.contains("is-out")) { mo.disconnect(); go(); } });
        mo.observe(splash, { attributes: true, attributeFilter: ["class"] });
        setTimeout(() => { mo.disconnect(); }, 6000);
    } else if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
})();
