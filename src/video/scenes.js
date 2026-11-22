'use strict';
/* 1920x1080 scene renderer. Colour code: orange = built from primes, blue = built from zeros, green = the smooth law. */
const W = 1920, H = 1080, cv = document.getElementById('c'), g = cv.getContext('2d');
const C = { bg: '#0d1116', surface: '#161c24', ink: '#e9edf2', ink2: '#b4bdc9', muted: '#7f8a97', rule: '#2c3540', grid: '#1e262f', prime: '#ee6c35', zero: '#4a93ee', law: '#22b07c', whatif: '#9a8ff0', good: '#2fbf5b' };
const UI = (px, w = 500) => `${w} ${px}px Inter, sans-serif`;
const DISP = (px, it = false, w = 500) => `${it ? 'italic ' : ''}${w} ${px}px "Bodoni Moda", serif`;
const MATH = (px, it = true) => `${it ? 'italic ' : ''}400 ${px}px "STIXL","STIXG",Inter,serif`;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const prog = (t, t0, d) => clamp((t - t0) / d);
const fade = (t, t0, d = 0.5) => ease(prog(t, t0, d));
const fmt = n => Math.round(n).toLocaleString('en-US');
const lab = v => { const a = Math.abs(v); return a >= 1e6 ? (v / 1e6) + 'M' : a >= 1e4 ? (v / 1e3) + 'K' : fmt(v); };
function nice(a, b, n) { const s0 = (b - a) / n, mag = Math.pow(10, Math.floor(Math.log10(s0))), r = s0 / mag, st = (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * mag, out = []; for (let v = Math.ceil(a / st - 1e-9) * st; v <= b + st * 1e-6; v += st) out.push(+v.toFixed(10)); return out; }
const tk = (arr, f) => arr.map(v => ({ v, l: (f || lab)(v) }));
const minus = v => String(v).replace('-', '−');

function text(s, x, y, font, color, align = 'left', alpha = 1, base = 'alphabetic', ls = 0) {
  if (alpha <= 0.003) return; g.save(); g.globalAlpha *= alpha; g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = base; g.letterSpacing = ls + 'px'; g.fillText(s, x, y); g.restore();
}
/* inline rich text: tokens [str, flags]; flags: i italic math, u superscript, d subscript, o orange, b blue, g green, m muted, v violet, s sans */
function rich(tokens, x, y, px, align = 'left', alpha = 1) {
  if (alpha <= 0.003) return 0; g.save(); g.globalAlpha *= alpha; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const fontOf = f => { const small = /[ud]/.test(f), p = small ? px * 0.62 : px; return /s/.test(f) ? UI(p, 500) : MATH(p, /i/.test(f)); };
  let w = 0; const ws = tokens.map(([s, f = '']) => { g.font = fontOf(f); const m = g.measureText(s).width; w += m; return m; });
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  tokens.forEach(([s, f = ''], i) => { g.font = fontOf(f); g.fillStyle = /o/.test(f) ? C.prime : /b/.test(f) ? C.zero : /g/.test(f) ? C.law : /v/.test(f) ? C.whatif : /m/.test(f) ? C.muted : C.ink; g.fillText(s, cx, y + (/u/.test(f) ? -px * 0.36 : /d/.test(f) ? px * 0.16 : 0)); cx += ws[i]; });
  g.restore(); return w;
}
function rrect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
function stroke(color, w, dash) { g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash || []); g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); g.setLineDash([]); }
function dot(x, y, r, color, ring = 4) { g.beginPath(); g.arc(x, y, r + ring, 0, 7); g.fillStyle = C.bg; g.fill(); g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = color; g.fill(); }
function key(x, y, color, labelText, alpha = 1, box = false) { if (alpha <= 0.003) return; g.save(); g.globalAlpha *= alpha; if (box) { g.fillStyle = color; rrect(x, y - 9, 30, 18, 4); g.fill(); } else { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 44, y); stroke(color, 5); } g.restore(); text(labelText, x + 60, y, UI(30, 500), C.ink2, 'left', alpha, 'middle'); }
function chart(o) {
  const fx = o.xlog ? Math.log : (v => v), a = fx(o.x0), b = fx(o.x1);
  const X = v => o.x + (fx(v) - a) / (b - a) * o.w, Y = v => o.y + (1 - (v - o.y0) / (o.y1 - o.y0)) * o.h;
  g.save(); g.globalAlpha *= (o.alpha ?? 1); g.font = UI(24, 500);
  (o.yt || []).forEach(t => { const y = Math.round(Y(t.v)); if (y < o.y - 2 || y > o.y + o.h + 2) return; g.strokeStyle = C.grid; g.lineWidth = 2; g.beginPath(); g.moveTo(o.x, y); g.lineTo(o.x + o.w, y); g.stroke(); g.fillStyle = C.muted; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(t.l, o.x - 16, y); });
  (o.xt || []).forEach(t => { const x = Math.round(X(t.v)); if (x < o.x - 2 || x > o.x + o.w + 2) return; g.strokeStyle = C.rule; g.lineWidth = 2; g.beginPath(); g.moveTo(x, o.y + o.h); g.lineTo(x, o.y + o.h + 10); g.stroke(); g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(t.l, x, o.y + o.h + 18); });
  g.strokeStyle = C.rule; g.lineWidth = 2; g.beginPath(); g.moveTo(o.x, o.y + o.h); g.lineTo(o.x + o.w, o.y + o.h); g.stroke();
  g.restore(); return { X, Y };
}
const clipTo = o => { g.save(); g.beginPath(); g.rect(o.x, o.y - 6, o.w, o.h + 8); g.clip(); };

/* ---------- formulas: a small TeX subset laid out on the canvas ----------
   Letters are italic, digits upright. Supported: ^ _ scripts, \frac{}{}, \sqrt{}, \sum \prod \int with limits,
   Greek letters by name, function names (\ln \cos \sin \Li \Re), \text{..} for sans words, \big( \big),
   spaces \, \; \quad, and colour groups \o{..} orange, \b{..} blue, \g{..} green, \v{..} violet, \m{..} muted, \w{..} ink. */
const TEX = (() => {
  const GREEK = { zeta: 'ζ', pi: 'π', sigma: 'σ', theta: 'θ', rho: 'ρ', beta: 'β', gamma: 'γ', psi: 'ψ', alpha: 'α' };
  const REL = { '=': '=', approx: '≈', le: '≤', lt: '<', gt: '>', to: '→', implies: '⟹' }, BIN = { '+': '+', '-': '−', cdot: '·', times: '×' };
  const FN = { ln: 'ln', cos: 'cos', sin: 'sin', Li: 'Li', Re: 'Re' }, COL = { o: 'prime', b: 'zero', g: 'law', v: 'whatif', m: 'muted', w: 'ink' };
  const SPACE = { ',': 0.17, ';': 0.28, quad: 1 }, MISC = { infty: '∞', cdots: '⋯', half: '½' };
  const up = p => `400 ${p}px "STIXL","STIXG","STIXM",Inter,serif`, it = p => `italic 400 ${p}px "STIXL","STIXG","STIXM",Inter,serif`, sym = p => `400 ${p}px "STIXM","STIXL",Inter,serif`;
  const cache = new Map();
  function glyph(s, font, p, c, kind = 'ord') { g.font = font; const w = g.measureText(s).width; return { w, a: p * 0.7, d: p * 0.22, kind, draw(x, y) { g.font = font; g.fillStyle = c; g.fillText(s, x, y); } }; }
  const space = w => ({ w, a: 0, d: 0, kind: 'sp', draw() { } });
  function hbox(list, p, lvl) {
    const out = [];
    list.forEach((b, k) => {
      if (b.kind !== 'bin' && b.kind !== 'rel') { out.push(b); return; }
      let prev = list[k - 1]; if (prev && prev.kind === 'sp') prev = list[k - 2];
      const binary = b.kind === 'rel' || (prev && (prev.kind === 'ord' || prev.kind === 'close')), sp = lvl || !binary ? 0 : (b.kind === 'rel' ? 0.3 : 0.23) * p;
      out.push(space(sp), b, space(sp));
    });
    return { w: out.reduce((s, b) => s + b.w, 0), a: Math.max(0, ...out.map(b => b.a)), d: Math.max(0, ...out.map(b => b.d)), kind: 'ord', draw(x, y) { for (const b of out) { b.draw(x, y); x += b.w; } } };
  }
  function build(src, px) {
    let i = 0;
    const skip = () => { while (src[i] === ' ') i++; };
    const arg = (p, lvl, c) => { skip(); if (src[i] === '{') { i++; const b = group(p, lvl, c); i++; return b; } return hbox([atom(p, lvl, c)], p, lvl); };
    function group(p, lvl, c) { const list = []; for (;;) { skip(); if (i >= src.length || src[i] === '}') break; list.push(scripts(atom(p, lvl, c), p, lvl, c)); } return hbox(list, p, lvl); }
    function scripts(b, p, lvl, c) {
      let sup = null, sub = null; const q = p * (lvl ? 0.8 : 0.64);
      for (;;) { skip(); if (src[i] === '^') { i++; sup = arg(q, lvl + 1, c); } else if (src[i] === '_') { i++; sub = arg(q, lvl + 1, c); } else break; }
      if (!sup && !sub) return b;
      if (b.limits) { // limits above and below a big operator
        const w = Math.max(b.w, sup ? sup.w : 0, sub ? sub.w : 0), gap = p * 0.1;
        return { w, a: b.a + (sup ? gap + sup.a + sup.d : 0), d: b.d + (sub ? gap + sub.a + sub.d : 0), kind: 'ord', draw(x, y) { b.draw(x + (w - b.w) / 2, y); if (sup) sup.draw(x + (w - sup.w) / 2, y - b.a - gap - sup.d); if (sub) sub.draw(x + (w - sub.w) / 2, y + b.d + gap + sub.a); } };
      }
      const big = b.kind === 'big', rise = big ? b.a - q * 0.45 : Math.max(p * 0.36, b.a - q * 0.5), drop = big ? b.d - q * 0.1 : p * 0.17 + Math.max(0, b.d - p * 0.22), sw = Math.max(sup ? sup.w : 0, sub ? sub.w : 0), pad = p * 0.04;
      return { w: b.w + pad + sw, a: Math.max(b.a, sup ? rise + sup.a : 0), d: Math.max(b.d, sub ? drop + sub.d : 0), kind: 'ord', draw(x, y) { b.draw(x, y); if (sup) sup.draw(x + b.w + pad, y - rise); if (sub) sub.draw(x + b.w + pad - (big ? p * 0.22 : 0), y + drop); } };
    }
    function atom(p, lvl, c) {
      const ch = src[i++];
      if (ch === '{') { const b = group(p, lvl, c); i++; return b; }
      if (ch !== '\\') {
        if (/[a-zA-Z]/.test(ch)) return glyph(ch, it(p), p, c);
        if (ch in REL) return glyph(REL[ch], up(p), p, c, 'rel');
        if (ch in BIN) return glyph(BIN[ch], up(p), p, c, 'bin');
        return glyph(ch, up(p), p, c, ch === '(' ? 'open' : ch === ')' ? 'close' : 'ord');
      }
      let name = src[i++]; if (/[a-zA-Z]/.test(name)) while (/[a-zA-Z]/.test(src[i] || '')) name += src[i++];
      if (name in GREEK) return glyph(GREEK[name], it(p), p, c);
      if (name in MISC) return glyph(MISC[name], sym(p), p, c);
      if (name in REL) return glyph(REL[name], sym(p), p, c, 'rel');
      if (name in BIN) return glyph(BIN[name], up(p), p, c, 'bin');
      if (name in FN) { skip(); const tight = src[i] === '(' || src[i] === '^' || src[i] === '_'; return hbox([glyph(FN[name], up(p), p, c), space(tight ? 0 : p * 0.14)], p, 1); }
      if (name in COL) return arg(p, lvl, C[COL[name]]);
      if (name in SPACE) return space(SPACE[name] * p);
      if (name === 'text') { skip(); i++; let s = ''; while (src[i] !== '}') s += src[i++]; i++; return glyph(s, UI(p * 0.62, 500), p, c === C.ink ? C.ink2 : c); }
      if (name === 'big') { const s = src[i++], P = p * 1.9; g.font = sym(P); const m = g.measureText(s), h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, off = p * 0.27 + h / 2 - m.actualBoundingBoxAscent; return { w: m.width, a: h / 2 + p * 0.27, d: h / 2 - p * 0.27, kind: s === '(' ? 'open' : 'close', draw(x, y) { g.font = sym(P); g.fillStyle = c; g.fillText(s, x, y - off); } }; }
      if (name === 'frac') {
        const q = lvl ? p : p * 0.9, n = arg(q, lvl, c), d = arg(q, lvl, c), w = Math.max(n.w, d.w) + p * 0.24, ax = p * 0.27, gap = p * 0.13, th = Math.max(2, p * 0.045);
        return { w: w + p * 0.12, a: ax + gap + n.d + n.a, d: gap + d.a + d.d - ax, kind: 'ord', draw(x, y) { x += p * 0.06; n.draw(x + (w - n.w) / 2, y - ax - gap - n.d); d.draw(x + (w - d.w) / 2, y - ax + gap + d.a * 0.96); g.fillStyle = c; g.fillRect(x, y - ax - th / 2, w, th); } };
      }
      if (name === 'sqrt') {
        const b = arg(p, lvl, c), top = b.a + p * 0.1, th = Math.max(2, p * 0.05), r = p * 0.52;
        return { w: r + b.w + p * 0.08, a: top + th, d: b.d, kind: 'ord', draw(x, y) { b.draw(x + r, y); g.beginPath(); g.moveTo(x + p * 0.04, y - p * 0.3); g.lineTo(x + p * 0.14, y - p * 0.36); g.lineTo(x + p * 0.3, y + p * 0.12); g.lineTo(x + r - p * 0.04, y - top); g.lineTo(x + r + b.w + p * 0.06, y - top); g.strokeStyle = c; g.lineWidth = th; g.lineJoin = 'miter'; g.lineCap = 'butt'; g.setLineDash([]); g.stroke(); } };
      }
      if (name === 'sum' || name === 'prod' || name === 'int') {
        const s = { sum: '∑', prod: '∏', int: '∫' }[name], P = p * (name === 'int' ? 1.75 : 1.5); g.font = sym(P); const m = g.measureText(s), h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, ax = p * 0.27, off = ax + h / 2 - m.actualBoundingBoxAscent;
        return { w: m.width + p * 0.1, a: h / 2 + ax, d: h / 2 - ax, kind: 'big', limits: name !== 'int' && !lvl, draw(x, y) { g.font = sym(P); g.fillStyle = c; g.fillText(s, x + p * 0.05, y - off); } };
      }
      throw new Error('formula: unknown command \\' + name);
    }
    return group(px, 0, C.ink);
  }
  return (src, px) => { const k = px + '|' + src; let b = cache.get(k); if (!b) { g.save(); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '0px'; b = build(src, px); g.restore(); cache.set(k, b); } return b; };
})();
/* draw a formula with its baseline at y; returns the box (w, a, d) so callers can place things around it */
function fx(src, x, y, px, align = 'left', alpha = 1) {
  const b = TEX(src, px); if (alpha <= 0.003) return b;
  g.save(); g.globalAlpha *= alpha; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '0px';
  b.draw(align === 'center' ? x - b.w / 2 : align === 'right' ? x - b.w : x, y); g.restore(); return b;
}

/* ---------- data ---------- */
const T = RH.tables(1e6);
const DT = 0.02, NP = 3001;
const ZP = (() => { const re = new Float32Array(NP), im = new Float32Array(NP), o = [0, 0]; for (let i = 0; i < NP; i++) { RH.zeta(0.5, i * DT, o); re[i] = o[0]; im[i] = o[1]; } return { re, im }; })();
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const WN = 1460, WALKS = [];
for (const seed of [5, 12, 23, 31, 47]) { const r = mulberry32(seed), pts = new Float32Array(WN + 1), per = Math.round(1e6 / WN); let s = 0; for (let i = 0; i < WN; i++) { for (let j = 0; j < per; j++) s += r() < 0.5 ? -1 : 1; pts[i + 1] = s; } WALKS.push(pts); }
const PERR = (() => { const lo = new Float32Array(WN), hi = new Float32Array(WN); for (let c = 0; c < WN; c++) { const a = Math.max(2, Math.floor(c / WN * 1e6)), b = Math.floor((c + 1) / WN * 1e6); let mn = 1e9, mx = -1e9; for (let n = a; n < b; n++) { const h = T.psi[n] - n; if (h > mx) mx = h; if (h - 1 < mn) mn = h - 1; } lo[c] = mn; hi[c] = mx; } return { lo, hi }; })();
const NB = 1060, LA = Math.log(100), LB = Math.log(1e6);
const NERR = (() => { const lo = new Float32Array(NB), hi = new Float32Array(NB); let n = 100; for (let c = 0; c < NB; c++) { const end = c === NB - 1 ? 1e6 : Math.exp(LA + (c + 1) / NB * (LB - LA)); let mn = 9, mx = -9; do { const r = Math.sqrt(n), h = (T.psi[n] - n) / r, l = (T.psi[n] - n - 1) / r; if (h > mx) mx = h; if (l < mn) mn = l; n++; } while (n < end); lo[c] = mn; hi[c] = mx; } return { lo, hi }; })();
const wave = (gm, u, r) => 2 * r * (0.5 * Math.cos(gm * u) + gm * Math.sin(gm * u)) / (0.25 + gm * gm);
function psiApprox(x, k) { const u = Math.log(x), r = Math.sqrt(x); let s = x - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x)); for (let j = 0; j < k; j++) s -= wave(ZEROS[j], u, r); return s; }
const Li = x => x <= 2 ? 0 : RH.li(x) - RH.LI2;
const T5 = x => 16 * x ** 5 - 20 * x ** 3 + 5 * x, ROOTS = [9, 7, 5, 3, 1].map(k => Math.cos(k * Math.PI / 10));

/* zeta trace into a rectangle */
function trace(R, i1, o = {}) {
  const iEnd = o.iMax || NP - 1; let x0 = -1.55, x1 = 0.4, y0 = -0.4, y1 = 0.4;
  for (let i = 0; i <= iEnd; i++) { const a = ZP.re[i], b = ZP.im[i]; if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; }
  const pad = 0.25; x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
  const s = Math.min(R.w / (x1 - x0), R.h / (y1 - y0)), ox = R.x + (R.w - s * (x1 - x0)) / 2, oy = R.y + (R.h - s * (y1 - y0)) / 2;
  const X = v => ox + (v - x0) * s, Y = v => oy + (y1 - v) * s;
  g.strokeStyle = C.rule; g.lineWidth = 2; g.beginPath(); g.moveTo(R.x, Y(0)); g.lineTo(R.x + R.w, Y(0)); g.moveTo(X(0), R.y); g.lineTo(X(0), R.y + R.h); g.stroke();
  const seg = (a, b, alpha, w) => { if (b <= a) return; g.save(); g.globalAlpha *= alpha; g.beginPath(); for (let i = a; i <= b; i++) { const x = X(ZP.re[i]), y = Y(ZP.im[i]); i === a ? g.moveTo(x, y) : g.lineTo(x, y); } stroke(C.zero, w); g.restore(); };
  const tail = Math.max(0, i1 - Math.round((o.tail || 4) / DT));
  if (o.ghost) seg(0, iEnd, 0.3, 3); else seg(0, tail, 0.5, 3.5);
  seg(tail, i1, 1, 5.5);
  return { X, Y, s };
}

/* ---------- scenes ---------- */
const S = {};

S.hook = (t, sc) => {
  const s = sc.sents, a0 = fade(t, 0.1, 0.8);
  text('A VISUAL INTRODUCTION', 122, 118, UI(24, 600), C.muted, 'left', a0, 'alphabetic', 4);
  text('The Riemann Hypothesis', 116, 212, DISP(98), C.ink, 'left', a0);
  const cols = 12, gx = 180, gy = 290, cw = 130, chh = 92, dim = 1 - 0.78 * fade(t, s[2].t0 + 0.2, 1.2);
  const ex = [[60, [2, 2, 3, 5]], [42, [2, 3, 7]], [35, [5, 7]]], d1 = (s[2].t0 - s[1].t0) / 3;
  let exK = -1, exA = 0; ex.forEach((e, k) => { const ta = s[1].t0 + k * d1, a = Math.min(fade(t, ta, 0.3), 1 - fade(t, ta + d1 - 0.3, 0.3)); if (a > 0) { exK = k; exA = a; } });
  for (let n = 1; n <= 60; n++) {
    const c = (n - 1) % cols, r = Math.floor((n - 1) / cols), x = gx + c * cw + cw / 2, y = gy + r * chh + chh / 2;
    const ap = fade(t, 0.25 + n * 0.012, 0.4), isP = n > 1 && !T.comp[n], hp = isP ? easeOut(prog(t, s[0].t0 + 0.3 + (n / 60) * 1.9, 0.4)) : 0;
    if (isP && hp > 0) { g.save(); g.globalAlpha = hp; rrect(x - 50, y - 36, 100, 72, 12); g.fillStyle = 'rgba(238,108,53,0.16)'; g.fill(); stroke(C.prime, 2.5); g.restore(); }
    if (exK >= 0 && ex[exK][0] === n) { g.save(); g.globalAlpha = exA; rrect(x - 52, y - 38, 104, 76, 12); stroke(C.ink, 3); g.restore(); }
    const hl = exK >= 0 && ex[exK][0] === n ? exA : 0;
    text(String(n), x, y + 2, UI(44, isP ? 600 : 500), isP && hp > 0.5 ? C.prime : C.ink2, 'center', ap * (isP ? 1 : Math.max(dim * 0.8, hl)), 'middle');
  }
  if (exK >= 0) { const [n, f] = ex[exK], tok = [[String(n), 's'], ['  =  ', 's']]; f.forEach((p, i) => { if (i) tok.push(['  ×  ', 'sm']); tok.push([String(p), 'so']); }); rich(tok, W / 2, 842, 62, 'center', exA); }
};

S.stairs = (t, sc) => {
  const s = sc.sents, R = { x: 240, y: 170, w: 1470, h: 630 };
  const z1 = ease(prog(t, s[2].t0 + 0.1, 3.6)), z2 = ease(prog(t, s[3].t0 + 1.7, 2.4));
  let L = Math.log(100) + (Math.log(1e6) - Math.log(100)) * z1; L = L + (Math.log(240) - L) * z2; const N = Math.exp(L);
  const ymax = Math.max(Li(N), T.pi[Math.floor(N)]) * 1.14, ch = chart({ ...R, x0: 0, x1: N, y0: 0, y1: ymax, xt: tk(nice(0, N, 5)), yt: tk(nice(0, ymax, 4)) });
  const rv = z1 > 0 ? 1 : ease(prog(t, s[0].t0 + 0.1, s[1].t1 - s[0].t0 - 0.3)), xr = N * rv, aLi = fade(t, s[2].t0 + 0.9, 0.9);
  clipTo(R);
  if (z2 > 0.02) { g.save(); g.globalAlpha = 0.42 * z2; g.beginPath(); g.moveTo(ch.X(2), ch.Y(0)); for (let n = 2; n <= N; n++) { g.lineTo(ch.X(n), ch.Y(T.pi[n - 1])); g.lineTo(ch.X(n), ch.Y(T.pi[n])); } g.lineTo(ch.X(N), ch.Y(T.pi[Math.floor(N)])); for (let i = 120; i >= 0; i--) { const x = 2 + (N - 2) * i / 120; g.lineTo(ch.X(x), ch.Y(Li(x))); } g.closePath(); g.fillStyle = C.whatif; g.fill(); g.restore(); }
  g.beginPath();
  if (N <= 4000) { g.moveTo(ch.X(0), ch.Y(0)); const M = Math.floor(Math.min(xr, N)); for (let n = 2; n <= M; n++) if (T.pi[n] !== T.pi[n - 1]) { g.lineTo(ch.X(n), ch.Y(T.pi[n - 1])); g.lineTo(ch.X(n), ch.Y(T.pi[n])); } g.lineTo(ch.X(Math.min(xr, N)), ch.Y(T.pi[M])); }
  else for (let p = 0; p <= R.w; p += 2) { const x = Math.min(N, N * p / R.w), y = ch.Y(T.pi[Math.floor(x)]); p ? g.lineTo(R.x + p, y) : g.moveTo(R.x + p, y); }
  stroke(C.prime, 6);
  if (aLi > 0) { g.save(); g.globalAlpha = aLi; g.beginPath(); for (let i = 0; i <= 200; i++) { const x = 2 + (N - 2) * i / 200; i ? g.lineTo(ch.X(x), ch.Y(Li(x))) : g.moveTo(ch.X(x), ch.Y(Li(x))); } stroke(C.law, 3); g.restore(); }
  g.restore();
  if (z1 === 0 && rv > 0.02) { const M = Math.round(xr); dot(ch.X(xr), ch.Y(T.pi[M]), 9, C.prime); text(T.pi[M] + (T.pi[M] === 1 ? ' prime' : ' primes') + ' up to ' + Math.max(2, M), ch.X(xr) - 24, ch.Y(T.pi[M]) - 30, UI(30, 600), C.ink, 'right', fade(t, s[0].t0 + 0.5, 0.4)); }
  key(R.x + 40, R.y + 36, C.prime, sc.formulas ? 'π(x), the number of primes up to x' : 'number of primes up to x', fade(t, s[0].t0, 0.5));
  key(R.x + 40, R.y + 88, C.law, sc.formulas ? 'Li(x), Gauss’s smooth curve' : 'Gauss’s smooth curve', aLi);
  if (sc.formulas) fx('\\o{\\pi(x)}\\;\\approx\\;\\g{\\Li(x)}\\;=\\;\\g{\\int_2^x\\frac{dt}{\\ln t}}', R.x + R.w - 40, R.y + R.h - 92, 58, 'right', aLi);
  key(R.x + 40, R.y + 140, C.whatif, 'the gap between them', z2, true);
  text('x', R.x + R.w + 34, R.y + R.h + 6, MATH(34), C.muted, 'center', 1, 'middle');
};

S.coins = (t, sc) => {
  const s = sc.sents, R = { x: 250, y: 170, w: WN, h: 630 }, sw = fade(t, s[3].t0 - 0.2, 0.9);
  const ch = chart({ ...R, x0: 0, x1: 1e6, y0: -2400, y1: 2400, xt: tk([0, 250000, 500000, 750000, 1e6], v => v ? (v / 1e6 === 1 ? '1,000,000' : fmt(v)) : '0'), yt: tk([-2000, -1000, 0, 1000, 2000], v => minus(fmt(v))) });
  const rv = prog(t, s[0].t0 + 0.2, s[1].t1 - 1.2 - s[0].t0), nShow = Math.round(ease(rv) * WN), aE = fade(t, s[1].t0 + 1.4, 0.9);
  clipTo(R);
  WALKS.forEach((w, k) => { g.save(); g.globalAlpha = (k === 0 ? 0.95 : 0.5) * (1 - 0.8 * sw); g.beginPath(); for (let i = 0; i <= nShow; i++) { const x = R.x + i, y = ch.Y(w[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); } stroke(k === 0 ? C.ink : C.ink2, k === 0 ? 3 : 2.2); g.restore(); });
  if (aE > 0) { g.save(); g.globalAlpha = aE; [1, -1].forEach(sg => { g.beginPath(); for (let i = 0; i <= 300; i++) { const n = 1e6 * i / 300, x = ch.X(n), y = ch.Y(sg * Math.sqrt(n)); i ? g.lineTo(x, y) : g.moveTo(x, y); } stroke(C.law, 5); }); g.restore(); }
  if (sw > 0) { const cols = Math.round(ease(prog(t, s[3].t0 + 0.2, 2.6)) * WN); g.save(); g.globalAlpha = sw; g.fillStyle = C.prime; for (let c = 0; c < cols; c++) { const y1 = ch.Y(PERR.hi[c]), y2 = ch.Y(PERR.lo[c]); g.fillRect(R.x + c, y1 - 1.5, 1.6, Math.max(3.5, y2 - y1 + 3)); } g.restore(); }
  g.restore();
  text('+ √n', ch.X(1e6) - 22, ch.Y(1000) - 40, UI(34, 600), C.law, 'right', aE * (1 - sw)); text('− √n', ch.X(1e6) - 22, ch.Y(-1000) + 62, UI(34, 600), C.law, 'right', aE * (1 - sw));
  text('+ √x', ch.X(1e6) - 22, ch.Y(1000) - 40, UI(34, 600), C.law, 'right', sw); text('− √x', ch.X(1e6) - 22, ch.Y(-1000) + 62, UI(34, 600), C.law, 'right', sw);
  key(R.x + 40, R.y + 36, C.ink2, 'heads minus tails, five runs of a million flips', fade(t, s[0].t0, 0.5) * (1 - 0.55 * sw));
  key(R.x + 40, R.y + 88, C.prime, 'the primes: actual count minus the smooth prediction', sw, true);
  text('number of coin flips', R.x + R.w / 2, R.y + R.h + 78, UI(26, 500), C.muted, 'center', 1 - sw); text('x', R.x + R.w / 2, R.y + R.h + 80, MATH(34), C.muted, 'center', sw);
  if (sc.formulas) { const aQ = fade(t, s[4].t0 - 0.3, 0.7); text('THE RIEMANN HYPOTHESIS, AS A FORMULA', R.x + 44, R.y + R.h - 138, UI(22, 600), C.muted, 'left', aQ, 'alphabetic', 3); fx('\\o{\\pi(x)}\\;=\\;\\g{\\Li(x)}+O(\\sqrt{x}\\,\\ln x)', R.x + 40, R.y + R.h - 58, 58, 'left', aQ); }
};

S.zeta = (t, sc) => {
  const s = sc.sents, aF = fade(t, s[0].t0 + 0.2, 0.8), aP = fade(t, s[1].t0 + 0.4, 0.9), up = ease(prog(t, s[1].t0 + 0.2, 1.0));
  const fy = 470 - 310 * up, fpx = 92 - 26 * up;
  text('1859', W / 2, 300, DISP(120, true, 400), C.muted, 'center', aF * (1 - up));
  rich([['ζ', 'ib'], ['(', ''], ['s', 'i'], [')  =  1  +  ', ''], ['1', ''], ['/', 'm'], ['2', ''], ['s', 'iu'], ['  +  ', ''], ['1', ''], ['/', 'm'], ['3', ''], ['s', 'iu'], ['  +  ', ''], ['1', ''], ['/', 'm'], ['4', ''], ['s', 'iu'], ['  +  ⋯', '']], W / 2, fy, fpx, 'center', aF);
  if (aP <= 0) return; g.save(); g.globalAlpha = aP;
  const tt = 44 * prog(t, s[2].t0, sc.dur - 1.0 - s[2].t0), i1 = Math.round(tt / DT);
  // left: the input plane
  const A = { x: 190, y: 250, w: 400, h: 590 }, SX = v => A.x + (v + 0.5) / 2 * A.w, SY = v => A.y + A.h - v / 46 * A.h;
  g.fillStyle = C.surface; g.fillRect(SX(0), A.y, SX(1) - SX(0), A.h);
  g.strokeStyle = C.rule; g.lineWidth = 2; g.beginPath(); g.moveTo(A.x, A.y + A.h); g.lineTo(A.x + A.w, A.y + A.h); g.stroke();
  g.beginPath(); g.moveTo(SX(0.5), A.y); g.lineTo(SX(0.5), A.y + A.h); stroke(C.zero, 4);
  [[0, '0'], [0.5, '½'], [1, '1']].forEach(([v, l]) => text(l, SX(v), A.y + A.h + 40, UI(26, 500), C.muted, 'center'));
  [10, 20, 30, 40].forEach(v => { text(String(v), A.x - 14, SY(v), UI(24, 500), C.muted, 'right', 1, 'middle'); g.strokeStyle = C.grid; g.beginPath(); g.moveTo(A.x, SY(v)); g.lineTo(A.x + A.w, SY(v)); g.stroke(); });
  text('the input', A.x, A.y - 26, UI(26, 600), C.ink2, 'left', 1, 'alphabetic'); rich([['s', 'i'], [' = ½ + ', ''], ['i t', 'i']], A.x + A.w, A.y - 26, 34, 'right');
  ZEROS.filter(z => z <= tt).forEach(z => { const k = easeOut(prog(tt, z, 1.2)); g.beginPath(); g.arc(SX(0.5), SY(z), 9 + 18 * (1 - k), 0, 7); g.save(); g.globalAlpha *= 0.35 * (1 - k); g.fillStyle = C.zero; g.fill(); g.restore(); dot(SX(0.5), SY(z), 9, C.zero, 3); });
  dot(SX(0.5), SY(tt), 11, C.ink, 4);
  text('the special line', SX(0.5) + 26, A.y + 30, UI(26, 500), C.zero, 'left', fade(t, s[3].t0, 0.5), 'middle');
  // arrow
  g.beginPath(); g.moveTo(640, 545); g.lineTo(760, 545); stroke(C.muted, 3); g.beginPath(); g.moveTo(760, 545); g.lineTo(744, 535); g.lineTo(744, 555); g.closePath(); g.fillStyle = C.muted; g.fill(); text('ζ', 698, 525, MATH(46), C.ink2, 'center');
  // right: the output plane
  const B = { x: 820, y: 240, w: 960, h: 610 }, tr = trace(B, i1, { iMax: Math.round(44 / DT), tail: 4 });
  text('the output', B.x, B.y - 16, UI(26, 600), C.ink2, 'left'); rich([['ζ', 'i'], ['(', ''], ['s', 'i'], [')', '']], B.x + 150, B.y - 16, 34, 'left');
  ZEROS.filter(z => z <= tt).forEach(z => { const k = prog(tt, z, 2.2); if (k < 1) { g.save(); g.globalAlpha *= 0.9 * (1 - k); g.beginPath(); g.arc(tr.X(0), tr.Y(0), 14 + 70 * easeOut(k), 0, 7); stroke(C.ink, 4); g.restore(); } });
  g.beginPath(); g.arc(tr.X(0), tr.Y(0), 12, 0, 7); g.fillStyle = C.bg; g.fill(); stroke(C.ink, 3.5); text('0', tr.X(0) - 26, tr.Y(0) + 44, UI(30, 600), C.ink, 'center');
  dot(tr.X(ZP.re[i1]), tr.Y(ZP.im[i1]), 11, C.zero, 4);
  const nz = ZEROS.filter(z => z <= tt).length; text('zeros so far', B.x + B.w, B.y + 20, UI(26, 500), C.muted, 'right'); text(String(nz), B.x + B.w, B.y + 96, DISP(84, true, 400), C.ink, 'right');
  g.restore();
};

S.music = (t, sc) => {
  const s = sc.sents, R = { x: 240, y: 200, w: 1470, h: 450 }, R2 = { x: 240, y: 775, w: 1470, h: 100 }, XM = 60;
  let K = 0; if (t >= s[1].t0) K = 1 + Math.min(2, Math.floor((t - s[1].t0) / ((s[2].t0 - s[1].t0) / 3)));
  if (t >= s[2].t0) K = Math.round(3 + 247 * Math.pow(prog(t, s[2].t0, s[2].t1 - s[2].t0 - 0.2), 2.3));
  const ch = chart({ ...R, x0: 0, x1: XM, y0: 0, y1: XM, xt: tk(nice(0, XM, 6)), yt: tk(nice(0, XM, 3)) });
  clipTo(R);
  g.beginPath(); g.moveTo(ch.X(0), ch.Y(0)); for (let n = 2; n <= XM; n++) if (T.psi[n] !== T.psi[n - 1]) { g.lineTo(ch.X(n), ch.Y(T.psi[n - 1])); g.lineTo(ch.X(n), ch.Y(T.psi[n])); } g.lineTo(ch.X(XM), ch.Y(T.psi[XM])); stroke(C.prime, 5);
  const SN = 1470; g.beginPath(); for (let i = 0; i < SN; i++) { const x = 1.2 + (XM - 1.2) * i / (SN - 1), y = ch.Y(psiApprox(x, K)); i ? g.lineTo(ch.X(x), y) : g.moveTo(ch.X(x), y); } stroke(C.zero, 4);
  g.restore();
  key(R.x + 40, R.y + 34, C.prime, 'the primes, as a staircase'); key(R.x + 40, R.y + 86, C.zero, 'a straight line plus waves from the zeros');
  text('zeros used', R.x, R.y - 62, UI(28, 500), C.muted, 'left'); text(String(K), R.x + 170, R.y - 42, DISP(84, true, 400), C.zero, 'left');
  if (sc.formulas) fx('\\o{\\psi(x)}\\;=\\;x-\\b{\\sum_{\\rho}\\frac{x^{\\rho}}{\\rho}}-\\ln 2\\pi-\\frac{1}{2}\\ln(1-x^{-2})', R.x + R.w - 30, R.y + R.h - 76, 46, 'right', fade(t, s[1].t0 - 0.1, 0.6));
  // current wave
  const aw = fade(t, s[1].t0 - 0.1, 0.5); if (aw > 0 && K > 0) { g.save(); g.globalAlpha = aw; const mid = R2.y + R2.h / 2, amp = 2.3 * Math.sqrt(XM) / ZEROS[0], scl = (R2.h / 2 - 6) / amp;
    g.strokeStyle = C.grid; g.lineWidth = 2; g.beginPath(); g.moveTo(R2.x, mid); g.lineTo(R2.x + R2.w, mid); g.stroke();
    g.beginPath(); for (let i = 0; i < 2 * SN; i++) { const x = 1.2 + (XM - 1.2) * i / (2 * SN - 1), y = mid + wave(ZEROS[K - 1], Math.log(x), Math.sqrt(x)) * scl; i ? g.lineTo(ch.X(x), y) : g.moveTo(ch.X(x), y); } stroke(C.zero, 3);
    text('the wave from zero no. ' + K, R2.x, R2.y - 14, UI(26, 500), C.ink2, 'left'); text(K > 3 ? 'higher pitch, quieter' : '', R2.x + R2.w, R2.y - 14, UI(26, 500), C.muted, 'right'); g.restore(); }
};

S.line = (t, sc) => {
  const s = sc.sents, A = { x: 170, y: 210, w: 380, h: 620 }, R = { x: 760, y: 230, w: NB, h: 530 }, G = ZEROS[0];
  const bUp = ease(prog(t, s[2].t0 + 0.6, 3.6)), bDn = ease(prog(t, s[3].t0 - 0.1, 1.3)), beta = 0.5 + 0.22 * bUp * (1 - bDn), rogue = beta > 0.5005;
  // left strip
  const SX = v => A.x + 30 + v * (A.w - 60), SY = v => A.y + A.h - (v - 8) / 44 * A.h;
  g.fillStyle = C.surface; g.fillRect(SX(0), A.y, SX(1) - SX(0), A.h); g.strokeStyle = C.rule; g.lineWidth = 2; g.strokeRect(SX(0), A.y, SX(1) - SX(0), A.h);
  g.beginPath(); g.moveTo(SX(0.5), A.y); g.lineTo(SX(0.5), A.y + A.h); stroke(C.zero, 3);
  [[0, '0'], [0.5, '½'], [1, '1']].forEach(([v, l]) => text(l, SX(v), A.y + A.h + 42, UI(26, 500), C.muted, 'center'));
  text('real part', A.x + A.w / 2, A.y + A.h + 84, UI(24, 500), C.muted, 'center'); text('the zeros of ζ', A.x + A.w / 2, A.y - 26, UI(28, 600), C.ink2, 'center');
  ZEROS.filter(z => z < 51).forEach((z, k) => { if (k === 0 && rogue) return; dot(SX(0.5), SY(z), 10, C.zero, 3); });
  const h0 = Math.min(fade(t, s[0].t0 + 0.2, 0.4), 1 - fade(t, s[1].t0 + 0.6, 0.5));
  if (h0 > 0) { g.save(); g.globalAlpha = h0; const y = SY(G); g.beginPath(); g.arc(SX(0.5), y, 22, 0, 7); stroke(C.ink, 3); [[-1, SX(0.5) - 34, SX(0.08)], [1, SX(0.5) + 34, SX(0.92)]].forEach(([d, a, b]) => { g.beginPath(); g.moveTo(a, y); g.lineTo(b, y); stroke(C.ink, 3); g.beginPath(); g.moveTo(b, y); g.lineTo(b - d * 14, y - 9); g.lineTo(b - d * 14, y + 9); g.closePath(); g.fillStyle = C.ink; g.fill(); }); text('quieter', SX(0.14), y + 48, UI(24, 500), C.ink2, 'center'); text('louder', SX(0.86), y + 48, UI(24, 500), C.ink2, 'center'); g.restore(); }
  if (rogue) { dot(SX(beta), SY(G), 11, C.whatif, 3); dot(SX(1 - beta), SY(G), 8, C.whatif, 3); text('off the line', SX(beta) , SY(G) - 30, UI(24, 600), C.whatif, 'center'); }
  // right chart
  const aC = fade(t, s[0].t0 + 0.1, 0.6), aB = fade(t, s[1].t0 + 0.2, 0.9), pair = (b, u) => -2 * Math.exp((b - 0.5) * u) * (b * Math.cos(G * u) + G * Math.sin(G * u)) / (b * b + G * G);
  const dl = new Float32Array(NB); let mxw = 0; if (rogue) for (let c = 0; c < NB; c++) { const u = LA + (c + 0.5) / NB * (LB - LA); dl[c] = pair(beta, u) - pair(0.5, u); mxw = Math.max(mxw, Math.abs(NERR.hi[c] + dl[c]), Math.abs(NERR.lo[c] + dl[c])); }
  const ext = Math.max(1.45, mxw * 1.1), ch = chart({ ...R, alpha: aC, xlog: true, x0: 100, x1: 1e6, y0: -ext, y1: ext, xt: [2, 3, 4, 5, 6].map(e => ({ v: Math.pow(10, e), l: ['100', '1,000', '10,000', '100,000', '1,000,000'][e - 2] })), yt: tk(nice(-ext, ext, 4), v => minus(v)) });
  text('error in the prime count, measured in units of √x', R.x, R.y - 26, UI(28, 600), C.ink2, 'left', aC);
  clipTo(R); const band = (off, color, a) => { g.save(); g.globalAlpha = a; g.fillStyle = color; for (let c = 0; c < NB; c++) { const y1 = ch.Y(NERR.hi[c] + (off ? dl[c] : 0)), y2 = ch.Y(NERR.lo[c] + (off ? dl[c] : 0)); g.fillRect(R.x + c, y1 - 1.2, 1.6, Math.max(3, y2 - y1 + 2.4)); } g.restore(); };
  if (rogue) band(true, C.whatif, 1);
  if (aB > 0) { g.save(); g.beginPath(); g.rect(R.x, R.y - 6, R.w * ease(prog(t, s[1].t0 + 0.2, 2.4)), R.h + 8); g.clip(); band(false, C.prime, 1); g.restore(); }
  g.restore();
  key(R.x + 10, R.y + R.h + 92, C.prime, 'the real primes', aB, true); key(R.x + 380, R.y + R.h + 92, C.whatif, 'with one zero off the line', rogue ? 1 : 0, true);
  if (sc.formulas) { const aW = aC * (1 - fade(t, s[3].t0 + 2.0, 0.5)); fx('\\b{\\rho=\\beta+i\\gamma}\\;\\;\\to\\;\\;\\text{a wave of size }\\,x^{\\beta}', R.x + 26, R.y + 62, 44, 'left', aW); fx('\\b{\\beta=\\half}\\;\\;\\to\\;\\;\\sqrt{x}', R.x + R.w - 26, R.y + 62, 44, 'right', aW * fade(t, s[1].t0 + 1.2, 0.6) * (1 - fade(t, s[2].t0 + 0.4, 0.5))); }
  const aH = fade(t, s[3].t0 + 2.2, 0.7); if (aH > 0) { g.save(); g.globalAlpha = aH * 0.82; g.fillStyle = C.bg; g.fillRect(R.x - 90, R.y - 70, R.w + 180, R.h + 200); g.restore(); text('Every zero is on the line.', R.x + R.w / 2, R.y + 250, DISP(84, true, 500), C.ink, 'center', aH); const aY = fade(t, s[4].t0 + 0.1, 0.6); text('1859 – 2026', R.x + R.w / 2, R.y + 380, DISP(64, false, 400), C.zero, 'center', aY); text('unproved for 167 years', R.x + R.w / 2, R.y + 440, UI(30, 500), C.muted, 'center', aY); }
};

S.mirror = (t, sc) => {
  const s = sc.sents, aD = Math.min(fade(t, s[0].t0 + 0.2, 0.7), 1 - fade(t, s[2].t0 - 0.5, 0.5)), aG = fade(t, s[2].t0 - 0.1, 0.7);
  if (aD > 0) { const lx = 520, rx = 1400; g.save(); g.globalAlpha = aD;
    text('Whole numbers', lx, 250, DISP(64), C.ink, 'center'); text('Polynomials', rx, 250, DISP(64), C.ink, 'center', fade(t, s[1].t0, 0.5));
    g.strokeStyle = C.rule; g.lineWidth = 2; g.beginPath(); g.moveTo(960, 190); g.lineTo(960, 800); g.stroke();
    const rows = [[[['60 = 2', ''], ['2', 'u'], [' · 3 · 5', '']], [['x', 'i'], ['3', 'u'], [' − ', ''], ['x', 'i'], [' = ', ''], ['x', 'i'], ['(', ''], ['x', 'i'], [' − 1)(', ''], ['x', 'i'], [' + 1)', '']], 400], [[['primes', 'so']], [['roots', 'so']], 540], [[['divisible by 2, twice', 's']], [['a root that counts twice', 's']], 680]];
    rows.forEach(([a, b, y], k) => { const ar = fade(t, s[0].t0 + 1.0 + k * 0.7, 0.5), br = fade(t, s[1].t0 + 0.3 + k * 0.6, 0.5); rich(a, lx, y, k ? 46 : 60, 'center', ar); rich(b, rx, y, k ? 46 : 60, 'center', br); if (br > 0) { g.save(); g.globalAlpha *= br; g.beginPath(); g.moveTo(905, y - 16); g.lineTo(1015, y - 16); stroke(C.muted, 3); [[905, 1], [1015, -1]].forEach(([x, d]) => { g.beginPath(); g.moveTo(x, y - 16); g.lineTo(x + d * 14, y - 25); g.lineTo(x + d * 14, y - 7); g.closePath(); g.fillStyle = C.muted; g.fill(); }); g.restore(); } });
    g.restore(); }
  if (aG <= 0) return; g.save(); g.globalAlpha = aG;
  const R = { x: 300, y: 190, w: 1320, h: 330 }, seg = (s[3].t1 - s[3].t0 - 0.6) / 3; let mm = 1; for (let k = 0; k < 3; k++) mm += ease(prog(t, s[3].t0 + 0.5 + k * seg, 0.7));
  const X = v => R.x + (v + 1.04) / 2.08 * R.w, Y = v => R.y + (1 - (v + 1.15) / 2.3) * R.h, m0 = Math.floor(mm), fr = mm - m0;
  g.strokeStyle = C.rule; g.lineWidth = 2; g.beginPath(); g.moveTo(R.x, Y(0)); g.lineTo(R.x + R.w, Y(0)); g.stroke();
  const poly = (m, a) => { if (a <= 0.01) return; g.save(); g.globalAlpha *= a; g.beginPath(); for (let i = 0; i <= 700; i++) { const x = -1 + 2 * i / 700, y = Y(Math.pow(T5(x), m)); i ? g.lineTo(X(x), y) : g.moveTo(X(x), y); } stroke(C.ink2, 5); g.restore(); };
  poly(m0, 1 - fr); poly(m0 + 1, fr);
  const mi = Math.round(mm); ROOTS.forEach(r => { dot(X(r), Y(0), 12, C.prime, 4); for (let k = 0; k < mi; k++) { const a = k < m0 ? 1 : (k === m0 ? Math.max(fr, mi > m0 ? 1 : 0) : 0); g.save(); g.globalAlpha *= a; g.fillStyle = C.prime; rrect(X(r) - 44, 578 + k * 30, 88, 22, 5); g.fill(); g.restore(); } });
  text('a polynomial of degree ' + 5 * mi, R.x, R.y - 30, UI(30, 600), C.ink2, 'left');
  rich([['5 roots', 'so'], ['  ×  ', 'sm'], [mi === 1 ? 'counted once' : 'counted ' + mi + ' times', 's'], ['  =  ', 'sm'], ['degree ' + 5 * mi, 's']], W / 2, 778, 44, 'center', fade(t, s[2].t0 + 2.6, 0.6) * (1 - fade(t, s[4].t0 - 0.2, 0.4)));
  rich([['roots  ≤  degree ÷ multiplicity', 's'], ['      ⟹      ', 'sm'], ['error ≈ ', 's'], ['√', 's'], ['p', 'i']], W / 2, 778, 44, 'center', fade(t, s[4].t0 + 0.1, 0.5));
  text('Stepanov, 1969', R.x + R.w, R.y - 30, UI(26, 500), C.muted, 'right', fade(t, s[4].t0 + 0.3, 0.5));
  g.restore();
};

S.idea = (t, sc) => {
  const s = sc.sents, aC = Math.min(fade(t, s[0].t0, 0.6), 1 - 0.9 * fade(t, s[2].t0 - 0.2, 0.6)) * (1 - fade(t, s[3].t0 - 0.5, 0.4));
  if (aC > 0) { g.save(); g.globalAlpha = aC; const card = (x, title) => { rrect(x, 210, 780, 500, 14); g.fillStyle = C.surface; g.fill(); stroke(C.rule, 2); text(title, x + 44, 280, UI(26, 600), C.muted, 'left', 1, 'alphabetic', 3); };
    card(150, 'A POLYNOMIAL'); card(990, 'A WHOLE NUMBER');
    const a1 = fade(t, s[1].t0 + 0.2, 0.5), a2 = fade(t, s[1].t0 + 3.2, 0.5);
    rich([['f', 'i'], ['(', ''], ['x', 'i'], [')', ''], ['    →    ', 'm'], ['f', 'i'], ['′(', ''], ['x', 'i'], [')', ''], ['    →    ', 'm'], ['f', 'i'], ['″(', ''], ['x', 'i'], [')', '']], 540, 430, 64, 'center');
    text('differentiate, again and again', 540, 520, UI(32, 500), C.ink2, 'center', a1); text('each root counts more times', 540, 570, UI(32, 500), C.ink2, 'center', a1);
    g.save(); g.globalAlpha *= a1; g.beginPath(); g.arc(540, 640, 26, 0, 7); g.fillStyle = C.good; g.fill(); g.beginPath(); g.moveTo(527, 641); g.lineTo(536, 651); g.lineTo(554, 630); stroke('#fff', 5); g.restore();
    rich([['360 = 2', ''], ['3', 'u'], [' · 3', ''], ['2', 'u'], [' · 5', '']], 1380, 430, 64, 'center');
    text('the derivative of 360 ?', 1380, 520, UI(32, 500), C.ink2, 'center', a2); text('there is no such thing', 1380, 570, UI(32, 500), C.ink2, 'center', a2);
    g.save(); g.globalAlpha *= a2; g.beginPath(); g.arc(1380, 640, 26, 0, 7); g.fillStyle = C.prime; g.fill(); g.beginPath(); g.moveTo(1369, 629); g.lineTo(1391, 651); g.moveTo(1391, 629); g.lineTo(1369, 651); stroke('#fff', 5); g.restore();
    g.restore(); }
  const aA = Math.min(fade(t, s[2].t0, 0.7), 1 - fade(t, s[3].t0 - 0.5, 0.5));
  if (aA > 0) { g.save(); g.globalAlpha = aA; rrect(260, 300, 1400, 400, 18); g.fillStyle = C.surface; g.fill(); stroke(C.zero, 3);
    text('ANNOUNCED 20 NOVEMBER 2026', W / 2, 390, UI(26, 600), C.zero, 'center', 1, 'alphabetic', 4);
    text('Levent Alpöge, working with Claude', W / 2, 500, DISP(76), C.ink, 'center');
    text('a proof of the Riemann hypothesis, written in the proof language Lean', W / 2, 580, UI(32, 500), C.ink2, 'center');
    text('as reported; mathematicians have only begun to read it', W / 2, 640, UI(26, 500), C.muted, 'center'); g.restore(); }
  const aL = fade(t, s[3].t0 - 0.1, 0.6); if (aL <= 0) return; g.save(); g.globalAlpha = aL;
  text('A chain of theta lifts', 150, 250, DISP(72), C.ink, 'left');
  const n = 8, bx = i => 150 + i * 212, by = 340, bw = 136, bh = 80, span = s[3].t1 - s[3].t0 + 0.6;
  for (let i = 0; i < n; i++) { const a = fade(t, s[3].t0 + 0.2 + i * span / (n + 1), 0.4); if (a <= 0) continue; g.save(); g.globalAlpha *= a;
    if (i === 6) text('⋯', bx(i) + bw / 2, by + bh / 2 + 4, UI(60, 500), C.ink2, 'center', 1, 'middle');
    else { rrect(bx(i), by, bw, bh, 12); g.fillStyle = C.surface; g.fill(); stroke(C.ink2, 2.5); rich([['U', 's'], [i === 7 ? 'm' : String(i), i === 7 ? 'id' : 'd']], bx(i) + bw / 2, by + bh / 2 + 15, 44, 'center'); }
    if (i > 0) { const x0 = bx(i - 1) + bw + 10, x1 = bx(i) - 10; g.beginPath(); g.moveTo(x0, by + bh / 2); g.lineTo(x1, by + bh / 2); stroke(C.muted, 3); g.beginPath(); g.moveTo(x1, by + bh / 2); g.lineTo(x1 - 13, by + bh / 2 - 8); g.lineTo(x1 - 13, by + bh / 2 + 8); g.closePath(); g.fillStyle = C.muted; g.fill(); if (i !== 6 && i !== 7) text('Θ', (x0 + x1) / 2, by + bh / 2 - 18, MATH(34, false), C.zero, 'center'); }
    g.restore(); }
  text('about √x links', bx(6) + bw / 2, by - 26, UI(28, 600), C.ink2, 'center', fade(t, s[3].t0 + span * 0.8, 0.5));
  const cnt = [0, 1, 2, 3, 4, 5, 0, 9];
  for (let i = 0; i < n; i++) for (let k = 0; k < cnt[i]; k++) { const a = fade(t, s[4].t0 + 0.3 + i * 0.32 + k * 0.05, 0.35); if (a <= 0) continue; g.save(); g.globalAlpha *= a; g.fillStyle = C.prime; rrect(bx(i) + 18, by + bh + 26 + k * 27, bw - 36, 19, 5); g.fill(); g.restore(); }
  text('each link adds one more layer of divisibility by primes', 150, 772, UI(34, 600), C.ink, 'left', fade(t, s[4].t0 + 0.5, 0.6));
  text('the stand-in for a derivative', 150, 824, UI(30, 500), C.muted, 'left', fade(t, s[4].t0 + 3.6, 0.6));
  g.restore();
};

S.status = (t, sc) => {
  const s = sc.sents;
  text('Where it stands', 150, 220, DISP(88), C.ink, 'left', fade(t, s[0].t0 - 0.2, 0.6)); text('22 November 2026', 1770, 220, UI(30, 500), C.muted, 'right', fade(t, s[0].t0, 0.6));
  const card = (x, a, color, title, lines, icon) => { if (a <= 0) return; g.save(); g.globalAlpha = a; g.translate(0, 24 * (1 - a)); rrect(x, 290, 790, 500, 18); g.fillStyle = C.surface; g.fill(); stroke(color, 3);
    g.beginPath(); g.arc(x + 84, 384, 40, 0, 7); g.fillStyle = color; g.fill(); icon(x + 84, 384);
    text(title, x + 150, 402, DISP(52), C.ink, 'left'); lines.forEach((l, i) => { g.beginPath(); g.arc(x + 62, 502 + i * 84, 6, 0, 7); g.fillStyle = color; g.fill(); text(l, x + 92, 514 + i * 84, UI(34, 500), C.ink2, 'left'); }); g.restore(); };
  card(150, fade(t, s[1].t0 - 0.1, 0.7), C.good, 'Checked by machine', ['17 million lines of Lean code', 'accepted by independent proof checkers', 'certified by the Lean & Mathlib teams'], (x, y) => { g.beginPath(); g.moveTo(x - 18, y + 1); g.lineTo(x - 5, y + 15); g.lineTo(x + 20, y - 14); stroke('#fff', 7); });
  card(980, fade(t, s[2].t0 - 0.1, 0.7), C.muted, 'Not yet understood', ['no human-readable proof so far', 'experts have only begun reading', 'open questions are still being logged'], (x, y) => { [-17, 0, 17].forEach(d => { g.beginPath(); g.arc(x + d, y, 5.5, 0, 7); g.fillStyle = '#fff'; g.fill(); }); });
};

S.close = (t, sc) => {
  const s = sc.sents, B = { x: 1000, y: 150, w: 800, h: 700 }, iMax = Math.round(50 / DT), tt = 18 + 30 * prog(t, 0, sc.dur);
  g.save(); g.globalAlpha = 0.9; const tr = trace(B, Math.round(tt / DT), { ghost: true, tail: 6, iMax }); g.beginPath(); g.arc(tr.X(0), tr.Y(0), 11, 0, 7); g.fillStyle = C.bg; g.fill(); stroke(C.ink, 3.5); dot(tr.X(ZP.re[Math.round(tt / DT)]), tr.Y(ZP.im[Math.round(tt / DT)]), 10, C.zero, 4); g.restore();
  const a1 = fade(t, s[1].t0 - 0.3, 0.9);
  ['The primes are', 'as orderly as', 'randomness allows.'].forEach((l, i) => text(l, 130, 420 + i * 104, DISP(88, i === 2, 500), C.ink, 'left', a1));
  text('The Riemann Hypothesis', 130, 250, DISP(48, false, 400), C.muted, 'left', fade(t, 0.2, 0.8));
  if (sc.formulas) fx('\\b{\\zeta}(s)=0,\\;\\;0\\lt\\Re s\\lt 1\\;\\;\\implies\\;\\;\\Re s=\\half', 130, 728, 46, 'left', fade(t, s[1].t0 + 0.6, 0.9));
  text('Charts computed from the primes below one million and the first 600 zeros of ζ.', 130, 800, UI(24, 500), C.muted, 'left', fade(t, 1.0, 0.8));
  text('Narration: synthetic voice.  Status as of 22 November 2026.', 130, 838, UI(24, 500), C.muted, 'left', fade(t, 1.0, 0.8));
};

/* ---------- scenes of the extended cut ---------- */
const BASEL = (() => { const a = new Float64Array(3001); for (let n = 1; n <= 3000; n++) a[n] = a[n - 1] + 1 / (n * n); return a; })();
function arrow(x0, y0, x1, y1, color, w, head = 20) {
  const ang = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0), h = Math.min(head, len * 0.42);
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - h * 0.7 * Math.cos(ang), y1 - h * 0.7 * Math.sin(ang)); stroke(color, w);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - h * Math.cos(ang - 0.4), y1 - h * Math.sin(ang - 0.4)); g.lineTo(x1 - h * Math.cos(ang + 0.4), y1 - h * Math.sin(ang + 0.4)); g.closePath(); g.fillStyle = color; g.fill();
}
/* partial sums of 1 + 2^-s + 3^-s + ... at s = 1/2 + it: the arrows laid head to tail */
const CHAIN_N = 48, CHX = new Float64Array(CHAIN_N + 1), CHY = new Float64Array(CHAIN_N + 1), LOGN = Float64Array.from({ length: CHAIN_N + 1 }, (_, n) => n ? Math.log(n) : 0), ZV = [0, 0];
function chainAt(tt) { let x = 0, y = 0; for (let n = 1; n <= CHAIN_N; n++) { const m = 1 / Math.sqrt(n), a = -tt * LOGN[n]; x += m * Math.cos(a); y += m * Math.sin(a); CHX[n] = x; CHY[n] = y; } }

S.euler = (t, sc) => {
  const s = sc.sents, aI = Math.min(fade(t, s[0].t0, 0.7), 1 - fade(t, s[1].t0 - 0.5, 0.4));
  text('1735', W / 2, 440, DISP(150, true, 400), C.muted, 'center', aI); text('Leonhard Euler', W / 2, 570, DISP(76), C.ink, 'center', aI);
  if (t < s[1].t0 - 0.15) return;
  text('LEONHARD EULER  ·  1735', 152, 150, UI(24, 600), C.muted, 'left', fade(t, s[1].t0, 0.6), 'alphabetic', 4);
  // the series, one term at a time
  const parts = ['1', '\\;+\\;\\frac{1}{2^2}', '\\;+\\;\\frac{1}{3^2}', '\\;+\\;\\frac{1}{4^2}', '\\;+\\;\\frac{1}{5^2}', '\\;+\\;\\cdots', '\\;=\\;\\frac{\\pi^2}{6}'];
  const step = Math.min(0.66, (s[1].t1 - s[1].t0 - 1.3) / 5), at = k => s[1].t0 + 0.1 + k * step; let x = 150;
  parts.forEach((p, k) => { x += fx(p, x, 345, 80, 'left', k < 6 ? fade(t, at(k), 0.4) : fade(t, s[2].t0 + 0.5, 0.6)).w; });
  // the running total as a bar
  const B = { x: 150, y: 560, h: 84, u: 800 }, BX = v => B.x + v * B.u, TOT = Math.PI * Math.PI / 6;
  let N = 0; for (let k = 0; k < 5; k++) if (t >= at(k)) N = k + 1;
  if (N === 5) N = Math.min(3000, Math.round(5 * Math.pow(600, ease(prog(t, at(5), s[2].t1 + 0.4 - at(5))))));
  g.strokeStyle = C.rule; g.lineWidth = 2; g.strokeRect(B.x, B.y, 1.8 * B.u, B.h);
  for (let n = 1; n <= Math.min(N, 14); n++) { g.save(); g.globalAlpha = n <= 5 ? fade(t, at(n - 1), 0.35) : 1; g.fillStyle = n % 2 ? C.ink2 : C.muted; g.fillRect(BX(BASEL[n - 1]), B.y, Math.max(1, (BASEL[n] - BASEL[n - 1]) * B.u - (n < 9 ? 3 : 0)), B.h); g.restore(); }
  if (N > 14) { g.fillStyle = C.ink2; g.fillRect(BX(BASEL[14]), B.y, (BASEL[N] - BASEL[14]) * B.u, B.h); }
  [['1', 1], ['¼', 2], ['⅑', 3]].forEach(([l, n]) => text(l, BX((BASEL[n - 1] + BASEL[n]) / 2), B.y + B.h / 2 + 2, UI(n === 3 ? 30 : 36, 600), C.bg, 'center', fade(t, at(n - 1) + 0.1, 0.35), 'middle'));
  [0, 0.5, 1, 1.5].forEach(v => { g.strokeStyle = C.rule; g.lineWidth = 2; g.beginPath(); g.moveTo(BX(v), B.y + B.h); g.lineTo(BX(v), B.y + B.h + 12); g.stroke(); text(String(v), BX(v), B.y + B.h + 44, UI(24, 500), C.muted, 'center'); });
  rich([['first ' + fmt(N) + (N === 1 ? ' term' : ' terms') + ':   ', 'sm'], [BASEL[N].toFixed(4), 's']], B.x, B.y + B.h + 120, 40, 'left', fade(t, at(0), 0.4));
  const aT = fade(t, s[2].t0 + 0.5, 0.6);
  if (aT > 0) { g.save(); g.globalAlpha = aT; g.beginPath(); g.moveTo(BX(TOT), B.y - 26); g.lineTo(BX(TOT), B.y + B.h + 70); stroke(C.ink, 3, [8, 8]); g.restore(); rich([['π', 'i'], ['2', 'u'], ['/6  =  1.6449…', '']], BX(TOT), B.y + B.h + 120, 44, 'center', aT); }
  // the circle that pi comes from
  const aC = fade(t, s[3].t0 - 0.1, 0.6);
  if (aC > 0) { const cx = 1650, cy = 300, r = 118, sw = ease(prog(t, s[3].t0 + 0.3, 1.5)); g.save(); g.globalAlpha = aC;
    g.beginPath(); g.arc(cx, cy, r, 0, 7); stroke(C.rule, 3); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + r, cy); stroke(C.muted, 3); text('1', cx + r / 2, cy + 34, UI(26, 500), C.muted, 'center');
    if (sw > 0) { g.beginPath(); g.arc(cx, cy, r, 0, -Math.PI * sw, true); stroke(C.ink, 6); }
    text('π', cx, cy - r - 22, MATH(56), C.ink, 'center', sw); text('half-way round a circle of radius 1', cx, cy + r + 52, UI(24, 500), C.muted, 'center'); g.restore(); }
};

S.product = (t, sc) => {
  const s = sc.sents, px = 92, y0 = 318, SUM = '\\sum_{n=1}^{\\infty}\\frac{1}{n^s}', PROD = '\\;=\\;\\o{\\prod_{p}}\\frac{1}{1-\\o{p}^{-s}}', ZL = '\\b{\\zeta}(s)\\;=\\;';
  const wS = TEX(SUM, px).w, wP = TEX(PROD, px).w, wZ = TEX(ZL, px).w, aZ = fade(t, s[4].t0 + 1.9, 0.6), x0 = W / 2 - (wS + wP) / 2 + wZ / 2 * ease(prog(t, s[4].t0 + 1.5, 0.8));
  fx(SUM, x0, y0, px, 'left', fade(t, s[0].t0 + 0.1, 0.7)); fx(PROD, x0 + wS, y0, px, 'left', fade(t, s[1].t0 + 0.9, 0.7)); fx(ZL, x0 - wZ, y0, px, 'left', aZ);
  const aB = fade(t, s[4].t0 + 3.0, 0.6), dim = (1 - 0.6 * fade(t, s[3].t0 - 0.2, 0.5)) * (1 - fade(t, s[4].t0 + 2.5, 0.5));
  text('every whole number', x0 + wS / 2, y0 + 176, UI(30, 600), C.ink2, 'center', fade(t, s[3].t0 + 0.1, 0.5)); text('every prime', x0 + wS + wP / 2 + 40, y0 + 176, UI(30, 600), C.prime, 'center', fade(t, s[3].t0 + 2.1, 0.5));
  // each factor is a geometric series; multiplying out picks one term from each
  const q = 56, y1 = 650, F = (a, b) => `\\big(1+\\frac{1}{${a}^s}+\\frac{1}{${b}^s}+\\cdots\\big)`, facs = [[2, 4, 1], [3, 9, 0], [5, 25, 0]], tail = TEX('\\;\\cdots', q).w;
  const tot = facs.reduce((w, [a, b]) => w + TEX(F(a, b), q).w, 0) + tail, tp = s[2].t0 + 1.7; let x = W / 2 - tot / 2;
  g.save(); g.globalAlpha = dim;
  facs.forEach(([a, b, pick], k) => {
    const al = fade(t, s[2].t0 + 0.15 + 0.3 * k, 0.5), w = fx(F(a, b), x, y1, q, 'left', al).w; text('prime ' + a, x + w / 2, y1 + 92, UI(24, 600), C.prime, 'center', al);
    const pre = pick ? `\\big(1+\\frac{1}{${a}^s}+` : '\\big(1+', fr = TEX(`\\frac{1}{${pick ? b : a}^s}`, q), bx = x + TEX(pre, q).w, ap = fade(t, tp + 0.45 * k, 0.3);
    if (ap > 0) { g.save(); g.globalAlpha *= ap; rrect(bx - 5, y1 - fr.a - 9, fr.w + 10, fr.a + fr.d + 20, 10); stroke(C.prime, 3); g.restore(); }
    x += w;
  });
  fx('\\;\\cdots', x, y1, q, 'left', fade(t, s[2].t0 + 1.05, 0.5));
  const aR = fade(t, tp + 1.5, 0.5), R = '\\frac{1}{4^s}\\cdot\\frac{1}{3^s}\\cdot\\frac{1}{5^s}\\;=\\;\\frac{1}{60^s}', wR = TEX(R, q).w, xr = W / 2 - (wR + 560) / 2;
  fx(R, xr, 838, q, 'left', aR); rich([['60 = 2', 's'], ['2', 'su'], [' · 3 · 5', 's'], ['     in one way only', 'sm']], xr + wR + 70, 852, 40, 'left', aR);
  g.restore();
  const Z2 = '\\b{\\zeta}(2)\\;=\\;1+\\frac{1}{2^2}+\\frac{1}{3^2}+\\cdots\\;=\\;\\frac{\\pi^2}{6}'; text('EULER’S SUM IS ITS VALUE AT 2', W / 2, 610, UI(24, 600), C.muted, 'center', aB, 'alphabetic', 4); fx(Z2, W / 2, 740, 72, 'center', aB);
};

S.spin = (t, sc) => {
  const s = sc.sents, aI = Math.min(fade(t, s[0].t0, 0.7), 1 - fade(t, s[1].t0 - 0.45, 0.4));
  if (aI > 0) { text('1859', W / 2, 290, DISP(120, true, 400), C.muted, 'center', aI); fx('\\b{\\zeta}(s)\\;=\\;1+\\frac{1}{2^s}+\\frac{1}{3^s}+\\frac{1}{4^s}+\\cdots', W / 2, 470, 92, 'center', aI);
    const a2 = aI * fade(t, s[0].t0 + 2.6, 0.6); fx('s\\;=\\;\\sigma+i\\,t', W / 2, 690, 84, 'center', a2); text('a complex number: a real part and an imaginary part', W / 2, 770, UI(30, 500), C.ink2, 'center', a2); }
  const aP = fade(t, s[1].t0 - 0.05, 0.7); if (aP <= 0) return; g.save(); g.globalAlpha = aP;
  const cx = 560, cy = 525, R = 255, PX = v => cx + v * R, PY = v => cy - v * R, q0 = s[1].t0 + 0.5 * (s[1].t1 - s[1].t0);
  g.strokeStyle = C.rule; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 355, cy); g.lineTo(cx + 355, cy); g.moveTo(cx, cy - 345); g.lineTo(cx, cy + 345); g.stroke();
  g.beginPath(); g.arc(cx, cy, R, 0, 7); stroke(C.rule, 3);
  text('real', cx + 355, cy - 16, UI(24, 500), C.muted, 'right'); text('imaginary', cx + 18, cy - 322, UI(24, 500), C.muted, 'left');
  [[1, 0, '1', 16, 40, 'left'], [0, 1, 'i', 18, -14, 'left'], [-1, 0, '−1', -16, 40, 'right'], [0, -1, '−i', 18, 36, 'left']].forEach(([a, b, l, dx, dy, al]) => { dot(PX(a), PY(b), 6, C.muted, 3); text(l, PX(a) + dx, PY(b) + dy, MATH(36, l.includes('i')), C.ink2, al); });
  // a complex number is a point
  const aA = Math.min(fade(t, s[1].t0 + 0.3, 0.5), 1 - fade(t, q0 - 0.25, 0.35));
  if (aA > 0) { const a = 0.6, b = 0.47; g.save(); g.globalAlpha *= aA; g.beginPath(); g.moveTo(PX(a), cy); g.lineTo(PX(a), PY(b)); g.lineTo(cx, PY(b)); stroke(C.muted, 2.5, [7, 7]); dot(PX(a), PY(b), 11, C.ink, 4);
    text('a', PX(a), cy + 40, MATH(36), C.ink2, 'center'); text('b', cx - 20, PY(b) + 10, MATH(36), C.ink2, 'right'); fx('a+b\\,i', PX(a) + 24, PY(b) - 22, 50); g.restore(); }
  // multiplying by i: a quarter turn; then Euler's formula: any angle; then half a turn
  let quarter = 0; for (let k = 0; k < 4; k++) quarter += ease(prog(t, q0 + 0.72 * k, 0.5));
  const euler = t >= s[2].t0, th1 = 2.2 * ease(prog(t, s[2].t0 + 0.9, s[2].t1 - s[2].t0 - 1.4)), th = euler ? th1 + (Math.PI - 2.2) * ease(prog(t, s[3].t0 + 0.25, 1.7)) : quarter * Math.PI / 2;
  const aV = fade(t, q0 - 0.1, 0.4), ex = PX(Math.cos(th)), ey = PY(Math.sin(th));
  if (aV > 0) { g.save(); g.globalAlpha *= aV;
    if (euler) { const aE = fade(t, s[2].t0 + 0.5, 0.5); g.save(); g.globalAlpha *= aE;
      if (th > 0.02) { g.beginPath(); g.arc(cx, cy, R, 0, -th, true); stroke(C.ink, 6); g.beginPath(); g.arc(cx, cy, 64, 0, -th, true); stroke(C.zero, 5); text('θ', cx + 96 * Math.cos(th / 2), cy - 96 * Math.sin(th / 2) + 12, MATH(40), C.zero, 'center'); }
      g.beginPath(); g.moveTo(ex, cy); g.lineTo(ex, ey); g.lineTo(cx, ey); stroke(C.muted, 2.5, [7, 7]); g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, cy); stroke(C.ink2, 6); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, ey); stroke(C.ink2, 6);
      const co = Math.cos(th), aL = Math.min(1, Math.abs(co) * 6) * (1 - fade(t, s[3].t0 + 0.2, 0.4)); text('cos θ', (cx + ex) / 2, cy + 44, UI(26, 600), C.ink2, 'center', aL); text('sin θ', cx + (co >= 0 ? -16 : 16), (cy + ey) / 2 + 8, UI(26, 600), C.ink2, co >= 0 ? 'right' : 'left', Math.min(aL, Math.sin(th) * 6));
      const lr = R + 70, fb = TEX('e^{i\\theta}', 50); fx('e^{i\\theta}', cx + lr * Math.cos(th) - fb.w / 2, cy - lr * Math.sin(th) + 16, 50, 'left', 1 - fade(t, s[3].t0 + 1.4, 0.4)); g.restore(); }
    else { const k = Math.min(3, Math.floor(quarter)), fr = quarter - k; if (fr > 0.01 && fr < 0.99) { g.beginPath(); g.arc(cx, cy, 64, -k * Math.PI / 2, -th, true); stroke(C.zero, 5); } }
    arrow(cx, cy, ex, ey, C.ink, 7, 26); dot(ex, ey, 10, C.ink, 0); g.restore(); }
  // right column
  const RX = 1010, later = 1 - 0.62 * fade(t, s[2].t0 - 0.2, 0.5), aQ = fade(t, q0, 0.5) * later;
  const wq = fx('\\times\\,i', RX, 300, 88, 'left', aQ).w; text('=  a quarter turn', RX + wq + 34, 296, UI(40, 500), C.ink2, 'left', aQ);
  ['1', '\\;\\to\\;i', '\\;\\to\\;-1', '\\;\\to\\;-i', '\\;\\to\\;1'].reduce((x, p, k) => x + fx(p, x, 392, 52, 'left', (k ? fade(t, q0 + 0.72 * (k - 1) + 0.3, 0.3) : fade(t, q0, 0.4)) * later).w, RX);
  fx('e^{i\\theta}\\;=\\;\\cos\\theta+i\\,\\sin\\theta', RX, 545, 84, 'left', fade(t, s[2].t0 + 0.3, 0.6));
  if (euler) { const aR = fade(t, s[2].t0 + 0.9, 0.5); rich([['θ', 'i'], ['  =  ' + (th / Math.PI).toFixed(2) + ' ', ''], ['π', 'i']], RX, 640, 50, 'left', aR); text(th > Math.PI - 0.004 ? 'half a turn' : '', RX + 330, 636, UI(32, 500), C.ink2, 'left', aR); }
  fx('e^{i\\pi}\\;=\\;-1', RX, 838, 128, 'left', fade(t, s[3].t0 + 2.0, 0.6));
  g.restore();
};

S.arrows = (t, sc) => {
  const s = sc.sents, P = { x: 800, y: 150, w: 1010, h: 745 }, U = 250, ox = P.x + 248, oy = P.y + 330, X = v => ox + v * U, Y = v => oy - v * U;
  const T1 = 17, T2 = 20, tt = t < s[4].t0 ? T1 * ease(prog(t, s[0].t0 + 1.0, s[2].t0 - s[0].t0 - 1.0)) : T1 + (T2 - T1) * ease(prog(t, s[4].t0 + 0.2, sc.dur - 1.0 - s[4].t0));
  // left column: one term of the sum, as a length and an angle
  const px = 74, L1 = '\\frac{1}{n^s}\\;=\\;', L2 = '\\frac{1}{n^{\\sigma}}', L3 = '\\;\\cdot\\;', L4 = 'e^{-i\\,t\\,\\ln n}', xa = 120, ya = 300, aF = fade(t, s[0].t0 + 0.2, 0.7);
  const w1 = fx(L1, xa, ya, px, 'left', aF).w, b2 = fx(L2, xa + w1, ya, px, 'left', aF), w3 = fx(L3, xa + w1 + b2.w, ya, px, 'left', aF).w, b4 = fx(L4, xa + w1 + b2.w + w3, ya, px, 'left', aF);
  const tag = (x, w, l1, l2, a) => { if (a <= 0) return; g.save(); g.globalAlpha = a; g.beginPath(); g.moveTo(x, ya + 86); g.lineTo(x, ya + 98); g.lineTo(x + w, ya + 98); g.lineTo(x + w, ya + 86); stroke(C.muted, 2.5); g.restore(); text(l1, x + w / 2, ya + 140, UI(30, 600), C.ink, 'center', a); text(l2, x + w / 2, ya + 178, UI(24, 500), C.muted, 'center', a); };
  tag(xa + w1, b2.w, 'its length', 'set by the real part', fade(t, s[1].t0 + 0.2, 0.5)); tag(xa + w1 + b2.w + w3, b4.w, 'its angle', 'set by t', fade(t, s[1].t0 + 0.55 * (s[1].t1 - s[1].t0), 0.5));
  const aS = fade(t, s[0].t0 + 1.0, 0.6); fx('s\\;=\\;\\half+i\\,t', xa, 610, 60, 'left', aS); rich([['t', 'i'], ['  =  ' + tt.toFixed(2), '']], xa + 420, 610, 60, 'left', aS);
  const aN = fade(t, s[3].t0 + 0.3, 0.6); g.save(); g.globalAlpha = aN; g.beginPath(); g.arc(xa + 16, 704, 13, 0, 7); stroke(C.zero, 5); g.restore(); rich([['ζ', 'ib'], ['(', ''], ['s', 'i'], [')', ''], ['   the centre of the spiral', 's']], xa + 50, 716, 40, 'left', aN);
  text('On this line the sum itself never settles: the spiral keeps', xa, 806, UI(23, 500), C.muted, 'left', aN); text('widening as terms are added. Zeta is the point it circles.', xa, 838, UI(23, 500), C.muted, 'left', aN);
  // right: the arrows
  const aR = fade(t, s[0].t0 + 0.7, 0.7); if (aR <= 0) return; g.save(); g.globalAlpha = aR; g.beginPath(); g.rect(P.x, P.y, P.w, P.h); g.clip();
  g.strokeStyle = C.rule; g.lineWidth = 2; g.beginPath(); g.moveTo(P.x, oy); g.lineTo(P.x + P.w, oy); g.moveTo(ox, P.y); g.lineTo(ox, P.y + P.h); g.stroke();
  [1, 2].forEach(v => { g.beginPath(); g.moveTo(X(v), oy - 8); g.lineTo(X(v), oy + 8); g.stroke(); text(String(v), X(v), oy + 40, UI(24, 500), C.muted, 'center'); }); text('0', ox - 20, oy - 14, UI(24, 500), C.muted, 'center');
  chainAt(tt); RH.zeta(0.5, tt, ZV);
  const c0 = s[2].t0 + 0.15, c1 = s[2].t0 + 0.5 * (s[2].t1 - s[2].t0), NF = 6, K = t < c1 ? NF : Math.round(NF + (CHAIN_N - NF) * ease(prog(t, c1, s[2].t1 - c1 + 0.2)));
  if (t >= s[4].t0) { g.beginPath(); const i0 = Math.round(T1 / DT), i1 = Math.round(tt / DT); for (let i = i0; i <= i1; i++) { const x = X(ZP.re[i]), y = Y(ZP.im[i]); i === i0 ? g.moveTo(x, y) : g.lineTo(x, y); } stroke(C.zero, 5); }
  if (K > NF) { g.save(); g.globalAlpha *= 0.85; g.beginPath(); g.moveTo(X(CHX[NF]), Y(CHY[NF])); for (let n = NF + 1; n <= K; n++) g.lineTo(X(CHX[n]), Y(CHY[n])); stroke(C.ink2, 3); g.restore(); for (let n = NF + 1; n <= K; n++) { g.beginPath(); g.arc(X(CHX[n]), Y(CHY[n]), 2.6, 0, 7); g.fillStyle = C.ink2; g.fill(); } }
  for (let n = NF; n >= 1; n--) { // the first arrows: a fan from the origin, then head to tail
    const an = fade(t, s[0].t0 + 0.8 + 0.22 * (n - 1), 0.4), lk = ease(prog(t, c0 + 0.16 * (n - 1), 0.9)), bx = lk * CHX[n - 1], by = lk * CHY[n - 1], dx = CHX[n] - CHX[n - 1], dy = CHY[n] - CHY[n - 1];
    if (an <= 0) continue; g.save(); g.globalAlpha *= an; const thin = n > 4 ? lk : 0; arrow(X(bx), Y(by), X(bx + dx), Y(by + dy), n === 1 ? C.ink : C.ink2, n === 1 ? 7 : 6 - 3 * thin, 22 - 14 * thin);
    const m = Math.hypot(dx, dy), lx = X(bx + dx + 0.13 * dx / m), ly = Y(by + dy + 0.13 * dy / m); text(String(n), lx, ly + 2, UI(24, 600), C.muted, 'center', 1 - lk, 'middle'); g.restore(); }
  if (aN > 0) { g.save(); g.globalAlpha *= aN; g.beginPath(); g.arc(X(ZV[0]), Y(ZV[1]), 15, 0, 7); g.fillStyle = C.bg; g.fill(); stroke(C.zero, 6); g.restore(); }
  g.restore();
  text('n = 1, 2, 3, …  each term drawn as an arrow', P.x + 20, P.y + 34, UI(26, 500), C.muted, 'left', aR * (1 - fade(t, c0, 0.4)));
  text('1 + 2⁻ˢ + 3⁻ˢ + …  the arrows laid head to tail', P.x + 20, P.y + 34, UI(26, 500), C.muted, 'left', fade(t, c0 + 0.3, 0.4));
};

S.path = (t, sc) => {
  const s = sc.sents, T0 = 20, T1 = 46, tt = T0 + (T1 - T0) * prog(t, s[0].t0 - 0.3, sc.dur - 0.7 - s[0].t0), i1 = Math.round(tt / DT), aP = fade(t, 0.1, 0.6);
  g.save(); g.globalAlpha = aP;
  const A = { x: 170, y: 250, w: 400, h: 590 }, SX = v => A.x + (v + 0.5) / 2 * A.w, SY = v => A.y + A.h - v / 46 * A.h;
  g.fillStyle = C.surface; g.fillRect(SX(0), A.y, SX(1) - SX(0), A.h);
  g.strokeStyle = C.rule; g.lineWidth = 2; g.beginPath(); g.moveTo(A.x, A.y + A.h); g.lineTo(A.x + A.w, A.y + A.h); g.stroke();
  g.beginPath(); g.moveTo(SX(0.5), A.y); g.lineTo(SX(0.5), A.y + A.h); stroke(C.zero, 4);
  [[0, '0'], [0.5, '½'], [1, '1']].forEach(([v, l]) => text(l, SX(v), A.y + A.h + 40, UI(26, 500), C.muted, 'center')); text('real part', A.x + A.w / 2, A.y + A.h + 82, UI(24, 500), C.muted, 'center');
  [10, 20, 30, 40].forEach(v => { text(String(v), A.x - 14, SY(v), UI(24, 500), C.muted, 'right', 1, 'middle'); g.strokeStyle = C.grid; g.beginPath(); g.moveTo(A.x, SY(v)); g.lineTo(A.x + A.w, SY(v)); g.stroke(); });
  text('the input', A.x, A.y - 26, UI(26, 600), C.ink2, 'left'); fx('s\\;=\\;\\half+i\\,t', A.x + A.w, A.y - 26, 36, 'right');
  ZEROS.filter(z => z <= tt).forEach(z => { const k = easeOut(prog(tt, z, 1.2)); g.beginPath(); g.arc(SX(0.5), SY(z), 9 + 18 * (1 - k), 0, 7); g.save(); g.globalAlpha *= 0.35 * (1 - k); g.fillStyle = C.zero; g.fill(); g.restore(); dot(SX(0.5), SY(z), 9, C.zero, 3); });
  dot(SX(0.5), SY(tt), 11, C.ink, 4); text('the special line', SX(0.5) + 26, A.y + 30, UI(26, 500), C.zero, 'left', fade(t, s[1].t0, 0.5), 'middle');
  g.beginPath(); g.moveTo(620, 545); g.lineTo(740, 545); stroke(C.muted, 3); g.beginPath(); g.moveTo(740, 545); g.lineTo(724, 535); g.lineTo(724, 555); g.closePath(); g.fillStyle = C.muted; g.fill(); text('ζ', 678, 525, MATH(46), C.ink2, 'center');
  const B = { x: 800, y: 200, w: 1000, h: 670 }, tr = trace(B, i1, { iMax: Math.round(46 / DT), tail: 4 });
  text('the output', B.x, B.y - 16, UI(26, 600), C.ink2, 'left'); rich([['ζ', 'i'], ['(', ''], ['s', 'i'], [')', ''], ['    and the arrows that add up to it', 'sm']], B.x + 150, B.y - 16, 34, 'left');
  chainAt(tt); g.save(); g.beginPath(); g.rect(B.x, B.y, B.w, B.h); g.clip(); g.globalAlpha *= 0.62; g.beginPath(); g.moveTo(tr.X(0), tr.Y(0)); for (let n = 1; n <= CHAIN_N; n++) g.lineTo(tr.X(CHX[n]), tr.Y(CHY[n])); stroke(C.ink2, 2.5); g.restore();
  ZEROS.filter(z => z <= tt).forEach(z => { const k = prog(tt, z, 2.2); if (k < 1) { g.save(); g.globalAlpha *= 0.9 * (1 - k); g.beginPath(); g.arc(tr.X(0), tr.Y(0), 14 + 70 * easeOut(k), 0, 7); stroke(C.ink, 4); g.restore(); } });
  g.beginPath(); g.arc(tr.X(0), tr.Y(0), 12, 0, 7); g.fillStyle = C.bg; g.fill(); stroke(C.ink, 3.5); text('0', tr.X(0) - 26, tr.Y(0) + 44, UI(30, 600), C.ink, 'center');
  dot(tr.X(ZP.re[i1]), tr.Y(ZP.im[i1]), 11, C.zero, 4);
  const nz = ZEROS.filter(z => z <= tt).length; text('zeros so far', B.x + B.w, B.y + 20, UI(26, 500), C.muted, 'right'); text(String(nz), B.x + B.w, B.y + 96, DISP(84, true, 400), C.ink, 'right');
  g.restore();
};

/* ---------- overlays ---------- */
function caption(sc, t) {
  let cur = null; for (const s of sc.sents) if (t >= s.t0 - 0.12 && t <= s.t1 + 0.3) cur = s; if (!cur) return;
  let txt = cur.cap; const a = Math.min(fade(t, cur.t0 - 0.12, 0.18), 1 - fade(t, cur.t1 + 0.12, 0.18));
  if (txt.length > 88) { const mid = txt.length / 2; let best = -1, bd = 1e9; for (let i = 0; i < txt.length - 1; i++) { const c = txt[i]; if ((c === ',' || c === '.' || c === ':') && txt[i + 1] === ' ') { const d = Math.abs(i - mid) - (c === '.' ? 12 : 0); if (d < bd) { bd = d; best = i + 1; } } } if (best < 0 || bd > txt.length * 0.3) best = txt.lastIndexOf(' ', mid); const tm = cur.t0 + (cur.t1 - cur.t0) * (best / txt.length); txt = t < tm ? txt.slice(0, best).trim() : txt.slice(best).trim(); }
  g.save(); g.font = UI(42, 600); const words = txt.split(' '), lines = []; let line = '';
  for (const w of words) { const tr = line ? line + ' ' + w : w; if (g.measureText(tr).width > 1500 && line) { lines.push(line); line = w; } else line = tr; } lines.push(line);
  if (lines.length === 2 && lines[1].split(' ').length < 3) { const ws = txt.split(' '), h = Math.ceil(ws.length / 2) + 1; lines[0] = ws.slice(0, h).join(' '); lines[1] = ws.slice(h).join(' '); }
  const y0 = lines.length === 1 ? 994 : 966; g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
  const wmax = Math.max(...lines.map(l => g.measureText(l).width)); g.fillStyle = 'rgba(8,11,15,0.78)'; rrect(W / 2 - wmax / 2 - 34, y0 - 40, wmax + 68, 80 + (lines.length - 1) * 56, 16); g.fill();
  g.fillStyle = C.ink; lines.forEach((l, i) => g.fillText(l, W / 2, y0 + i * 56)); g.restore();
}
function chrome(i, sc, t) {
  if (sc.label) text(String(i + 1).padStart(2, '0') + '  ·  ' + sc.label.toUpperCase().replace('Π', 'π'), 1800, 84, UI(22, 600), C.muted, 'right', fade(t, 0.2, 0.5), 'alphabetic', 3);
  const p = (sc.start + t) / TL.total; g.fillStyle = C.rule; g.fillRect(0, H - 6, W, 6); g.fillStyle = C.zero; g.fillRect(0, H - 6, W * p, 6);
}
window.renderFrame = (i, t, raw) => {
  const sc = TL.scenes[i]; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  S[sc.id](t, sc); chrome(i, sc, t); caption(sc, t);
  const last = i === TL.scenes.length - 1, fo = last ? 1.1 : 0.3, k = Math.max(1 - fade(t, 0, i === 0 ? 0.6 : 0.3), fade(t, sc.dur - fo, fo - 0.04));
  if (k > 0) { g.globalAlpha = k; g.fillStyle = last && t > 1 ? '#000' : C.bg; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  return raw ? null : cv.toDataURL('image/jpeg', 0.92).slice(23);
};
window.ready = Promise.all(['500 40px "Bodoni Moda"', '400 40px "Bodoni Moda"', 'italic 500 40px "Bodoni Moda"', 'italic 400 40px "Bodoni Moda"', '400 40px STIXL', 'italic 400 40px STIXL', '400 40px STIXG', 'italic 400 40px STIXG', '400 40px STIXM'].map(f => document.fonts.load(f, 'aζΘ∑'))).then(() => true);
