/* 点々 — 共通部分（保存・日付・部品） */
(() => {
'use strict';
const T = window.T = { views: {}, version: '1.0.0' };

/* ---------- DOM ---------- */
T.$ = (s, r = document) => r.querySelector(s);

function add(el, a) {
  if (a == null || a === false || a === true) return;
  if (Array.isArray(a)) { a.forEach(x => add(el, x)); return; }
  if (a instanceof Node) { el.appendChild(a); return; }
  if (typeof a === 'object') {
    for (const k in a) {
      const v = a[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style') {
        for (const p in v) p.startsWith('--') ? el.style.setProperty(p, v[p]) : (el.style[p] = v[p]);
      }
      else if (k in el && k !== 'list' && k !== 'form') { try { el[k] = v; } catch { el.setAttribute(k, v); } }
      else el.setAttribute(k, v === true ? '' : v);
    }
    return;
  }
  el.appendChild(document.createTextNode(String(a)));
}

/* h('button.btn.pri', {onclick}, '文字') */
T.h = (sel, ...args) => {
  const m = sel.match(/^([a-z0-9]+)?(.*)$/i);
  const el = document.createElement(m[1] || 'div');
  (m[2].match(/[.#][^.#]+/g) || []).forEach(t => t[0] === '#' ? (el.id = t.slice(1)) : el.classList.add(t.slice(1)));
  args.forEach(a => add(el, a));
  return el;
};
const h = T.h;

T.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
T.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
T.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ---------- 日付（すべて端末のローカル時間で扱う） ---------- */
const pad = n => String(n).padStart(2, '0');
T.ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
T.today = () => T.ymd(new Date());
T.parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
T.addDays = (s, n) => { const d = T.parse(s); d.setDate(d.getDate() + n); return T.ymd(d); };
T.diffDays = (a, b) => Math.round((T.parse(b) - T.parse(a)) / 864e5);
T.WD = ['日', '月', '火', '水', '木', '金', '土'];
T.fmt = (s, kind = 'md') => {
  const d = T.parse(s);
  const md = `${d.getMonth() + 1}月${d.getDate()}日`;
  if (kind === 'md') return md;
  if (kind === 'mdw') return `${md}（${T.WD[d.getDay()]}）`;
  if (kind === 'ymd') return `${d.getFullYear()}年${md}`;
  return `${d.getFullYear()}年${md}（${T.WD[d.getDay()]}）`;
};
T.yen = n => '¥' + Math.round(Number(n) || 0).toLocaleString('ja-JP');

/* ---------- アイコン ---------- */
const IC = {
  home: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/>',
  diary: '<path d="M6.5 3.5H16a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6.5z"/><path d="M6.5 3.5v17M10.5 8.5h4M10.5 12h4"/>',
  stamp: '<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.4l2.6 2.6 5-5.6"/>',
  sprout: '<path d="M12 20.5V12"/><path d="M12 12.2c0-3.6-2.6-6-6.7-6 0 4 2.6 6 6.7 6z"/><path d="M12 14.6c0-3 2.1-5 6.2-5 0 3.5-2.6 5-6.2 5z"/>',
  bubble: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z"/><path d="M8.5 8.6h7M8.5 11.6h4.2"/>',
  yen: '<circle cx="12" cy="12" r="8.5"/><path d="M9 7.8l3 4.2 3-4.2M12 12v5M9.4 12.4h5.2M9.4 14.9h5.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  left: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  right: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
  photo: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><circle cx="9" cy="10.3" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/>',
  grid: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/>',
  quest: '<path d="M9 9.2a3 3 0 1 1 4.6 2.5c-.9.6-1.6 1.2-1.6 2.3"/><circle cx="12" cy="17.6" r=".9" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5L20 20"/>',
  shuffle: '<path d="M4 7h3.5c5 0 5 10 10 10H20M4 17h3.5c1.6 0 2.7-1 3.6-2.4M20 7h-2.5c-1.6 0-2.7 1-3.6 2.4M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5"/>',
  pen: '<path d="M5 19l.8-3.8L16.5 4.5a1.8 1.8 0 0 1 2.6 0l.4.4a1.8 1.8 0 0 1 0 2.6L8.8 18.2z"/>',
  erase: '<path d="M4.5 15.5l9-9a1.8 1.8 0 0 1 2.6 0l2.4 2.4a1.8 1.8 0 0 1 0 2.6L12 18H7z"/><path d="M9.5 10.5l5 5M12 18h8"/>',
  fill: '<path d="M11 4l7 7-6.2 6.2a1.8 1.8 0 0 1-2.6 0L5 13z"/><path d="M5.3 12.6h11.2M19.5 15.5s1.5 1.8 1.5 3a1.5 1.5 0 0 1-3 0c0-1.2 1.5-3 1.5-3z"/>',
  undo: '<path d="M8 6L4 10l4 4"/><path d="M4 10h10a5 5 0 0 1 0 10h-3"/>',
  star: '<path d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.3 7.2 18.9l1-5.4-4-3.8 5.4-.7z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
};
T.icon = name => {
  const s = document.createElement('span');
  s.className = 'ic';
  s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[name] || ''}</svg>`;
  return s;
};

/* ---------- ドットの数字（このアプリの顔） ---------- */
const G = {
  '0': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '.': ['0', '0', '0', '0', '0', '0', '1'],
  ',': ['00', '00', '00', '00', '00', '01', '10'],
  '-': ['000', '000', '000', '111', '000', '000', '000'],
  '/': ['00001', '00001', '00010', '00100', '01000', '10000', '10000'],
  '¥': ['10001', '01010', '11111', '00100', '11111', '00100', '00100'],
  ' ': ['00', '00', '00', '00', '00', '00', '00'],
};
T.dots = (text, { ghost = false, pop = false } = {}) => {
  const on = new Set();
  let x = 0;
  for (const ch of String(text)) {
    const g = G[ch] || G[' '];
    const w = g[0].length;
    for (let r = 0; r < 7; r++) for (let c = 0; c < w; c++) if (g[r][c] === '1') on.add((x + c) + ',' + r);
    x += w + 1;
  }
  const cols = Math.max(1, x - 1);
  let a = '', b = '';
  for (let c = 0; c < cols; c++) for (let r = 0; r < 7; r++) {
    const p = `cx="${c * 10 + 5}" cy="${r * 10 + 5}"`;
    if (on.has(c + ',' + r)) a += `<circle ${p} r="3.9"${pop ? ` style="animation-delay:${c * 16 + r * 6}ms"` : ''}/>`;
    else if (ghost) b += `<circle ${p} r="1.4"/>`;
  }
  const t = document.createElement('template');
  t.innerHTML = `<svg class="dm${pop ? ' pop' : ''}" viewBox="0 0 ${cols * 10} 70" role="img" aria-label="${T.esc(text)}"><g class="dm-off">${b}</g><g class="dm-on">${a}</g></svg>`;
  return t.content.firstChild;
};

/* ---------- 保存（IndexedDB。使えない環境では localStorage） ---------- */
const defaults = () => ({
  app: 'tenten', v: 1,
  settings: { theme: 'auto', hint: true },
  diary: {}, habits: [], hobbies: [], words: [],
  money: {
    accounts: [
      { id: T.uid(), name: '財布', kind: 'wallet', balance: 0 },
      { id: T.uid(), name: '銀行', kind: 'bank', balance: 0 },
    ],
    tx: [], fixed: [], wishes: [], budget: 0, wage: 0,
  },
});
function normalize(x) {
  const d = defaults();
  const s = Object.assign(d, x || {});
  s.settings = Object.assign(defaults().settings, (x && x.settings) || {});
  s.money = Object.assign(defaults().money, (x && x.money) || {});
  return s;
}

let db = null;
const mem = new Map();
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('tenten', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('blobs'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function tx(store, mode, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const rq = fn(t.objectStore(store));
    t.oncomplete = () => res(rq && rq.result);
    t.onerror = t.onabort = () => rej(t.error);
  });
}

T.load = async () => {
  let raw = null;
  try { db = await openDB(); raw = await tx('kv', 'readonly', s => s.get('state')); }
  catch { db = null; try { raw = JSON.parse(localStorage.getItem('tenten') || 'null'); } catch { raw = null; } }
  T.S = normalize(raw);
};
let saveTimer;
T.flush = () => {
  clearTimeout(saveTimer);
  if (db) return tx('kv', 'readwrite', s => s.put(T.S, 'state')).catch(() => T.toast('保存できなかった。端末の空き容量を確認して'));
  try { localStorage.setItem('tenten', JSON.stringify(T.S)); } catch { T.toast('保存できなかった。端末の空き容量を確認して'); }
  return Promise.resolve();
};
T.save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(T.flush, 250); };
addEventListener('pagehide', () => T.S && T.flush());
document.addEventListener('visibilitychange', () => { if (document.hidden && T.S) T.flush(); });

/* 写真の置き場所 */
T.putBlob = async data => { const id = T.uid(); mem.set(id, data); if (db) await tx('blobs', 'readwrite', s => s.put(data, id)); return id; };
T.getBlob = async id => { if (mem.has(id)) return mem.get(id); if (!db) return null; const v = await tx('blobs', 'readonly', s => s.get(id)); if (v) mem.set(id, v); return v; };
T.delBlob = id => { mem.delete(id); return db ? tx('blobs', 'readwrite', s => s.delete(id)).catch(() => {}) : Promise.resolve(); };
T.img = (id, cls = '') => {
  const im = h('img' + cls, { alt: '', loading: 'lazy' });
  T.getBlob(id).then(u => { if (u) im.src = u; });
  return im;
};
T.shrink = (file, max = 1400, q = 0.82) => new Promise((res, rej) => {
  const u = URL.createObjectURL(file);
  const im = new Image();
  im.onload = () => {
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(im.naturalWidth * k));
    c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    URL.revokeObjectURL(u);
    res(c.toDataURL('image/jpeg', q));
  };
  im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image')); };
  im.src = u;
});

/* バックアップ */
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
T.download = async (name, blob) => {
  // iPhone / iPad は共有シートから「ファイルに保存」「画像を保存」ができる
  if (isIOS && navigator.canShare) {
    try {
      const file = new File([blob], name, { type: blob.type });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
T.exportAll = async () => {
  await T.flush();
  const blobs = {};
  if (db) await new Promise((res, rej) => {
    const rq = db.transaction('blobs').objectStore('blobs').openCursor();
    rq.onsuccess = () => { const c = rq.result; if (c) { blobs[c.key] = c.value; c.continue(); } else res(); };
    rq.onerror = () => rej(rq.error);
  });
  else mem.forEach((v, k) => { blobs[k] = v; });
  const out = JSON.stringify({ app: 'tenten', exported: new Date().toISOString(), state: T.S, blobs });
  await T.download(`tenten-backup-${T.today()}.json`, new Blob([out], { type: 'application/json' }));
};
T.importAll = async file => {
  const data = JSON.parse(await file.text());
  if (!data || data.app !== 'tenten' || !data.state) throw new Error('format');
  T.S = normalize(data.state);
  if (db) {
    await tx('blobs', 'readwrite', s => { s.clear(); for (const k in (data.blobs || {})) s.put(data.blobs[k], k); });
  }
  mem.clear();
  if (!db) for (const k in (data.blobs || {})) mem.set(k, data.blobs[k]);
  await T.flush();
};
T.eraseAll = async () => {
  T.S = normalize(null);
  mem.clear();
  if (db) await tx('blobs', 'readwrite', s => s.clear());
  await T.flush();
};

/* ---------- 部品 ---------- */
let toastTimer;
T.toast = msg => {
  const el = T.$('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
};

let openSheets = 0;
const sheets = new Set();
T.closeSheets = () => [...sheets].forEach(s => s.close());
T.sheet = ({ title = '', content, onClose, cls = '' }) => {
  const root = T.$('#sheet-root');
  const wrap = h('.sheet-wrap');
  let closed = false;
  const api = {
    close() {
      if (closed) return;
      closed = true;
      sheets.delete(api);
      wrap.classList.add('out');
      document.removeEventListener('keydown', key);
      setTimeout(() => { wrap.remove(); if (--openSheets === 0) document.documentElement.classList.remove('lock'); }, 190);
      if (onClose) onClose();
    },
  };
  const box = h('.sheet' + cls, { role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'ダイアログ' },
    h('.sheet-head', h('h2', title), h('button.icon-btn', { type: 'button', 'aria-label': '閉じる', onclick: () => api.close() }, T.icon('x'))),
    content);
  api.el = box;
  const key = e => { if (e.key === 'Escape' && root.lastChild === wrap) api.close(); };
  wrap.addEventListener('click', e => { if (e.target === wrap) api.close(); });
  document.addEventListener('keydown', key);
  wrap.append(box);
  root.append(wrap);
  sheets.add(api);
  openSheets++;
  document.documentElement.classList.add('lock');
  return api;
};

T.confirm = (msg, ok = 'OK', danger = false) => new Promise(res => {
  let done = false;
  const fin = v => { if (done) return; done = true; res(v); s.close(); };
  const s = T.sheet({
    title: msg, cls: '.confirm',
    content: h('.form-actions',
      h('button.btn', { type: 'button', onclick: () => fin(false) }, 'やめる'),
      h('button.btn.pri' + (danger ? '.danger' : ''), { type: 'button', onclick: () => fin(true) }, ok)),
    onClose: () => { if (!done) { done = true; res(false); } },
  });
});

T.head = (title, ...right) => h('header.head', h('h1', title), h('.head-r', right));
T.seg = (opts, val, fn, cls = '') => h('.seg' + cls, { role: 'tablist' },
  opts.map(([v, l]) => h('button' + (v === val ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(v === val), onclick: () => fn(v) }, l)));
T.chips = (opts, val, fn) => h('.chips',
  opts.map(([v, l]) => h('button.chip' + (v === val ? '.on' : ''), { type: 'button', 'aria-pressed': String(v === val), onclick: () => fn(v) }, l)));
T.empty = (text, label, fn) => h('.empty', h('p', text), label && h('button.btn.pri', { type: 'button', onclick: fn }, label));
T.fab = (label, fn) => h('button.fab', { type: 'button', 'aria-label': label, title: label, onclick: fn }, T.icon('plus'));

/* フォーム。fields は配列か、いまの値を受け取って配列を返す関数 */
T.form = ({ title, fields, values = {}, submit = '保存する', onSubmit, onDelete, deleteLabel = '削除する' }) => {
  const v = { ...values };
  const body = h('form.form', { novalidate: true });
  const list = () => (typeof fields === 'function' ? fields(v) : fields).filter(Boolean);
  let sheet;
  const draw = () => {
    body.textContent = '';
    list().forEach(f => body.append(fieldEl(f, v, draw)));
    body.append(h('.form-actions',
      onDelete && h('button.btn.ghost.danger', { type: 'button', onclick: async () => { if (await T.confirm('ほんとに削除する？', '削除する', true)) { sheet.close(); onDelete(); } } }, deleteLabel),
      h('button.btn.pri', { type: 'submit' }, submit)));
  };
  body.addEventListener('submit', e => {
    e.preventDefault();
    for (const f of list()) {
      if (f.required && !String(v[f.k] ?? '').trim()) { T.toast(`「${f.label}」を入れてね`); return; }
    }
    sheet.close();
    onSubmit(v);
  });
  draw();
  sheet = T.sheet({ title, content: body });
  return sheet;
};
function fieldEl(f, v, redraw) {
  const cur = v[f.k] ?? '';
  if (f.type === 'chips' || f.type === 'color') {
    const row = h('.chips' + (f.type === 'color' ? '.swatches' : ''));
    f.options.forEach(o => {
      const [val, label] = Array.isArray(o) ? o : [o, o];
      const b = f.type === 'color'
        ? h('button.sw' + (cur === val ? '.on' : ''), { type: 'button', 'aria-label': label, title: label, style: { '--c': val } })
        : h('button.chip' + (cur === val ? '.on' : ''), { type: 'button' }, label);
      b.addEventListener('click', () => {
        v[f.k] = val;
        if (f.redraw) redraw();
        else { row.querySelectorAll('.on').forEach(x => x.classList.remove('on')); b.classList.add('on'); }
      });
      row.append(b);
    });
    return h('.field', h('span.field-label', f.label), row, f.hint && h('span.field-hint', f.hint));
  }
  let input;
  if (f.type === 'textarea') {
    input = h('textarea', { rows: f.rows || 3, placeholder: f.placeholder || '', value: cur });
  } else if (f.type === 'select') {
    input = h('select', f.options.map(o => { const [val, label] = Array.isArray(o) ? o : [o, o]; return h('option', { value: val }, label); }));
    input.value = cur;
    if (input.selectedIndex < 0 && f.options.length) { input.selectedIndex = 0; v[f.k] = input.value; }
  } else {
    input = h('input', { type: f.type === 'number' ? 'text' : (f.type || 'text'), placeholder: f.placeholder || '', value: cur });
    if (f.type === 'number') { input.inputMode = 'numeric'; input.autocomplete = 'off'; }
    if (f.max) input.max = f.max;
    if (f.list && f.list.length) {
      const id = 'dl-' + T.uid();
      input.setAttribute('list', id);
      input._dl = h('datalist', { id }, f.list.map(x => h('option', { value: x })));
    }
  }
  input.addEventListener(f.type === 'select' ? 'change' : 'input', () => {
    if (f.type === 'number') {
      const n = input.value.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[^\d.-]/g, '');
      v[f.k] = n === '' ? '' : Number(n);
    } else v[f.k] = input.value;
    if (f.redraw) redraw();
  });
  return h('label.field', h('span.field-label', f.label), input, input._dl, f.hint && h('span.field-hint', f.hint));
}
})();
