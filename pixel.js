/* 点々 — ドット絵 */
(() => {
'use strict';
const { h } = T;
const PAL = ['#1c2740', '#5a6478', '#aab1bd', '#ffffff', '#d4523a', '#e8894a', '#e5b020', '#f6e3a1',
  '#7db86a', '#2e8463', '#6fa8dc', '#2b4c9b', '#9a86d4', '#e79ab0', '#8a5a3c', '#f0c9a0'];
const CH = '0123456789abcdef';

function paint(ctx, s, px) {
  ctx.clearRect(0, 0, s, s);
  for (let i = 0; i < px.length; i++) {
    if (px[i] === '.') continue;
    ctx.fillStyle = PAL[CH.indexOf(px[i])] || PAL[0];
    ctx.fillRect(i % s, Math.floor(i / s), 1, 1);
  }
}

/* 保存してあるドット絵を小さなキャンバスにする */
T.artCanvas = (art, size) => {
  const c = h('canvas.art', { width: art.s, height: art.s });
  paint(c.getContext('2d'), art.s, art.d);
  if (size) c.style.width = c.style.height = size + 'px';
  return c;
};

/* エディタ。{s,d} / 'delete' / null を返す */
T.pixelEdit = art => new Promise(resolve => {
  let s = art ? art.s : 16;
  let px = art ? [...art.d] : Array(s * s).fill('.');
  let col = '0', tool = 'pen', done = false, last = null;
  const undo = [];
  const cv = h('canvas.px-canvas', { width: s, height: s });
  const ctx = cv.getContext('2d');
  const redraw = () => { if (cv.width !== s) cv.width = cv.height = s; cv.style.setProperty('--n', s); paint(ctx, s, px); };
  const cell = e => {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * s), y = Math.floor((e.clientY - r.top) / r.height * s);
    return (x < 0 || y < 0 || x >= s || y >= s) ? null : [x, y];
  };
  const set = (x, y) => { px[y * s + x] = tool === 'erase' ? '.' : col; };
  const line = (a, b) => {
    let [x0, y0] = a; const [x1, y1] = b;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      set(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  const flood = (x, y) => {
    const from = px[y * s + x], to = col;
    if (from === to) return;
    const st = [[x, y]];
    while (st.length) {
      const [a, b] = st.pop();
      if (a < 0 || b < 0 || a >= s || b >= s || px[b * s + a] !== from) continue;
      px[b * s + a] = to;
      st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
    }
  };
  const snap = () => { undo.push({ s, px: [...px] }); if (undo.length > 40) undo.shift(); };

  cv.addEventListener('pointerdown', e => {
    const c = cell(e); if (!c) return;
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    snap();
    if (tool === 'fill') { flood(c[0], c[1]); last = null; }
    else { set(c[0], c[1]); last = c; }
    redraw();
  });
  cv.addEventListener('pointermove', e => {
    if (!last) return;
    const c = cell(e); if (!c) return;
    line(last, c); last = c; redraw();
  });
  const end = () => { last = null; };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);

  const tools = h('.px-tools');
  const drawTools = () => {
    tools.textContent = '';
    [['pen', 'pen', 'ペン'], ['erase', 'erase', '消しゴム'], ['fill', 'fill', '塗りつぶし']].forEach(([k, ic, label]) =>
      tools.append(h('button.icon-btn' + (tool === k ? '.on' : ''), { type: 'button', 'aria-label': label, title: label, 'aria-pressed': String(tool === k), onclick: () => { tool = k; drawTools(); } }, T.icon(ic))));
    tools.append(
      h('button.icon-btn', { type: 'button', 'aria-label': 'ひとつ戻す', title: 'ひとつ戻す', onclick: () => { const u = undo.pop(); if (u) { s = u.s; px = u.px; redraw(); drawSize(); } } }, T.icon('undo')),
      h('button.btn.ghost.small', { type: 'button', onclick: () => { snap(); px = Array(s * s).fill('.'); redraw(); } }, '全部消す'));
  };
  const pal = h('.px-pal');
  const drawPal = () => {
    pal.textContent = '';
    PAL.forEach((c, i) => pal.append(h('button.sw' + (col === CH[i] ? '.on' : ''), { type: 'button', 'aria-label': '色 ' + (i + 1), style: { '--c': c }, onclick: () => { col = CH[i]; if (tool === 'erase') tool = 'pen'; drawPal(); drawTools(); } })));
  };
  const sizeBox = h('div');
  const drawSize = () => {
    sizeBox.textContent = '';
    sizeBox.append(T.seg([[16, '16×16'], [24, '24×24'], [32, '32×32']], s, n => {
      if (n === s) return;
      snap();
      const np = Array(n * n).fill('.');
      const m = Math.min(n, s);
      for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) np[y * n + x] = px[y * s + x];
      s = n; px = np; redraw(); drawSize();
    }, '.small'));
  };
  const png = () => {
    const k = Math.floor(768 / s), c = document.createElement('canvas');
    c.width = c.height = s * k;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(cv, 0, 0, s * k, s * k);
    c.toBlob(b => b && T.download(`tenten-dot-${T.today()}.png`, b), 'image/png');
  };
  const fin = v => { done = true; resolve(v); sheet.close(); };

  redraw(); drawTools(); drawPal(); drawSize();
  const sheet = T.sheet({
    title: 'ドット絵',
    content: h('.px', sizeBox, h('.px-stage', cv), tools, pal,
      h('.form-actions',
        art && h('button.btn.ghost.danger', { type: 'button', onclick: () => fin('delete') }, '削除する'),
        h('button.btn.ghost', { type: 'button', onclick: png }, '画像で保存'),
        h('button.btn.pri', { type: 'button', onclick: () => { if (px.every(c => c === '.')) { T.toast('まだ何も描いてない'); return; } fin({ s, d: px.join('') }); } }, '日記に貼る'))),
    onClose: () => { if (!done) resolve(null); },
  });
});
})();
