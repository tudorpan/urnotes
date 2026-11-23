/* urNotes · Intro-ul: lampa cu suflet (~4,5 s, la fiecare pornire; o atingere îl sare).
   Pe masă, în întuneric: baza apare, brațul desenează N-ul, capul atârnă adormit. Lampa respiră, se trezește și se
   întinde, se uită în jur (sus, la stânga, la dreapta), zărește numele din întuneric, se uită de două ori, sare puțin de
   bucurie și se aprinde: lumina scoate „urNotes” din întuneric. Dă din cap mulțumită, apoi se uită spre colțul de sus
   și zboară acolo, unde rămâne ca logo (butonul lămpii din antet), în timp ce aplicația apare dedesubt.
   Mișcarea e făcută aici, cu Web Animations; culorile și starea de pornire sunt în identity.css (#splash.intro).
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const intro = { t0: 0, anims: [], ready: false, flying: false, done: false, el: null };
const INTRO_FLY_AT = 3950; // ms de la pornire: de aici lampa poate zbura (dacă aplicația e gata)

function introStart() {
    const el = document.getElementById("splash");
    if (!el || !el.classList.contains("intro") || el.classList.contains("is-still") || !Element.prototype.animate) return;
    intro.el = el;
    intro.t0 = performance.now();
    document.body.classList.add("intro-on");
    const q = sel => el.querySelector(sel);
    const qa = sel => [...el.querySelectorAll(sel)];
    const lamp = q(".in-lamp"), head = q(".in-head"), arm = q(".in-arm"), base = q(".in-base");
    const bulb = q(".in-bulb"), light = q(".in-light"), lit = q(".in-name-lit"), dim = q(".in-name-dim");
    const desk = q(".in-desk"), tag = q(".splash-tag"), joints = qa(".in-joint");
    // fill „forwards” pentru corpul lămpii: are mai multe mișcări la rând pe aceeași proprietate, care nu trebuie să se acopere
    const play = (node, frames, start, dur, easing = "cubic-bezier(.4, 0, .2, 1)", fill = "both") => {
        if (!node) return;
        intro.anims.push(node.animate(frames, { delay: start, duration: dur, easing, fill }));
    };
    const spring = "cubic-bezier(.3, 1.5, .5, 1)";
    const rot = d => `rotate(${d}deg)`;

    // 1 · masa, baza, brațul care desenează N-ul
    play(desk, [{ opacity: 0 }, { opacity: 1 }], 0, 500, "ease");
    play(base, [{ opacity: 1, transform: "scaleX(0)" }, { opacity: 1, transform: "scaleX(1)" }], 140, 340, spring);
    play(arm, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], 320, 760, "cubic-bezier(.65, 0, .35, 1)");
    [600, 860, 1070].forEach((t, i) => play(joints[i], [{ opacity: 1, transform: "scale(0)" }, { opacity: 1, transform: "scale(1)" }], t, 260, spring));

    // 2 · capul atârnă adormit; lampa respiră
    const H = []; // unghiurile capului de-a lungul timpului: [ms, grade, easing spre punctul următor]
    play(head, [{ opacity: 0 }, { opacity: 1 }], 1040, 160, "ease");
    play(lamp, [{ transform: "scale(1, 1)" }, { transform: "scale(1, 1.025)" }, { transform: "scale(1, 1)" }], 1100, 420, "ease-in-out", "forwards");

    // 3 · se trezește și se întinde; se uită în jur; zărește numele, se uită de două ori, îl țintește
    H.push([1040, 28], [1380, 28], [1760, -160], [1980, -215], [2180, -110], [2320, -62], [2400, -96], [2580, -42.25]);
    play(lamp, [{ transform: "scale(1, 1)" }, { transform: "scale(1.04, .94)", offset: .35 }, { transform: "scale(.98, 1.05)", offset: .7 }, { transform: "scale(1, 1)" }], 1380, 420, "ease-in-out", "forwards");
    play(dim, [{ opacity: 0 }, { opacity: 1 }], 2050, 400, "ease");

    // 4 · un mic salt de bucurie, apoi clic: se aprinde (cu pâlpâire) și lumina scoate numele din întuneric
    play(lamp, [
        { transform: "translateY(0) scale(1, 1)" },
        { transform: "translateY(0) scale(1.05, .93)", offset: .2 },
        { transform: "translateY(-24px) scale(.97, 1.05)", offset: .55 },
        { transform: "translateY(0) scale(1.06, .92)", offset: .82 },
        { transform: "translateY(0) scale(1, 1)" }
    ], 2600, 380, "ease-in-out", "forwards");
    const flick = [{ opacity: 0 }, { opacity: .9, offset: .18 }, { opacity: .1, offset: .32 }, { opacity: 1, offset: .5 }, { opacity: .35, offset: .64 }, { opacity: 1, offset: .78 }, { opacity: 1 }];
    play(bulb, flick, 3000, 360, "steps(1, end)");
    play(light, flick, 3030, 360, "steps(1, end)");
    play(lit, flick, 3030, 360, "steps(1, end)");

    // 5 · dă din cap, mulțumită; rândul de dedesubt
    H.push([3420, -42.25], [3540, -30], [3660, -45], [3780, -33], [3900, -42.25]);
    play(tag, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], 3440, 420, "cubic-bezier(.2, .8, .2, 1)");

    // capul: un singur șir de cadre, cu momentele de mai sus
    const t0 = H[0][0], tEnd = H[H.length - 1][0];
    play(head, H.map(([t, d]) => ({ transform: rot(d), offset: (t - t0) / (tEnd - t0) })), t0, tEnd - t0, "cubic-bezier(.45, 0, .3, 1)");

    el.addEventListener("pointerdown", introSkip, { once: true });
    setTimeout(introMaybeFly, INTRO_FLY_AT);
}

/** Aplicația e gata (din hideSplash): lampa poate zbura când ajunge la momentul ei. */
function introReady() {
    intro.ready = true;
    const el = document.getElementById("splash");
    if (!el) return;
    if (!intro.el) { // fără mișcare (sau fără Web Animations): masa luminată, apoi se stinge ușor
        setTimeout(() => {
            el.style.transition = "opacity .25s ease";
            el.style.opacity = "0";
            setTimeout(() => el.remove(), 300);
        }, Math.max(0, 600 - performance.now()));
        return;
    }
    introMaybeFly();
}
function introSkip() {
    if (intro.flying) return;
    intro.skipped = true;
    intro.anims.forEach(a => { try { a.finish(); } catch (_) { /* gata deja */ } });
    introMaybeFly();
}
function introMaybeFly() {
    if (intro.flying || !intro.ready || !intro.el) return;
    if (!intro.skipped && performance.now() - intro.t0 < INTRO_FLY_AT) return;
    intro.flying = true;
    introFly();
}

/** Lampa se uită spre colțul de sus și zboară la locul ei din antet; aplicația apare dedesubt. */
function introFly() {
    const el = intro.el, art = el.querySelector(".intro-art");
    const fast = Boolean(intro.skipped);
    const dur = fast ? 420 : 760;
    const look = fast ? 0 : 220;
    const fade = (node, ms, delay = 0) => node && node.animate([{ opacity: getComputedStyle(node).opacity }, { opacity: 0 }], { duration: ms, delay, fill: "both", easing: "ease" });
    // ce nu zboară se stinge: lumina, numele, rândul, masa
    [".in-light", ".in-name-lit", ".in-name-dim", ".in-desk", ".splash-tag"].forEach(s => fade(el.querySelector(s), fast ? 160 : 260));
    // unde trebuie să ajungă: lampa din antet (cea vizibilă)
    const target = [...document.querySelectorAll(".lamp-btn .lamp-logo")].find(n => n.getBoundingClientRect().width > 0);
    const union = nodes => nodes.map(n => n.getBoundingClientRect()).filter(r => r.width || r.height).reduce((a, r) => ({
        left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom)
    }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    const finish = () => {
        document.body.classList.remove("intro-on");
        // lampa din antet „aterizează”: o mică turtire
        target?.animate([{ transform: "scale(1.12, .9)" }, { transform: "scale(.96, 1.04)" }, { transform: "none" }], { duration: 320, easing: "ease-out" });
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "both" }).finished.then(() => el.remove(), () => el.remove());
        intro.done = true;
    };
    if (!target || !art) {
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "both" }).finished.then(() => { el.remove(); document.body.classList.remove("intro-on"); });
        return;
    }
    const src = union([el.querySelector(".in-arm"), el.querySelector(".in-base")]);
    const dst = union([target.querySelector(".ll-arm"), target.querySelector("rect.ll-arm-fill")]);
    const a = art.getBoundingClientRect();
    const s = (dst.right - dst.left) / (src.right - src.left);
    const tx = dst.left - a.left - (src.left - a.left) * s;
    const ty = dst.top - a.top - (src.top - a.top) * s;
    // capul privește spre colț, apoi, în zbor, ia poziția din logo
    el.querySelector(".in-head")?.animate([{ transform: getComputedStyle(el.querySelector(".in-head")).transform }, { transform: "rotate(-200deg)" }, { transform: "rotate(-12deg)" }],
        { duration: look + dur, easing: "cubic-bezier(.45, 0, .3, 1)", fill: "both" });
    // fundalul se retrage, aplicația apare
    el.animate([{ backgroundColor: "rgba(11, 18, 38, 1)" }, { backgroundColor: "rgba(11, 18, 38, 0)" }], { duration: dur * 0.62, delay: look + dur * 0.38, fill: "both", easing: "ease" });
    art.animate([
        { transform: "translate(0, 0) scale(1)" },
        { transform: `translate(${tx * 0.45}px, ${ty * 0.45 - 30}px) scale(${1 - (1 - s) * 0.5})`, offset: 0.45 },
        { transform: `translate(${tx}px, ${ty}px) scale(${s})` }
    ], { duration: dur, delay: look, easing: "cubic-bezier(.5, 0, .25, 1)", fill: "both" }).finished.then(finish, finish);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", introStart, { once: true });
else introStart();
