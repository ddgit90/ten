/* 点々 — 日記 */
(() => {
'use strict';
const { h } = T;

const COLORS = [
  ['sora', '空', '#6FA8DC'], ['ai', '藍', '#2B4C9B'], ['wakaba', '若葉', '#7DB86A'], ['yamabuki', '山吹', '#E5B020'],
  ['daidai', '橙', '#E8894A'], ['shu', '朱', '#D4523A'], ['momo', '桃', '#E79AB0'], ['fuji', '藤', '#9A86D4'],
  ['hai', '灰', '#9AA0A8'], ['sumi', '墨', '#3A4256'],
];
const PROMPTS = [
  '今日いちばん長く考えていたことは？', '今日食べたもので、いちばんおいしかったのは？', '今日ちょっと笑ったこと',
  '今日はじめて知ったこと', '今日の小さな「できた」', '明日の自分にひとこと', '今日見た景色でおぼえているもの',
  '誰かに言いそびれたこと', 'いま欲しいもの。なんで欲しい？', '今日やらなくてよかったこと', '耳に残っている音や曲',
  '5年後に読み返す自分へ', '最近ハマっているものの、どこが好き？', '今日いちばん面倒だったこと',
  '今日の天気と、そのときの気分', 'ありがとうと思ったこと', '最近気になっている言葉', '今日の自分をひとことで言うと',
];

const D = () => T.S.diary;
const colorOf = e => (COLORS.find(c => c[0] === (e && e.color)) || [])[2];
const blank = () => ({ text: '', photos: [], arts: [] });
function ent(d, make) {
  let e = D()[d];
  if (!e && make) e = D()[d] = blank();
  return e;
}
function tidy(d) {
  const e = D()[d];
  if (e && !e.text.trim() && !e.photos.length && !e.arts.length && !e.color) delete D()[d];
}
const days = () => Object.keys(D()).sort();
const excerpt = (e, n = 80) => { const t = e.text.trim().replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n) + '…' : t; };
const shiftMonth = (ym, k) => { const [y, m] = ym.split('-').map(Number); return T.ymd(new Date(y, m - 1 + k, 1)).slice(0, 7); };

let cur = null;             // いま開いている日
let q = '', flt = 'all', shown = 40;

/* 一覧の1行（ホームでも使う） */
function row(d, label) {
  const e = D()[d], dt = T.parse(d);
  const thumb = e.photos[0] ? T.img(e.photos[0], '.erow-thumb') : (e.arts[0] ? h('span.erow-thumb.is-art', T.artCanvas(e.arts[0])) : null);
  return h('button.erow', { type: 'button', onclick: () => T.go('diary/' + d) },
    h('span.erow-day' + (label ? '.wide' : ''), h('b', label || dt.getDate()), h('small', label ? T.fmt(d, 'md') : T.WD[dt.getDay()])),
    h('span.erow-body',
      h('span.erow-text', excerpt(e) || (e.photos.length ? '写真だけの日' : e.arts.length ? 'ドット絵だけの日' : '色だけの日'))),
    thumb,
    h('i.erow-dot', { style: { '--c': colorOf(e) || 'var(--acc)' } }));
}

/* ---------- 書く ---------- */
function write(root, d) {
  cur = d;
  const t = T.today(), dt = T.parse(d);
  const e0 = ent(d) || blank();

  const dateIn = h('input.date-hit', { type: 'date', value: d, max: t, 'aria-label': '日付をえらぶ',
    onclick: ev => { try { ev.target.showPicker && ev.target.showPicker(); } catch {} },
    onchange: ev => { const v = ev.target.value; if (v && v <= t) T.go('diary/' + v); else if (v) T.toast('先の日付はまだ書けない'); } });
  root.append(h('.daybar',
    h('button.icon-btn', { type: 'button', 'aria-label': '前の日', onclick: () => T.go('diary/' + T.addDays(d, -1)) }, T.icon('left')),
    h('.daybar-date', T.dots(`${dt.getMonth() + 1}.${dt.getDate()}`, { ghost: true }),
      h('span.daybar-sub', `${dt.getFullYear()}年 ${T.WD[dt.getDay()]}曜日`, d === t && h('em', '今日')), dateIn),
    h('button.icon-btn', { type: 'button', 'aria-label': '次の日', disabled: d >= t, onclick: () => T.go('diary/' + T.addDays(d, 1)) }, T.icon('right'))));

  // 今日の色
  const colors = h('.colors', { role: 'group', 'aria-label': 'この日の色' });
  COLORS.forEach(([k, name, hex]) => {
    const b = h('button.sw' + (e0.color === k ? '.on' : ''), { type: 'button', title: name, 'aria-label': name, style: { '--c': hex } });
    b.addEventListener('click', () => {
      const x = ent(d, true);
      const off = x.color === k;
      x.color = off ? undefined : k;
      colors.querySelectorAll('.on').forEach(n => n.classList.remove('on'));
      if (!off) b.classList.add('on');
      tidy(d); T.save();
    });
    colors.append(b);
  });
  root.append(h('.color-row', h('span.quiet', 'この日の色'), colors));

  // 本文
  const count = h('span.quiet');
  const meta = () => { count.textContent = ta.value.length ? `${ta.value.length}字` : ''; };
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight, 132) + 'px'; };
  const ta = h('textarea.diary-text', {
    placeholder: d === t ? '一行でもいい。今日のことを。' : 'この日のことを。', value: e0.text, 'aria-label': '日記の本文',
    oninput: () => { const x = ent(d, true); x.text = ta.value; x.at = Date.now(); tidy(d); T.save(); grow(); meta(); },
  });

  // お題
  const pbar = h('.prompt-bar', { hidden: true });
  const showPrompt = () => {
    const p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    pbar.hidden = false;
    pbar.textContent = '';
    pbar.append(h('p', p),
      h('button.btn.small', { type: 'button', onclick: showPrompt }, 'べつのお題'),
      h('button.btn.small.pri', { type: 'button', onclick: () => {
        ta.value = (ta.value.trim() ? ta.value.replace(/\s+$/, '') + '\n\n' : '') + `「${p}」\n`;
        ta.dispatchEvent(new Event('input'));
        pbar.hidden = true; ta.focus();
      } }, 'これで書く'));
  };

  // 添付
  const atts = h('.atts');
  const drawAtts = () => {
    const e = ent(d) || blank();
    atts.textContent = '';
    e.photos.forEach(id => atts.append(h('button.att', { type: 'button', 'aria-label': '写真をひらく', onclick: () => viewPhoto(d, id, drawAtts) }, T.img(id))));
    e.arts.forEach(a => atts.append(h('button.att.is-art', { type: 'button', 'aria-label': 'ドット絵を直す', onclick: async () => {
      const r = await T.pixelEdit(a);
      if (!r) return;
      const x = ent(d, true);
      if (r === 'delete') x.arts = x.arts.filter(o => o.id !== a.id); else Object.assign(a, r);
      tidy(d); T.save(); drawAtts();
    } }, T.artCanvas(a))));
  };
  const file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async () => {
    const x = ent(d, true);
    let bad = 0;
    for (const f of file.files) {
      try { x.photos.push(await T.putBlob(await T.shrink(f))); } catch { bad++; }
    }
    file.value = '';
    tidy(d); T.save(); drawAtts();
    if (bad) T.toast('読み込めない画像があった');
  } });
  const tools = h('.diary-tools',
    h('button.btn.small', { type: 'button', onclick: () => file.click() }, T.icon('photo'), '写真'),
    h('button.btn.small', { type: 'button', onclick: async () => {
      const r = await T.pixelEdit(null);
      if (r && r !== 'delete') { ent(d, true).arts.push({ id: T.uid(), ...r }); T.save(); drawAtts(); }
    } }, T.icon('grid'), 'ドット絵'),
    h('button.btn.small', { type: 'button', onclick: showPrompt }, T.icon('quest'), 'お題'),
    file);

  root.append(h('.page', ta, pbar, atts, tools,
    h('.diary-meta', count, h('span.quiet', '書いたそばから保存される'),
      D()[d] && h('button.btn.ghost.small.danger', { type: 'button', onclick: async () => {
        if (!await T.confirm(`${T.fmt(d)}の日記を消す？`, '消す', true)) return;
        const e = D()[d];
        if (e) { e.photos.forEach(T.delBlob); delete D()[d]; T.save(); }
        T.render();
      } }, 'この日を消す'))));
  drawAtts(); meta();
  requestAnimationFrame(grow);

  if (d !== t) root.append(h('p.center', h('button.btn.small', { type: 'button', onclick: () => T.go('diary') }, '今日にもどる')));

  // 同じ日付の、ほかの年
  const same = days().filter(x => x !== d && x.slice(5) === d.slice(5)).reverse();
  if (same.length) root.append(h('section.block', h('h2', 'ほかの年のこの日'), same.map(x => row(x, x.slice(0, 4)))));
}

function viewPhoto(d, id, after) {
  const s = T.sheet({
    title: T.fmt(d),
    content: h('.photo-view', T.img(id),
      h('.form-actions', h('button.btn.ghost.danger', { type: 'button', onclick: async () => {
        if (!await T.confirm('この写真を消す？', '消す', true)) return;
        const e = D()[d];
        if (e) { e.photos = e.photos.filter(x => x !== id); T.delBlob(id); tidy(d); T.save(); }
        s.close(); after();
      } }, '写真を消す'))),
  });
}

/* ---------- 月 ---------- */
function month(root, ym) {
  const [y, m] = ym.split('-').map(Number);
  const t = T.today(), n = new Date(y, m, 0).getDate(), lead = new Date(y, m - 1, 1).getDay();
  root.append(h('.pager',
    h('button.icon-btn', { type: 'button', 'aria-label': '前の月', onclick: () => T.go('diary/m/' + shiftMonth(ym, -1)) }, T.icon('left')),
    h('button.pager-title', { type: 'button', title: 'この年を見る', onclick: () => T.go('diary/y/' + y) }, `${y}年 ${m}月`),
    h('button.icon-btn', { type: 'button', 'aria-label': '次の月', disabled: ym >= t.slice(0, 7), onclick: () => T.go('diary/m/' + shiftMonth(ym, 1)) }, T.icon('right'))));
  const grid = h('.cal');
  T.WD.forEach(w => grid.append(h('span.cal-wd', w)));
  for (let i = 0; i < lead; i++) grid.append(h('span'));
  let wrote = 0;
  for (let i = 1; i <= n; i++) {
    const d = `${ym}-${String(i).padStart(2, '0')}`, e = D()[d];
    if (e) wrote++;
    grid.append(h('button.cal-day' + (e ? '.has' : '') + (e && (e.photos.length || e.arts.length) ? '.att' : '') + (d === t ? '.today' : ''), {
      type: 'button', disabled: d > t, 'aria-label': T.fmt(d) + (e ? ' 書いた' : ''),
      style: e ? { '--c': colorOf(e) || 'var(--acc)' } : null,
      onclick: () => T.go('diary/' + d),
    }, h('span', i)));
  }
  root.append(grid, h('p.quiet.center', wrote ? `この月は ${wrote}日 書いた` : 'この月はまだ白紙。日付を押すと書ける'));
  const list = days().filter(d => d.startsWith(ym)).reverse();
  if (list.length) root.append(h('section.block', list.map(d => row(d))));
}

/* ---------- 年 ---------- */
function year(root, ys) {
  const y = Number(ys), t = T.today(), ty = Number(t.slice(0, 4));
  const all = days();
  const inYear = all.filter(d => d.startsWith(ys + '-'));
  root.append(h('.pager',
    h('button.icon-btn', { type: 'button', 'aria-label': '前の年', onclick: () => T.go('diary/y/' + (y - 1)) }, T.icon('left')),
    h('span.pager-title', `${y}年`),
    h('button.icon-btn', { type: 'button', 'aria-label': '次の年', disabled: y >= ty, onclick: () => T.go('diary/y/' + (y + 1)) }, T.icon('right'))));
  const box = h('.yeargrid');
  for (let m = 1; m <= 12; m++) {
    const ym = `${ys}-${String(m).padStart(2, '0')}`, n = new Date(y, m, 0).getDate();
    const line = h('button.yrow', { type: 'button', 'aria-label': `${m}月を見る`, disabled: ym > t.slice(0, 7), onclick: () => T.go('diary/m/' + ym) }, h('b', m));
    for (let i = 1; i <= 31; i++) {
      const d = `${ym}-${String(i).padStart(2, '0')}`, e = D()[d];
      line.append(h('i' + (i > n ? '.none' : e ? '.on' : d === t ? '.now' : d > t ? '.later' : ''), e ? { style: { '--c': colorOf(e) || 'var(--acc)' } } : null));
    }
    box.append(line);
  }
  root.append(box, h('p.quiet.center', inYear.length ? `${y}年は ${inYear.length}日 書いた。月を押すとその月へ` : 'この年の点はまだない'));
  const years = [...new Set(all.map(d => d.slice(0, 4)))].filter(x => x !== ys);
  if (years.length) root.append(h('.chips.center', years.map(x => h('button.chip', { type: 'button', onclick: () => T.go('diary/y/' + x) }, x + '年'))));
}

/* ---------- 一覧・検索 ---------- */
function list(root) {
  const out = h('div');
  const draw = () => {
    out.textContent = '';
    const key = q.trim().toLowerCase();
    const hit = days().reverse().filter(d => {
      const e = D()[d];
      if (flt === 'photo' && !e.photos.length) return false;
      if (flt === 'art' && !e.arts.length) return false;
      return !key || e.text.toLowerCase().includes(key) || d.includes(key);
    });
    if (!hit.length) { out.append(T.empty(days().length ? '見つからなかった。言葉を変えてみて' : 'まだ日記がない。「書く」から今日の一行をどうぞ')); return; }
    out.append(h('p.quiet', `${hit.length}日ぶん`));
    let ym = '';
    hit.slice(0, shown).forEach(d => {
      if (d.slice(0, 7) !== ym) { ym = d.slice(0, 7); out.append(h('h2.month-h', `${Number(ym.slice(0, 4))}年 ${Number(ym.slice(5))}月`)); }
      out.append(row(d));
    });
    if (hit.length > shown) out.append(h('p.center', h('button.btn', { type: 'button', onclick: () => { shown += 40; draw(); } }, 'もっと前を見る')));
  };
  const input = h('input', { type: 'search', placeholder: '言葉や日付（2026-11 など）でさがす', value: q, 'aria-label': '日記をさがす', oninput: () => { q = input.value; shown = 40; draw(); } });
  root.append(
    h('.search', T.icon('search'), input),
    h('.row-between',
      T.chips([['all', 'すべて'], ['photo', '写真あり'], ['art', 'ドット絵あり']], flt, v => { flt = v; shown = 40; T.render(); }),
      h('button.btn.small', { type: 'button', onclick: () => {
        const a = days();
        if (!a.length) { T.toast('まだ日記がない'); return; }
        T.go('diary/' + a[Math.floor(Math.random() * a.length)]);
      } }, T.icon('shuffle'), 'めくる')),
    out);
  draw();
}

T.views.diary = {
  render(root, a) {
    const t = T.today();
    let mode = 'write', arg = t;
    if (a[0] === 'm') { mode = 'month'; arg = /^\d{4}-\d\d$/.test(a[1] || '') ? a[1] : (cur || t).slice(0, 7); }
    else if (a[0] === 'y') { mode = 'year'; arg = /^\d{4}$/.test(a[1] || '') ? a[1] : (cur || t).slice(0, 4); }
    else if (a[0] === 'all') mode = 'list';
    else if (/^\d{4}-\d\d-\d\d$/.test(a[0] || '') && a[0] <= t && !isNaN(T.parse(a[0]))) arg = a[0];
    root.append(T.head('日記'),
      T.seg([['write', '書く'], ['month', '月'], ['year', '年'], ['list', '一覧']], mode,
        m => T.go({ write: cur && cur !== t && mode !== 'write' ? 'diary/' + cur : 'diary', month: 'diary/m', year: 'diary/y', list: 'diary/all' }[m])));
    ({ write, month, year, list })[mode](root, arg);
  },
  row, days, colorOf,
  quick(text) { const e = ent(T.today(), true); e.text = (e.text.trim() ? e.text.replace(/\s+$/, '') + '\n' : '') + text; e.at = Date.now(); T.save(); },
};
})();
