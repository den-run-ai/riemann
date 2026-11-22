/* ---------- number-theory helpers (pure functions) ---------- */
const RH = {};
RH.sieve = function (N) {
  const comp = new Uint8Array(N + 1), primes = [];
  for (let i = 2; i <= N; i++) {
    if (!comp[i]) { primes.push(i); for (let j = i * i; j <= N; j += i) comp[j] = 1; }
  }
  return { comp, primes };
};
RH.tables = function (N) {
  const { comp, primes } = RH.sieve(N);
  const pi = new Uint32Array(N + 1), psi = new Float64Array(N + 1);
  for (const p of primes) { const L = Math.log(p); for (let q = p; q <= N; q *= p) psi[q] = L; }
  let c = 0, s = 0;
  for (let n = 0; n <= N; n++) { if (n > 1 && !comp[n]) c++; pi[n] = c; s += psi[n]; psi[n] = s; }
  return { comp, primes, pi, psi };
};
RH.li = function (x) {
  const L = Math.log(x); let s = 0.5772156649015329 + Math.log(L), term = 1;
  for (let k = 1; k < 400; k++) { term *= L / k; const a = term / k; s += a; if (a < 1e-13 * Math.abs(s)) break; }
  return s;
};
RH.LI2 = 1.0451637801174927;
/* Riemann zeta by Borwein's alternating-series algorithm; fine for 0 < sigma, |t| <= 70 */
(function () {
  const n = 90, d = new Float64Array(n + 1), ln = new Float64Array(n + 1);
  let c = 1 / n, s = 0;
  for (let i = 0; i <= n; i++) { s += c; d[i] = n * s; c *= 4 * (n + i) * (n - i) / ((2 * i + 1) * (2 * i + 2)); }
  const w = new Float64Array(n);
  for (let k = 0; k < n; k++) { w[k] = (k & 1 ? -1 : 1) * (d[k] / d[n] - 1); ln[k] = Math.log(k + 1); }
  const LN2 = Math.LN2;
  RH.zeta = function (sig, t, out) {
    let re = 0, im = 0;
    for (let k = 0; k < n; k++) {
      const m = w[k] * Math.exp(-sig * ln[k]), a = t * ln[k];
      re += m * Math.cos(a); im -= m * Math.sin(a);
    }
    const p = Math.pow(2, 1 - sig), dr = 1 - p * Math.cos(t * LN2), di = p * Math.sin(t * LN2);
    const den = dr * dr + di * di;
    out[0] = -(re * dr + im * di) / den; out[1] = -(im * dr - re * di) / den;
    return out;
  };
})();
/* points on y^2 = x^3 + a x + b over F_p (p >= 5), including the point at infinity */
RH.ecCount = function (a, b, p, collect) {
  const cnt = new Uint8Array(p), roots = collect ? [] : null;
  for (let y = 0; y < p; y++) cnt[(y * y) % p]++;
  let N = 1; const pts = [];
  for (let x = 0; x < p; x++) {
    let v = (((x * x) % p) * x + a * x + b) % p; if (v < 0) v += p;
    N += cnt[v];
    if (collect && cnt[v]) for (let y = 0; y < p; y++) if ((y * y) % p === v) pts.push(x, y);
  }
  let disc = (4 * a * a * a + 27 * b * b) % p; if (disc < 0) disc += p;
  return { N, ap: p + 1 - N, pts, singular: disc === 0 };
};
/* exponent of p in C(2n, n) */
RH.vBinom = function (n, p) { let v = 0; for (let q = p; q <= 2 * n; q *= p) v += Math.floor(2 * n / q) - 2 * Math.floor(n / q); return v; };
if (typeof module !== 'undefined') module.exports = RH;
