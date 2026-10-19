// ───────────── utilities ─────────────
const U = {
  int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  pick: a => a[Math.floor(Math.random() * a.length)],
  shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  rnorm() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  sum: a => a.reduce((s, v) => s + v, 0),
  mean: a => U.sum(a) / a.length,
  sd(a) { const m = U.mean(a); return Math.sqrt(U.sum(a.map(v => (v - m) ** 2)) / (a.length - 1)); },
  sorted: a => a.slice().sort((x, y) => x - y),
  // Tukey five-number summary, identical to R's fivenum()
  fivenum(x) { const s = U.sorted(x), n = s.length, n4 = Math.floor((n + 3) / 2) / 2;
    return [1, n4, (n + 1) / 2, n + 1 - n4, n].map(d => 0.5 * (s[Math.floor(d) - 1] + s[Math.ceil(d) - 1])); },
  // R quantile(type = 7)
  q7(x, p) { const s = U.sorted(x), h = (s.length - 1) * p, lo = Math.floor(h); return lo + 1 < s.length ? s[lo] + (h - lo) * (s[lo + 1] - s[lo]) : s[lo]; },
  qnorm(p) { // Acklam's approximation
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00],
      b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01],
      c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00],
      d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00], pl = 0.02425;
    let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  },
  ppoints(n) { const a = n <= 10 ? 3 / 8 : 0.5; return Array.from({ length: n }, (_, i) => (i + 1 - a) / (n + 1 - 2 * a)); },
  f(x, d = 2) { return (+x.toFixed(d)).toString(); },
  sig(x, s = 3) { return x === 0 ? '0' : (+x.toPrecision(s)).toString(); },
  comma: x => Math.round(x).toLocaleString('en-US'),
  uniq: a => [...new Set(a)],
  kde(x, bw, grid) { const k = 1 / (x.length * bw * Math.sqrt(2 * Math.PI));
    return grid.map(g => k * U.sum(x.map(v => Math.exp(-0.5 * ((g - v) / bw) ** 2)))); },
  nrd0(x) { const s = U.sorted(x), iqr = U.q7(s, .75) - U.q7(s, .25), sd = U.sd(s);
    return 0.9 * Math.min(sd, iqr / 1.34 || sd) * Math.pow(x.length, -0.2); },
  range: (a, b, step = 1) => { const r = []; for (let v = a; v <= b + 1e-9; v += step) r.push(+v.toFixed(10)); return r; },
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Build a multiple-choice object from a correct answer + distractors (all strings); returns null if not enough unique.
function mc(correct, distractors, n = 4) {
  const opts = [correct]; for (const d of distractors) { if (opts.length >= n) break; if (d != null && !opts.includes(d)) opts.push(d); }
  return opts.length === n ? { c: opts, a: 0 } : null;
}

// ───────────── SVG plotting ─────────────
function niceTicks(lo, hi, n = 5) {
  const span = hi - lo || 1, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0)), err = step0 / mag;
  const step = err >= 7.5 ? 10 * mag : err >= 3.5 ? 5 * mag : err >= 1.5 ? 2 * mag : mag;
  const t = []; for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) t.push(+v.toFixed(10)); return t;
}
function frame(o) {
  const w = o.w || 460, h = o.h || 280, m = Object.assign({ l: 52, r: 16, t: o.title ? 30 : 14, b: 44 }, o.m || {});
  const [x0, x1] = o.xd, [y0, y1] = o.yd, pw = w - m.l - m.r, ph = h - m.t - m.b;
  const sx = v => m.l + (v - x0) / (x1 - x0) * pw, sy = v => m.t + ph - (v - y0) / (y1 - y0) * ph;
  let s = `<svg viewBox="0 0 ${w} ${h}" class="plot" role="img" xmlns="http://www.w3.org/2000/svg">`;
  if (o.title) s += `<text x="${m.l}" y="18" class="ttl">${esc(o.title)}</text>`;
  const cid = 'cp' + Math.random().toString(36).slice(2, 9);
  s += `<defs><clipPath id="${cid}"><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/></clipPath></defs><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" class="panel"/>`;
  const xt = o.xticks || niceTicks(x0, x1), yt = o.yticks || niceTicks(y0, y1);
  if (o.grid !== false) { for (const v of xt) s += `<line x1="${sx(v)}" x2="${sx(v)}" y1="${m.t}" y2="${m.t + ph}" class="grid"/>`;
    for (const v of yt) s += `<line x1="${m.l}" x2="${m.l + pw}" y1="${sy(v)}" y2="${sy(v)}" class="grid"/>`; }
  for (const v of xt) s += `<line x1="${sx(v)}" x2="${sx(v)}" y1="${m.t + ph}" y2="${m.t + ph + 4}" class="ax"/><text x="${sx(v)}" y="${m.t + ph + 16}" class="tk" text-anchor="middle">${o.xfmt ? o.xfmt(v) : v}</text>`;
  if (!o.noy) for (const v of yt) s += `<line x1="${m.l - 4}" x2="${m.l}" y1="${sy(v)}" y2="${sy(v)}" class="ax"/><text x="${m.l - 7}" y="${sy(v) + 4}" class="tk" text-anchor="end">${o.yfmt ? o.yfmt(v) : v}</text>`;
  if (o.xlab) s += `<text x="${m.l + pw / 2}" y="${h - 8}" class="lab" text-anchor="middle">${esc(o.xlab)}</text>`;
  if (o.ylab) s += `<text transform="translate(14 ${m.t + ph / 2}) rotate(-90)" class="lab" text-anchor="middle">${esc(o.ylab)}</text>`;
  return { sx, sy, w, h, m, pw, ph, clip: `clip-path="url(#${cid})"`, head: s, end: '</svg>' };
}
function histSVG(breaks, counts, o = {}) {
  const ymax = Math.max(...counts, 1);
  const F = frame(Object.assign({ xd: [breaks[0], breaks[breaks.length - 1]], yd: [0, ymax * 1.08], ylab: 'count',
    yticks: niceTicks(0, ymax, Math.min(ymax, 5)).filter(v => Number.isInteger(v) || ymax > 10) }, o));
  let s = F.head;
  counts.forEach((c, i) => { if (c > 0) s += `<rect x="${F.sx(breaks[i])}" y="${F.sy(c)}" width="${F.sx(breaks[i + 1]) - F.sx(breaks[i])}" height="${F.sy(0) - F.sy(c)}" class="bar"/>`; });
  return s + F.end;
}
const wrap = (svg, cap) => `<figure class="fig">${svg}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
const table = (head, rows) => `<table class="dt"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</table>`;

// ───────────── generators ─────────────
const GEN = {};

GEN.outliers = { t: 'box', name: 'Boxplot outliers (fences)', make() {
  for (let k = 0; k < 400; k++) {
    const n = U.pick([11, 12, 13, 15]), c = U.int(10, 60), sp = U.int(3, 8), ext = U.int(1, 3);
    const x = [];
    for (let i = 0; i < n - ext; i++) x.push(Math.round(c + U.rnorm() * sp));
    for (let i = 0; i < ext; i++) x.push(Math.round(c + (Math.random() < .5 ? -1 : 1) * sp * (2 + Math.random() * 4)));
    const s = U.sorted(x); if (new Set(s).size !== n) continue;
    const f = U.fivenum(s), lh = f[1], uh = f[3], H = uh - lh; if (H <= 0) continue;
    const lo = lh - 1.5 * H, hi = uh + 1.5 * H; if (s.includes(lo) || s.includes(hi)) continue;
    const set = m => s.filter(v => v < lh - m * H || v > uh + m * H), fmt = a => a.length ? a.join(', ') : 'none';
    const out = set(1.5);
    const sdset = s.filter(v => Math.abs(v - U.mean(s)) > 2 * U.sd(s));
    const plusNext = out.length ? U.uniq([...out, s.find(v => v >= lo && v <= hi && (v < lh ? true : false)) ?? s[0]]).sort((a, b) => a - b) : [s[0]];
    const r = mc(fmt(out), U.shuffle([fmt(set(1)), fmt(set(3)), fmt(set(0.75)), fmt(sdset), fmt(plusNext), fmt(out.filter(v => v > hi)), fmt(out.filter(v => v < lo))]));
    if (!r || (out.length === 0 && Math.random() < .7)) continue;
    const hint = Math.random() < .5;
    return Object.assign(r, {
      q: `If a boxplot were drawn in R (base R / Tukey method) based on the data below, which values, if any, would be shown as outliers?<pre>Values: ${s.join(', ')}</pre>${hint ? `(Hint: the lower hinge is ${lh} and the upper hinge is ${uh}.)` : '(Compute the hinges yourself — n = ' + n + '.)'}`,
      e: `${hint ? '' : `Tukey hinges (fivenum): split the sorted data in half${n % 2 ? ' (the median belongs to both halves when n is odd)' : ''}; the lower hinge is the median of the lower half = <b>${lh}</b>, the upper hinge = <b>${uh}</b>.<br>`}H-spread = ${uh} − ${lh} = <b>${H}</b>. Fences: ${uh} + 1.5(${H}) = <b>${U.f(hi)}</b> and ${lh} − 1.5(${H}) = <b>${U.f(lo)}</b>. Values beyond the fences: <b>${fmt(out)}</b>. Whiskers stop at the most extreme values inside the fences.` });
  } } };

GEN.hinge = { t: 'box', name: 'Tukey hinges vs quantile()', make() {
  for (let k = 0; k < 300; k++) {
    const n = U.int(8, 13), s = U.sorted(Array.from({ length: n }, () => U.int(1, 60)));
    if (new Set(s).size !== n) continue;
    const upper = Math.random() < .5, f = U.fivenum(s), hinge = upper ? f[3] : f[1], q = U.q7(s, upper ? .75 : .25);
    const half = upper ? s.slice(Math.ceil(n / 2)) : s.slice(0, Math.floor(n / 2));
    const halfMed = U.q7(half, .5);
    const r = mc(U.f(hinge), U.shuffle([U.f(q), U.f(halfMed), U.f(f[2]), U.f(upper ? s[n - 2] : s[1]), U.f(U.mean(half))]));
    if (!r || Math.abs(hinge - q) < 1e-9) continue;
    return Object.assign(r, {
      q: `Base R's <code>boxplot()</code> uses Tukey's hinges (<code>fivenum()</code>). What is the <b>${upper ? 'upper' : 'lower'} hinge</b> of:<pre>${s.join(' ')}</pre>`,
      e: `n = ${n}. Tukey: split the sorted data into halves${n % 2 ? ', <b>including the median in both halves</b> because n is odd' : ''}; the ${upper ? 'upper' : 'lower'} hinge is the median of the ${upper ? 'upper' : 'lower'} half = <b>${U.f(hinge)}</b>.<br>Compare: R's default <code>quantile(x, ${upper ? .75 : .25})</code> (type 7) = ${U.f(q)} — this is what ggplot2's <code>geom_boxplot()</code> uses, which is why base R and ggplot2 boxes can differ slightly.` });
  } } };

GEN.densHist = { t: 'hist', name: 'Density histogram heights', make() {
  for (let k = 0; k < 200; k++) {
    const w = U.pick([2, 5, 10, 20, 50, 100]), start = w * U.int(0, 8), K = 5;
    const cnt = Array.from({ length: K }, () => U.int(1, 18)), n = U.sum(cnt), j = U.int(0, K - 1);
    const dens = cnt[j] / (n * w), rel = cnt[j] / n;
    const r = mc(U.sig(dens), U.shuffle([U.sig(rel), U.sig(cnt[j] / w), U.sig(cnt[j] * w / n), U.sig(1 / (K * w))]));
    if (!r) continue;
    const rows = cnt.map((c, i) => [`${start + i * w}–${start + (i + 1) * w}`, c]);
    return Object.assign(r, {
      q: `A histogram is drawn with binwidth ${w} using these counts (n = ${n}). If you switch to a <b>density</b> histogram (<code>y = after_stat(density)</code>), what is the height of the ${rows[j][0]} bar?${table(['bin', 'count'], rows)}`,
      e: `density = relative frequency / binwidth = (${cnt[j]}/${n}) / ${w} = <b>${U.sig(dens)}</b>. Check: area = ${w} × ${U.sig(dens)} = ${U.sig(rel)} = the relative frequency, and all bar areas add to 1.` });
  } } };

GEN.unequal = { t: 'hist', name: 'Unequal bin widths (Q3-style)', make() {
  const groups = [['Under 5', 0, 5], ['5–9', 5, 5], ['10–14', 10, 5], ['15–19', 15, 5], ['20–24', 20, 5], ['25–34', 25, 10], ['35–44', 35, 10], ['45–54', 45, 10], ['55–59', 55, 5], ['60–64', 60, 5], ['65–74', 65, 10], ['75–84', 75, 10]];
  const t = U.pick([1, 2, 3]), wide = U.pick([5, 6, 7, 10]), narrowIdx = U.pick([0, 1, 2, 3, 8, 9]);
  const rateB = U.int(4, 9) * 100, rate = groups.map(() => U.int(3, 14) * 100);
  rate[narrowIdx] = rateB; rate[wide] = rateB * t;
  const counts = groups.map((g, i) => rate[i] * g[2] + U.int(-40, 40));
  counts[narrowIdx] = rateB * 5; counts[wide] = rateB * t * 10;
  const ageA = groups[wide][1] + U.int(1, 8), ageB = groups[narrowIdx][1] + U.int(1, 3);
  const ratio = v => v >= 1 ? `${v}:1` : `1:${1 / v}`;
  const r = mc(ratio(t), U.shuffle([ratio(2 * t), ratio(4 * t), t > 1 ? ratio(t / 2 >= 1 ? t / 2 : 0.5) : ratio(0.5)]));
  const mx = Math.max(...counts), H = 26 + groups.length * 20;
  const F = frame({ w: 480, h: H + 40, m: { l: 70, t: 10, b: 40 }, xd: [0, mx * 1.05], yd: [0, groups.length], yticks: [], noy: true, xlab: 'count', xfmt: v => U.comma(v) });
  let s = F.head;
  groups.forEach((g, i) => { const y = F.m.t + (i + .15) * (F.ph / groups.length), bh = F.ph / groups.length * .7;
    s += `<rect x="${F.sx(0)}" y="${y}" width="${F.sx(counts[i]) - F.sx(0)}" height="${bh}" class="bar"/><text x="${F.m.l - 6}" y="${y + bh * .8}" class="tk" text-anchor="end">${g[0]}</text>`; });
  return Object.assign(r, { fig: wrap(s + F.end, 'Population by age group'),
    q: `Based on the bar chart, what is your best estimate of the ratio of ${ageA}-year-olds to ${ageB}-year-olds?`,
    e: `The ${groups[wide][0]} bar (${U.comma(counts[wide])}) is about ${2 * t}× the ${groups[narrowIdx][0]} bar (${U.comma(counts[narrowIdx])}) — but the brackets have different widths (10 years vs 5 years). Per single year of age: ${U.comma(counts[wide])}/10 = ${U.comma(counts[wide] / 10)} vs ${U.comma(counts[narrowIdx])}/5 = ${U.comma(counts[narrowIdx] / 5)} → about <b>${ratio(t)}</b>. Watch for inconsistent bin widths (sample midterm Q3).` });
} };

GEN.closed = { t: 'hist', name: 'Right-closed vs left-closed bins', make() {
  for (let k = 0; k < 300; k++) {
    const base = 5 * U.int(6, 14), x = U.sorted(Array.from({ length: U.int(9, 12) }, () => base + U.int(0, 20)));
    const L = base + 5 * U.int(1, 2), R = L + 5;
    const rc = x.filter(v => v > L && v <= R).length, lc = x.filter(v => v >= L && v < R).length;
    const both = x.filter(v => v >= L && v <= R).length, none = x.filter(v => v > L && v < R).length;
    if (rc === lc) continue;
    const left = Math.random() < .4, ans = left ? lc : rc;
    const r = mc(String(ans), U.shuffle([String(left ? rc : lc), String(both), String(none), String(ans + 1)]));
    if (!r) continue;
    return Object.assign(r, {
      q: `<pre>x = c(${x.join(', ')})\nggplot(df, aes(x)) +\n  geom_histogram(binwidth = 5, boundary = 0${left ? ', closed = "left"' : ''})</pre>How many observations are in the bar that spans <b>${L} to ${R}</b>?`,
      e: `${left ? '<code>closed = "left"</code> → bins are <b>[a, b)</b>: a value on the boundary goes to the bin on its right.' : 'ggplot2\'s default is <code>closed = "right"</code> → bins are <b>(a, b]</b>: a value exactly on a boundary goes into the bin on its left.'} Values in ${left ? `[${L}, ${R})` : `(${L}, ${R}]`}: ${x.filter(v => left ? v >= L && v < R : v > L && v <= R).join(', ') || 'none'} → <b>${ans}</b>. (With the other convention it would be ${left ? rc : lc}.)` });
  } } };

GEN.histNot = { t: 'hist', name: 'Which could NOT be a histogram? (Q2-style)', make() {
  for (let k = 0; k < 500; k++) {
    const lo = U.int(1, 5), hi = lo + 5, x = U.sorted([lo, hi, ...Array.from({ length: 8 }, () => U.int(lo, hi))]);
    const br = U.range(lo, hi), cbr = U.range(lo - .5, hi + .5);
    const rc = br.slice(0, -1).map((b, i) => x.filter(v => i === 0 ? v >= b && v <= br[i + 1] : v > b && v <= br[i + 1]).length);
    const lcC = br.slice(0, -1).map((b, i) => x.filter(v => i === 4 ? v >= b && v <= br[i + 1] : v >= b && v < br[i + 1]).length);
    const cen = cbr.slice(0, -1).map((b, i) => x.filter(v => v > b && v < cbr[i + 1]).length);
    const base = U.pick([rc, lcC]), bad = base.slice(), i = U.int(0, 4);
    if (Math.random() < .5) { if (bad[i] === 0) continue; bad[i]--; } else { const j = i < 4 ? i + 1 : i - 1; if (bad[i] === 0) continue; bad[i]--; bad[j]++; }
    const same = (a, b) => a.length === b.length && a.every((v, q) => v === b[q]);
    if (same(bad, rc) || same(bad, lcC)) continue;
    const panels = U.shuffle([{ k: 'rc', br, c: rc }, { k: 'lc', br, c: lcC }, { k: 'cen', br: cbr, c: cen }, { k: 'bad', br, c: bad }]);
    const ymax = Math.max(...panels.flatMap(p => p.c));
    const L = ['A', 'B', 'C', 'D'], ans = panels.findIndex(p => p.k === 'bad');
    const figs = panels.map((p, q) => `<div class="mini"><div class="mini-l">${L[q]}</div>${histSVG(p.br, p.c, { w: 210, h: 160, yd: [0, ymax * 1.08], ylab: 'Frequency', m: { l: 40, b: 26, t: 8, r: 8 }, xticks: p.k === 'cen' ? U.range(lo, hi, 2) : br, grid: false, yticks: U.range(0, ymax) })}</div>`).join('');
    const desc = { rc: 'right-closed bins (a, b] (first bin includes its left edge)', lc: 'right-open bins [a, b) (last bin includes its right edge)', cen: 'bins of width 1 centered on the integers', bad: '' };
    return { c: L.map(l => 'Histogram ' + l), a: ans, fx: true, fig: `<div class="minis">${figs}</div>`,
      q: `Which of the following could NOT be a histogram of the given data?<pre>x = c(${x.join(', ')})</pre>`,
      e: panels.map((p, q) => `${L[q]}: ${p.k === 'bad' ? `<b>impossible</b> — counts ${p.c.join(', ')} (sum ${U.sum(p.c)}) don't match any binning of the data` : desc[p.k] + ' ✓'}`).join('<br>') + '<br>Integer data sit exactly on integer bin boundaries, so right-closed vs right-open changes the bars.' };
  } } };

const PIV = [
  { id: ['country'], m: ['`2019`', '`2020`', '`2021`', '`2022`', '`2023`'], names: 'year', values: 'gdp' },
  { id: ['income'], m: ['`Very Dissatisfied`', 'Dissatisfied', 'Satisfied', '`Very Satisfied`'], names: 'response', values: 'count' },
  { id: ['state', 'region'], m: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], names: 'month', values: 'rain' },
  { id: ['school'], m: ['Reading', 'Math', 'Writing'], names: 'subject', values: 'score' },
  { id: ['Type'], m: ['Alcohol', 'Malic', 'Ash', 'Magnesium', 'Phenols', 'Flavanoids', 'Proline'], names: 'variable', values: 'value' },
];
GEN.pivot = { t: 'facet', name: 'pivot_longer() dimensions', make() {
  const P = U.pick(PIV), m = U.int(3, P.m.length), meas = P.m.slice(0, m), r = U.int(3, 9), k = P.id.length;
  const useMinus = Math.random() < .4;
  const cols = useMinus ? (k === 1 ? `-${P.id[0]}` : `-c(${P.id.join(', ')})`) : `${meas[0]}:${meas[m - 1]}`;
  const R2 = r * m, C2 = k + 2, f = (a, b) => `${a} rows, ${b} columns`;
  const res = mc(f(R2, C2), U.shuffle([f(R2, 2), f(r, C2), f(R2, k + m), f(r * (m + k), C2), f(r, m + k)]));
  return Object.assign(res, {
    q: `The data frame <code>df</code> is <b>${r} × ${k + m}</b> with columns: <code>${[...P.id, ...meas].join(', ')}</code>. How many rows and columns does the result have?<pre>df |> pivot_longer(cols = ${cols},\n                  names_to = "${P.names}", values_to = "${P.values}")</pre>`,
    e: `Each of the ${r} rows is repeated once for each of the ${m} pivoted columns → ${r} × ${m} = <b>${R2} rows</b>. Columns: the ${k} kept id column${k > 1 ? 's' : ''} (${P.id.join(', ')}) + <code>${P.names}</code> + <code>${P.values}</code> = <b>${C2}</b>. (Sample midterm Q18 is this exact idea: 4 × 4 = 16 rows, 3 columns.)` });
} };

const DS = {
  mpg: { cont: ['cty', 'hwy', 'displ', 'cyl'], cat: ['drv', 'class', 'fl'] },
  penguins: { cont: ['bill_len', 'bill_dep', 'flipper_len', 'body_mass'], cat: ['species', 'island', 'sex'] },
  diamonds: { cont: ['carat', 'price', 'depth', 'table'], cat: ['cut', 'clarity', 'cut'] },
};
GEN.scales = { t: 'gg', name: 'Counting scales', make() {
  const dn = U.pick(Object.keys(DS)), D = DS[dn], cont = U.shuffle(D.cont), cat = U.shuffle(D.cat);
  const top = [`x = ${cont[0]}`, `y = ${cont[1]}`], geomAes = [], mapped = ['x', 'y'];
  const pool = U.shuffle([['color', U.pick([cat[0], cont[2]])], ['size', cont[3]], ['shape', cat[1]], ['alpha', cont[2]]]).slice(0, U.int(0, 3));
  pool.forEach(([a, v]) => { (Math.random() < .6 ? top : geomAes).push(`${a} = ${v}`); mapped.push(a); });
  const settings = U.shuffle([mapped.includes('alpha') ? null : 'alpha = .5', mapped.includes('size') ? null : 'size = 2', mapped.includes('color') ? null : 'color = "navy"', mapped.includes('shape') ? null : 'shape = 1'].filter(Boolean)).slice(0, U.int(1, 2));
  const geomArgs = [geomAes.length ? `aes(${geomAes.join(', ')})` : null, ...settings].filter(Boolean).join(', ');
  const extra = U.pick(['', `\n  facet_wrap(~${cat[2]}) +`, `\n  geom_smooth(method = "lm", se = FALSE) +`, `\n  theme_bw(14) +`]);
  let code = `ggplot(${dn}, aes(${top.join(', ')})) +\n  geom_point(${geomArgs})`;
  if (extra) code = code.replace(/\)$/, ') +') + extra.replace(/ \+$/, '');
  const n = mapped.length, res = mc(String(n), U.shuffle([String(n - 1), String(n + 1), String(n + settings.length), String(n + 2)]));
  return Object.assign(res, {
    q: `Counting default scales, how many scales does this graph have?<pre>${code}</pre>`,
    e: `One scale per <b>aesthetic mapping</b> (anything inside <code>aes()</code>, in ggplot() or in a geom): <b>${mapped.join(', ')}</b> → ${n}. Settings outside aes() (${settings.join(', ')}) create no scales.${extra.includes('facet') ? ' Facets are not scales.' : extra.includes('smooth') ? ' The extra layer reuses the same x and y scales.' : extra.includes('theme') ? ' Themes are not scales.' : ''}` });
} };

GEN.mappings = { t: 'gg', name: 'Mappings vs settings', make() {
  const dn = U.pick(Object.keys(DS)), D = DS[dn], cont = U.shuffle(D.cont), cat = U.shuffle(D.cat);
  const T = U.pick([
    () => ({ code: `ggplot(${dn}, aes(x = ${cont[0]})) +\n  geom_histogram(aes(fill = ${cat[0]}), color = "white", binwidth = 5)`, maps: ['x', 'fill'], sets: ['color'], inner: ['fill'] }),
    () => ({ code: `ggplot(${dn}, aes(x = ${cat[0]}, y = ${cont[0]})) +\n  geom_boxplot(fill = "lightblue") +\n  geom_jitter(aes(color = ${cat[1]}), width = .2)`, maps: ['x', 'y', 'color'], sets: ['fill'], inner: ['color'] }),
    () => ({ code: `ggplot(${dn}, aes(x = ${cont[0]}, y = ${cont[1]})) +\n  geom_point(aes(size = ${cont[2]}), color = "navy", alpha = .3)`, maps: ['x', 'y', 'size'], sets: ['color', 'alpha'], inner: ['size'] }),
    () => ({ code: `ggplot(${dn}, aes(x = ${cont[0]}, y = after_stat(density))) +\n  geom_histogram(fill = "cornflowerblue") +\n  geom_density(aes(color = ${cat[0]}))`, maps: ['x', 'y', 'color'], sets: ['fill'], inner: ['color'] }),
    () => ({ code: `ggplot(${dn}, aes(x = ${cont[0]}, y = ${cont[1]}, shape = ${cat[0]})) +\n  geom_point(size = 3, color = "grey30")`, maps: ['x', 'y', 'shape'], sets: ['size', 'color'], inner: [] }),
  ])();
  const L = a => a.length === 1 ? a[0] + ' only' : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const outer = T.maps.filter(m => !T.inner.includes(m));
  const res = mc(L(T.maps), U.shuffle([L([...T.maps, ...T.sets]), outer.length ? L(outer) : null, T.inner.length ? L(T.inner) : null, L([...outer, ...T.sets]), L(T.maps.filter(m => m !== 'y').concat(T.sets.slice(0, 1))), L(T.maps.slice(0, -1)), L(T.sets), L(['x', 'y']), L(['x'])]));
  return Object.assign(res, {
    q: `Which of the following are <b>aesthetic mappings</b> in the code below?<pre>${T.code}</pre>`,
    e: `Mappings are inside <code>aes()</code> — whether in ggplot() (inherited by every layer) or inside a geom: <b>${T.maps.join(', ')}</b>. ${T.sets.map(s => `<code>${s}</code>`).join(' and ')} ${T.sets.length > 1 ? 'are settings' : 'is a setting'} (a constant outside aes()). Parameters like binwidth/width aren't aesthetics at all.` });
} };

// QQ plot shapes
const QQT = {
  norm: { lab: 'approximately normally distributed', gen: () => 50 + 10 * U.rnorm(), why: 'Points follow the reference line closely — approximately normal.' },
  right: { lab: 'right-skewed (positively skewed)', gen: () => -Math.log(Math.random()) * 10, why: 'Convex "smile": the upper tail rises far above the line (long right tail) and the lower tail sits above the line too (short left tail) → right skew.' },
  left: { lab: 'left-skewed (negatively skewed)', gen: () => 100 + Math.log(Math.random()) * 10, why: 'Concave "frown": the lower tail drops far below the line (long left tail) → left skew.' },
  heavy: { lab: 'heavier-tailed than normal (e.g., t distribution)', gen: () => { let c = 0; for (let i = 0; i < 3; i++) c += U.rnorm() ** 2; return 10 * U.rnorm() / Math.sqrt(c / 3); }, why: 'S-shape steep at the ends: lowest values below the line, highest above → extremes more extreme than normal (fat tails).' },
  light: { lab: 'lighter-tailed than normal (e.g., uniform)', gen: () => Math.random() * 100, why: 'Ends flatten out (low end above the line, high end below) → the extremes are less extreme than normal: light tails, as with a uniform distribution.' },
};
GEN.qq = { t: 'norm', name: 'Read a QQ plot', make() {
  const key = U.pick(Object.keys(QQT)), n = 120;
  const s = U.sorted(Array.from({ length: n }, QQT[key].gen)), th = U.ppoints(n).map(U.qnorm);
  const q1s = U.q7(s, .25), q3s = U.q7(s, .75), q1t = U.qnorm(.25), q3t = U.qnorm(.75), sl = (q3s - q1s) / (q3t - q1t), ic = q1s - sl * q1t;
  const ylo = Math.min(...s), yhi = Math.max(...s), pad = (yhi - ylo) * .06;
  const F = frame({ xd: [-3, 3], yd: [ylo - pad, yhi + pad], xlab: 'Theoretical Quantiles', ylab: 'Sample Quantiles', title: 'Normal Q–Q Plot', yfmt: v => U.sig(v, 3) });
  let svg = F.head + `<line x1="${F.sx(-3)}" y1="${F.sy(ic - 3 * sl)}" x2="${F.sx(3)}" y2="${F.sy(ic + 3 * sl)}" class="ref" ${F.clip}/>`;
  s.forEach((v, i) => { svg += `<circle cx="${F.sx(th[i])}" cy="${F.sy(v)}" r="2.6" class="pt"/>`; });
  svg += F.end;
  const others = U.shuffle(Object.keys(QQT).filter(k => k !== key)).slice(0, 3).map(k => 'The data appear to be ' + QQT[k].lab);
  return { c: ['The data appear to be ' + QQT[key].lab, ...others], a: 0, fig: wrap(svg.replace('<svg', '<svg style="overflow:hidden"')),
    q: 'What can be concluded from the normal QQ plot below?', e: QQT[key].why + ' (Reference line drawn through the quartiles, as geom_qq_line() does.)' };
} };

GEN.bandwidth = { t: 'dens', name: 'Bandwidth comparison', make() {
  const x = Array.from({ length: 80 }, () => Math.random() < .5 ? 30 + 5 * U.rnorm() : 55 + 6 * U.rnorm());
  const h = U.nrd0(x), small = h * U.pick([.25, .3, .35]), big = h * U.pick([2.2, 2.6, 3]);
  const grid = U.range(0, 90, 0.75), dS = U.kde(x, small, grid), dB = U.kde(x, big, grid), ymax = Math.max(...dS, ...dB) * 1.1;
  const aIsBig = Math.random() < .5, A = aIsBig ? dB : dS, B = aIsBig ? dS : dB;
  const F = frame({ xd: [0, 90], yd: [0, ymax], xlab: 'x', ylab: 'density', yfmt: v => U.sig(v, 2) });
  const path = d => 'M' + grid.map((g, i) => `${F.sx(g).toFixed(1)},${F.sy(d[i]).toFixed(1)}`).join('L');
  const svg = F.head + `<path d="${path(A)}" class="ln"/><path d="${path(B)}" class="ln2"/>` +
    `<text x="${F.w - 120}" y="${F.m.t + 16}" class="tk">── curve A</text><text x="${F.w - 120}" y="${F.m.t + 32}" class="tk">- - curve B</text>` + F.end;
  return { c: ['Curve A', 'Curve B', 'They have the same bandwidth; B just uses a different kernel', 'It cannot be determined without the raw data'], a: aIsBig ? 0 : 1, fx: true, fig: wrap(svg),
    q: 'Both curves are <code>geom_density()</code> estimates of the <b>same data</b>. Which curve was drawn with the <b>larger bandwidth</b>?',
    e: `Larger bandwidth → smoother curve with fewer ups and downs. Curve ${aIsBig ? 'A' : 'B'} is the smooth one (bw ≈ ${U.sig(big, 2)}); curve ${aIsBig ? 'B' : 'A'} (bw ≈ ${U.sig(small, 2)}) is bumpy. Don't over-interpret small bumps — try several bandwidths.` };
} };

GEN.densArea = { t: 'dens', name: 'Area under a density curve', make() {
  const scale = U.pick([0.005, 0.01, 0.1, 10, 50, 100]);
  const x = Array.from({ length: 60 }, () => scale * (Math.random() < .7 ? Math.abs(1.2 * U.rnorm()) : 3 + Math.abs(U.rnorm())));
  const lo = 0, hi = Math.max(...x) * 1.1, grid = U.range(lo, hi, (hi - lo) / 200), bw = U.nrd0(x), d = U.kde(x, bw, grid), pk = Math.max(...d);
  const F = frame({ xd: [lo, hi], yd: [0, pk * 1.1], xlab: 'x', ylab: 'density', title: 'ggplot(df, aes(x)) + geom_density()', xfmt: v => U.sig(v, 3), yfmt: v => U.sig(v, 3) });
  const pts = grid.map((g, i) => `${F.sx(g).toFixed(1)},${F.sy(d[i]).toFixed(1)}`);
  const svg = F.head + `<path d="M${F.sx(lo)},${F.sy(0)}L${pts.join('L')}L${F.sx(hi)},${F.sy(0)}Z" class="area"/>` + F.end;
  const res = mc('1', U.shuffle([U.sig(pk, 2), U.sig(pk * (hi - lo) / 2, 2), U.sig(hi - lo, 2), U.sig(pk * (hi - lo), 2), '0.5']));
  return Object.assign(res, { fig: wrap(svg), q: 'What is the approximate area of the shaded portion of the graph?',
    e: `A density curve always has total area <b>1</b>, no matter the scale of x. Here x spans about ${U.sig(hi, 2)}, so the peak is ${U.sig(pk, 2)} — ${pk > 1 ? 'heights above 1 are perfectly fine' : 'tiny heights are fine'} because area = height × width.` });
} };

// ───── mosaic drawing ─────
const MOS = [
  { v: [['Age', ['young', 'old']], ['Music', ['classical', 'rock']]], dep: ['Favorite', ['bubble gum', 'coffee']] },
  { v: [['Temperature', ['Low', 'High']], ['Water_softness', ['Soft', 'Medium', 'Hard']], ['M_User', ['Yes', 'No']]], dep: ['Preference', ['Brand X', 'Brand M']] },
  { v: [['Sex', ['F', 'M']], ['Size', ['small', 'large']]], dep: ['Food', ['other', 'invert.', 'fish']] },
  { v: [['Contact', ['Low', 'High']], ['Type', ['Tower', 'Apart.', 'Terrace']], ['Influence', ['Low', 'Med', 'High']]], dep: ['Satisfaction', ['Low', 'Med', 'High']] },
  { v: [['Program', ['Undergrad', 'Grad']], ['Housing', ['On', 'Off']]], dep: ['Binge', ['No', 'Yes']] },
  { v: [['Treatment', ['Placebo', 'Drug']], ['Sex', ['F', 'M']], ['Age', ['<50', '50+']]], dep: ['Outcome', ['no change', 'partial', 'cured']] },
];
const FILLS = { 2: ['#dcdcdc', '#4a4a4a'], 3: ['#e3e3e3', '#9a9a9a', '#3d3d3d'] };
function mosaicSVG(vars, dirs, count, o = {}) {
  const W = o.w || 560, Hh = o.h || 330, m = Object.assign({ l: 78, r: 112, t: 46, b: 56 }, o.m || {});
  const gaps = o.gaps || [10, 5, 3, 2], groups = vars.map(() => []), leaves = [];
  const total = path => { let s = 0; const rec = (d, p) => { if (d === vars.length) { s += count(p); return; } vars[d][1].forEach(l => rec(d + 1, [...p, l])); };
    rec(path.length, path); return s; };
  const split = (x, y, w, h, d, path) => {
    if (d === vars.length) { leaves.push({ x, y, w, h, path }); return; }
    const lv = vars[d][1], wt = lv.map(l => total([...path, l])), tot = U.sum(wt), last = d === vars.length - 1, g = last ? 0 : gaps[d];
    const len = (dirs[d] === 'v' ? w : h) - g * (lv.length - 1); let off = 0;
    lv.forEach((l, i) => { const sz = tot ? len * wt[i] / tot : 0;
      const r = dirs[d] === 'v' ? [x + off, y, sz, h] : [y + off, x, sz, w];
      const rect = dirs[d] === 'v' ? { x: r[0], y, w: sz, h } : { x, y: r[0], w, h: sz };
      groups[d].push(Object.assign({ level: l, i }, rect)); split(rect.x, rect.y, rect.w, rect.h, d + 1, [...path, l]); off += sz + g; });
  };
  const pw = W - m.l - m.r, ph = Hh - m.t - m.b; split(m.l, m.t, pw, ph, 0, []);
  const dep = vars.length - 1, fills = FILLS[vars[dep][1].length];
  let s = `<svg viewBox="0 0 ${W} ${Hh}" class="plot" xmlns="http://www.w3.org/2000/svg">`;
  leaves.forEach(L => { const li = vars[dep][1].indexOf(L.path[dep]); s += `<rect x="${L.x}" y="${L.y}" width="${Math.max(L.w, 0)}" height="${Math.max(L.h, 0)}" fill="${fills[li]}" class="tile"/>`; });
  const vIdx = dirs.map((d, i) => d === 'v' && i !== dep ? i : -1).filter(i => i >= 0), hIdx = dirs.map((d, i) => d === 'h' && i !== dep ? i : -1).filter(i => i >= 0);
  vIdx.forEach((d, k) => { const G = groups[d]; const yy = k === 0 ? Math.min(...G.map(g => g.y)) : Math.max(...G.map(g => g.y + g.h));
    G.filter(g => Math.abs((k === 0 ? g.y : g.y + g.h) - yy) < .5).forEach(g => { s += `<text x="${g.x + g.w / 2}" y="${k === 0 ? yy - 7 : yy + 15}" class="tk" text-anchor="middle">${esc(g.level)}</text>`; });
    s += `<text x="${m.l + pw / 2}" y="${k === 0 ? yy - 24 : yy + 34}" class="lab b" text-anchor="middle">${esc(vars[d][0])}</text>`; });
  hIdx.forEach(d => { const G = groups[d]; const xx = Math.min(...G.map(g => g.x));
    G.filter(g => Math.abs(g.x - xx) < .5).forEach(g => { s += `<text x="${xx - 6}" y="${g.y + g.h / 2 + 4}" class="tk" text-anchor="end">${esc(g.level)}</text>`; });
    s += `<text transform="translate(16 ${m.t + ph / 2}) rotate(-90)" class="lab b" text-anchor="middle">${esc(vars[d][0])}</text>`; });
  const lx = m.l + pw + 14; s += `<text x="${lx}" y="${m.t + 4}" class="lab b">${esc(vars[dep][0])}</text>`;
  vars[dep][1].forEach((l, i) => { const yy = m.t + 16 + i * 20; s += `<rect x="${lx}" y="${yy}" width="14" height="14" fill="${fills[i]}" class="tile"/><text x="${lx + 20}" y="${yy + 11}" class="tk">${esc(l)}</text>`; });
  return s + '</svg>';
}
function randCounts(vars, strength = 1) {
  const eff = vars.map(v => v[1].map(() => Math.random())), memo = {};
  return path => { const k = path.join('|'); if (memo[k] != null) return memo[k];
    let w = 1; path.forEach((l, d) => { const i = vars[d][1].indexOf(l); w *= 0.5 + eff[d][i]; });
    const dep = path.length - 1, di = vars[dep][1].indexOf(path[dep]);
    for (let d = 0; d < dep; d++) { const i = vars[d][1].indexOf(path[d]); w *= Math.exp(strength * (eff[d][i] - .5) * (di - (vars[dep][1].length - 1) / 2) * 2.2); }
    return (memo[k] = Math.max(1, Math.round(w * U.int(8, 14)))); };
}
GEN.mosaicOrder = { t: 'mosaic', name: 'Mosaic plot: order of cuts', make() {
  const S = U.pick(MOS), ind = U.shuffle(S.v), vars = [...ind, S.dep];
  const dirs = vars.length === 3 ? ['v', 'v', 'h'] : ['h', 'v', 'v', 'h'];
  const svg = mosaicSVG(vars, dirs, randCounts(vars, 1.2));
  const names = vars.map(v => v[0]), correct = names.join(', ');
  const perms = []; const perm = (a, p = []) => { if (!a.length) { perms.push(p); return; } a.forEach((v, i) => perm(a.filter((_, j) => j !== i), [...p, v])); }; perm(names);
  const res = mc(correct, U.shuffle(perms.map(p => p.join(', '))));
  const dn = { v: 'vertical', h: 'horizontal' };
  return Object.assign(res, { fig: wrap(svg),
    q: 'What is the order in which cuts were made to construct the mosaic plot below?',
    e: names.map((nm, i) => `${'①②③④'[i]} <b>${nm}</b> — ${dn[dirs[i]]} ${i === 0 ? 'cut through the whole plot (one label per level, biggest gaps)' : i === names.length - 1 ? 'final split inside every tile (the fill = dependent variable)' : `split repeated within each ${names[i - 1]} block`}`).join('<br>') +
      '<br>Tip: earlier splits form contiguous blocks with wider gaps; later variables\' labels repeat inside each block.' });
} };

function miniMosaic(p, wts, xl, yl, label) {
  const W = 200, H = 150, m = { l: 18, t: 22, b: 8, r: 8 }, pw = W - m.l - m.r, ph = H - m.t - m.b, g = 4, tot = U.sum(wts);
  let x = m.l, s = `<svg viewBox="0 0 ${W} ${H}" class="plot"><text x="${W / 2}" y="15" class="lab b" text-anchor="middle">${label}</text>`;
  const avail = pw - g * (wts.length - 1);
  wts.forEach((w, i) => { const cw = avail * w / tot, hy = ph * (1 - p[i]);
    s += `<rect x="${x}" y="${m.t}" width="${cw}" height="${hy}" fill="${FILLS[2][0]}" class="tile"/><rect x="${x}" y="${m.t + hy}" width="${cw}" height="${ph - hy}" fill="${FILLS[2][1]}" class="tile"/>`; x += cw + g; });
  return s + '</svg>';
}
GEN.mosaicAssoc = { t: 'mosaic', name: 'Which mosaic shows association?', make() {
  const k = U.pick([2, 3]), mode = U.pick(['strong', 'none']), target = U.int(0, 3), L = ['A', 'B', 'C', 'D'];
  const panels = L.map((_, i) => { const wts = Array.from({ length: k }, () => U.int(3, 10)); let p;
    const b = .3 + Math.random() * .4;
    if (mode === 'strong') p = i === target ? Array.from({ length: k }, (_, j) => Math.min(.9, Math.max(.1, .12 + j * (.76 / (k - 1)) + (Math.random() - .5) * .05))) : Array.from({ length: k }, () => b + (Math.random() - .5) * .08);
    else p = i === target ? Array.from({ length: k }, () => b) : Array.from({ length: k }, (_, j) => Math.min(.9, Math.max(.1, b + (j - (k - 1) / 2) * (.25 + Math.random() * .3))));
    if (mode === 'strong' && i === target && Math.random() < .5) p.reverse();
    return `<div class="mini">${miniMosaic(p, wts, 'X', 'Y', L[i])}</div>`; }).join('');
  return { c: L.map(l => 'Plot ' + l), a: target, fx: true, fig: `<div class="minis">${panels}</div><div class="cap">Each plot: X split vertically (widths ∝ counts), Y split horizontally (dark = "yes").</div>`,
    q: mode === 'strong' ? 'Which mosaic plot shows the <b>strongest association</b> between X and Y?' : 'Which mosaic plot shows <b>no association</b> (independence) between X and Y?',
    e: mode === 'strong' ? `In plot ${L[target]} the horizontal cuts are badly misaligned from column to column (a "staircase") — the proportion of Y = yes changes a lot across levels of X. In the others the cuts nearly line up.` : `In plot ${L[target]} the horizontal cuts line up perfectly across columns (a regular grid), so P(Y | X) is the same for every X → independence. The others show staircases.` };
} };

GEN.expected = { t: 'mosaic', name: 'Expected counts under independence', make() {
  const groups = U.pick([['18–29', '30–49', '50–64', '65+'], ['Freshman', 'Sophomore', 'Junior', 'Senior'], ['Tower', 'Apartment', 'Atrium', 'Terrace']]);
  const tot = groups.map(() => U.int(20, 120) * 10), pr = groups.map(() => .15 + Math.random() * .5);
  const yes = tot.map((t, i) => Math.round(t * pr[i])), no = tot.map((t, i) => t - yes[i]);
  const N = U.sum(tot), Y = U.sum(yes), j = U.int(0, groups.length - 1), ex = tot[j] * Y / N;
  const res = mc(U.f(ex, 1), U.shuffle([String(yes[j]), U.f(tot[j] * (N - Y) / N, 1), U.f(Y / groups.length, 1), U.f(tot[j] / 2, 1), U.f(tot[j] * Y / N / 2, 1)]));
  return Object.assign(res, {
    q: `Observed counts:${table(['group', 'yes', 'no', 'total'], groups.map((g, i) => [g, yes[i], no[i], tot[i]]).concat([['<b>total</b>', Y, N - Y, N]]))}If the two variables were <b>independent</b>, how many "yes" responses would you expect in the <b>${groups[j]}</b> group?`,
    e: `Expected = (row total × column total) / grand total = ${tot[j]} × ${Y} / ${N} = <b>${U.f(ex, 1)}</b> — i.e., the group size times the overall "yes" rate (${U.f(100 * Y / N, 1)}%). The chi-square test of independence compares these expected counts to the observed (${yes[j]}). A mosaic of the expected counts would show perfectly aligned cuts.` });
} };

GEN.stem = { t: 'norm', name: 'Read a stem-and-leaf plot', make() {
  const mode = U.pick([1, 2, 0]), n = U.int(9, 13);
  const vals = U.sorted(Array.from({ length: n }, () => U.int(11, 69)));
  const scale = mode === 1 ? 1 : mode === 2 ? 10 : 0.1;
  const stems = U.uniq(vals.map(v => Math.floor(v / 10)));
  const allStems = U.range(stems[0], stems[stems.length - 1]);
  const lines = allStems.map(st => `  ${st} | ${vals.filter(v => Math.floor(v / 10) === st).map(v => v % 10).join('')}`);
  const hdr = mode === 0 ? 'The decimal point is at the |' : `The decimal point is ${mode} digit(s) to the right of the |`;
  const ask = U.pick(['largest', 'smallest', 'median']);
  const raw = ask === 'largest' ? vals[n - 1] : ask === 'smallest' ? vals[0] : U.q7(vals, .5);
  const fmt = v => U.f(v * scale, 2);
  const res = mc(fmt(raw), U.shuffle([U.f(raw * scale * 10, 2), U.f(raw * scale / 10, 2), fmt(ask === 'largest' ? vals[n - 2] : ask === 'smallest' ? vals[1] : U.mean(vals)), U.f(Math.floor(raw / 10) * scale * 10, 2)]));
  return Object.assign(res, {
    q: `What is the <b>${ask}</b> value in this stem-and-leaf display?<pre>  ${hdr}\n\n${lines.join('\n')}</pre>`,
    e: `${hdr} → each entry "stem | leaf" means ${mode === 1 ? 'stem = tens, leaf = units (3 | 4 = 34)' : mode === 2 ? 'stem = hundreds, leaf = tens (3 | 4 = 340)' : 'stem = units, leaf = tenths (3 | 4 = 3.4)'}. The ${ask} is <b>${fmt(raw)}</b>.${ask === 'median' ? ` (n = ${n}${n % 2 ? ', middle value' : ', average of the two middle values'}.)` : ''}` });
} };

GEN.pcpCorr = { t: 'pcp', name: 'Correlation in parallel coordinates', make() {
  const types = U.shuffle(['pos', 'neg', 'none']).slice(0, 2), rho = { pos: .95, neg: -.95, none: 0 };
  const n = 16, A = Array.from({ length: n }, U.rnorm);
  const mk = (src, t) => src.map(v => rho[t] * v + Math.sqrt(1 - rho[t] ** 2) * U.rnorm() * (t === 'none' ? 1 : .9));
  const B = mk(A, types[0]), C = mk(B, types[1]), cols = [A, B, C];
  const z = a => { const m = U.mean(a), s = U.sd(a); return a.map(v => (v - m) / s); }, Z = cols.map(z);
  const F = frame({ w: 440, h: 270, xd: [0.7, 3.3], yd: [-3, 3], xticks: [1, 2, 3], xfmt: v => ['', 'A', 'B', 'C'][v], ylab: 'standardized value', xlab: 'variable' });
  let s = F.head; for (let i = 0; i < n; i++) s += `<polyline ${F.clip} points="${[0, 1, 2].map(j => `${F.sx(j + 1)},${F.sy(Math.max(-3, Math.min(3, Z[j][i])))}`).join(' ')}" class="pc"/>`;
  s += F.end;
  const pair = U.int(0, 1), ty = types[pair], P = pair ? 'B and C' : 'A and B';
  const lab = { pos: 'Strong positive correlation', neg: 'Strong negative correlation', none: 'Little or no correlation' };
  return { c: [lab.pos, lab.neg, lab.none, 'Correlation cannot be judged from a parallel coordinate plot'], a: ['pos', 'neg', 'none'].indexOf(ty), fx: true, fig: wrap(s),
    q: `In the parallel coordinate plot below, what is the relationship between <b>${P}</b>?`,
    e: `${{ pos: 'Lines between ' + P + ' stay roughly parallel — high values stay high and low stay low → positive correlation.', neg: 'Lines between ' + P + ' cross in an "X" pattern — high on one axis means low on the other → negative correlation.', none: 'Lines between ' + P + ' go every which way with no consistent pattern → little/no correlation.' }[ty]} Only adjacent axes can be compared easily.` };
} };

GEN.zscore = { t: 'pcp', name: 'Standardize / rescale a value', make() {
  const uni = Math.random() < .4;
  if (uni) { const mn = U.int(0, 40), mx = mn + U.int(20, 100), v = U.int(mn + 1, mx - 1), ans = (v - mn) / (mx - mn);
    const res = mc(U.f(ans, 3), U.shuffle([U.f(v / mx, 3), U.f((v - mn) / mx, 3), U.f((mx - v) / (mx - mn), 3), U.f((v - (mn + mx) / 2) / (mx - mn), 3)]));
    return Object.assign(res, { q: `A variable ranges from ${mn} to ${mx}. In <code>ggparcoord(..., scale = "uniminmax")</code>, what does the value ${v} become?`,
      e: `uniminmax rescales each variable to [0, 1]: (x − min)/(max − min) = (${v} − ${mn})/(${mx} − ${mn}) = <b>${U.f(ans, 3)}</b>.` }); }
  const mu = U.int(20, 80), sd = U.int(2, 12), v = mu + U.int(-3 * sd, 3 * sd), ans = (v - mu) / sd;
  const res = mc(U.f(ans, 2), U.shuffle([U.f(v - mu, 2), U.f((v - mu) / sd ** 2, 2), U.f(v / sd, 2), U.f((mu - v) / sd, 2)]));
  return Object.assign(res, { q: `A variable has mean ${mu} and standard deviation ${sd}. After standardizing (the ggparcoord default, <code>scale = "std"</code>), what does the value ${v} become?`,
    e: `Standardize: (x − mean)/sd = (${v} − ${mu})/${sd} = <b>${U.f(ans, 2)}</b>.` });
} };

GEN.simpson = { t: 'mosaic', name: "Simpson's paradox", make() {
  const [X, Y] = U.shuffle(['Alaska', 'America West']), [good, bad] = U.pick([['Phoenix', 'Seattle'], ['San Diego', 'San Francisco'], ['Los Angeles', 'Chicago']]);
  const rX = [.04 + Math.random() * .04, .14 + Math.random() * .05], rY = [rX[0] + .03 + Math.random() * .03, rX[1] + .04 + Math.random() * .04];
  const nX = [U.int(15, 30) * 10, U.int(150, 250) * 10], nY = [U.int(300, 450) * 10, U.int(20, 40) * 10];
  const dX = nX.map((n, i) => Math.round(n * rX[i])), dY = nY.map((n, i) => Math.round(n * rY[i]));
  const pct = (d, n) => U.f(100 * d / n, 1) + '%';
  const oX = U.sum(dX) / U.sum(nX), oY = U.sum(dY) / U.sum(nY); if (oX <= oY) return GEN.simpson.make();
  const rows = [[X, good, nX[0] - dX[0], dX[0]], [X, bad, nX[1] - dX[1], dX[1]], [Y, good, nY[0] - dY[0], dY[0]], [Y, bad, nY[1] - dY[1], dY[1]]];
  const opts = [`${X} has the higher overall delay rate, but ${Y} has the higher delay rate at each airport`, `${X} has the higher delay rate overall and at each airport`, `${Y} has the higher delay rate overall and at each airport`, `${Y} has the higher overall delay rate, but ${X} has the higher delay rate at each airport`];
  return { c: opts, a: 0, q: `Flight data for two airlines at two airports:${table(['airline', 'airport', 'on time', 'delayed'], rows)}Which statement is correct?`,
    e: `${X}: ${good} ${pct(dX[0], nX[0])}, ${bad} ${pct(dX[1], nX[1])}, overall <b>${pct(U.sum(dX), U.sum(nX))}</b>. ${Y}: ${good} ${pct(dY[0], nY[0])}, ${bad} ${pct(dY[1], nY[1])}, overall <b>${pct(U.sum(dY), U.sum(nY))}</b>.<br>Simpson's paradox: ${X} flies mostly out of ${bad} (high delays) and ${Y} mostly out of ${good}. The airport drives delays; the airlines are associated with airports. A mosaic plot shows this because tile sizes reveal the very different airport mixes.` };
} };

GEN.dropna = { t: 'na', name: 'drop_na() row counts', make() {
  const n = U.int(5, 7), cols = ['id', 'score', 'group'], data = Array.from({ length: n }, (_, i) => [i + 1, Math.random() < .3 ? null : U.int(50, 99), Math.random() < .3 ? null : U.pick(['a', 'b', 'c'])]);
  const col = U.pick([null, 'score', 'group']), ci = col ? cols.indexOf(col) : -1;
  const kept = data.filter(r => col ? r[ci] !== null : r.every(v => v !== null)).length;
  if (data.every(r => r.every(v => v !== null))) return GEN.dropna.make();
  const other = data.filter(r => r.every(v => v !== null)).length, alt = col ? other : data.filter(r => r[1] !== null).length;
  const res = mc(String(kept), U.shuffle([String(alt), String(n), String(Math.max(0, kept - 1)), String(kept + 1)].filter(v => +v <= n)));
  if (!res) return GEN.dropna.make();
  const pre = ['   id score group'].concat(data.map(r => `${String(r[0]).padStart(5)} ${String(r[1] ?? 'NA').padStart(5)} ${String(r[2] ?? 'NA').padStart(5)}`)).join('\n');
  return Object.assign(res, { q: `How many rows does <code>df |> drop_na(${col || ''})</code> return?<pre>${pre}</pre>`,
    e: col ? `<code>drop_na(${col})</code> only removes rows where <b>${col}</b> is NA → ${kept} rows remain. (Plain <code>drop_na()</code> would keep only complete cases: ${other}.)` : `<code>drop_na()</code> with no columns keeps only <b>complete cases</b> (like <code>na.omit()</code>) → ${kept} rows.` });
} };

GEN.tiles = { t: 'mosaic', name: 'Number of tiles in a mosaic', make() {
  const S = U.pick(MOS), vars = [...S.v, S.dep], n = vars.reduce((p, v) => p * v[1].length, 1), sm = U.sum(vars.map(v => v[1].length));
  const res = mc(String(n), U.shuffle([String(sm), String(n * 2), String(n / 2), String(n - vars[vars.length - 1][1].length), String(n + 1)]));
  return Object.assign(res, { q: `A mosaic plot displays ${vars.map(v => `<b>${v[0]}</b> (${v[1].join(', ')})`).join(', ')}. How many tiles (small rectangles) does it contain?`,
    e: `One tile per unique combination of levels: ${vars.map(v => v[1].length).join(' × ')} = <b>${n}</b>. (Alligator example: 2 × 2 × 5 = 20.)` });
} };

GEN.vcd = { t: 'mosaic', name: 'vcd::mosaic() formula order', make() {
  const S = U.pick(MOS.filter(s => s.v.length >= 2)), ind = U.shuffle(S.v).map(v => v[0]), dep = S.dep[0];
  const dirs = ind.length === 2 ? '"v", "v", "h"' : '"h", "v", "v", "h"';
  const askColors = Math.random() < .35;
  if (askColors) { const k = S.dep[1].length;
    const res = mc(String(k), U.shuffle([String(ind.length + 1), String(S.v[0][1].length * k), String(k + 1), '1']));
    return Object.assign(res, { q: `<pre>mosaic(${dep} ~ ${ind.join(' + ')}, data = df,\n       direction = c(${dirs}),\n       highlighting_fill = colors)</pre>${dep} has levels ${S.dep[1].join(', ')}. How many colors should <code>colors</code> contain?`,
      e: `One color per level of the <b>dependent</b> variable (${dep}) → <b>${k}</b>. Using the wrong number won't necessarily error — it silently produces a wrong graph.` }); }
  const corr = [...ind, dep].join(', ');
  const res = mc(corr, U.shuffle([[dep, ...ind].join(', '), [...ind].reverse().concat(dep).join(', '), [ind[0], dep, ...ind.slice(1)].join(', '), [dep, ...[...ind].reverse()].join(', ')]));
  return Object.assign(res, { q: `In what order are the splits made?<pre>library(vcd)\nmosaic(${dep} ~ ${ind.join(' + ')}, data = df,\n       direction = c(${dirs}))</pre>`,
    e: `The independent variables (right of ~) are split in the order listed, and the dependent variable (left of ~) is split <b>last</b>: <b>${corr}</b>. That's why the direction vector ends with "h" for the dependent variable.` });
} };

GEN.quantile = { t: 'box', name: 'quantile() type 7', make() {
  for (let k = 0; k < 200; k++) {
    const n = U.int(6, 10), s = U.sorted(Array.from({ length: n }, () => U.int(1, 30) * 2)); if (new Set(s).size !== n) continue;
    const p = U.pick([.25, .75]), q = U.q7(s, p), f = U.fivenum(s)[p === .25 ? 1 : 3];
    const res = mc(U.f(q), U.shuffle([U.f(f), U.f(s[Math.round(p * n) - 1]), U.f(s[Math.ceil(p * n)] ?? s[n - 1]), U.f(U.q7(s, .5)), U.f(p * U.sum(s) / n * 2)]));
    if (!res || q === f) continue;
    const h = (n - 1) * p, lo = Math.floor(h);
    return Object.assign(res, { q: `What does <code>quantile(x, ${p})</code> (R's default, type 7) return?<pre>x = c(${s.join(', ')})</pre>`,
      e: `Type 7: h = (n − 1)p = (${n} − 1)(${p}) = ${U.f(h)}. Take the ${lo + 1}${['st', 'nd', 'rd'][lo] || 'th'} value (${s[lo]}) plus ${U.f(h - lo)} of the way to the next (${s[lo + 1]}): ${s[lo]} + ${U.f(h - lo)} × ${s[lo + 1] - s[lo]} = <b>${U.f(q)}</b>. (Tukey's hinge from fivenum() would be ${U.f(f)}; ggplot2 boxplots use quantile(), base R uses hinges.)` });
  } } };

GEN.fiveHist = { t: 'box', name: 'Quartiles from a histogram (Q7-style)', make() {
  const left = Math.random() < .5;
  const x = Array.from({ length: 100 }, () => { const e = Math.min(6.9, -Math.log(Math.random()) * 0.9); return Math.round((left ? 8 - e : 1 + e) * 10) / 10; });
  const q = [0, .25, .5, .75, 1].map(p => Math.round(U.q7(x, p) * 10) / 10), F1 = a => a.map(v => v.toFixed(1)).join('   ');
  const mirror = q.map(v => Math.round((9 - v) * 10) / 10).reverse();
  const beyond = left ? [...q.slice(0, 4), Math.round((8.6 + Math.random()) * 10) / 10] : [Math.round((0.2 + Math.random() * .5) * 10) / 10, ...q.slice(1)];
  const r1 = v => Math.round(v * 10) / 10, mid = left ? [q[0], r1((q[0] + 4.5) / 2), 4.5, q[3], q[4]] : [q[0], q[1], 4.5, r1((4.5 + q[4]) / 2), q[4]];
  const counts = U.range(1, 7).map((b, i) => x.filter(v => i === 0 ? v >= b && v <= b + 1 : v > b && v <= b + 1).length);
  const res = mc(F1(q), U.shuffle([F1(mirror), F1(beyond), F1(mid)]));
  if (!res) return GEN.fiveHist.make();
  return Object.assign(res, { fig: wrap(histSVG(U.range(1, 8), counts, { ylab: 'Frequency', xticks: U.range(1, 8) })),
    q: 'Which of the following could represent the 0, 25, 50, 75 and 100th percentiles of the data in the histogram?',
    e: `The data are ${left ? 'left' : 'right'}-skewed, with most values ${left ? 'between 6 and 8' : 'between 1 and 3'}, so the median must be ${left ? 'high' : 'low'}. The mirror-image set puts the median on the wrong side, the set with ${left ? `max ${beyond[4]}` : `min ${beyond[0]}`} goes beyond the histogram's range (impossible), and a median of 4.5 sits where there is almost no data. Answer: <b>${F1(q)}</b>.` });
} };

const GEN_KEYS = Object.keys(GEN);
function makeGen(key) {
  for (let i = 0; i < 8; i++) { try { const q = GEN[key].make(); if (q && q.c && q.c.length) return Object.assign({ t: GEN[key].t, s: 'Generated · ' + GEN[key].name, gen: key }, q); } catch (err) { console.warn(key, err); } }
  return null;
}
if (typeof module !== 'undefined') module.exports = { U, GEN, makeGen, GEN_KEYS };
