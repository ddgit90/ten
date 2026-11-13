/* 点々 — つづける（押した日だけ数える） */
(() => {
'use strict';
const { h } = T;
const HC = ['#D4523A', '#E8894A', '#D99A0B', '#2E8463', '#3D8FB5', '#2B4C9B', '#7A5FC0', '#C76A93', '#5A6478'];
const H = () => T.S.habits;

function stats(hb) {
  const ds = Object.keys(hb.log).sort(), t = T.today();
  let best = 0, run = 0, prev = null, back = 0;
  for (const d of ds) {
    const gap = prev ? T.diffDays(prev, d) : 0;
    if (prev && gap === 1) run++;
    else { if (prev && gap >= 3) back++; run = 1; }
    if (run > best) best = run;
    prev = d;
  }
  let cur = 0, c = hb.log[t] ? t : T.addDays(t, -1);
  while (hb.log[c]) { cur++; c = T.addDays(c, -1); }
  const mon = T.addDays(t, -((T.parse(t).getDay() + 6) % 7));
  let wk = 0;
  for (let i = 0; i < 7; i++) if (hb.log[T.addDays(mon, i)]) wk++;
  return { total: ds.length, best, cur, back, wk, mon };
}
function toggle(hb, d) {
  if (hb.log[d]) delete hb.log[d]; else hb.log[d] = 1;
  T.save();
}

/* 今日のハンコ（ホームでも使う） */
function stamp(hb, big) {
  const t = T.today(), on = !!hb.log[t];
  return h('button.stamp' + (on ? '.on' : '') + (big ? '.big' : ''), {
    type: 'button', 'data-stamp': hb.id, style: { '--c': hb.color }, 'aria-pressed': String(on),
    'aria-label': `${hb.name} 今日のハンコ${on ? '（押してある）' : ''}`,
    onclick: ev => {
      ev.stopPropagation();
      toggle(hb, t);
      T.render();
      if (hb.log[t]) {
        const b = document.querySelector(`[data-stamp="${hb.id}"]`);
        if (b) b.classList.add('press');
        if (navigator.vibrate) navigator.vibrate(12);
      }
    },
  }, h('span', '済'));
}

function card(hb) {
  const t = T.today(), s = stats(hb);
  const week = h('.week');
  for (let i = 6; i >= 0; i--) {
    const d = T.addDays(t, -i);
    week.append(h('button.wdot' + (hb.log[d] ? '.on' : '') + (i === 0 ? '.today' : ''), {
      type: 'button', 'aria-label': `${T.fmt(d, 'mdw')} ${hb.log[d] ? '押してある' : 'まだ'}`, 'aria-pressed': String(!!hb.log[d]),
      onclick: () => { toggle(hb, d); T.render(); },
    }, h('i'), h('small', T.WD[T.parse(d).getDay()])));
  }
  const dayN = Math.max(1, T.diffDays(hb.since, t) + 1);
  return h('article.habit', { style: { '--c': hb.color } },
    h('.habit-top',
      h('button.habit-name', { type: 'button', onclick: () => detail(hb.id) },
        h('b', hb.name),
        h('span.quiet', `${T.fmt(hb.since, 'md')}から ${dayN}日目`)),
      stamp(hb, true)),
    h('.habit-mid', week,
      h('.habit-num', h('span', h('b', s.total), h('small', '回')),
        hb.goal ? h('span.quiet', `今週 ${s.wk}/${hb.goal}`) : null)));
}

function detail(id) {
  const body = h('div');
  let sheet;
  const draw = () => {
    const hb = H().find(x => x.id === id);
    body.textContent = '';
    if (!hb) return;
    const s = stats(hb), t = T.today();
    body.style.setProperty('--c', hb.color);
    const grid = h('.hgrid');
    const start = T.addDays(s.mon, -7 * 15);
    for (let i = 0; i < 7 * 16; i++) {
      const d = T.addDays(start, i);
      // 縦が曜日、横が週になるよう grid-auto-flow: column で並べる
      grid.append(d > t ? h('span') : h('button' + (hb.log[d] ? '.on' : '') + (d === t ? '.today' : ''), {
        type: 'button', title: T.fmt(d, 'mdw'), 'aria-label': `${T.fmt(d, 'mdw')} ${hb.log[d] ? '押してある' : 'まだ'}`,
        onclick: () => { toggle(hb, d); draw(); T.render(); },
      }));
    }
    const facts = [
      s.cur >= 2 && ['いまの連続', `${s.cur}日`],
      s.best >= 2 && ['最長', `${s.best}日`],
      ['もどってきた', `${s.back}回`],
      hb.goal ? ['今週', `${s.wk} / ${hb.goal}`] : null,
    ].filter(Boolean);
    body.append(
      h('.hero-num', T.dots(String(s.total)), h('span', '回 押した')),
      h('p.quiet.center', `${T.fmt(hb.since, 'ymd')}から。空いた日は数えない。`),
      h('.facts', facts.map(([k, v]) => h('div', h('small', k), h('b', v)))),
      h('p.quiet', 'この16週間。押し忘れた日はここから押せる'),
      grid,
      h('.form-actions',
        h('button.btn.ghost.danger', { type: 'button', onclick: async () => {
          if (!await T.confirm(`「${hb.name}」を記録ごと消す？`, '消す', true)) return;
          T.S.habits = H().filter(x => x.id !== id); T.save(); sheet.close(); T.render();
        } }, '削除'),
        h('button.btn.ghost', { type: 'button', onclick: () => { hb.rest = !hb.rest; T.save(); sheet.close(); T.render(); T.toast(hb.rest ? 'お休みにした。いつでも再開できる' : '再開した'); } }, hb.rest ? '再開する' : 'お休みにする'),
        h('button.btn', { type: 'button', onclick: () => { sheet.close(); edit(hb); } }, '編集')));
  };
  draw();
  const hb = H().find(x => x.id === id);
  sheet = T.sheet({ title: hb ? hb.name : '', content: body });
}

function edit(hb) {
  T.form({
    title: hb ? '編集' : 'つづけたいこと',
    values: hb ? { name: hb.name, goal: hb.goal || 0, since: hb.since, color: hb.color } : { goal: 0, since: T.today(), color: HC[H().length % HC.length] },
    fields: [
      { k: 'name', label: 'なにを', placeholder: '筋トレ、散歩、ストレッチ…', required: true },
      { k: 'goal', label: 'ゆるい目安', type: 'chips', options: [[0, '決めない'], [1, '週1'], [2, '週2'], [3, '週3'], [5, '週5'], [7, '毎日']], hint: '届かなくても何も起きない。ただの目印' },
      { k: 'since', label: 'いつから', type: 'date', max: T.today() },
      { k: 'color', label: 'ハンコの色', type: 'color', options: HC.map(c => [c, c]) },
    ],
    submit: hb ? '保存する' : 'はじめる',
    onSubmit: v => {
      const since = v.since && v.since <= T.today() ? v.since : T.today();
      if (hb) Object.assign(hb, { name: v.name.trim(), goal: Number(v.goal) || 0, since, color: v.color });
      else H().push({ id: T.uid(), name: v.name.trim(), goal: Number(v.goal) || 0, since, color: v.color, log: {} });
      T.save(); T.render();
    },
  });
}

T.views.habits = {
  render(root) {
    const act = H().filter(x => !x.rest), rest = H().filter(x => x.rest), t = T.today();
    root.append(T.head('つづける'));
    if (!H().length) {
      root.append(T.empty('やった日にハンコを押すだけ。空いた日は数えないし、途切れても何も減らない。', 'ひとつ作る', () => edit()));
    } else {
      const doneN = act.filter(x => x.log[t]).length;
      root.append(h('p.lead', act.length ? `今日は ${doneN} / ${act.length}。押した日だけが残っていく。` : 'いまは全部お休み中。'));
      act.forEach(hb => root.append(card(hb)));
      if (rest.length) root.append(h('section.block', h('h2', 'お休み中'),
        rest.map(hb => h('button.erow', { type: 'button', onclick: () => detail(hb.id) },
          h('i.erow-dot', { style: { '--c': hb.color } }),
          h('span.erow-body', h('span.erow-text', hb.name)),
          h('span.quiet', `${stats(hb).total}回`)))));
    }
    root.append(T.fab('つづけたいことを足す', () => edit()));
  },
  stamp, stats, active: () => H().filter(x => !x.rest),
};
})();
