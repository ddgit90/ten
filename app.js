/* 点々 — ホーム・設定・画面切り替え */
(() => {
'use strict';
const { h } = T;

T.SECS = [
  { id: 'home', label: '今日', icon: 'home' },
  { id: 'diary', label: '日記', icon: 'diary' },
  { id: 'habits', label: 'つづける', icon: 'stamp' },
  { id: 'hobbies', label: '趣味', icon: 'sprout' },
  { id: 'words', label: 'ことば', icon: 'bubble' },
  { id: 'money', label: 'お金', icon: 'yen' },
];

/* ---------- テーマ ---------- */
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const th = T.S.settings.theme;
  const dark = th === 'dark' || (th === 'auto' && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = dark ? '#10151F' : '#F1F2EF';
}
mq.addEventListener('change', () => T.S && applyTheme());

/* ---------- ロック（画面を隠すためのもの。暗号化ではない） ---------- */
const hashPin = pin => {
  const s = 'tenten:' + pin;
  let x = 2166136261;
  for (let r = 0; r < 2000; r++) for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i) + r; x = Math.imul(x, 16777619) >>> 0; }
  return x.toString(36);
};
function pinPad(label, onDone) {
  let v = '';
  const dots = h('.pin-dots', [0, 1, 2, 3].map(() => h('i')));
  const msg = h('p.pin-msg', { 'aria-live': 'polite' }, label);
  const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < v.length));
  const api = {
    press(k) {
      if (k === 'del') v = v.slice(0, -1); else if (v.length < 4) v += k;
      paint();
      if (v.length === 4) { const pin = v; setTimeout(() => { v = ''; paint(); onDone(pin, api); }, 150); }
    },
    say(text, bad) { msg.textContent = text; if (bad) { dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake'); } },
  };
  api.el = h('.pin', msg, dots, h('.pin-keys', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(k => k === '' ? h('span')
    : h('button', { type: 'button', 'aria-label': k === 'del' ? '1つ消す' : k, onclick: () => api.press(k) }, k === 'del' ? T.icon('left') : k))));
  return api;
}
let locked = false;
function lock() {
  if (locked || !T.S.settings.pin) return Promise.resolve();
  locked = true;
  T.closeSheets();
  document.documentElement.classList.add('locked');
  return new Promise(res => {
    const pad = pinPad('暗証番号を4桁', (pin, api) => {
      if (hashPin(pin) !== T.S.settings.pin) { api.say('ちがうみたい。もう一度', true); return; }
      removeEventListener('keydown', key);
      wrap.remove(); locked = false;
      document.documentElement.classList.remove('locked');
      res();
    });
    const key = e => { if (document.querySelector('.sheet-wrap')) return; if (/^\d$/.test(e.key)) pad.press(e.key); else if (e.key === 'Backspace') pad.press('del'); };
    addEventListener('keydown', key);
    const wrap = h('#lock', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'ロック' }, pad.el,
      h('button.btn.ghost.small', { type: 'button', onclick: async () => {
        if (!await T.confirm('番号は確かめようがないので、ぜんぶ消してやり直すことになる。バックアップのファイルがあれば、そのあと戻せる。消す？', 'ぜんぶ消す', true)) return;
        await T.eraseAll(); location.hash = '#/home'; location.reload();
      } }, '番号を忘れた'));
    document.body.append(wrap);
  });
}
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (T.S && T.S.settings.pin && hiddenAt && Date.now() - hiddenAt > 180000) lock();
});
function setPin(after) {
  let first = null;
  const pad = pinPad('新しい番号を4桁', (pin, api) => {
    if (!first) { first = pin; api.say('確認のため、もう一度'); }
    else if (pin === first) { T.S.settings.pin = hashPin(pin); T.save(); s.close(); T.toast('ロックをかけた'); after(); }
    else { first = null; api.say('合わなかった。最初から', true); }
  });
  const s = T.sheet({ title: 'ロックをかける', content: h('div', pad.el, h('p.quiet.center', '番号を忘れると、ぜんぶ消してバックアップから戻すことになる。')) });
}

/* ---------- 設定 ---------- */
function settings() {
  const body = h('.settings');
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async () => {
    const f = file.files[0];
    file.value = '';
    if (!f) return;
    if (!await T.confirm('いまの中身を、バックアップの内容で置きかえる？', '置きかえる', true)) return;
    try { await T.importAll(f); location.reload(); }
    catch { T.toast('このファイルは読み込めなかった。点々のバックアップか確認して'); }
  } });
  const usage = h('span.quiet', '');
  if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => {
    if (e && e.usage != null) usage.textContent = `いま約 ${(e.usage / 1048576).toFixed(1)}MB 使っている`;
  }).catch(() => {});
  const draw = () => {
    body.textContent = '';
    body.append(
      h('section', h('h3', '見た目'),
        T.seg([['auto', '端末に合わせる'], ['light', '明るい'], ['dark', '暗い']], T.S.settings.theme, v => { T.S.settings.theme = v; T.save(); applyTheme(); draw(); })),
      h('section', h('h3', 'バックアップ'),
        h('p.quiet', '中身はこの端末のブラウザの中だけにある。ブラウザのデータを消すと一緒に消えるので、ときどき書き出しておくと安心。'),
        h('.form-actions.start',
          h('button.btn', { type: 'button', onclick: async () => { try { await T.exportAll(); draw(); } catch { T.toast('書き出せなかった'); } } }, 'ファイルに書き出す'),
          h('button.btn', { type: 'button', onclick: () => file.click() }, 'ファイルから戻す'), file),
        h('span.quiet', T.S.settings.lastBackup ? `最後に書き出したのは ${T.fmt(T.S.settings.lastBackup, 'ymd')}（${T.diffDays(T.S.settings.lastBackup, T.today())}日前）` : 'まだ一度も書き出していない'),
        usage),
      h('section', h('h3', 'ロック'),
        h('p.quiet', T.S.settings.pin ? '開くときと、3分以上はなれて戻ったときに4桁の番号を聞く。' : '開くときに4桁の番号を聞くようにできる。画面を隠すためのもので、中身の暗号化まではしない。'),
        h('.form-actions.start', T.S.settings.pin
          ? h('button.btn', { type: 'button', onclick: async () => { if (await T.confirm('ロックを外す？', '外す')) { delete T.S.settings.pin; T.save(); draw(); T.toast('ロックを外した'); } } }, 'ロックを外す')
          : h('button.btn', { type: 'button', onclick: () => setPin(draw) }, '4桁の番号をかける'))),
      h('section', h('h3', '切り替えのコツ'),
        h('p.quiet', '下のバーを長押ししたまま左右にすべらせると、指を離したページへ飛べる。パソコンなら 1〜6 のキーでも切り替わる。')),
      h('section', h('h3', 'やり直す'),
        h('.form-actions.start', h('button.btn.ghost.danger', { type: 'button', onclick: async () => {
          if (!await T.confirm('日記もお金も、ぜんぶ消す？ 元には戻せない', 'ぜんぶ消す', true)) return;
          await T.eraseAll(); location.hash = '#/home'; location.reload();
        } }, 'ぜんぶ消す'))),
      h('p.quiet.center', `点々 ${T.version}`));
  };
  draw();
  T.sheet({ title: '設定', content: body });
}

/* ---------- ホーム ---------- */
let firstPaint = true;
function strip() {
  const t = T.today(), N = 28, D = T.S.diary;
  let s = '';
  for (let i = 0; i < N; i++) {
    const d = T.addDays(t, i - (N - 1)), e = D[d], x = i * 12 + 6;
    if (e && i < N - 1 && D[T.addDays(d, 1)]) s += `<line x1="${x}" y1="8" x2="${x + 12}" y2="8"/>`;
    s += e ? `<circle cx="${x}" cy="8" r="4" style="fill:${T.views.diary.colorOf(e) || 'var(--ai)'}"/>` : `<circle class="no" cx="${x}" cy="8" r="1.5"/>`;
  }
  const tp = document.createElement('template');
  tp.innerHTML = `<svg class="strip" viewBox="0 0 ${N * 12} 16" role="img" aria-label="この4週間に書いた日">${s}</svg>`;
  return tp.content.firstChild;
}

function home(root) {
  const now = new Date(), t = T.today(), hr = now.getHours();
  const hello = hr < 5 ? '遅くまでおつかれさま。' : hr < 11 ? 'おはよう。' : hr < 18 ? 'こんにちは。' : 'こんばんは。';
  const D = T.S.diary, e = D[t], dv = T.views.diary, total = dv.days().length;

  root.append(h('header.hero',
    h('.hero-date', T.dots(`${now.getMonth() + 1}.${now.getDate()}`, { ghost: true, pop: firstPaint })),
    h('.hero-side',
      h('button.icon-btn', { type: 'button', 'aria-label': '設定', onclick: settings }, T.icon('gear')),
      h('p', `${T.WD[now.getDay()]}曜日`), h('p.quiet', `${now.getFullYear()}年`))));
  firstPaint = false;

  // 今日の一行
  const sec = h('section.block.first');
  if (e && (e.text.trim() || e.photos.length || e.arts.length)) {
    sec.append(h('h2', hello + '今日の点は、もう打ってある。'),
      h('button.today-entry', { type: 'button', onclick: () => T.go('diary') },
        h('span', e.text.trim() || '写真や絵だけの日'), h('small', '続きを書く')));
  } else {
    const ta = h('textarea', { rows: 2, placeholder: '一行でもいい。今日のことを。', 'aria-label': '今日の一行' });
    sec.append(h('h2', hello + '今日の一行、どうする？'),
      h('.quick', ta, h('button.btn.pri', { type: 'button', onclick: () => {
        const v = ta.value.trim();
        if (!v) { T.go('diary'); return; }
        dv.quick(v); T.toast('今日の点を打った'); T.render();
      } }, '書く')));
  }
  sec.append(h('button.strip-wrap', { type: 'button', 'aria-label': '年の一覧を見る', onclick: () => T.go('diary/y') }, strip(),
    h('span.quiet', total ? `これまでに ${total}日。点がつながると線になる` : 'この4週間。書いた日に点がつく')));
  root.append(sec);

  // ハンコ
  const hs = T.views.habits.active();
  if (hs.length) root.append(h('section.block', h('h2', h('button.h-link', { type: 'button', onclick: () => T.go('habits') }, 'つづける')),
    h('.stamps', hs.map(hb => h('.stamp-cell', T.views.habits.stamp(hb), h('small', hb.name))))));

  // お金
  const m = T.money.sums(), M = T.S.money;
  if (M.tx.length || M.accounts.some(a => a.balance) || M.fixed.length) root.append(h('section.block', h('h2', h('button.h-link', { type: 'button', onclick: () => T.go('money') }, 'お金')),
    h('button.mrow', { type: 'button', onclick: () => T.go('money') },
      h('span.mrow-main', h('b', m.free < 0 ? '足りない見込み' : '自由に使えるお金'), h('small', `今月これから出ていく ${T.yen(m.due)} を引いた額`)),
      h('span.mrow-amt.big', (m.free < 0 ? '−' : '') + T.yen(Math.abs(m.free)))),
    T.money.dueNow().slice(0, 3).map(({ f, d }) => h('.due',
      h('span', h('b', f.name), ` ${d === t ? '今日が期日' : T.fmt(d, 'md') + 'の分'}　${T.yen(f.amount)}`),
      h('button.btn.small', { type: 'button', onclick: () => T.money.pay(f) }, '払った'))),
    h('.form-actions.start', h('button.btn.small', { type: 'button', onclick: () => T.money.add() }, T.icon('plus'), '使ったお金を記録'))));

  // ことば（日替わりで1つ）
  const W = T.S.words;
  if (W.length) {
    let n = 0;
    for (const c of t) n = (n * 31 + c.charCodeAt(0)) >>> 0;
    const w = W[n % W.length];
    root.append(h('section.block', h('h2', h('button.h-link', { type: 'button', onclick: () => T.go('words') }, 'ことば')),
      h('button.today-word', { type: 'button', onclick: () => T.views.words.open(w.id) },
        h('small', T.views.words.label(w)), h('b', w.term), h('span', w.meaning || w.thoughts || '中身はまだ。押して確かめる'))));
  }

  // あの日
  const past = [];
  const yr = now.getFullYear();
  Object.keys(D).forEach(d => { if (d !== t && d.slice(5) === t.slice(5)) past.push([`${yr - Number(d.slice(0, 4))}年前`, d]); });
  past.sort((a, b) => b[1].localeCompare(a[1]));
  const pm = T.ymd(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()));
  if (D[pm] && T.parse(pm).getDate() === now.getDate()) past.unshift(['1か月前', pm]);
  const pw = T.addDays(t, -7);
  if (D[pw]) past.unshift(['1週間前', pw]);
  if (past.length) root.append(h('section.block', h('h2', 'あの日'), past.slice(0, 4).map(([l, d]) => dv.row(d, l))));

  // たまってきたら、書き出しをひと声だけ（しつこくしない）
  const st = T.S.settings, since = st.lastBackup ? T.diffDays(st.lastBackup, t) : null;
  const snoozed = st.backupSnooze && T.diffDays(st.backupSnooze, t) < 14;
  if (total >= 7 && (since === null || since >= 30) && !snoozed) root.append(h('section.block.nudge',
    h('p', since === null ? `日記が${total}日ぶんたまった。この端末の中にしかないので、一度ファイルに書き出しておくと安心。` : `最後に書き出してから${since}日たった。そろそろもう一度どう？`),
    h('.form-actions.start',
      h('button.btn.small', { type: 'button', onclick: async () => { try { if (await T.exportAll()) T.render(); } catch { T.toast('書き出せなかった'); } } }, 'ファイルに書き出す'),
      h('button.btn.small.ghost', { type: 'button', onclick: () => { st.backupSnooze = t; T.save(); T.render(); } }, 'あとで'))));

  // はじめて開いたとき
  if (!total && !hs.length && !W.length && !T.S.hobbies.length) root.append(h('section.block.guide',
    h('h2', 'はじめに'),
    h('p', '日記が真ん中。まわりに「つづける」「趣味」「ことば」「お金」がある。どれも使いたくなったときに触ればいい。'),
    h('p', '下のバーは、長押ししたまま左右にすべらせると素早く切り替えられる。')));
}
T.views.home = { render: home };

/* ---------- 画面切り替え ---------- */
let curPath = null;
function parseHash() {
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (!p.length || !T.views[p[0]]) return ['home'];
  return p;
}
function paint(keepScroll) {
  const [sec, ...args] = parseHash();
  const view = T.$('#view'), y = scrollY;
  document.body.dataset.sec = sec;
  view.textContent = '';
  T.views[sec].render(view, args);
  document.querySelectorAll('#dock button').forEach(b => {
    const on = b.dataset.id === sec;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  scrollTo(0, keepScroll ? y : 0);
  const sd = T.SECS.find(s => s.id === sec);
  document.title = sec === 'home' ? '点々' : `${sd.label} | 点々`;
}
function route() {
  const path = location.hash;
  const same = path === curPath;
  curPath = path;
  if (!same) T.closeSheets();
  if (!same) { const v = T.$('#view'); v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); }
  paint(same);
}
T.render = () => paint(true);
T.go = path => {
  const target = '#/' + path;
  if (location.hash === target) T.render(); else location.hash = target;
};

/* ---------- ドック（タップ／長押し→すべらせて切り替え） ---------- */
function buildDock() {
  const dock = T.$('#dock');
  const bubble = h('.dock-bubble', { 'aria-hidden': 'true' });
  const btns = T.SECS.map(s => h('button', { type: 'button', 'data-id': s.id, 'aria-label': s.label },
    T.icon(s.icon), h('small', s.label)));
  dock.append(bubble, ...btns);

  let down = null, scrub = false, timer = null, hot = -1;
  const idxAt = x => {
    let best = 0, bd = Infinity;
    btns.forEach((b, i) => { const r = b.getBoundingClientRect(), d = Math.abs(x - (r.left + r.width / 2)); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  const wave = x => {
    btns.forEach(b => {
      const r = b.getBoundingClientRect(), c = r.left + r.width / 2;
      const k = Math.max(0, 1 - Math.abs(x - c) / 110);
      b.style.transform = `translateY(${-14 * k}px) scale(${1 + 0.38 * k})`;
    });
  };
  const setHot = (i, x) => {
    if (i !== hot) {
      hot = i;
      btns.forEach((b, j) => b.classList.toggle('hot', j === i));
      bubble.textContent = T.SECS[i].label;
      document.body.dataset.hot = T.SECS[i].id;
      if (navigator.vibrate) navigator.vibrate(6);
    }
    const dr = dock.getBoundingClientRect();
    bubble.style.left = Math.min(dr.width - 44, Math.max(44, x - dr.left)) + 'px';
    wave(x);
  };
  const start = x => {
    scrub = true;
    dock.classList.add('scrub');
    dock.classList.remove('hint');
    setHot(idxAt(x), x);
  };
  const end = () => {
    clearTimeout(timer);
    down = null; scrub = false; hot = -1;
    dock.classList.remove('scrub');
    delete document.body.dataset.hot;
    btns.forEach(b => { b.style.transform = ''; b.classList.remove('hot'); });
  };
  dock.addEventListener('pointerdown', e => {
    if (e.button) return;
    down = { x: e.clientX, i: idxAt(e.clientX) };
    try { dock.setPointerCapture(e.pointerId); } catch {}
    timer = setTimeout(() => { if (down) start(down.x); }, 300);
  });
  dock.addEventListener('pointermove', e => {
    if (!down) return;
    if (!scrub && Math.abs(e.clientX - down.x) > 14) { clearTimeout(timer); start(e.clientX); }
    if (scrub) setHot(idxAt(e.clientX), e.clientX);
  });
  dock.addEventListener('pointerup', e => {
    if (!down) return;
    const i = scrub ? hot : down.i;
    end();
    if (i >= 0) T.go(T.SECS[i].id === 'home' ? 'home' : T.SECS[i].id);
  });
  dock.addEventListener('pointercancel', end);
  dock.addEventListener('contextmenu', e => e.preventDefault());
  // キーボード操作（Enter / Space）のときだけ click を使う
  btns.forEach((b, i) => b.addEventListener('click', e => { if (e.detail === 0) T.go(T.SECS[i].id); }));

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (locked || document.documentElement.classList.contains('lock')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= T.SECS.length) T.go(T.SECS[n - 1].id);
  });
  // はじめて開いたときだけ、切り替えのコツを出す
  if (T.S.settings.hint) { dock.classList.add('hint'); T.S.settings.hint = false; T.save(); }
}

/* ---------- 起動 ---------- */
(async () => {
  await T.load();
  applyTheme();
  buildDock();
  await lock();
  addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
})();
