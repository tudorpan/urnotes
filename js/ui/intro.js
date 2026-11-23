/* urNotes · Intro-ul: lampa cu suflet (~4,3 s, apoi zborul spre antet; la fiecare pornire; o atingere îl grăbește).
   Pe masă, în întuneric: baza apare, brațul desenează N-ul, capul cade și se leagănă, lampa se lasă moale și adoarme
   (respiră). Inspiră, se întinde și cască, se uită în jur, trece cu privirea peste nume, „hm?”, se întoarce brusc spre el
   și se apleacă curioasă. Se ghemuiește, sare de bucurie, aterizează turtită, iar din izbitură becul pâlpâie și se
   aprinde: lumina (calculată ca în realitate, vezi mai jos) scoate „urNotes” din întuneric. Dă din cap mulțumită, apoi se ghemuiește și sare în colțul de sus,
   unde rămâne ca logo (butonul lămpii din antet), în timp ce aplicația apare dedesubt.

   Cum e animată, „de mână”: lampa e un mic schelet (baza, două încheieturi, capul), nu o imagine care se rotește.
   Fiecare mișcare e scrisă ca poze-cheie legate prin curbe (încet-la-pornire / încet-la-oprire, cu depășire și revenire
   unde trebuie), cu anticipare înainte de orice gest mare. Capul are inerție: se leagănă în urma corpului (un mic arc
   simulat), iar în opriri lampa nu îngheață: respiră și se mișcă puțin. Totul e desenat cadru cu cadru
   (requestAnimationFrame); culorile și starea de pornire sunt în identity.css (#splash.intro).
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const intro = { t0: 0, jump: 0, ready: false, flying: false, done: false, skipped: false, el: null, fly: null };
const INTRO_FLY_AT = 4300; // ms de la pornire: de aici lampa poate zbura (dacă aplicația e gata)
const INTRO_END = 4350;    // după asta lampa doar „trăiește” (respiră) până pleacă

/* ---------- curbe ---------- */
function introBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
    return u => {
        if (u <= 0) return 0;
        if (u >= 1) return 1;
        let t = u;
        for (let i = 0; i < 6; i++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - u) / d; }
        if (!(t >= 0 && t <= 1) || Math.abs(X(t) - u) > 1e-4) { let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (X(t) < u) lo = t; else hi = t; } }
        return Y(t);
    };
}
const IE = {
    io: introBezier(0.45, 0, 0.25, 1),      // de la o poză la alta: pornește încet, ajunge încet
    soft: introBezier(0.37, 0, 0.63, 1),    // ca un sinus: pentru respirații și opriri vii
    out: introBezier(0.16, 0.84, 0.3, 1),   // pleacă tare, se așază lung (un gest hotărât)
    in: introBezier(0.6, 0, 0.9, 0.45),     // cade, tot mai repede
    snap: introBezier(0.1, 0.9, 0.2, 1),    // brusc (privirea care se întoarce)
    draw: introBezier(0.55, 0, 0.35, 1),
    back: u => { const s = 2.1; u -= 1; return u * u * ((s + 1) * u + s) + 1; },             // trece puțin peste și revine
    settle: u => 1 - Math.exp(-6.2 * u) * Math.cos(u * Math.PI * 2.6),                         // arc: depășește, oscilează, se oprește
    wobble: u => 1 - Math.exp(-5 * u) * Math.cos(u * Math.PI * 4.2)
};
/** O pistă: poze-cheie [ms, valoare, curba spre ea]. */
function introTrack(keys) {
    return t => {
        if (t <= keys[0][0]) return keys[0][1];
        for (let i = 1; i < keys.length; i++) {
            const [tk, vk, e] = keys[i];
            if (t < tk) {
                const [tp, vp] = keys[i - 1];
                if (tk <= tp) return vk;
                return vp + (vk - vp) * (e || IE.io)((t - tp) / (tk - tp));
            }
        }
        return keys[keys.length - 1][1];
    };
}
const introClamp = (v, a, b) => Math.min(b, Math.max(a, v));
const introLin = (t, a, b) => introClamp((t - a) / (b - a), 0, 1);

/* ---------- scheletul lămpii (coordonatele din SVG) ---------- */
const IR = (() => {
    const P0 = [88, 330], P1 = [88, 96], P2 = [232, 250], P3 = [232, 78];
    const L1 = P0[1] - P1[1], L2 = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]), L3 = P2[1] - P3[1];
    const R12 = Math.atan2(P2[1] - P1[1], P2[0] - P1[0]) * 180 / Math.PI + 90; // unghiul de la brațul stâng la diagonală
    return { P0, L1, L2, L3, R12, rest: P3 };
})();
/** lean: tot brațul se înclină din bază · crouch: diagonala se lasă (lampa se ghemuiește), brațul din dreapta rămâne drept
    · kink: brațul din dreapta se îndoaie. */
function introRig(lean, crouch, kink) {
    const r = Math.PI / 180, { P0, L1, L2, L3, R12 } = IR;
    const a1 = -90 + lean, a2 = a1 + R12 + crouch, a3 = a2 - R12 - crouch + kink;
    const P1 = [P0[0] + L1 * Math.cos(a1 * r), P0[1] + L1 * Math.sin(a1 * r)];
    const P2 = [P1[0] + L2 * Math.cos(a2 * r), P1[1] + L2 * Math.sin(a2 * r)];
    const P3 = [P2[0] + L3 * Math.cos(a3 * r), P2[1] + L3 * Math.sin(a3 * r)];
    return { P1, P2, P3, tilt: a3 + 90 };
}

/* ---------- coregrafia (ms de la pornire) ---------- */
const IT = (() => {
    const T = introTrack, E = IE;
    return {
        desk: T([[0, 0], [520, 1, E.soft]]),
        baseIn: T([[110, 0], [470, 1, E.back]]),
        draw: T([[260, 0], [1060, 1, E.draw]]),
        headIn: T([[1040, 0], [1150, 1, E.soft]]),
        lean: T([
            [0, 0], [1060, 0], [1480, -3, E.io],                      // se lasă moale
            [1640, -3], [1790, -5, E.io], [2040, -7, E.out], [2200, -4, E.io],   // inspiră, se întinde, revine
            [2440, -9, E.io], [2490, -8.5, E.soft], [2720, 4, E.io], [2830, 2, E.io], // stânga, dreapta, „hm?”
            [2960, 8, E.snap], [3060, 6, E.io],                       // se apleacă spre nume, curioasă
            [3190, 2, E.io], [3330, -2, E.out], [3470, 3, E.in], [3820, 0, E.settle]   // saltul
        ]),
        crouch: T([
            [0, 0], [1060, 0], [1480, 8, E.io],
            [1640, 8], [1790, 12, E.io], [2040, -13, E.out], [2210, 3, E.settle],
            [2440, 2, E.io], [2720, 0, E.io], [2830, 5, E.io],
            [2960, -8, E.snap], [3060, -4, E.io],
            [3190, 14, E.io],                                         // se ghemuiește (anticipare)
            [3265, -14, E.out], [3390, -6, E.soft], [3460, -10, E.in], // se întinde în aer, plutește, cade întinsă
            [3510, 13, E.out], [3830, 0, E.settle]                    // aterizează turtită și revine
        ]),
        kink: T([[0, 0], [1790, 0], [2040, -9, E.out], [2210, 0, E.settle], [3190, 2, E.io], [3265, -5, E.out], [3510, 5, E.out], [3830, 0, E.settle]]),
        lift: T([[0, 0], [3190, 0], [3330, -40, E.out], [3395, -42, E.soft], [3470, 0, E.in]]),
        // capul, față de brațul din dreapta: 0 = gura în jos; negativ = se ridică spre dreapta, apoi spre stânga
        head: T([
            [1040, -75], [1500, -26, E.settle],                       // cade și se leagănă, atârnă moale în față
            [1640, -26], [1790, -18, E.io], [2040, -150, E.out], [2200, -158, E.soft], // inspiră (capul coboară), se uită în sus
            [2440, -222, E.io], [2490, -217, E.soft],                 // în stânga, sus
            [2720, -100, E.io], [2830, -114, E.io],                   // în dreapta… și mai departe: „hm?”
            [2960, -38, E.back], [3060, -42.25, E.io],                // ia stai! — se întoarce brusc la nume
            [3190, -34, E.io], [3330, -48, E.out], [3470, -42.25, E.io],
            [3530, -47, E.out], [3720, -42.25, E.settle]              // tresare când se aprinde
        ]),
        baseSX: T([[0, 1], [3190, 1], [3265, 0.94, E.out], [3470, 1, E.io], [3510, 1.1, E.out], [3760, 1, E.settle]]),
        baseSY: T([[0, 1], [3470, 1], [3510, 0.78, E.out], [3760, 1, E.settle]]),
        dim: T([[2560, 0], [3100, 1, E.soft]])
    };
})();
/** pâlpâirea becului (trepte, fără curbe: un bec adevărat nu se aprinde lin) */
function introFlicker(t, start) {
    const d = t - start;
    if (d < 0) return 0;
    if (d < 55) return 0.9;
    if (d < 110) return 0.12;
    if (d < 175) return 1;
    if (d < 225) return 0.38;
    return 1;
}
/** respirația și micile mișcări din opriri (lampa nu stă niciodată perfect nemișcată) */
function introLife(t) {
    const sleep = introLin(t, 1100, 1250) * (1 - introLin(t, 1640, 1720));
    const awake = introLin(t, 2100, 2400);
    const breath = Math.sin((t - 1100) / 1000 * Math.PI * 2 / 0.62);
    const nodT = t - 3830;
    const nod = nodT > 0 ? Math.exp(-nodT / 240) * Math.sin(nodT / 1000 * Math.PI * 2 / 0.22) : 0;
    const nodLag = nodT > 45 ? Math.exp(-(nodT - 45) / 240) * Math.sin((nodT - 45) / 1000 * Math.PI * 2 / 0.22) : 0;
    return {
        crouch: sleep * 2.2 * breath + awake * 0.7 * Math.sin(t / 560) + 2.6 * nodLag,
        lean: awake * 0.6 * Math.sin(t / 830 + 1),
        head: sleep * -4 * Math.sin((t - 1240) / 1000 * Math.PI * 2 / 0.62) + awake * 1.2 * Math.sin(t / 470 + 2) + 10 * nod
    };
}
function introPose(t) {
    const l = introLife(t);
    return {
        lean: IT.lean(t) + l.lean, crouch: IT.crouch(t) + l.crouch, kink: IT.kink(t),
        head: IT.head(t) + l.head, lift: IT.lift(t)
    };
}

/* ---------- desenarea unui cadru ---------- */
function introParts(el) {
    const q = s => el.querySelector(s);
    return {
        art: q(".intro-art"), lamp: q(".in-lamp"), head: q(".in-head"), arm: q(".in-arm"), base: q(".in-base"),
        bulb: q(".in-bulb"), light: q(".in-light"), cone: q(".in-cone"), coneM: q(".in-cone-m"), coneO: q(".in-cone-o"), coneOM: q(".in-cone-om"), coneO2: q(".in-cone-o2"), coneOM2: q(".in-cone-om2"), pool: q(".in-pool"),
        beamG: q("#inBeam"), poolG: q("#inPool"), warm: [...el.querySelectorAll(".in-warm")], halo: q(".in-halo"), amb: q(".in-amb"),
        shadow: q(".in-shadow"), lit: q(".in-name-lit"), dim: q(".in-name-dim"), desk: q(".in-desk"), joints: [...el.querySelectorAll(".in-joint")]
    };
}
function introDrawPose(p, pose, drag) {
    const g = introRig(pose.lean, pose.crouch, pose.kink);
    const f = n => n.toFixed(2);
    p.arm.setAttribute("d", `M88 330 L${f(g.P1[0])} ${f(g.P1[1])} L${f(g.P2[0])} ${f(g.P2[1])} L${f(g.P3[0])} ${f(g.P3[1])}`);
    [g.P1, g.P2, g.P3].forEach((P, i) => { const j = p.joints[i]; if (j) { j.setAttribute("cx", f(P[0])); j.setAttribute("cy", f(P[1])); } });
    const dx = g.P3[0] - IR.rest[0], dy = g.P3[1] - IR.rest[1];
    const a = pose.head + g.tilt + drag;
    p.head.style.transform = `translate(${f(dx)}px, ${f(dy)}px) rotate(${f(a)}deg)`;
    if (intro.light && (intro.light.I * (intro.light.fade ?? 1)) > 0.002) introDrawLight(p, introLightGeo(dx, dy + pose.lift, a), intro.light, introLightGeo(dx, dy + pose.lift, a, 2.5), introLightGeo(dx, dy + pose.lift, a, 5));
    else introDrawLight(p, null, null);
    p.lamp.style.transform = `translateY(${f(pose.lift)}px)`;
    return g;
}
function introDrawFrame(p, t) {
    const set = (n, o) => { if (n) n.style.opacity = o.toFixed(3); };
    set(p.desk, IT.desk(t));
    const bi = IT.baseIn(t);
    set(p.base, bi > 0 ? 1 : 0);
    p.base.style.transform = `scale(${(bi * IT.baseSX(t)).toFixed(3)}, ${IT.baseSY(t).toFixed(3)})`;
    const d = IT.draw(t);
    p.arm.style.strokeDashoffset = (100 - 100 * d).toFixed(2);
    // încheieturile apar când linia ajunge la ele, cu un mic „pop”
    p.joints.forEach((j, i) => {
        const tc = i < 2 ? intro.jointAt[i] : 1060;
        const k = t < tc ? 0 : IE.back(Math.min(1, (t - tc) / 260));
        j.style.opacity = t < tc ? "0" : "1";
        j.style.transform = `scale(${Math.max(0, k).toFixed(3)})`;
    });
    set(p.head, IT.headIn(t));
    set(p.dim, IT.dim(t));
}

/* ---------- lumina, ca în realitate ----------
   Becul stă în abajur; lumina iese doar prin gura lui, într-un con cu marginile date de pereții abajurului (se întâlnesc
   într-un vârf virtual, deasupra becului). Razele de margine sunt prelungite până lovesc masa: acolo se face pata de lumină,
   mai strălucitoare în partea mai apropiată de bec. Strălucirea scade cu distanța (aproximativ cu pătratul ei), marginile
   sunt moi (penumbră), literele numelui își aruncă umbra pe masă, în direcția opusă becului, iar camera primește puțină
   lumină difuză. Becul nu sare instant între stins și aprins: filamentul se încălzește și se răcește (o mică întârziere),
   iar culoarea pornește mai portocalie și se albește pe măsură ce se încălzește. */
const IL = { desk: 334, apex: [232, 58], mouthL: [192, 138], mouthR: [272, 138], bulb: [232, 138], name: [452, 300], ref: null };
function introLightGeo(dx, dy, a, spread = 0) {
    const r = a * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
    const W = ([x, y]) => { const X = x - 232, Y = y - 78; return [232 + X * c - Y * sn + dx, 78 + X * sn + Y * c + dy]; };
    // spread: conul de penumbră, cu câteva grade mai larg (razele de margine rotite în afară, în jurul vârfului)
    const turn = ([x, y], deg) => { const k = deg * Math.PI / 180, X = x - IL.apex[0], Y = y - IL.apex[1]; return [IL.apex[0] + X * Math.cos(k) - Y * Math.sin(k), IL.apex[1] + X * Math.sin(k) + Y * Math.cos(k)]; };
    const apex = W(IL.apex), L = W(turn(IL.mouthL, spread)), R = W(turn(IL.mouthR, -spread)), B = W(IL.bulb);
    const ray = E => {
        const vx = E[0] - apex[0], vy = E[1] - apex[1], n = Math.hypot(vx, vy), d = [vx / n, vy / n];
        if (d[1] > 0.03 && E[1] < IL.desk) { const k = (IL.desk - E[1]) / d[1]; return { hit: true, P: [E[0] + d[0] * k, IL.desk], d }; }
        return { hit: false, P: [E[0] + d[0] * 1600, E[1] + d[1] * 1600], d };
    };
    const rl = ray(L), rr = ray(R);
    const pts = [L, rl.P];
    if (rl.hit !== rr.hit) { const far = rl.hit ? rr : rl; pts.push([far.d[0] >= 0 ? 2400 : -1800, IL.desk]); }
    pts.push(rr.P, R);
    const ax = B[0] - apex[0], ay = B[1] - apex[1], an = Math.hypot(ax, ay);
    return { pts, B, rl, rr, dir: [ax / an, ay / an] };
}
const introMix = (h1, h2, k) => {
    const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    const ch = sh => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * k));
    return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};
function introDrawLight(p, g, L, gOuter, gOuter2) {
    const I = L ? L.I * (L.fade ?? 1) : 0, warm = L ? L.warm : 1;
    const f = n => n.toFixed(1);
    const set = (n, o) => { if (n) n.style.opacity = o.toFixed(3); };
    set(p.bulb, I);
    if (I <= 0.002 || !g) { [p.light, p.lit, p.halo, p.amb, p.shadow].forEach(n => set(n, 0)); return; }
    if (!IL.ref) IL.ref = introLightGeo(0, 0, -42.25);
    const dist = (P, Q) => Math.hypot(P[0] - Q[0], P[1] - Q[1]);
    const fall = (d, d0, lo, hi) => introClamp((d0 / Math.max(d, 1)) ** 2, lo, hi); // ~ 1/d², față de lampa în repaus
    const path = G => "M" + G.pts.map(P => `${f(P[0])} ${f(P[1])}`).join(" L") + "Z";
    const d = path(g), dO = path(gOuter || g), dO2 = path(gOuter2 || gOuter || g);
    p.coneO2?.setAttribute("d", dO2); p.coneOM2?.setAttribute("d", dO2);
    p.cone?.setAttribute("d", d); p.coneM?.setAttribute("d", d);
    p.coneO?.setAttribute("d", dO); p.coneOM?.setAttribute("d", dO);
    // conul: luminos lângă bec, tot mai slab cu distanța
    const reach = Math.max(...g.pts.map(P => dist(P, g.B)));
    p.beamG?.setAttribute("cx", f(g.B[0])); p.beamG?.setAttribute("cy", f(g.B[1]));
    p.beamG?.setAttribute("r", f(introClamp(reach, 160, 900)));
    // culoarea: la pornire mai portocalie, apoi caldă-albă
    const col = introMix("#FFB765", "#F7D995", warm);
    p.warm.forEach(n => n.setAttribute("stop-color", col));
    set(p.light, I);
    // pata de pe masă: între cele două raze care o ating, cu centrul fierbinte spre bec
    const hitL = g.rl.hit ? g.rl.P[0] : null, hitR = g.rr.hit ? g.rr.P[0] : null;
    let x1 = hitL ?? (g.rl.d[0] >= 0 ? 2400 : -1800), x2 = hitR ?? (g.rr.d[0] >= 0 ? 2400 : -1800);
    if (x1 > x2) [x1, x2] = [x2, x1];
    x1 = Math.max(x1, 24); x2 = Math.min(x2, 640); // pata rămâne pe masă
    if ((hitL !== null || hitR !== null) && x2 - x1 > 4) {
        const cx = (x1 + x2) / 2, rx = Math.max(8, (x2 - x1) / 2 + 16);
        const near = Math.abs(x1 - g.B[0]) + 0.01 < Math.abs(x2 - g.B[0]) ? 0.28 : 0.72;
        const height = Math.max(4, IL.desk - g.B[1]);
        p.pool?.setAttribute("cx", f(cx)); p.pool?.setAttribute("rx", f(rx));
        p.pool?.setAttribute("ry", f(introClamp(7 + rx * 0.06, 7, 26)));
        p.poolG?.setAttribute("fx", near.toFixed(2));
        set(p.pool, fall(height, IL.desk - IL.ref.B[1], 0.25, 1.6));
    } else set(p.pool, 0);
    // numele: cât de aproape e de bec și dacă e în con (masca o face pe a doua)
    const nameK = fall(dist(g.B, IL.name), dist(IL.ref.B, IL.name), 0.45, 1.3);
    set(p.lit, Math.min(1, I * nameK));
    // umbra literelor: culcată pe masă, dinspre bec spre partea opusă
    if (g.B[1] < IL.desk - 8) {
        const k = introClamp((IL.name[0] - g.B[0]) / (IL.desk - g.B[1]), -3, 3);
        p.shadow?.setAttribute("transform", `matrix(1 0 ${(-k).toFixed(3)} 0.12 ${(IL.desk * k).toFixed(1)} ${(IL.desk * 0.88).toFixed(1)})`);
        set(p.shadow, 0.55 * I * Math.min(1, nameK));
    } else set(p.shadow, 0);
    // strălucirea becului și lumina difuză din cameră
    p.halo?.setAttribute("cx", f(g.B[0] + g.dir[0] * 12)); p.halo?.setAttribute("cy", f(g.B[1] + g.dir[1] * 12));
    set(p.halo, I * (0.7 + 0.3 * warm));
    const poolC = hitL !== null && hitR !== null ? [(hitL + hitR) / 2, IL.desk] : [g.B[0] + g.dir[0] * 180, g.B[1] + g.dir[1] * 180];
    p.amb?.setAttribute("cx", f(poolC[0])); p.amb?.setAttribute("cy", f(poolC[1]));
    set(p.amb, 0.07 * I);
}
/** intensitatea becului: urmează pâlpâirea cu întârzierea filamentului (se aprinde repede, se stinge mai încet) */
function introLightStep(L, t, dt) {
    const target = introFlicker(t, 3520);
    const tau = target > L.I ? 16 : 42;
    L.I += (target - L.I) * (1 - Math.exp(-Math.max(0, dt) / tau));
    if (L.I < 0.001) L.I = 0;
    L.warm = IE.soft(introLin(t, 3740, 4250));
}

/* ---------- inerția capului: un arc mic, împins de accelerația încheieturii ---------- */
function introHeadSpring(state, posAt, t, dtTotal, gain = 1) {
    const h = 6, steps = Math.min(40, Math.max(1, Math.round(dtTotal / 4)));
    const dt = dtTotal / steps;
    for (let i = steps - 1; i >= 0; i--) {
        const ti = t - i * dt;
        const a = posAt(ti - h), b = posAt(ti), c = posAt(ti + h);
        const ax = (a[0] - 2 * b[0] + c[0]) / (h * h) * 1e6;   // px/s²
        const ay = (a[1] - 2 * b[1] + c[1]) / (h * h) * 1e6;
        const s = dt / 1000;
        const acc = -230 * state.th - 10.5 * state.v - gain * 0.0042 * ax * 60 - gain * 0.0016 * ay * 60 * Math.sin(state.dir);
        state.v += acc * s;
        state.th = introClamp(state.th + state.v * s, -11, 11);
    }
}

/* ---------- pornire ---------- */
function introStart() {
    const el = document.getElementById("splash");
    if (!el || !el.classList.contains("intro")) return;
    if (el.classList.contains("is-still") || !Element.prototype.animate || !window.requestAnimationFrame) {
        // fără mișcare: lampa aprinsă, în repaus, cu lumina calculată la fel
        if (el.classList.contains("is-still") && el.querySelector(".in-cone")) introDrawLight(introParts(el), introLightGeo(0, 0, -42.25), { I: 1, warm: 1 }, introLightGeo(0, 0, -42.25, 2.5), introLightGeo(0, 0, -42.25, 5));
        return;
    }
    intro.el = el;
    intro.t0 = performance.now();
    intro.p = introParts(el);
    intro.spring = { th: 0, v: 0, dir: 0 };
    intro.light = { I: 0, warm: 0, fade: 1 };
    document.body.classList.add("intro-on");
    // când ajunge linia la fiecare încheietură
    const L = IR.L1 + IR.L2 + IR.L3, th = [IR.L1 / L, (IR.L1 + IR.L2) / L];
    intro.jointAt = th.map(v => { for (let t = 260; t <= 1060; t += 4) if (IT.draw(t) >= v) return t; return 1060; });
    intro.last = 0;
    el.addEventListener("pointerdown", introSkip, { once: true });
    const tick = now => {
        if (intro.done) return;
        const t = now - intro.t0 + intro.jump;
        if (intro.fly) intro.fly(now);
        else {
            const p = intro.p;
            const pose = introPose(t);
            const posAt = tt => { const q = introPose(tt), g = introRig(q.lean, q.crouch, q.kink); return [g.P3[0], g.P3[1] + q.lift]; };
            if (t > 1040) {
                intro.spring.dir = (pose.head + 90) * Math.PI / 180;
                introHeadSpring(intro.spring, posAt, t, Math.min(50, Math.max(1, t - intro.last)));
            }
            introLightStep(intro.light, t, t - intro.last);
            intro.last = t;
            introDrawFrame(p, t);
            introDrawPose(p, pose, intro.spring.th);
            if (t >= INTRO_FLY_AT) introMaybeFly();
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

/** Aplicația e gata (din hideSplash): lampa poate zbura când ajunge la momentul ei. */
function introReady() {
    intro.ready = true;
    const el = document.getElementById("splash");
    if (!el) return;
    if (!intro.el) { // fără mișcare (sau fără animații): masa luminată, apoi se stinge ușor
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
    if (intro.flying || !intro.el) return;
    intro.skipped = true;
    const t = performance.now() - intro.t0 + intro.jump;
    if (t < INTRO_END) { intro.jump += INTRO_END - t; intro.spring = { th: 0, v: 0, dir: 0 }; intro.last = INTRO_END; }
    intro.light = { I: 1, warm: 1, fade: 1 };
    introDrawFrame(intro.p, INTRO_END);
    introDrawPose(intro.p, introPose(INTRO_END), 0);
    introMaybeFly();
}
function introMaybeFly() {
    if (intro.flying || !intro.ready || !intro.el) return;
    if (!intro.skipped && performance.now() - intro.t0 + intro.jump < INTRO_FLY_AT) return;
    intro.flying = true;
    introFly();
}

/** Lampa se ghemuiește, se uită spre colțul de sus și sare la locul ei din antet; aplicația apare dedesubt. */
function introFly() {
    const el = intro.el, p = intro.p, art = p.art;
    const fast = intro.skipped;
    const pre = fast ? 90 : 230, dur = fast ? 470 : 820;
    const fade = (node, ms, delay = 0) => node && node.animate([{ opacity: getComputedStyle(node).opacity }, { opacity: 0 }], { duration: ms, delay, fill: "both", easing: "ease" });
    [p.dim, p.desk].forEach(n => fade(n, fast ? 170 : 280));
    const target = [...document.querySelectorAll(".lamp-btn .lamp-logo")].find(n => n.getBoundingClientRect().width > 0);
    const finish = () => {
        if (intro.done) return;
        intro.done = true;
        document.body.classList.remove("intro-on");
        // lampa din antet „aterizează”: se turtește și revine
        target?.animate([{ transform: "scale(1.14, .86)" }, { transform: "scale(.95, 1.06)", offset: .45 }, { transform: "scale(1.02, .98)", offset: .75 }, { transform: "none" }],
            { duration: 420, easing: "cubic-bezier(.2, .7, .3, 1)" });
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "both" }).finished.then(() => el.remove(), () => el.remove());
    };
    if (!target || !art) {
        intro.done = true;
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "both" }).finished.then(() => { el.remove(); document.body.classList.remove("intro-on"); });
        return;
    }
    // unde trebuie să ajungă: lampa în poziția de logo (în repaus), suprapusă peste lampa din antet
    const t = performance.now() - intro.t0 + intro.jump;
    const now = introPose(t);
    introDrawPose(p, { lean: 0, crouch: 0, kink: 0, head: -12, lift: 0 }, 0);
    const union = nodes => nodes.map(n => n.getBoundingClientRect()).filter(r => r.width || r.height).reduce((a, r) => ({
        left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom)
    }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    const src = union([p.arm, p.base]);
    const dst = union([target.querySelector(".ll-arm"), target.querySelector("rect.ll-arm-fill")]);
    const a = art.getBoundingClientRect();
    const s = (dst.right - dst.left) / (src.right - src.left);
    const tx = dst.left - a.left - (src.left - a.left) * s;
    const ty = dst.top - a.top - (src.top - a.top) * s;
    introDrawPose(p, now, intro.spring.th);
    art.style.transformOrigin = "0 0";

    const T = introTrack, E = IE, end = pre + dur;
    const k = {
        crouch: T([[0, now.crouch], [pre, 13, E.io], [pre + dur * 0.22, -13, E.out], [pre + dur * 0.75, -3, E.soft], [end, 0, E.io]]),
        lean: T([[0, now.lean], [pre, -5, E.io], [pre + dur * 0.3, -11, E.out], [pre + dur * 0.7, 3, E.soft], [end, 0, E.io]]),
        kink: T([[0, now.kink], [pre, 2, E.io], [pre + dur * 0.25, -6, E.out], [end, 0, E.io]]),
        lift: T([[0, now.lift], [pre, 0, E.io]]),
        head: T([[0, now.head], [pre * 0.6, now.head + 8, E.io], [pre + dur * 0.3, -196, E.out], [pre + dur * 0.6, -166, E.soft], [end, -12, E.io]]),
        move: T([[pre, 0], [end, 1, introBezier(0.5, 0.05, 0.22, 1)]]),
        grow: T([[pre, 0], [end, 1, introBezier(0.3, 0, 0.35, 1)]])
    };
    // drumul: un arc (curbă Bézier), nu o linie dreaptă
    const C = [tx * 0.28, Math.min(0, ty) * 0.55 - 120];
    const at = m => [2 * (1 - m) * m * C[0] + m * m * tx, 2 * (1 - m) * m * C[1] + m * m * ty];
    el.animate([{ backgroundColor: "rgba(11, 18, 38, 1)" }, { backgroundColor: "rgba(11, 18, 38, 0)" }],
        { duration: dur * 0.6, delay: pre + dur * 0.4, fill: "both", easing: "ease" });
    const t0 = performance.now();
    let last = 0;
    const spring = intro.spring;
    intro.fly = nowMs => {
        const ft = Math.min(end, nowMs - t0);
        const m = k.move(ft), sc = 1 + (s - 1) * k.grow(ft), pos = at(m);
        const pose = { lean: k.lean(ft), crouch: k.crouch(ft), kink: k.kink(ft), head: k.head(ft), lift: k.lift(ft) };
        const posAt = tt => {
            const mm = k.move(tt), ss = 1 + (s - 1) * k.grow(tt), pp = at(mm);
            const g = introRig(k.lean(tt), k.crouch(tt), k.kink(tt));
            return [(pp[0] + g.P3[0] * ss) / Math.max(ss, 0.2), (pp[1] + (g.P3[1] + k.lift(tt)) * ss) / Math.max(ss, 0.2)];
        };
        // becul se stinge cât se întoarce capul (cu răcirea filamentului)
        intro.light.fade = 1 - IE.soft(introLin(ft, 0, fast ? 120 : 180));
        const calm = 1 - introLin(ft, end - dur * 0.35, end); // inerția se stinge înainte de aterizare
        spring.dir = (pose.head + 90) * Math.PI / 180;
        introHeadSpring(spring, posAt, ft, Math.min(50, Math.max(1, ft - last)), 0.5 * calm);
        spring.th *= 0.5 + 0.5 * calm;
        last = ft;
        art.style.transform = `translate(${pos[0].toFixed(2)}px, ${pos[1].toFixed(2)}px) scale(${sc.toFixed(4)})`;
        if (ft >= end) {
            intro.light.fade = 0;
            introDrawPose(p, { lean: 0, crouch: 0, kink: 0, head: -12, lift: 0 }, 0);
            art.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
            intro.fly = () => {};
            finish();
            return;
        }
        introDrawPose(p, pose, spring.th);
    };
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", introStart, { once: true });
else introStart();
