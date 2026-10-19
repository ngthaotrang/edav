// ───────────── app state ─────────────
const TOPICS = {
  mosaic: 'Mosaic Plots & Multivariate Categorical', pcp: 'Parallel Coordinates & Multivariate Continuous',
  hist: 'Histograms & Bins', box: 'Boxplots, Quantiles & Outliers', gg: 'Grammar of Graphics / ggplot2',
  norm: 'QQ Plots, Normality & Stem-and-Leaf', dens: 'Density Curves & Ridgelines', cat: 'Categorical Data & Bar Charts',
  scat: 'Scatterplots & 2D Density', facet: 'Faceting & Reshaping (pivot_longer)', na: 'Missing Data', eda: 'EDA & Perception',
};
const EXAM_MIX = { mosaic: 6, pcp: 4, hist: 4, box: 4, gg: 4, norm: 3, dens: 2, cat: 2, scat: 2, na: 1, facet: 1 };
BANK.forEach((b, i) => b.id = 'b' + i);
SAMPLE.forEach(s => { s.id = 's' + s.n; s.s = 'Sample Midterm Q' + s.n; s.fx = true; });
const STORE = 'edavMidterm.v1';
const S = Object.assign({ stats: {}, missed: [], topics: Object.keys(TOPICS), gen: true, weak: false, seen: [] }, JSON.parse(localStorage.getItem(STORE) || '{}'));
const save = () => localStorage.setItem(STORE, JSON.stringify(S));
const $ = (q, el = document) => el.querySelector(q), $$ = (q, el = document) => [...el.querySelectorAll(q)];
const LET = ['A', 'B', 'C', 'D', 'E'];
const acc = t => { const st = S.stats[t]; return st && st.n ? st.c / st.n : null; };
function record(q, ok) {
  const st = S.stats[q.t] || (S.stats[q.t] = { c: 0, n: 0 }); st.n++; if (ok) st.c++;
  const key = q.gen ? 'g:' + q.gen : q.id;
  if (!ok) { if (!S.missed.includes(key)) S.missed.push(key); }
  else S.missed = S.missed.filter(k => k !== key);
  save(); renderSidebar();
}
// Shuffle choices (unless fixed), returning a new question instance
function instance(q) {
  const o = Object.assign({}, q);
  if (q.type === 'fill') return o;
  const numeric = q.c.every(c => /^-?[\d.]+$/.test(String(c).trim()));
  const idx = q.fx ? q.c.map((_, i) => i) : numeric ? q.c.map((_, i) => i).sort((x, y) => parseFloat(q.c[x]) - parseFloat(q.c[y])) : U.shuffle(q.c.map((_, i) => i));
  o.c = idx.map(i => q.c[i]); o.a = idx.indexOf(q.a); return o;
}
const figHTML = q => q.fig ? (IMG[q.fig] ? `<figure class="fig"><img src="${IMG[q.fig]}" alt="figure for question"></figure>` : q.fig) : '';
const fromKey = key => key.startsWith('g:') ? makeGen(key.slice(2)) : key.startsWith('s') ? SAMPLE.find(s => s.id === key) : BANK.find(b => b.id === key);

// ───────────── picking questions ─────────────
function pickPractice() {
  const tw = S.topics.map(t => {
    const ns = BANK.filter(b => b.t === t).length, ng = S.gen ? GEN_KEYS.filter(k => GEN[k].t === t).length : 0;
    let w = ns + 4 * ng; if (S.weak) { const a = acc(t); w *= 0.4 + 2 * (1 - (a == null ? .5 : a)); }
    return [t, w];
  }).filter(x => x[1] > 0);
  if (!tw.length) return null;
  let r = Math.random() * U.sum(tw.map(x => x[1])), topic = tw[0][0];
  for (const [t, w] of tw) { if ((r -= w) <= 0) { topic = t; break; } }
  const gens = S.gen ? GEN_KEYS.filter(k => GEN[k].t === topic) : [];
  const stat = BANK.filter(b => b.t === topic && !S.seen.includes(b.id));
  const statAll = BANK.filter(b => b.t === topic);
  if (gens.length && (Math.random() < .45 || !statAll.length)) return makeGen(U.pick(gens));
  const q = U.pick(stat.length ? stat : statAll);
  S.seen.push(q.id); if (S.seen.length > 60) S.seen = S.seen.slice(-60);
  return q;
}

// ───────────── rendering a single question card ─────────────
function cardHTML(q, num, opts = {}) {
  const meta = `<div class="meta"><span class="chip t-${q.t}">${TOPICS[q.t]}</span><span class="src">${q.s || ''}</span></div>`;
  const body = q.type === 'fill'
    ? `<div class="fill"><input type="text" placeholder="type your answer, e.g. x = ..., y = ..., fill = ..." aria-label="your answer"></div>`
    : `<div class="opts">${q.c.map((c, i) => `<button class="opt" data-i="${i}"><span class="let">${LET[i]}</span><span class="otx">${c}</span></button>`).join('')}</div>`;
  return `<article class="card" data-num="${num}">${meta}<div class="qn">${num ? `<span class="num">${num}.</span>` : ''}<div class="qtext">${q.q}</div></div>${figHTML(q)}${body}<div class="exp" hidden></div></article>`;
}
function reveal(card, q, chosen, opts = {}) {
  const ok = chosen === q.a;
  $$('.opt', card).forEach(b => { const i = +b.dataset.i; b.disabled = true;
    if (i === q.a) b.classList.add('right'); else if (i === chosen) b.classList.add('wrong'); });
  const exp = $('.exp', card); exp.hidden = false;
  exp.innerHTML = `<div class="verdict ${chosen == null ? 'skip' : ok ? 'ok' : 'no'}">${chosen == null ? 'Not answered' : ok ? 'Correct' : 'Not quite'} — the answer is <b>${LET[q.a]}</b></div><div class="why"><span class="prof">Professor's note</span>${q.e}</div>`;
  return ok;
}
function revealFill(card, q, selfMark) {
  const exp = $('.exp', card); exp.hidden = false; $('input', card).disabled = true;
  exp.innerHTML = `<div class="verdict skip">Answer: <code>${q.answer}</code></div><div class="why"><span class="prof">Professor's note</span>${q.e}</div>` +
    (selfMark ? `<div class="selfmark">Did you get it? <button class="btn sm" data-self="1">Yes</button><button class="btn sm ghost" data-self="0">No</button></div>` : '');
}

// ───────────── PRACTICE ─────────────
const P = { q: null, done: false, n: 0, c: 0, streak: 0, review: false };
function nextPractice() {
  let q;
  if (P.review) {
    if (!S.missed.length) { $('#practice-card').innerHTML = `<div class="empty">🎉 No missed questions left to review. Switch back to <b>Practice</b> for new questions.</div>`; P.q = null; return; }
    const key = U.pick(S.missed); q = fromKey(key);
    if (!q) { S.missed = S.missed.filter(k => k !== key); save(); return nextPractice(); }
  } else q = pickPractice();
  if (!q) { $('#practice-card').innerHTML = `<div class="empty">Select at least one topic in the sidebar.</div>`; return; }
  P.q = instance(q); P.done = false;
  $('#practice-card').innerHTML = cardHTML(P.q, 0);
  $('#next').textContent = 'Skip →';
  const card = $('#practice-card .card');
  $$('.opt', card).forEach(b => b.onclick = () => answerPractice(+b.dataset.i));
  if (P.q.type === 'fill') { const inp = $('input', card); inp.focus();
    $('#next').textContent = 'Show answer'; }
  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  if (matchMedia('(max-width: 860px)').matches) $('.toolbar').scrollIntoView({ behavior, block: 'start' });
  else window.scrollTo({ top: 0, behavior });
}
function answerPractice(i) {
  if (P.done || !P.q) return; P.done = true;
  const card = $('#practice-card .card'), ok = reveal(card, P.q, i);
  P.n++; if (ok) { P.c++; P.streak++; } else P.streak = 0;
  record(P.q, ok); updateSession(); $('#next').textContent = 'Next question →';
}
function updateSession() { $('#sess').innerHTML = `Session: <b>${P.c}/${P.n}</b>${P.n ? ` (${Math.round(100 * P.c / P.n)}%)` : ''} · streak <b>${P.streak}</b>`; }
function onNext() {
  if (P.q && P.q.type === 'fill' && !P.done) { P.done = true; const card = $('#practice-card .card'); revealFill(card, P.q, true);
    $$('[data-self]', card).forEach(b => b.onclick = () => { const ok = b.dataset.self === '1'; P.n++; if (ok) { P.c++; P.streak++; } else P.streak = 0; record(P.q, ok); updateSession(); nextPractice(); });
    $('#next').textContent = 'Next question →'; return; }
  nextPractice();
}

// ───────────── EXAM (mock + sample) ─────────────
const E = { qs: [], ans: [], t0: 0, timer: null, submitted: false, kind: '' };
function buildMock() {
  const qs = [], usedGen = new Set(), usedBank = new Set();
  for (const [t, k] of Object.entries(EXAM_MIX)) {
    const gens = U.shuffle(GEN_KEYS.filter(g => GEN[g].t === t)), stat = U.shuffle(BANK.filter(b => b.t === t));
    for (let i = 0; i < k; i++) {
      let q = null;
      if (gens.length && (Math.random() < .4 || !stat.length)) { const g = gens.find(g => !usedGen.has(g)); if (g) { usedGen.add(g); q = makeGen(g); } }
      if (!q) { const b = stat.find(b => !usedBank.has(b.id)); if (b) { usedBank.add(b.id); q = b; } }
      if (q) qs.push(q);
    }
  }
  return U.shuffle(qs);
}
function startExam(kind) {
  E.kind = kind; E.submitted = false; clearInterval(E.timer);
  E.qs = (kind === 'sample' ? SAMPLE : buildMock()).map(instance); E.ans = E.qs.map(() => null);
  const timed = kind === 'mock' || $('#sample-timer').checked;
  const host = $(`#${kind}-body`);
  host.innerHTML = `<div class="examhead"><div><b>${kind === 'mock' ? 'Mock Midterm' : 'Sample Midterm (Prof. Robbins)'}</b> · ${E.qs.length} questions · closed book</div><div class="timer" id="${kind}-timer">${timed ? '75:00' : 'untimed'}</div><div class="progress" id="${kind}-prog">0/${E.qs.length} answered</div></div>` +
    E.qs.map((q, i) => cardHTML(q, i + 1)).join('') +
    `<div class="submitbar"><button class="btn primary" id="${kind}-submit">Submit & grade</button></div><div id="${kind}-result"></div>`;
  $$('.card', host).forEach((card, i) => {
    $$('.opt', card).forEach(b => b.onclick = () => { if (E.submitted) return; $$('.opt', card).forEach(x => x.classList.remove('sel')); b.classList.add('sel'); E.ans[i] = +b.dataset.i; prog(); });
    const inp = $('input', card); if (inp) inp.oninput = () => { E.ans[i] = inp.value.trim() || null; prog(); };
  });
  $(`#${kind}-submit`).onclick = () => submitExam();
  const prog = () => { $(`#${kind}-prog`).textContent = `${E.ans.filter(a => a != null).length}/${E.qs.length} answered`; };
  if (timed) { E.t0 = Date.now(); E.timer = setInterval(() => {
    const left = 75 * 60 - Math.floor((Date.now() - E.t0) / 1000), el = $(`#${kind}-timer`); if (!el) return clearInterval(E.timer);
    el.textContent = `${String(Math.floor(Math.max(0, left) / 60)).padStart(2, '0')}:${String(Math.max(0, left) % 60).padStart(2, '0')}`;
    el.classList.toggle('low', left < 600); if (left <= 0) { clearInterval(E.timer); submitExam(true); } }, 1000); }
  $(`#${kind}-start`).textContent = 'Restart'; window.scrollTo({ top: 0 });
}
function submitExam(auto) {
  if (E.submitted) return;
  const un = E.ans.filter(a => a == null).length;
  if (!auto && un && !confirm(`${un} question(s) unanswered. Submit anyway?`)) return;
  E.submitted = true; clearInterval(E.timer);
  const host = $(`#${E.kind}-body`), cards = $$('.card', host); let right = 0, total = 0; const byT = {};
  const pending = [];
  E.qs.forEach((q, i) => {
    if (q.type === 'fill') { revealFill(cards[i], q, true); pending.push(i);
      $$('[data-self]', cards[i]).forEach(b => b.onclick = () => { $('.selfmark', cards[i]).innerHTML = b.dataset.self === '1' ? '✓ marked correct' : '✗ marked incorrect';
        const ok = b.dataset.self === '1'; record(q, ok); if (ok) { right++; } (byT[q.t] = byT[q.t] || [0, 0])[0] += ok ? 1 : 0; summary(); });
      total++; (byT[q.t] = byT[q.t] || [0, 0])[1]++; return; }
    const ok = reveal(cards[i], q, E.ans[i]); total++; if (ok) right++;
    (byT[q.t] = byT[q.t] || [0, 0])[1]++; if (ok) byT[q.t][0]++;
    record(q, ok);
  });
  const mins = Math.round((Date.now() - E.t0) / 60000);
  const summary = () => {
    const pct = Math.round(100 * right / total);
    $(`#${E.kind}-result`).innerHTML = `<div class="result"><div class="score">${right}/${total} <span>(${pct}%)</span></div>${E.t0 && E.kind === 'mock' ? `<div class="muted">Time used: ~${mins} min of 75</div>` : ''}${pending.length ? `<div class="muted">Q${pending.map(i => i + 1).join(', ')} is fill-in: self-mark it above to include it.</div>` : ''}<h3>By topic</h3>${Object.entries(byT).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).map(([t, [c, n]]) => bar(TOPICS[t], c, n)).join('')}<p class="muted">Every question is now marked with the correct answer and the professor's explanation. Missed questions were added to <b>Review missed</b>.</p></div>`;
  };
  summary(); $(`#${E.kind}-submit`).disabled = true;
  $(`#${E.kind}-result`).scrollIntoView({ behavior: 'smooth' });
}
const bar = (label, c, n) => `<div class="tbar"><div class="tl">${label}</div><div class="track"><div class="fillb ${c / n >= .8 ? 'g' : c / n >= .6 ? 'y' : 'r'}" style="width:${n ? 100 * c / n : 0}%"></div></div><div class="tn">${c}/${n}</div></div>`;

// ───────────── sidebar / stats ─────────────
function renderSidebar() {
  $('#topics').innerHTML = Object.entries(TOPICS).map(([k, v]) => {
    const a = acc(k), st = S.stats[k];
    return `<label class="tp"><input type="checkbox" value="${k}" ${S.topics.includes(k) ? 'checked' : ''}><span class="tpn">${v}</span><span class="tpa ${a == null ? '' : a >= .8 ? 'g' : a >= .6 ? 'y' : 'r'}">${a == null ? '–' : Math.round(100 * a) + '%'}</span></label>`;
  }).join('');
  $$('#topics input').forEach(cb => cb.onchange = () => { S.topics = $$('#topics input').filter(x => x.checked).map(x => x.value); save(); });
  $('#missed-count').textContent = S.missed.length;
  const tot = Object.values(S.stats).reduce((s, v) => [s[0] + v.c, s[1] + v.n], [0, 0]);
  $('#overall').innerHTML = tot[1] ? `All-time: <b>${tot[0]}/${tot[1]}</b> (${Math.round(100 * tot[0] / tot[1])}%)` : 'No answers yet';
  $('#stats-body').innerHTML = Object.keys(TOPICS).map(t => { const st = S.stats[t] || { c: 0, n: 0 }; return bar(TOPICS[t], st.c, st.n); }).join('');
}

// ───────────── tabs & wiring ─────────────
function show(tab) {
  $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
  $$('.view').forEach(v => v.hidden = v.id !== 'view-' + (tab === 'review' ? 'practice' : tab));
  if (tab === 'practice' || tab === 'review') { const rv = tab === 'review'; if (P.review !== rv || !P.q) { P.review = rv; nextPractice(); }
    $('#mode-label').textContent = rv ? `Reviewing missed questions (${S.missed.length} left)` : 'Random practice'; }
}
document.addEventListener('DOMContentLoaded', () => {
  $('#topic-settings').open = !matchMedia('(max-width: 860px)').matches;
  $$('.tab').forEach(t => t.onclick = () => show(t.dataset.tab));
  $('#next').onclick = onNext;
  $('#gen').checked = S.gen; $('#weak').checked = S.weak;
  $('#gen').onchange = e => { S.gen = e.target.checked; save(); };
  $('#weak').onchange = e => { S.weak = e.target.checked; save(); };
  $('#all').onclick = () => { S.topics = Object.keys(TOPICS); save(); renderSidebar(); };
  $('#none').onclick = () => { S.topics = []; save(); renderSidebar(); };
  $('#mock-start').onclick = () => startExam('mock');
  $('#sample-start').onclick = () => startExam('sample');
  $('#reset').onclick = () => { if (confirm('Reset all stats and missed questions?')) { S.stats = {}; S.missed = []; save(); renderSidebar(); } };
  document.addEventListener('keydown', e => {
    if ($('#view-practice').hidden || e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
    const k = e.key.toLowerCase(), m = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 }[k];
    if (m != null && P.q && !P.done && P.q.type !== 'fill') { answerPractice(m); e.preventDefault(); }
    else if (k === 'enter' || k === 'n' || k === 'arrowright') { onNext(); e.preventDefault(); }
  });
  $('#bankinfo').textContent = `${BANK.length} written questions · ${GEN_KEYS.length} randomized generators · ${SAMPLE.length} sample-midterm questions`;
  const days = Math.ceil((new Date('2026-10-20T16:10:00') - new Date()) / 864e5);
  $('#countdown').textContent = days > 1 ? `Midterm in ${days} days · Tue Oct 20, in class` : days === 1 ? 'Midterm is tomorrow · Tue Oct 20, in class' : 'Midterm: Tue Oct 20, in class';
  renderSidebar(); show('practice');
});
