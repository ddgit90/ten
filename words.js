/* 点々 — ことば（言葉・知識・なぜ？・話題） */
(() => {
'use strict';
const { h } = T;
const TYPES = {
  word: { label: 'ことば', term: 'ことば', meaning: '意味', mph: 'どういう意味？ 自分の言葉でOK' },
  know: { label: '知識', term: 'タイトル', meaning: '内容', mph: 'わかったこと、しくみ、数字など' },
  why: { label: 'なぜ？', term: '問い', meaning: 'わかったこと', mph: '調べてわかったら書く。空のままでもいい' },
  talk: { label: '話題', term: 'トークテーマ', meaning: 'メモ', mph: '話したいこと、聞いてみたいこと' },
};
const W = () => T.S.words;
let type = 'all', genre = '', q = '', sort = 'new';

const genres = () => [...new Set(W().map(w => w.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'));
const state = w => w.type === 'why' ? (w.meaning && w.meaning.trim() ? 'わかった' : '考え中') : null;

function edit(w, preset) {
  const isNew = !w;
  T.form({
    title: isNew ? '書きとめる' : '編集',
    values: isNew ? { type: preset || (type !== 'all' ? type : 'word'), genre: genre || '' } : { ...w },
    fields: v => {
      const m = TYPES[v.type] || TYPES.word;
      return [
        { k: 'type', label: '種類', type: 'chips', options: Object.entries(TYPES).map(([k, x]) => [k, x.label]), redraw: true },
        { k: 'term', label: m.term, required: true, placeholder: v.type === 'why' ? 'なんで空は青いんだろう' : v.type === 'talk' ? '最近ハマってるものの話' : '' },
        v.type === 'word' && { k: 'reading', label: 'よみ', placeholder: 'ひらがなで（並べ替えに使う）' },
        v.type === 'why' && { k: 'thoughts', label: '自分の考え', type: 'textarea', rows: 3, placeholder: 'まず自分で考えてみる。まちがってていい' },
        { k: 'meaning', label: m.meaning, type: 'textarea', rows: 4, placeholder: m.mph },
        v.type === 'word' && { k: 'example', label: '使い方', type: 'textarea', rows: 2, placeholder: '例文や、聞いた場面' },
        (v.type === 'word' || v.type === 'know') && { k: 'thoughts', label: '思ったこと', type: 'textarea', rows: 2, placeholder: 'なんで気になった？ 関係ありそうなこと' },
        { k: 'genre', label: 'ジャンル', placeholder: '経済、IT、ことわざ、雑学…', list: genres() },
        { k: 'src', label: v.type === 'talk' ? '誰と話したい' : 'どこで出会った', placeholder: v.type === 'talk' ? '' : '本、動画、授業、会話…' },
      ];
    },
    submit: isNew ? '書きとめる' : '保存する',
    onDelete: isNew ? null : () => { T.S.words = W().filter(x => x.id !== w.id); T.save(); T.render(); },
    onSubmit: v => {
      const clean = k => String(v[k] || '').trim();
      const rec = { type: v.type, term: clean('term'), reading: clean('reading'), meaning: clean('meaning'), example: clean('example'), thoughts: clean('thoughts'), genre: clean('genre'), src: clean('src') };
      if (isNew) W().push({ id: T.uid(), created: T.today(), fav: false, ...rec });
      else Object.assign(w, rec);
      T.save(); T.render();
    },
  });
}

/* 辞書の1項目みたいに読む */
function open(id) {
  const w = W().find(x => x.id === id);
  if (!w) return;
  const m = TYPES[w.type] || TYPES.word;
  const part = (label, text, cls = '') => text ? h('.entry-part' + cls, h('small', label), h('p', text)) : null;
  const s = T.sheet({
    title: m.label, cls: '.entry-sheet',
    content: h('article.entry',
      h('h3', w.term), w.reading && h('p.entry-read', w.reading),
      h('.chips', state(w) && h('span.chip.static' + (state(w) === 'わかった' ? '.on' : ''), state(w)), w.genre && h('span.chip.static', w.genre)),
      w.type === 'why' ? part('自分の考え', w.thoughts) : null,
      part(m.meaning, w.meaning, '.main'),
      part('使い方', w.example, '.ex'),
      w.type !== 'why' ? part('思ったこと', w.thoughts) : null,
      part(w.type === 'talk' ? '誰と話したい' : '出会った場所', w.src),
      h('p.quiet', `${T.fmt(w.created, 'ymd')}に書きとめた`),
      h('.form-actions',
        h('button.btn.ghost', { type: 'button', onclick: () => { w.fav = !w.fav; T.save(); s.close(); T.render(); T.toast(w.fav ? 'お気に入りにした' : 'お気に入りを外した'); } }, w.fav ? 'お気に入りを外す' : 'お気に入り'),
        h('button.btn', { type: 'button', onclick: () => { s.close(); edit(w); } }, '編集'))),
  });
}

/* めくって思い出す */
function flash(pool) {
  if (!pool.length) { T.toast('めくれるものがまだない'); return; }
  const body = h('.flash');
  let last = null;
  const next = () => {
    let w = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1) while (w === last) w = pool[Math.floor(Math.random() * pool.length)];
    last = w;
    const m = TYPES[w.type] || TYPES.word;
    const back = w.type === 'why' ? [w.thoughts && '自分の考え：' + w.thoughts, w.meaning].filter(Boolean).join('\n\n') : w.meaning;
    const cardEl = h('button.flip', { type: 'button', 'aria-label': 'めくる', onclick: () => cardEl.classList.toggle('turned') },
      h('span.flip-in',
        h('span.flip-a', h('small', m.label), h('b', w.term), w.reading && h('em', w.reading), h('i', '押すと裏返る')),
        h('span.flip-b', h('small', m.meaning), h('span', back || 'まだ書いてない。考える時間だと思って'))));
    body.textContent = '';
    body.append(cardEl, h('.form-actions', h('button.btn.pri', { type: 'button', onclick: next }, 'つぎをめくる')));
  };
  next();
  T.sheet({ title: 'めくる', content: body });
}

function filtered() {
  const key = q.trim().toLowerCase();
  const list = W().filter(w => (type === 'all' || w.type === type) && (!genre || w.genre === genre) &&
    (!key || [w.term, w.reading, w.meaning, w.example, w.thoughts, w.genre].some(x => x && x.toLowerCase().includes(key))));
  if (sort === 'aiu') list.sort((a, b) => (a.reading || a.term).localeCompare(b.reading || b.term, 'ja'));
  else list.sort((a, b) => (b.fav - a.fav) || b.created.localeCompare(a.created) || b.id.localeCompare(a.id));
  return list;
}

function item(w) {
  const m = TYPES[w.type] || TYPES.word;
  return h('button.word.t-' + w.type, { type: 'button', onclick: () => open(w.id) },
    h('span.word-head', h('b', w.term), w.reading && h('em', w.reading), w.fav && h('span.word-fav', { 'aria-label': 'お気に入り' }, T.icon('star'))),
    h('span.word-body', w.meaning || (w.type === 'why' ? w.thoughts || 'まだ考え中' : 'まだ書いてない')),
    h('span.word-foot', h('small', m.label), state(w) && h('small', state(w)), w.genre && h('small', w.genre)));
}

T.views.words = {
  render(root) {
    root.append(T.head('ことば'));
    if (!W().length) {
      root.append(T.empty('知らなかった言葉、覚えておきたい知識、「なんでだろう」、誰かと話したいこと。気になった瞬間に置いておく。', 'ひとつ書きとめる', () => edit()));
      root.append(T.fab('書きとめる', () => edit()));
      return;
    }
    const out = h('div');
    const draw = () => {
      out.textContent = '';
      const list = filtered();
      if (!list.length) { out.append(h('p.quiet.center', '当てはまるものがない')); return; }
      list.forEach(w => out.append(item(w)));
    };
    const input = h('input', { type: 'search', placeholder: 'さがす', value: q, 'aria-label': 'ことばをさがす', oninput: () => { q = input.value; draw(); } });
    const gs = genres();
    if (genre && !gs.includes(genre)) genre = '';
    root.append(
      h('.search', T.icon('search'), input),
      T.seg([['all', 'すべて'], ...Object.entries(TYPES).map(([k, x]) => [k, x.label])], type, v => { type = v; T.render(); }),
      gs.length ? T.chips([['', '全ジャンル'], ...gs.map(g => [g, g])], genre, v => { genre = v; T.render(); }) : null,
      h('.row-between',
        T.chips([['new', '新しい順'], ['aiu', 'あいうえお順']], sort, v => { sort = v; T.render(); }),
        h('button.btn.small', { type: 'button', onclick: () => flash(filtered()) }, T.icon('shuffle'), 'めくる')),
      out);
    draw();
    root.append(T.fab('書きとめる', () => edit()));
  },
  open, edit, label: w => (TYPES[w.type] || TYPES.word).label,
};
})();
