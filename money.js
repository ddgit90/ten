/* 点々 — お金（持っているお金・記録・定期・ほしい） */
(() => {
'use strict';
const { h } = T;
const KINDS = [['wallet', '財布'], ['bank', '銀行'], ['emoney', '電子マネー'], ['save', '貯金'], ['other', 'その他']];
const OUT = ['食費', '日用品', '交通', '趣味・娯楽', '交際', '服・美容', '通信', 'サブスク', '学び', '医療', '住まい', 'その他'];
const INC = ['バイト', 'おこづかい', '臨時収入', 'その他'];
const LV = [[1, '必要'], [2, 'ほしい'], [3, 'あこがれ']];
const M = () => T.S.money;
const acc = id => M().accounts.find(a => a.id === id);
const kindName = k => (KINDS.find(x => x[0] === k) || KINDS[4])[1];
const num = v => Math.max(0, Math.round(Number(v) || 0));
let ym = null;
const shiftMonth = (s, k) => { const [y, m] = s.split('-').map(Number); return T.ymd(new Date(y, m - 1 + k, 1)).slice(0, 7); };

/* ---------- 記録 ---------- */
function apply(tx, s) {
  const a = acc(tx.acc), b = acc(tx.to);
  if (tx.type === 'out' && a) a.balance -= s * tx.amount;
  if (tx.type === 'in' && a) a.balance += s * tx.amount;
  if (tx.type === 'move') { if (a) a.balance -= s * tx.amount; if (b) b.balance += s * tx.amount; }
}
function removeTx(tx) {
  apply(tx, -1);
  M().tx = M().tx.filter(x => x.id !== tx.id);
  M().fixed.forEach(f => { for (const k in (f.paid || {})) if (f.paid[k] === tx.id) delete f.paid[k]; });
  M().wishes.forEach(w => { if (w.tx === tx.id) { delete w.tx; delete w.bought; } });
}
function editTx(tx, preset) {
  const accs = M().accounts.map(a => [a.id, a.name]);
  if (!accs.length) { T.toast('先に「いま」で財布や口座を作ってね'); return; }
  T.form({
    title: tx ? '記録を直す' : '記録する',
    values: tx ? { ...tx } : { type: 'out', date: T.today(), acc: accs[0][0], to: (accs[1] || accs[0])[0], cat: OUT[0], ...(preset || {}) },
    fields: v => {
      const cats = v.type === 'in' ? INC : OUT;
      if (v.type !== 'move' && !cats.includes(v.cat)) v.cat = cats[0];
      return [
      { k: 'type', label: '種類', type: 'chips', options: [['out', '使った'], ['in', '入った'], ['move', '移した']], redraw: true },
      { k: 'amount', label: '金額', type: 'number', placeholder: '0', required: true },
      v.type !== 'move' && { k: 'cat', label: 'なにに', type: 'chips', options: v.type === 'in' ? INC : OUT },
      { k: 'acc', label: v.type === 'in' ? 'どこに入った' : v.type === 'move' ? 'どこから' : 'どこから払った', type: 'select', options: accs },
      v.type === 'move' && { k: 'to', label: 'どこへ', type: 'select', options: accs },
      { k: 'date', label: '日付', type: 'date', max: T.today() },
      { k: 'memo', label: 'メモ', placeholder: 'お店、理由など' },
      ];
    },
    onDelete: tx ? () => { removeTx(tx); T.save(); T.render(); } : null,
    onSubmit: v => {
      const amount = num(v.amount);
      if (!amount) { T.toast('金額が0だったので記録しなかった'); return; }
      if (v.type === 'move' && v.acc === v.to) { T.toast('同じ場所には移せない'); return; }
      const cats = v.type === 'in' ? INC : OUT;
      const rec = { type: v.type, amount, cat: v.type === 'move' ? '' : (cats.includes(v.cat) ? v.cat : cats[0]), acc: v.acc, to: v.type === 'move' ? v.to : '', date: v.date || T.today(), memo: String(v.memo || '').trim() };
      if (tx) { apply(tx, -1); Object.assign(tx, rec); apply(tx, 1); }
      else { const n = { id: T.uid(), ...rec }; M().tx.push(n); apply(n, 1); }
      T.save(); T.render();
    },
  });
}

/* ---------- 定期 ---------- */
const periodKey = (f, d) => f.cycle === 'y' ? d.slice(0, 4) : f.cycle === 'w' ? T.addDays(d, -T.parse(d).getDay()) : d.slice(0, 7);
function dueIn(f, d) {
  if (f.cycle === 'w') return T.addDays(periodKey(f, d), f.wd || 0);
  const dt = T.parse(d), y = dt.getFullYear();
  const mo = f.cycle === 'y' ? (f.month || 1) - 1 : dt.getMonth();
  return T.ymd(new Date(y, mo, Math.min(f.day || 1, new Date(y, mo + 1, 0).getDate())));
}
/* 登録する前に過ぎていた期日は、もう済んだものとして扱う */
const before = (f, d) => !!f.from && d < f.from;
function nextDue(f, t) {
  const k = periodKey(f, t);
  if (!(f.paid && f.paid[k]) && !before(f, dueIn(f, t))) return { d: dueIn(f, t), k };
  const dt = T.parse(t);
  const nd = f.cycle === 'w' ? T.addDays(k, 7) : f.cycle === 'y' ? `${dt.getFullYear() + 1}-01-01` : T.ymd(new Date(dt.getFullYear(), dt.getMonth() + 1, 1));
  return { d: dueIn(f, nd), k: periodKey(f, nd) };
}
/* 今月、これから出ていく分 */
function remain(f, t) {
  const k = periodKey(f, t), paid = (f.paid && f.paid[k]) || before(f, dueIn(f, t));
  if (f.cycle === 'm') return paid ? 0 : f.amount;
  if (f.cycle === 'y') return (!paid && dueIn(f, t).slice(0, 7) === t.slice(0, 7)) ? f.amount : 0;
  let n = 0;
  const m0 = t.slice(0, 7);
  for (let d = paid ? T.addDays(dueIn(f, t), 7) : dueIn(f, t); d.slice(0, 7) <= m0; d = T.addDays(d, 7)) if (d.slice(0, 7) === m0) n++;
  return n * f.amount;
}
const perMonth = f => f.cycle === 'y' ? f.amount / 12 : f.cycle === 'w' ? f.amount * 52 / 12 : f.amount;
const cycleText = f => f.cycle === 'y' ? `毎年 ${f.month || 1}月${f.day || 1}日` : f.cycle === 'w' ? `毎週 ${T.WD[f.wd || 0]}曜` : `毎月 ${f.day || 1}日`;

function editFixed(f) {
  const accs = M().accounts.map(a => [a.id, a.name]);
  T.form({
    title: f ? '定期を直す' : '定期的にかかるお金',
    values: f ? { ...f, on: f.on !== false } : { cycle: 'm', day: 1, month: 1, wd: 1, cat: 'サブスク', acc: accs[0] && accs[0][0] },
    fields: v => [
      { k: 'name', label: 'なまえ', placeholder: 'スマホ代、動画サブスク、定期券…', required: true },
      { k: 'amount', label: '1回の金額', type: 'number', placeholder: '0', required: true },
      { k: 'cycle', label: 'どのくらいで', type: 'chips', options: [['m', '毎月'], ['y', '毎年'], ['w', '毎週']], redraw: true },
      v.cycle === 'y' && { k: 'month', label: '何月', type: 'select', options: [...Array(12)].map((_, i) => [i + 1, `${i + 1}月`]) },
      v.cycle !== 'w' && { k: 'day', label: '何日', type: 'select', options: [...Array(31)].map((_, i) => [i + 1, `${i + 1}日`]), hint: 'その月にない日は月末として扱う' },
      v.cycle === 'w' && { k: 'wd', label: '何曜日', type: 'select', options: T.WD.map((w, i) => [i, w + '曜']) },
      { k: 'cat', label: 'なにに', type: 'chips', options: OUT },
      accs.length ? { k: 'acc', label: 'どこから払う', type: 'select', options: accs } : null,
      f ? { k: 'on', label: '状態', type: 'chips', options: [[true, '動いている'], [false, '止めておく']], hint: '止めると「自由に使えるお金」から引かなくなる' } : null,
    ],
    onDelete: f ? () => { M().fixed = M().fixed.filter(x => x.id !== f.id); T.save(); T.render(); } : null,
    onSubmit: v => {
      const amount = num(v.amount);
      if (!amount) { T.toast('金額が0だったので保存しなかった'); return; }
      const rec = { name: v.name.trim(), amount, cycle: v.cycle, day: Number(v.day) || 1, month: Number(v.month) || 1, wd: Number(v.wd) || 0, cat: OUT.includes(v.cat) ? v.cat : 'その他', acc: v.acc || '' };
      if (f) rec.on = v.on !== false;
      if (f) Object.assign(f, rec); else M().fixed.push({ id: T.uid(), on: true, paid: {}, from: T.today(), ...rec });
      T.save(); T.render();
    },
  });
}
function payFixed(f) {
  const t = T.today(), nx = nextDue(f, t);
  const tx = { id: T.uid(), type: 'out', amount: f.amount, cat: f.cat, acc: f.acc, to: '', date: t, memo: f.name };
  M().tx.push(tx); apply(tx, 1);
  f.paid = f.paid || {}; f.paid[nx.k] = tx.id;
  T.save(); T.render(); T.toast(`${f.name} を記録した`);
}

/* ---------- まとめ ---------- */
function sums() {
  const t = T.today();
  let hand = 0, save = 0;
  M().accounts.forEach(a => { if (a.kind === 'save') save += a.balance; else hand += a.balance; });
  const due = M().fixed.filter(f => f.on !== false).reduce((s, f) => s + remain(f, t), 0);
  return { hand, save, due, free: hand - due, total: hand + save };
}
function monthOf(m) {
  const list = M().tx.filter(x => x.date.startsWith(m));
  let inc = 0, out = 0; const cats = {};
  list.forEach(x => { if (x.type === 'in') inc += x.amount; else if (x.type === 'out') { out += x.amount; cats[x.cat] = (cats[x.cat] || 0) + x.amount; } });
  return { list, inc, out, cats: Object.entries(cats).sort((a, b) => b[1] - a[1]) };
}

function editAccount(a) {
  T.form({
    title: a ? '直す' : 'お金の置き場所',
    values: a ? { ...a } : { kind: 'wallet', balance: '' },
    fields: [
      { k: 'name', label: 'なまえ', placeholder: '財布、ゆうちょ、PayPay…', required: true },
      { k: 'kind', label: '種類', type: 'chips', options: KINDS, hint: '「貯金」は自由に使えるお金に入れない' },
      { k: 'balance', label: 'いま入っている金額', type: 'number', placeholder: '0', hint: a ? '数えたらズレてた、というときはここを直せばOK' : null },
    ],
    onDelete: a ? () => { M().accounts = M().accounts.filter(x => x.id !== a.id); T.save(); T.render(); } : null,
    onSubmit: v => {
      const rec = { name: v.name.trim(), kind: v.kind, balance: Math.round(Number(v.balance) || 0) };
      if (a) Object.assign(a, rec); else M().accounts.push({ id: T.uid(), ...rec });
      T.save(); T.render();
    },
  });
}
function editPrefs() {
  T.form({
    title: 'お金の設定',
    values: { budget: M().budget || '', wage: M().wage || '' },
    fields: [
      { k: 'budget', label: '1か月に使っていい金額', type: 'number', placeholder: '決めないなら空で', hint: '入れると「今月あといくら、1日あたりいくら」が出る' },
      { k: 'wage', label: '時給', type: 'number', placeholder: '入れないなら空で', hint: '入れると、ほしいものが「バイト何時間ぶん」かわかる' },
    ],
    onSubmit: v => { M().budget = num(v.budget); M().wage = num(v.wage); T.save(); T.render(); },
  });
}

/* ---------- いま ---------- */
function now(root) {
  const s = sums(), t = T.today();
  if (!ym) ym = t.slice(0, 7);
  root.append(
    h('.hero-num.left', T.dots(T.yen(Math.abs(s.free))), h('span', s.free < 0 ? '足りない見込み' : '自由に使える')),
    h('p.quiet', `手もと ${T.yen(s.hand)} から、今月これから出ていく ${T.yen(s.due)} を引いた額。`, s.save ? `貯金 ${T.yen(s.save)} は別にしてある。` : ''));

  const accBox = h('section.block', h('.row-between', h('h2', '置き場所'), h('button.btn.small', { type: 'button', onclick: () => editAccount() }, '足す')));
  if (!M().accounts.length) accBox.append(h('p.quiet', '財布や口座を足すと、ここに並ぶ'));
  M().accounts.forEach(a => accBox.append(h('button.mrow', { type: 'button', onclick: () => editAccount(a) },
    h('span.mrow-main', h('b', a.name), h('small', kindName(a.kind))), h('span.mrow-amt', T.yen(a.balance)))));
  accBox.append(h('p.quiet.right', `合計 ${T.yen(s.total)}`));
  root.append(accBox);

  // 月のまとめ
  const m = monthOf(ym), isNow = ym === t.slice(0, 7);
  const box = h('section.block',
    h('.pager.tight',
      h('button.icon-btn', { type: 'button', 'aria-label': '前の月', onclick: () => { ym = shiftMonth(ym, -1); T.render(); } }, T.icon('left')),
      h('span.pager-title', `${Number(ym.slice(0, 4))}年 ${Number(ym.slice(5))}月`),
      h('button.icon-btn', { type: 'button', 'aria-label': '次の月', disabled: isNow, onclick: () => { ym = shiftMonth(ym, 1); T.render(); } }, T.icon('right'))),
    h('.facts', h('div', h('small', '入った'), h('b', T.yen(m.inc))), h('div', h('small', '使った'), h('b', T.yen(m.out))), h('div', h('small', '差し引き'), h('b', (m.inc - m.out < 0 ? '−' : '') + T.yen(Math.abs(m.inc - m.out))))));
  if (M().budget) {
    const left = M().budget - m.out, pct = Math.min(100, Math.round(m.out / M().budget * 100));
    const lastDay = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)), 0).getDate();
    const daysLeft = lastDay - T.parse(t).getDate() + 1;
    box.append(h('.budget',
      h('.bar', h('i' + (left < 0 ? '.over' : ''), { style: { width: pct + '%' } })),
      h('p.quiet', left >= 0
        ? `予算 ${T.yen(M().budget)} のうち、あと ${T.yen(left)}` + (isNow ? `。1日あたり ${T.yen(left / daysLeft)}` : '')
        : `予算 ${T.yen(M().budget)} を ${T.yen(-left)} こえた`)));
  }
  if (m.cats.length) {
    const max = m.cats[0][1];
    box.append(h('.catbars', m.cats.map(([c, v]) => h('.catbar', h('span', c), h('.bar', h('i', { style: { width: Math.max(3, v / max * 100) + '%' } })), h('b', T.yen(v))))));
  } else box.append(h('p.quiet', 'この月の「使った」はまだない'));
  root.append(box, h('p.center', h('button.btn.small.ghost', { type: 'button', onclick: editPrefs }, '予算と時給を設定する')));
}

/* ---------- 記録一覧 ---------- */
function log(root) {
  const t = T.today();
  if (!ym) ym = t.slice(0, 7);
  const m = monthOf(ym);
  root.append(h('.pager',
    h('button.icon-btn', { type: 'button', 'aria-label': '前の月', onclick: () => { ym = shiftMonth(ym, -1); T.render(); } }, T.icon('left')),
    h('span.pager-title', `${Number(ym.slice(0, 4))}年 ${Number(ym.slice(5))}月`),
    h('button.icon-btn', { type: 'button', 'aria-label': '次の月', disabled: ym >= t.slice(0, 7), onclick: () => { ym = shiftMonth(ym, 1); T.render(); } }, T.icon('right'))));
  if (!m.list.length) { root.append(T.empty('この月の記録はまだない。使ったらその場で1件、がいちばん続く。', '記録する', () => editTx())); return; }
  let day = '';
  [...m.list].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).forEach(x => {
    if (x.date !== day) { day = x.date; root.append(h('h2.month-h', T.fmt(day, 'mdw'))); }
    const a = acc(x.acc), b = acc(x.to);
    root.append(h('button.mrow', { type: 'button', onclick: () => editTx(x) },
      h('span.mrow-main', h('b', x.type === 'move' ? '移した' : x.cat), h('small', [x.memo, x.type === 'move' ? `${a ? a.name : '？'} から ${b ? b.name : '？'}` : (a ? a.name : '')].filter(Boolean).join('　'))),
      h('span.mrow-amt' + (x.type === 'in' ? '.plus' : ''), (x.type === 'in' ? '+' : x.type === 'out' ? '−' : '') + T.yen(x.amount))));
  });
}

/* ---------- 定期一覧 ---------- */
function fixed(root) {
  const t = T.today(), list = M().fixed;
  if (!list.length) { root.append(T.empty('スマホ代、サブスク、定期券。毎回かかるお金を入れておくと、「自由に使えるお金」から先に引いておく。', '定期を足す', () => editFixed())); return; }
  const on = list.filter(f => f.on !== false), pm = on.reduce((s, f) => s + perMonth(f), 0);
  root.append(h('.facts', h('div', h('small', '1か月あたり'), h('b', T.yen(pm))), h('div', h('small', '1年あたり'), h('b', T.yen(pm * 12))), h('div', h('small', '1日あたり'), h('b', T.yen(pm * 12 / 365)))));
  [...list].sort((a, b) => nextDue(a, t).d.localeCompare(nextDue(b, t).d)).forEach(f => {
    const nx = nextDue(f, t), late = nx.d < t, off = f.on === false;
    root.append(h('article.fixed' + (off ? '.off' : ''),
      h('button.fixed-main', { type: 'button', onclick: () => editFixed(f) },
        h('b', f.name),
        h('span.quiet', `${cycleText(f)}　1日あたり ${T.yen(perMonth(f) * 12 / 365)}`),
        h('span.quiet', off ? '止めている' : late ? `${T.fmt(nx.d, 'md')}の分をまだ記録してない` : `つぎは ${T.fmt(nx.d, 'mdw')}`)),
      h('.fixed-side', h('b', T.yen(f.amount)),
        off ? h('button.btn.small', { type: 'button', onclick: () => { f.on = true; T.save(); T.render(); } }, '再開')
          : h('button.btn.small', { type: 'button', onclick: () => payFixed(f) }, '払った'))));
  });
  root.append(h('p.quiet', '「払った」を押すと、記録に入って残高からも引かれる。'));
}

/* ---------- ほしい ---------- */
function addWish(w) { M().wishes.push({ id: T.uid(), lv: 2, created: T.today(), why: '', url: '', ...w }); T.save(); }
function editWish(w) {
  T.form({
    title: w ? '直す' : 'ほしいもの',
    values: w ? { ...w } : { lv: 2 },
    fields: [
      { k: 'name', label: 'なにが', required: true },
      { k: 'price', label: 'だいたいの値段', type: 'number', placeholder: '0' },
      { k: 'lv', label: 'どのくらい', type: 'chips', options: LV },
      { k: 'why', label: 'なんで欲しい', type: 'textarea', rows: 2, placeholder: '買ったらどう使う？ 今あるもので足りない理由は？' },
      { k: 'url', label: 'リンク', type: 'url', placeholder: 'https://' },
    ],
    onDelete: w ? () => { M().wishes = M().wishes.filter(x => x.id !== w.id); T.save(); T.render(); } : null,
    onSubmit: v => {
      const rec = { name: v.name.trim(), price: num(v.price), lv: Number(v.lv) || 2, why: String(v.why || '').trim(), url: String(v.url || '').trim() };
      if (w) Object.assign(w, rec); else addWish(rec);
      T.save(); T.render();
    },
  });
}
function buyWish(w) {
  const accs = M().accounts.map(a => [a.id, a.name]);
  if (!accs.length) { w.bought = T.today(); T.save(); T.render(); return; }
  T.form({
    title: `${w.name} を買った`,
    values: { amount: w.price || '', acc: accs[0][0], cat: '趣味・娯楽', date: T.today() },
    fields: [
      { k: 'amount', label: '実際の金額', type: 'number', required: true },
      { k: 'acc', label: 'どこから払った', type: 'select', options: accs },
      { k: 'cat', label: 'なにに', type: 'chips', options: OUT },
      { k: 'date', label: '日付', type: 'date', max: T.today() },
    ],
    submit: '記録する',
    onSubmit: v => {
      const tx = { id: T.uid(), type: 'out', amount: num(v.amount), cat: OUT.includes(v.cat) ? v.cat : 'その他', acc: v.acc, to: '', date: v.date || T.today(), memo: w.name };
      if (tx.amount) { M().tx.push(tx); apply(tx, 1); w.tx = tx.id; }
      w.bought = tx.date;
      T.save(); T.render(); T.toast('買ったものに移した');
    },
  });
}
function wish(root) {
  const t = T.today(), s = sums();
  const open = M().wishes.filter(w => !w.bought).sort((a, b) => a.lv - b.lv || a.created.localeCompare(b.created));
  const got = M().wishes.filter(w => w.bought).sort((a, b) => b.bought.localeCompare(a.bought));
  if (!M().wishes.length) { root.append(T.empty('欲しいと思ったら、買う前にまずここへ。何日か寝かせてもまだ欲しいなら、それは本物。', 'ほしいものを書く', () => editWish())); return; }
  if (open.length) root.append(h('p.lead', `${open.length}個で ${T.yen(open.reduce((x, w) => x + (w.price || 0), 0))}。自由に使えるお金は ${T.yen(s.free)}。`));
  open.forEach(w => {
    const slept = Math.max(0, T.diffDays(w.created, t));
    const notes = [
      `寝かせて ${slept}日`,
      w.price && M().wage ? `バイト 約${Math.ceil(w.price / M().wage * 10) / 10}時間ぶん` : null,
      w.price ? (s.free >= w.price ? `いま買える（残り ${T.yen(s.free - w.price)}）` : `あと ${T.yen(w.price - s.free)}`) : null,
    ].filter(Boolean);
    const safe = /^https?:\/\//i.test(w.url || '');
    root.append(h('article.wish.lv' + w.lv,
      h('.wish-top', h('span.wish-lv', (LV.find(x => x[0] === w.lv) || LV[1])[1]), h('b', w.name), h('span.wish-price', w.price ? T.yen(w.price) : '値段まだ')),
      w.why && h('p.wish-why', w.why),
      h('ul.wish-notes', notes.map(n => h('li', n))),
      h('.wish-acts',
        safe && h('a.btn.small.ghost', { href: w.url, target: '_blank', rel: 'noopener noreferrer' }, T.icon('link'), '見にいく'),
        h('button.btn.small.ghost', { type: 'button', onclick: () => editWish(w) }, '直す'),
        h('button.btn.small', { type: 'button', onclick: () => buyWish(w) }, '買った'))));
  });
  if (got.length) root.append(h('section.block', h('h2', '買ったもの'),
    got.map(w => h('button.mrow', { type: 'button', onclick: () => editWish(w) },
      h('span.mrow-main', h('b', w.name), h('small', `${T.fmt(w.bought, 'ymd')}　寝かせた日数 ${Math.max(0, T.diffDays(w.created, w.bought))}`)),
      h('span.mrow-amt', w.price ? T.yen(w.price) : '')))));
}

T.money = { sums, addWish };
T.views.money = {
  render(root, a) {
    const tab = ['log', 'fixed', 'wish'].includes(a[0]) ? a[0] : 'now';
    root.append(T.head('お金'),
      T.seg([['now', 'いま'], ['log', '記録'], ['fixed', '定期'], ['wish', 'ほしい']], tab, v => T.go(v === 'now' ? 'money' : 'money/' + v)));
    ({ now, log, fixed, wish })[tab](root);
    const fabs = { now: ['記録する', () => editTx()], log: ['記録する', () => editTx()], fixed: ['定期を足す', () => editFixed()], wish: ['ほしいものを足す', () => editWish()] };
    root.append(T.fab(...fabs[tab]));
  },
};
})();
