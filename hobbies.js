/* 点々 — 趣味（ひとつずつ、ちゃんと考える） */
(() => {
'use strict';
const { h } = T;
const ST = [['kininaru', '気になる'], ['hajimeta', 'はじめた'], ['tsuzuku', '続いてる'], ['yasumi', 'お休み']];
const stName = k => (ST.find(s => s[0] === k) || ST[0])[1];
/* 見つけたときに考えておくと、あとで効く問い */
const QS = [
  ['trigger', 'きっかけ', 'どこで出会った？ 何を見て気になった？'],
  ['appeal', 'どこに惹かれた', '見た目、音、手ざわり、達成感、人…'],
  ['first', '最初の一歩', '今週できる、いちばん小さいことは？'],
  ['pace', '続けるなら', '頻度、場所、ひとりで？ 誰かと？'],
  ['memo', '自由メモ', 'リンク、気になる人、用語など'],
];
const HB = () => T.S.hobbies;
let flt = 'all';

function checklist(items, { price, placeholder, onChange, extra }) {
  const box = h('.clist');
  const draw = () => {
    box.textContent = '';
    items.forEach(it => box.append(h('.citem' + (it.done ? '.done' : ''),
      h('button.cbox', { type: 'button', 'aria-label': it.done ? '済みを外す' : '済みにする', 'aria-pressed': String(!!it.done), onclick: () => { it.done = !it.done; onChange(); draw(); } }),
      h('span.ctext', it.t),
      price && it.price ? h('span.cprice', T.yen(it.price)) : null,
      extra ? extra(it) : null,
      h('button.icon-btn.small', { type: 'button', 'aria-label': `${it.t} を消す`, onclick: () => { items.splice(items.indexOf(it), 1); onChange(); draw(); } }, T.icon('x')))));
    const name = h('input', { type: 'text', placeholder, 'aria-label': placeholder });
    const yen = price ? h('input.w-price', { type: 'text', inputMode: 'numeric', placeholder: '値段', 'aria-label': '値段' }) : null;
    const addIt = () => {
      const t = name.value.trim();
      if (!t) { name.focus(); return; }
      items.push({ id: T.uid(), t, price: yen ? Number(yen.value.replace(/[^\d]/g, '')) || 0 : 0, done: false });
      onChange(); draw();
      box.querySelector('.cadd input').focus();
    };
    const onKey = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addIt(); } };
    name.addEventListener('keydown', onKey);
    if (yen) yen.addEventListener('keydown', onKey);
    box.append(h('.cadd', name, yen, h('button.btn.small', { type: 'button', onclick: addIt }, '足す')));
  };
  draw();
  return box;
}

function edit(hb) {
  T.form({
    title: hb ? '編集' : '趣味を見つけた',
    values: hb ? { name: hb.name, status: hb.status, found: hb.found } : { status: 'kininaru', found: T.today() },
    fields: [
      { k: 'name', label: 'なまえ', placeholder: 'カメラ、ボルダリング、コーヒー…', required: true },
      { k: 'status', label: 'いまの距離', type: 'chips', options: ST },
      { k: 'found', label: '見つけた日', type: 'date', max: T.today() },
    ],
    submit: hb ? '保存する' : '書きとめる',
    onDelete: hb ? () => { T.S.hobbies = HB().filter(x => x.id !== hb.id); T.save(); T.go('hobbies'); } : null,
    onSubmit: v => {
      if (hb) { Object.assign(hb, { name: v.name.trim(), status: v.status, found: v.found || hb.found }); T.save(); T.render(); }
      else {
        const n = { id: T.uid(), name: v.name.trim(), status: v.status, found: v.found || T.today(), qa: {}, needs: [], todo: [], logs: [] };
        HB().push(n); T.save(); T.go('hobbies/' + n.id);
      }
    },
  });
}

function detail(root, hb) {
  const t = T.today();
  root.append(
    h('header.head',
      h('button.back', { type: 'button', onclick: () => T.go('hobbies') }, T.icon('left'), '趣味'),
      h('.head-r', h('button.btn.small', { type: 'button', onclick: () => edit(hb) }, '編集'))),
    h('h1.title', hb.name),
    h('p.quiet', `${T.fmt(hb.found, 'ymd')}に見つけた。${Math.max(0, T.diffDays(hb.found, t))}日たった`),
    T.chips(ST, hb.status, v => { hb.status = v; T.save(); T.render(); }));

  // 問い
  const qa = h('section.block', h('h2', '考えておくこと'));
  QS.forEach(([k, label, ph]) => {
    const ta = h('textarea.auto', { rows: 1, placeholder: ph, value: hb.qa[k] || '', 'aria-label': label });
    const grow = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    ta.addEventListener('input', () => { hb.qa[k] = ta.value; T.save(); grow(); });
    requestAnimationFrame(grow);
    qa.append(h('label.qa', h('span', label), ta));
  });
  root.append(qa);

  // 必要なもの
  const sum = h('p.quiet');
  const drawSum = () => {
    const all = hb.needs.reduce((s, x) => s + (x.price || 0), 0), left = hb.needs.filter(x => !x.done).reduce((s, x) => s + (x.price || 0), 0);
    sum.textContent = hb.needs.length ? `ぜんぶで ${T.yen(all)}、まだ持ってない分 ${T.yen(left)}` : 'はじめるのに要るものと、だいたいの値段';
  };
  root.append(h('section.block', h('h2', '必要なもの'), sum,
    checklist(hb.needs, {
      price: true, placeholder: '道具・入会金・本など',
      onChange: () => { T.save(); drawSum(); },
      extra: it => it.done ? null : h('button.btn.ghost.small', { type: 'button', title: 'お金の「ほしい」に入れる', onclick: () => {
        T.money.addWish({ name: it.t, price: it.price || 0, why: `${hb.name}に使う` });
        T.toast('お金の「ほしい」に入れた');
      } }, 'ほしいへ'),
    })));
  drawSum();

  // やってみたいこと
  root.append(h('section.block', h('h2', 'やってみたいこと'),
    checklist(hb.todo, { placeholder: '行きたい場所、試したい技、作りたいもの', onChange: () => T.save() })));

  // 記録
  const logBox = h('div');
  const drawLogs = () => {
    logBox.textContent = '';
    if (!hb.logs.length) logBox.append(h('p.quiet', 'やった日、感じたことを一言ずつ。あとで読むとけっこう面白い'));
    [...hb.logs].sort((a, b) => b.date.localeCompare(a.date)).forEach(l => logBox.append(h('.log',
      h('time', T.fmt(l.date, 'mdw'), l.date.slice(0, 4) !== t.slice(0, 4) ? ` ${l.date.slice(0, 4)}` : ''),
      h('p', l.text),
      h('button.icon-btn.small', { type: 'button', 'aria-label': 'この記録を消す', onclick: async () => {
        if (!await T.confirm('この記録を消す？', '消す', true)) return;
        hb.logs = hb.logs.filter(x => x.id !== l.id); T.save(); drawLogs();
      } }, T.icon('x')))));
  };
  const lt = h('textarea.auto', { rows: 2, placeholder: '今日やったこと、気づいたこと', 'aria-label': '記録' });
  const ld = h('input.w-date', { type: 'date', value: t, max: t, 'aria-label': '日付' });
  root.append(h('section.block', h('h2', '記録'),
    h('.logadd', lt, h('.row-between', ld, h('button.btn.small.pri', { type: 'button', onclick: () => {
      const text = lt.value.trim();
      if (!text) { lt.focus(); return; }
      hb.logs.push({ id: T.uid(), date: ld.value && ld.value <= t ? ld.value : t, text });
      if (hb.status === 'kininaru') hb.status = 'hajimeta';
      lt.value = ''; T.save(); T.render();
    } }, '記録する'))),
    logBox));
  drawLogs();
}

T.views.hobbies = {
  render(root, a) {
    const one = a[0] && HB().find(x => x.id === a[0]);
    if (one) { detail(root, one); return; }
    root.append(T.head('趣味'));
    if (!HB().length) {
      root.append(T.empty('「これ、ちょっと気になる」をひとつずつ置いておく場所。きっかけ、要るもの、最初の一歩まで一緒に考える。', '気になるものを書く', () => edit()));
    } else {
      root.append(T.chips([['all', 'すべて'], ...ST], flt, v => { flt = v; T.render(); }));
      const list = HB().filter(x => flt === 'all' || x.status === flt).sort((a, b) => b.found.localeCompare(a.found));
      if (!list.length) root.append(h('p.quiet.center', 'この距離のものは、いまはない'));
      list.forEach(hb => {
        const next = hb.todo.find(x => !x.done);
        root.append(h('button.hobby', { type: 'button', onclick: () => T.go('hobbies/' + hb.id) },
          h('span.hobby-st.st-' + hb.status, stName(hb.status)),
          h('b', hb.name),
          h('span.quiet', next ? `つぎは「${next.t}」` : hb.qa.appeal ? hb.qa.appeal.split('\n')[0] : 'まだ何も書いてない'),
          h('span.hobby-n', hb.logs.length ? `記録 ${hb.logs.length}` : '')));
      });
    }
    root.append(T.fab('趣味を足す', () => edit()));
  },
};
})();
