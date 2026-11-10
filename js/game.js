/*
 * Maskeli Fiiller – tarayıcı oyunu
 * Derleme gerektirmez: index.html'i açmak ya da GitHub Pages'e koymak yeterlidir.
 */
(() => {
  'use strict';

  const D = window.MF_DATA;
  const COLORS = ['isim', 'sifat', 'zarf'];
  const ALL_MASKS = ['isim', 'sifat', 'zarf', 'altin'];
  const MASK_NAME = { isim: 'mavi', sifat: 'yeşil', zarf: 'turuncu', altin: 'altın' };
  const PAWNS = [
    { name: 'Kırmızı', hex: '#e5383b' },
    { name: 'Mor', hex: '#8e5cf7' },
    { name: 'Pembe', hex: '#f0609e' },
    { name: 'Kahverengi', hex: '#a8743f' },
  ];
  const SAVE_KEY = 'maskeli-fiiller:oyun:v1';
  const PREFS_KEY = 'maskeli-fiiller:ayarlar:v1';
  const TALLY_KEY = 'maskeli-fiiller:fuar-cetele:v1';
  const CASE_SECS = 30;
  const PRODUCE_SECS = 60;
  const FAIR_SECS = 5 * 60;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Yardımcılar ---------- */

  const $ = (sel, root = document) => root.querySelector(sel);
  const sleep = ms => new Promise(r => setTimeout(r, reduceMotion ? Math.min(ms, 60) : ms));
  const trLower = s => String(s).toLocaleLowerCase('tr-TR');
  const trUpper = s => String(s).toLocaleUpperCase('tr-TR');
  const norm = w => trLower(w).replace(/[^a-zçğıöşüâîû]/g, '');
  const tokenize = s => s.split(/\s+/).filter(Boolean);

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') {
          for (const [sk, sv] of Object.entries(v)) {
            if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
          }
        } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'html') el.innerHTML = v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  // replaceChildren boş değerleri "null" yazısına çevirir; önce ayıkla
  const clean = kids => kids.flat(Infinity).filter(k => k != null && k !== false);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* depolama kapalı olabilir */ } },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* yok say */ } },
  };

  const prefs = Object.assign(
    { sound: true, timer: true, expert: false, count: 2, names: ['', '', '', ''] },
    store.get(PREFS_KEY, {})
  );
  const savePrefs = () => store.set(PREFS_KEY, prefs);

  // Dinleyiciler: ekran değişince hepsi kapatılır
  const live = new Set();
  function listen(type, fn) {
    const ac = new AbortController();
    document.addEventListener(type, fn, { signal: ac.signal });
    live.add(ac);
    return () => { ac.abort(); live.delete(ac); };
  }
  const helpOpen = () => !!document.querySelector('.overlay.help');

  /* ---------- Ses ---------- */

  let actx = null;
  const TONES = {
    good: [[660, 0], [880, 0.11], [1175, 0.22]],
    bad: [[300, 0], [220, 0.16]],
    tick: [[1250, 0]],
    step: [[520, 0]],
    roll: [[380, 0]],
    buzz: [[200, 0], [200, 0.09]],
    win: [[523, 0], [659, 0.13], [784, 0.26], [1047, 0.39], [1319, 0.55]],
  };
  function beep(kind) {
    if (!prefs.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      for (const [f, t] of TONES[kind] || []) {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = kind === 'buzz' ? 'square' : 'triangle';
        o.frequency.value = f;
        const t0 = actx.currentTime + t;
        const len = kind === 'step' || kind === 'tick' ? 0.07 : 0.18;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(kind === 'buzz' ? 0.06 : 0.14, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
        o.connect(g).connect(actx.destination);
        o.start(t0);
        o.stop(t0 + len + 0.02);
      }
    } catch (e) { /* ses yoksa sessiz devam */ }
  }

  /* ---------- Görsel parçalar ---------- */

  const MASK_PATH = 'M3 9C12 1 25 3 32 9c7-6 20-8 29 0 2 14-8 25-18 23-6-1-8-6-11-6s-5 5-11 6C11 34 1 23 3 9z';
  function maskIcon(kind, size = 28, label) {
    const el = h('span', {
      class: `mask mask-${kind}`,
      style: { width: size + 'px', height: Math.round(size * 0.64) + 'px' },
      role: label ? 'img' : null,
      'aria-label': label || null,
      'aria-hidden': label ? null : 'true',
    });
    el.innerHTML = `<svg viewBox="0 0 64 40" focusable="false"><path class="mask-face" d="${MASK_PATH}"/>` +
      '<ellipse class="mask-eye" cx="19" cy="16" rx="7" ry="4.6"/><ellipse class="mask-eye" cx="45" cy="16" rx="7" ry="4.6"/></svg>';
    return el;
  }

  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function dieFace(n, blank) {
    const d = h('div', { class: 'die' + (blank ? ' blank' : ''), role: 'img', 'aria-label': blank ? 'Zar' : `Zar: ${n}` });
    for (let i = 0; i < 9; i++) d.append(h('span', { class: !blank && PIPS[n].includes(i) ? 'pip on' : 'pip' }));
    return d;
  }

  const who = pi => ({ name: S.players[pi].name, hex: PAWNS[pi].hex });
  function pawnChip(w, extraClass = '') {
    return h('span', { class: 'pawn ' + extraClass, style: { background: w.hex }, title: w.name, 'aria-hidden': 'true' },
      trUpper(w.name.trim().charAt(0) || '?'));
  }
  function whoTag(w) {
    return h('span', { class: 'who-tag' }, pawnChip(w), h('span', null, w.name));
  }

  function maskTrack(masks, size = 24) {
    let gold = masks.altin;
    const parts = [];
    for (const c of COLORS) {
      const grp = h('span', { class: 'track-grp' });
      for (let k = 0; k < 2; k++) {
        if (masks[c] > k) grp.append(maskIcon(c, size));
        else if (gold > 0) { gold--; grp.append(maskIcon('altin', size)); }
        else grp.append(maskIcon('empty-' + c, size));
      }
      if (masks[c] > 2) grp.append(h('span', { class: 'extra' }, '+' + (masks[c] - 2)));
      parts.push(grp);
    }
    if (gold > 0) parts.push(h('span', { class: 'track-grp' }, maskIcon('altin', size), h('span', { class: 'extra' }, '×' + gold)));
    const label = `Maskeler: ${masks.isim} mavi, ${masks.sifat} yeşil, ${masks.zarf} turuncu, ${masks.altin} altın`;
    return h('div', { class: 'track', role: 'img', 'aria-label': label, title: label }, parts);
  }

  let toastTimer = null;
  function toast(msg, ms = 2400) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* ---------- Pencere (modal) ---------- */

  const modalRoot = $('#modal-root');
  function openModal({ kind = '', label = 'Kart', help = false } = {}) {
    const lastFocus = document.activeElement;
    const body = h('div', { class: 'modal-body' });
    const dialog = h('div', { class: `modal ${kind}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': label, tabindex: '-1' }, body);
    const overlay = h('div', { class: 'overlay' + (help ? ' help' : '') }, dialog);
    let unlisten = null;
    const close = () => {
      if (!help) stopTimer();
      if (unlisten) unlisten();
      overlay.remove();
      if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    };
    if (help) {
      dialog.prepend(h('button', { class: 'modal-x', type: 'button', 'aria-label': 'Kapat', onclick: close }, '×'));
      overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
      unlisten = listen('keydown', e => { if (e.key === 'Escape' && modalRoot.lastElementChild === overlay) close(); });
    }
    modalRoot.append(overlay);
    dialog.focus({ preventScroll: true });
    return {
      body, dialog, close,
      set(...kids) {
        body.replaceChildren(...clean(kids));
        dialog.scrollTop = 0;
        dialog.focus({ preventScroll: true });
      },
    };
  }

  /* ---------- Süre sayacı ---------- */

  let activeTimer = null;
  function startTimer(host, secs, onExpire) {
    stopTimer();
    if (!secs) { host.replaceChildren(); return; }
    const fill = h('span', { class: 'timer-fill' });
    const num = h('span', { class: 'timer-num' }, String(secs));
    const bar = h('div', { class: 'timer', role: 'timer', 'aria-label': 'Kalan süre (saniye)' }, fill, num);
    host.replaceChildren(bar);
    const t0 = Date.now();
    let lastSec = secs;
    const id = setInterval(() => {
      const left = Math.max(0, secs - (Date.now() - t0) / 1000);
      fill.style.transform = `scaleX(${left / secs})`;
      const s = Math.ceil(left);
      if (s !== lastSec) {
        lastSec = s;
        num.textContent = String(s);
        bar.classList.toggle('low', s <= 5);
        if (s <= 5 && s > 0) beep('tick');
      }
      if (left <= 0) { stopTimer(); onExpire(); }
    }, 100);
    activeTimer = id;
  }
  function stopTimer() {
    if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
  }

  let fairClock = null;
  function stopAll() {
    stopTimer();
    clearInterval(fairClock);
    fairClock = null;
    for (const ac of live) ac.abort();
    live.clear();
    modalRoot.replaceChildren();
  }

  /* ---------- Oyun durumu ---------- */

  const app = $('#app');
  const DECK_SRC = { vaka: D.VAKA, tuzak: D.TUZAK, kok: D.KOK };
  let S = null;           // tam oyun durumu (kaydedilir)
  let phase = 'idle';     // idle | rolling | moving | task | over

  function freshDecks() {
    return {
      vaka: shuffle(D.VAKA.map((_, i) => i)),
      tuzak: shuffle(D.TUZAK.map((_, i) => i)),
      kok: shuffle(D.KOK.map((_, i) => i)),
    };
  }
  function draw(kind, decks) {
    if (!decks[kind].length) decks[kind] = shuffle(DECK_SRC[kind].map((_, i) => i));
    return DECK_SRC[kind][decks[kind].pop()];
  }

  function newGame(names, settings) {
    S = {
      v: 1,
      settings: { timer: !!settings.timer, expert: !!settings.expert },
      players: names.map(name => ({ name, pos: 0, masks: { isim: 0, sifat: 0, zarf: 0, altin: 0 } })),
      current: 0,
      treasury: { ...D.TREASURY },
      decks: freshDecks(),
      log: [],
      lastRoll: null,
      turn: 1,
    };
    addLog('Balo başladı! Herkes Balo Kapısı\'nda.');
    save();
  }
  const save = () => { if (S) store.set(SAVE_KEY, S); };
  function validSave(s) {
    return s && s.v === 1 && Array.isArray(s.players) && s.players.length >= 2 && s.players.length <= 4 &&
      s.decks && s.treasury && typeof s.current === 'number';
  }
  function addLog(text) {
    S.log.unshift(text);
    if (S.log.length > 40) S.log.length = 40;
  }

  const missingCount = m => COLORS.reduce((n, c) => n + Math.max(0, 2 - m[c]), 0);
  const hasWon = m => m.altin >= missingCount(m);

  function award(pi, color) {
    if (S.treasury[color] <= 0) return false;
    S.treasury[color]--;
    S.players[pi].masks[color]++;
    return true;
  }

  /* ---------- Ana menü ---------- */

  function renderHome() {
    stopAll();
    phase = 'idle';
    const saved = store.get(SAVE_KEY, null);
    const canResume = validSave(saved);
    app.replaceChildren(
      h('section', { class: 'home' },
        h('div', { class: 'hero' },
          h('div', { class: 'hero-masks', 'aria-hidden': 'true' }, maskIcon('isim', 74), maskIcon('sifat', 96), maskIcon('zarf', 74)),
          h('h1', null, 'Maskeli Fiiller'),
          h('p', { class: 'hero-sub' }, 'Fiilimsi Dedektifleri'),
          h('p', { class: 'story' },
            'Kelimeler Sarayı\'nda maskeli balo var. Bazı fiiller ek takıp kılık değiştirmiş: kimi isim, kimi sıfat, kimi zarf gibi davranıyor. ',
            'Sen bir dedektifsin; maskeli fiilleri yakala ve hangi maskeyi taktıklarını bul!'),
          h('ul', { class: 'legend' }, COLORS.map(c =>
            h('li', { class: 'legend-item' }, maskIcon(c, 28), h('span', null, h('b', null, D.TYPES[c].label), ' · ', D.TYPES[c].mask, ' maske'))))
        ),
        h('div', { class: 'home-actions' },
          canResume ? h('button', { class: 'btn btn-gold btn-xl', type: 'button', onclick: resumeGame },
            'Oyuna devam et', h('small', null, saved.players.map(p => p.name).join(' · '))) : null,
          h('button', { class: 'btn btn-primary btn-xl', type: 'button', onclick: () => renderSetup(canResume) },
            'Yeni oyun', h('small', null, '2–4 oyuncu ya da takım · 25–30 dk')),
          h('button', { class: 'btn btn-secondary btn-xl', type: 'button', onclick: renderFairStart },
            'Fuar modu', h('small', null, '5 dakikada 4 soru · rozet kazan')),
        ),
        h('p', { class: 'home-links' },
          h('button', { class: 'link-btn', type: 'button', onclick: showRules }, 'Nasıl oynanır?'), ' · ',
          h('button', { class: 'link-btn', type: 'button', onclick: showDefter }, 'Dedektif Defteri')),
        h('p', { class: 'foot' }, 'TÜBİTAK 4006-B Bilim Fuarı · Tasarım projesi · 8. sınıf Türkçe (LGS)')
      )
    );
    app.focus({ preventScroll: true });
  }

  function resumeGame() {
    const saved = store.get(SAVE_KEY, null);
    if (!validSave(saved)) { toast('Kayıtlı oyun bulunamadı.'); return renderHome(); }
    S = saved;
    renderGame();
    startTurn();
  }

  /* ---------- Oyun kurulumu ---------- */

  function toggle(label, desc, value, onChange) {
    const input = h('input', { type: 'checkbox', class: 'switch-input', checked: value ? true : null, onchange: e => onChange(e.target.checked) });
    return h('label', { class: 'switch' }, input, h('span', { class: 'switch-ui', 'aria-hidden': 'true' }),
      h('span', { class: 'switch-text' }, h('b', null, label), h('small', null, desc)));
  }

  function renderSetup(hasSave) {
    stopAll();
    let count = [2, 3, 4].includes(prefs.count) ? prefs.count : 2;
    const names = prefs.names.slice(0, 4);
    while (names.length < 4) names.push('');
    const settings = { timer: prefs.timer, expert: prefs.expert };

    const paint = () => {
      app.replaceChildren(h('section', { class: 'setup panel' },
        h('h2', null, 'Yeni oyun'),
        h('p', { class: 'muted' }, 'Oyuncu ya da takım sayısını seç. En genç oyuncu 1. sıraya yazılır ve oyuna o başlar; sıra saat yönünde ilerler.'),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Oyuncu sayısı' }, [2, 3, 4].map(n =>
          h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(n === count), onclick: () => { count = n; paint(); } }, `${n} oyuncu`))),
        h('div', { class: 'name-list' }, Array.from({ length: count }, (_, i) =>
          h('label', { class: 'name-row' },
            h('span', { class: 'pawn', style: { background: PAWNS[i].hex }, 'aria-hidden': 'true' }, String(i + 1)),
            h('input', {
              type: 'text', maxlength: '16', value: names[i], placeholder: `${i + 1}. Dedektif`, autocomplete: 'off',
              'aria-label': `${i + 1}. oyuncunun adı`, oninput: e => { names[i] = e.target.value; },
            }),
            h('span', { class: 'pawn-name' }, PAWNS[i].name)
          ))),
        h('div', { class: 'toggles' },
          toggle('Süre sayacı', 'Vaka, Tuzak ve Düello 30 sn, Üret 60 sn', settings.timer, v => { settings.timer = v; }),
          toggle('Uzman kuralı', 'Maske için fiilimsinin ekini de seçmek gerekir', settings.expert, v => { settings.expert = v; })),
        h('div', { class: 'row-end' },
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: renderHome }, 'Geri'),
          h('button', {
            class: 'btn btn-primary btn-lg', type: 'button', onclick: () => {
              if (hasSave && !window.confirm('Kayıtlı oyun silinecek ve yeni oyun başlayacak. Devam edilsin mi?')) return;
              const finalNames = names.slice(0, count).map((n, i) => n.trim() || `${i + 1}. Dedektif`);
              Object.assign(prefs, { count, names, timer: settings.timer, expert: settings.expert });
              savePrefs();
              newGame(finalNames, settings);
              renderGame();
              startTurn();
            },
          }, 'Baloya gir!'))
      ));
    };
    paint();
    const first = app.querySelector('input[type=text]');
    if (first) first.focus();
  }

  /* ---------- Oyun ekranı ---------- */

  function cellPos(i) {
    if (i <= 6) return { c: i, r: 0 };
    if (i <= 12) return { c: 6, r: i - 6 };
    if (i <= 18) return { c: 6 - (i - 12), r: 6 };
    return { c: 0, r: 6 - (i - 18) };
  }

  let boardEl = null;
  let sideEl = null;

  function renderGame() {
    stopAll();
    boardEl = h('div', { class: 'board', role: 'group', 'aria-label': 'Balo Salonu oyun tahtası' });
    D.BOARD.forEach((t, i) => {
      const { c, r } = cellPos(i);
      const sq = D.SQUARES[t];
      boardEl.append(h('div', {
        class: `cell sq-${t}`, 'data-i': String(i), title: `${sq.label}: ${sq.desc}`,
        style: { gridColumn: String(c + 1), gridRow: String(r + 1) },
      },
        h('span', { class: 'cell-icon', 'aria-hidden': 'true' }, sq.icon),
        h('span', { class: 'cell-label' }, sq.short),
        i === 0 ? h('span', { class: 'cell-arrow', 'aria-hidden': 'true' }, '➜') : null,
        h('span', { class: 'cell-pawns' })));
    });
    boardEl.append(h('div', { class: 'board-center' }));
    sideEl = h('aside', { class: 'side', 'aria-label': 'Dedektifler' });
    app.replaceChildren(h('section', { class: 'game' }, h('div', { class: 'board-wrap' }, boardEl), sideEl));
  }

  function updateGame() { updateBoard(); updateSide(); }

  function updateBoard() {
    if (!boardEl) return;
    boardEl.querySelectorAll('.cell').forEach(cell => {
      const i = Number(cell.dataset.i);
      const holder = cell.querySelector('.cell-pawns');
      holder.replaceChildren(...S.players.map((p, pi) => (p.pos === i ? pawnChip(who(pi), pi === S.current ? 'active' : '') : null)).filter(Boolean));
      cell.classList.toggle('here', S.players[S.current].pos === i);
    });
    const center = boardEl.querySelector('.board-center');
    const p = S.players[S.current];
    const label = phase === 'idle' ? 'Zar at' : phase === 'rolling' ? 'Zar dönüyor…' : phase === 'moving' ? 'İlerliyor…' : 'Görevde';
    center.replaceChildren(
      h('div', { class: 'center-title' }, maskIcon('altin', 30), h('span', null, 'Maskeli Fiiller')),
      h('div', { class: 'turn-box' },
        h('div', { class: 'turn-who' }, h('span', { class: 'muted' }, `${S.turn}. tur · Sıra:`), whoTag(who(S.current))),
        h('div', { class: 'turn-row' },
          h('div', { class: 'die-slot', id: 'die-slot' }, S.lastRoll ? dieFace(S.lastRoll) : dieFace(1, true)),
          h('button', {
            class: 'btn btn-gold btn-roll', id: 'roll-btn', type: 'button', disabled: phase !== 'idle' ? true : null,
            onclick: rollAndMove,
          }, label))),
      h('div', { class: 'piles' },
        pile('vaka', 'Vaka', S.decks.vaka.length || D.VAKA.length),
        pile('tuzak', 'Tuzak', S.decks.tuzak.length || D.TUZAK.length),
        pile('kok', 'Kök', S.decks.kok.length || D.KOK.length)),
      h('div', { class: 'treasury', role: 'img', 'aria-label': `Hazine: ${S.treasury.isim} mavi, ${S.treasury.sifat} yeşil, ${S.treasury.zarf} turuncu, ${S.treasury.altin} altın` },
        h('span', { class: 'tre-label' }, 'Hazine'),
        ALL_MASKS.map(c => h('span', { class: 'tre' }, maskIcon(c, 22), h('b', null, String(S.treasury[c])))))
    );
    if (p && phase === 'idle') center.classList.add('ready'); else center.classList.remove('ready');
  }

  function pile(kind, label, n) {
    return h('span', { class: `pile pile-${kind}`, title: `${label} destesi: ${n} kart` }, h('b', null, label), h('small', null, String(n)));
  }

  function updateSide() {
    if (!sideEl) return;
    const cur = S.players[S.current];
    const tradeColors = COLORS.filter(c => cur.masks[c] >= 4);
    sideEl.replaceChildren(
      h('h2', { class: 'side-title' }, 'Dedektifler'),
      h('ol', { class: 'players' }, S.players.map((p, pi) =>
        h('li', { class: 'player' + (pi === S.current ? ' current' : '') + (hasWon(p.masks) ? ' won' : '') },
          h('div', { class: 'player-head' }, whoTag(who(pi)),
            h('span', { class: 'player-pos' }, D.SQUARES[D.BOARD[p.pos]].short)),
          maskTrack(p.masks, 26),
          pi === S.current && phase === 'idle' && tradeColors.length
            ? h('div', { class: 'trade' }, tradeColors.map(c => h('button', {
              class: 'btn btn-small btn-gold-outline', type: 'button', disabled: S.treasury.altin <= 0 ? true : null,
              onclick: () => trade(c),
            }, `Takas: 2 ${MASK_NAME[c]} → 1 altın`)))
            : null))),
      h('div', { class: 'goal' }, 'Hedef: her renkten 2 maske. Altın maske eksik rengin yerine geçer.'),
      h('h3', { class: 'log-title' }, 'Olaylar'),
      h('ul', { class: 'log', 'aria-live': 'polite' }, S.log.slice(0, 6).map(t => h('li', null, t))),
      h('div', { class: 'side-actions' },
        h('button', { class: 'btn btn-ghost btn-small', type: 'button', onclick: () => { save(); renderHome(); } }, 'Ana menü (oyun kaydedilir)'))
    );
  }

  function trade(c) {
    const p = S.players[S.current];
    if (phase !== 'idle' || p.masks[c] < 4 || S.treasury.altin <= 0) return;
    p.masks[c] -= 2;
    S.treasury[c] += 2;
    p.masks.altin++;
    S.treasury.altin--;
    addLog(`${p.name} takas yaptı: 2 ${MASK_NAME[c]} → 1 altın maske.`);
    beep('good');
    save();
    updateGame();
    if (hasWon(p.masks)) showVictory(S.current);
  }

  /* ---------- Tur akışı ---------- */

  function startTurn() {
    phase = 'idle';
    save();
    updateGame();
    const btn = $('#roll-btn');
    if (btn) btn.focus({ preventScroll: true });
  }

  async function rollAndMove() {
    if (phase !== 'idle') return;
    phase = 'rolling';
    updateGame();
    const slot = $('#die-slot');
    let n = 1;
    for (let k = 0; k < 9; k++) {
      n = 1 + Math.floor(Math.random() * 6);
      if (slot) slot.replaceChildren(dieFace(n));
      beep('roll');
      await sleep(65);
    }
    S.lastRoll = n;
    phase = 'moving';
    updateGame();
    const p = S.players[S.current];
    await sleep(250);
    for (let k = 0; k < n; k++) {
      p.pos = (p.pos + 1) % D.BOARD.length;
      beep('step');
      updateBoard();
      await sleep(230);
    }
    const t = D.BOARD[p.pos];
    addLog(`${p.name} ${n} attı → ${D.SQUARES[t].label}`);
    phase = 'task';
    updateGame();
    await sleep(380);
    runSquare(t);
  }

  function runSquare(t) {
    if (t === 'vaka') return flowVaka();
    if (t === 'uret') return flowUret();
    if (t === 'tuzak') return flowTuzak();
    if (t === 'duello') return flowDuello();
    toast('Balo Kapısı: burada durmak bir şey kazandırmaz.');
    setTimeout(afterTask, 1300);
  }

  function afterTask() {
    if (!S) return;
    const wi = S.players.findIndex(p => hasWon(p.masks));
    if (wi >= 0) return showVictory(wi);
    S.current = (S.current + 1) % S.players.length;
    S.turn++;
    startTurn();
  }

  const leftOf = pi => (pi + 1) % S.players.length;
  const timedSecs = secs => (S && S.settings.timer ? secs : 0);

  function awardText(name, color, got) {
    if (!got) return `${name} doğru bildi ama hazinede ${MASK_NAME[color]} maske kalmadı.`;
    return `${name} 1 ${MASK_NAME[color]} maske kazandı!`;
  }

  /* ---------- Kart başlığı ---------- */

  const DECK_LABEL = { vaka: 'Vaka kartı', tuzak: 'Tuzak kartı', kok: 'Kök kartı', duello: 'Düello' };
  function cardTop(kind, title, w, timerHost) {
    return h('div', { class: 'card-top' },
      h('span', { class: `deck-badge db-${kind}` }, title),
      w ? h('span', { class: 'card-who' }, h('span', { class: 'muted' }, 'Cevaplayan:'), whoTag(w)) : null,
      timerHost || null);
  }

  /* ---------- Vaka sorusu ---------- */

  function answerSpan(card) {
    const toks = tokenize(card.s).map(norm);
    const aw = tokenize(card.w).map(norm);
    for (let i = 0; i + aw.length <= toks.length; i++) {
      if (aw.every((w, j) => toks[i + j] === w)) return aw.map((_, j) => i + j);
    }
    return [];
  }

  function checkCase(card, sel, type, grp, expert) {
    const span = answerSpan(card);
    const picked = [...sel];
    const wordOk = picked.length > 0 && picked.every(i => span.includes(i)) && (!expert || picked.length === span.length);
    const typeOk = type === card.t;
    const grpOk = !expert || grp === card.g;
    const lastIdx = tokenize(card.s).length - 1;
    const pickedPredicate = picked.includes(lastIdx) && !span.includes(lastIdx);
    return { wordOk, typeOk, grpOk, correct: wordOk && typeOk && grpOk, pickedPredicate };
  }

  function caseVerdict(res, expert) {
    if (res.timeout) return 'süre doldu';
    if (res.correct) return 'doğru';
    if (!res.wordOk && !res.typeOk) return 'fiilimsi ve tür yanlış';
    if (!res.wordOk) return 'fiilimsi yanlış';
    if (!res.typeOk) return 'fiilimsiyi buldu, tür yanlış';
    if (expert && !res.grpOk) return 'ek yanlış';
    return 'yanlış';
  }

  function askCase(target, card, opts) {
    // opts: { kind, title, who, secs, expert, banner, onAnswer }
    const toks = tokenize(card.s);
    const sel = new Set();
    let type = null;
    let grp = null;
    let done = false;
    const timerHost = h('div', { class: 'timer-host' });
    const submitBtn = h('button', { class: 'btn btn-primary btn-lg', type: 'button', disabled: true, onclick: () => submit(false) }, 'Cevapla');

    const words = h('p', { class: 'sentence', lang: 'tr' }, toks.map((t, i) => h('button', {
      type: 'button', class: 'word', 'aria-pressed': 'false',
      onclick: e => {
        if (sel.has(i)) sel.delete(i); else sel.add(i);
        e.currentTarget.setAttribute('aria-pressed', String(sel.has(i)));
        refresh();
      },
    }, t)));

    const typeRow = h('div', { class: 'type-row', role: 'group', 'aria-label': 'Fiilimsinin türü' }, COLORS.map((c, k) => h('button', {
      type: 'button', class: `type-btn tb-${c}`, 'aria-pressed': 'false', 'data-c': c,
      onclick: () => { if (type !== c) { type = c; grp = null; paintGroups(); } refresh(); },
    }, maskIcon(c, 30), h('span', null, D.TYPES[c].label), h('kbd', null, String(k + 1)))));

    const grpRow = h('div', { class: 'grp-row' });
    function paintGroups() {
      if (!opts.expert) return;
      if (!type) { grpRow.replaceChildren(h('p', { class: 'step muted' }, '3. Ekini seç (önce türü seç)')); return; }
      grpRow.replaceChildren(
        h('p', { class: 'step' }, '3. Ekini seç'),
        h('div', { class: 'chips' }, D.SUFFIX_GROUPS[type].map(g => h('button', {
          type: 'button', class: 'chip', 'aria-pressed': String(grp === g.id), 'data-g': g.id,
          onclick: () => { grp = g.id; refresh(); },
        }, g.label))));
    }
    function refresh() {
      typeRow.querySelectorAll('.type-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === type)));
      grpRow.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.g === grp)));
      submitBtn.disabled = !(sel.size && type && (!opts.expert || grp));
    }
    const unlisten = listen('keydown', e => {
      if (helpOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (['1', '2', '3'].includes(e.key)) { typeRow.children[Number(e.key) - 1].click(); }
      else if (e.key === 'Enter' && !submitBtn.disabled && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); submit(false); }
    });
    function submit(timeout) {
      if (done) return;
      done = true;
      stopTimer();
      unlisten();
      const res = checkCase(card, sel, type, grp, opts.expert);
      if (timeout) Object.assign(res, { correct: false, timeout: true });
      beep(res.correct ? 'good' : 'bad');
      opts.onAnswer(res);
    }

    target.set(
      cardTop(opts.kind || 'vaka', opts.title || `${DECK_LABEL.vaka} · ${card.id}`, opts.who, timerHost),
      opts.banner ? h('p', { class: 'banner' }, opts.banner) : null,
      h('p', { class: 'step' }, '1. Fiilimsiye dokun', h('span', { class: 'muted' }, ' (bazen iki sözcüktür)')),
      words,
      h('p', { class: 'step' }, '2. Türünü seç'),
      typeRow,
      opts.expert ? grpRow : null,
      h('div', { class: 'row-center' }, submitBtn)
    );
    paintGroups();
    startTimer(timerHost, opts.secs, () => submit(true));
  }

  function highlightedSentence(card) {
    const span = answerSpan(card);
    return h('p', { class: 'sentence static', lang: 'tr' }, tokenize(card.s).map((t, i) => [
      i ? ' ' : null,
      h('span', { class: span.includes(i) ? `w hl hl-${card.t}` : 'w' }, t),
    ]));
  }

  const CASE_NOTES = {
    olumsuz: 'Olumsuz isim-fiil: -ma olumsuzluk ekinden sonra -mak isim-fiil eki gelmiş.',
    'adlaşmış': 'Adlaşmış sıfat-fiil: nitelediği isim düşmüş (okuyan kişiler → okuyanlar).',
  };

  function revealCase(target, card, { attempts, winnerName, got, expert, onContinue, continueLabel = 'Devam' }) {
    const anyPredicate = attempts.some(a => a.res.pickedPredicate);
    const btn = h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: onContinue }, continueLabel);
    target.set(
      cardTop('vaka', `${DECK_LABEL.vaka} · ${card.id} · Cevap`),
      winnerName
        ? h('p', { class: 'result good' }, maskIcon(got ? card.t : 'empty-' + card.t, 40), awardText(winnerName, card.t, got))
        : h('p', { class: 'result bad' }, 'Bu vakada maske kazanan olmadı.'),
      highlightedSentence(card),
      h('dl', { class: 'answer-box' },
        h('div', null, h('dt', null, 'Fiilimsi'), h('dd', null, card.w)),
        h('div', null, h('dt', null, 'Tür'), h('dd', { class: `tt-${card.t}` }, `${D.TYPES[card.t].label} (${MASK_NAME[card.t]})`)),
        h('div', null, h('dt', null, 'Ek'), h('dd', null, card.ek)),
        h('div', null, h('dt', null, 'Görevi'), h('dd', null, D.TYPES[card.t].task))),
      card.n && CASE_NOTES[card.n] ? h('p', { class: 'note' }, CASE_NOTES[card.n]) : null,
      card.tip ? h('p', { class: 'note' }, card.tip) : null,
      anyPredicate && !card.tip ? h('p', { class: 'note' }, 'İpucu: Cümlenin sonundaki yüklem çekimli fiildir; kip ve kişi eki alır, fiilimsi değildir.') : null,
      h('ul', { class: 'attempts' }, attempts.map(a => h('li', { class: a.res.correct ? 'ok' : 'no' },
        a.res.correct ? '✓ ' : '✗ ', h('b', null, a.name), a.label ? ` (${a.label})` : '', ': ', caseVerdict(a.res, expert)))),
      h('div', { class: 'row-center' }, btn)
    );
    btn.focus({ preventScroll: true });
  }

  /* ---------- Tuzak sorusu ---------- */

  function trapSentence(s) {
    const parts = s.split(/\*\*(.+?)\*\*/);
    return h('p', { class: 'sentence static', lang: 'tr' }, parts.map((part, i) => (i % 2 ? h('strong', { class: 'trap-word' }, part) : part)));
  }
  const trapAnswerText = card => (card.a === 'hayir' ? 'Hayır, fiilimsi değil' : `Evet, ${trLower(D.TYPES[card.a].label)}`);

  function checkTrap(card, yes, val) {
    if (card.a === 'hayir') return { correct: !yes && card.r.includes(val), ynOk: !yes };
    return { correct: !!yes && val === card.a, ynOk: !!yes };
  }
  function trapVerdict(res) {
    if (res.timeout) return 'süre doldu';
    if (res.correct) return 'doğru';
    if (res.ynOk) return 'evet/hayır doğru, neden yanlış';
    return 'yanlış';
  }

  function askTrap(target, card, opts) {
    let yes = null;
    let val = null;
    let done = false;
    const timerHost = h('div', { class: 'timer-host' });
    const submitBtn = h('button', { class: 'btn btn-primary btn-lg', type: 'button', disabled: true, onclick: () => submit(false) }, 'Cevapla');
    const second = h('div', { class: 'second-step' });
    const yesBtn = h('button', { type: 'button', class: 'yn-btn yes', 'aria-pressed': 'false', onclick: () => choose(true) }, '✓ Evet, fiilimsi');
    const noBtn = h('button', { type: 'button', class: 'yn-btn no', 'aria-pressed': 'false', onclick: () => choose(false) }, '✗ Hayır, değil');

    function choose(v) {
      if (yes !== v) {
        yes = v;
        val = null;
        if (v) {
          second.replaceChildren(h('p', { class: 'step' }, '2. Hangi tür?'),
            h('div', { class: 'type-row' }, COLORS.map(c => h('button', {
              type: 'button', class: `type-btn tb-${c}`, 'aria-pressed': 'false', 'data-v': c, onclick: () => { val = c; refresh(); },
            }, maskIcon(c, 30), h('span', null, D.TYPES[c].label)))));
        } else {
          second.replaceChildren(h('p', { class: 'step' }, '2. Neden fiilimsi değil?'),
            h('div', { class: 'reason-row' }, Object.entries(D.NO_REASONS).map(([k, label]) => h('button', {
              type: 'button', class: 'chip reason', 'aria-pressed': 'false', 'data-v': k, onclick: () => { val = k; refresh(); },
            }, label))));
        }
      }
      refresh();
    }
    function refresh() {
      yesBtn.setAttribute('aria-pressed', String(yes === true));
      noBtn.setAttribute('aria-pressed', String(yes === false));
      second.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === val)));
      submitBtn.disabled = !(yes !== null && val);
    }
    const unlisten = listen('keydown', e => {
      if (helpOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter' && !submitBtn.disabled && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); submit(false); }
    });
    function submit(timeout) {
      if (done) return;
      done = true;
      stopTimer();
      unlisten();
      const res = checkTrap(card, yes, val);
      if (timeout) Object.assign(res, { correct: false, timeout: true });
      beep(res.correct ? 'good' : 'bad');
      opts.onAnswer(res);
    }

    target.set(
      cardTop(opts.kind || 'tuzak', opts.title || `${DECK_LABEL.tuzak} · ${card.id}`, opts.who, timerHost),
      opts.banner ? h('p', { class: 'banner' }, opts.banner) : null,
      h('p', { class: 'step' }, '1. Koyu yazılı sözcük fiilimsi mi?'),
      trapSentence(card.s),
      h('div', { class: 'yn-row' }, yesBtn, noBtn),
      second,
      h('div', { class: 'row-center' }, submitBtn)
    );
    startTimer(timerHost, opts.secs, () => submit(true));
  }

  function revealTrap(target, card, { attempts, winnerName, got, onContinue, continueLabel = 'Devam' }) {
    const btn = h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: onContinue }, continueLabel);
    target.set(
      cardTop('tuzak', `${DECK_LABEL.tuzak} · ${card.id} · Cevap`),
      winnerName
        ? h('p', { class: 'result good' }, maskIcon(got ? 'altin' : 'empty-altin', 40), awardText(winnerName, 'altin', got))
        : h('p', { class: 'result bad' }, 'Tuzak işe yaradı: maske kazanan olmadı.'),
      trapSentence(card.s),
      h('dl', { class: 'answer-box' },
        h('div', null, h('dt', null, 'Cevap'), h('dd', { class: card.a === 'hayir' ? '' : `tt-${card.a}` }, trapAnswerText(card))),
        h('div', null, h('dt', null, 'Neden'), h('dd', null, card.why))),
      h('ul', { class: 'attempts' }, attempts.map(a => h('li', { class: a.res.correct ? 'ok' : 'no' },
        a.res.correct ? '✓ ' : '✗ ', h('b', null, a.name), a.label ? ` (${a.label})` : '', ': ', trapVerdict(a.res)))),
      h('div', { class: 'row-center' }, btn)
    );
    btn.focus({ preventScroll: true });
  }

  /* ---------- İtiraz hakkı ---------- */

  function offerChallenge(target, kind, res, challenger, onYes, onNo) {
    target.set(
      cardTop(kind, `${DECK_LABEL[kind]} · İtiraz hakkı`),
      h('p', { class: 'result bad' }, res.timeout ? '⏰ Süre doldu!' : '✗ Cevap yanlış.'),
      h('p', { class: 'lead center' }, 'Soldaki oyuncu itiraz edip cevap verebilir. Doğru bilirse maskeyi o alır.'),
      h('div', { class: 'challenger' }, whoTag(challenger)),
      h('div', { class: 'row-center' },
        h('button', { class: 'btn btn-gold btn-lg', type: 'button', onclick: onYes }, 'İtiraz et ve cevapla'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: onNo }, 'İtiraz yok, cevabı göster'))
    );
  }

  /* ---------- Kare görevleri ---------- */

  function flowVaka() {
    const card = draw('vaka', S.decks);
    const m = openModal({ kind: 'card card-vaka', label: 'Vaka kartı' });
    const cur = S.current;
    const attempts = [];
    const finish = winner => {
      const got = winner != null ? award(winner, card.t) : false;
      if (winner != null) addLog(awardText(S.players[winner].name, card.t, got));
      save();
      updateSide();
      revealCase(m, card, {
        attempts, winnerName: winner != null ? S.players[winner].name : null, got, expert: S.settings.expert,
        onContinue: () => { m.close(); afterTask(); },
      });
    };
    const ask = (pi, isChallenge) => askCase(m, card, {
      who: who(pi), secs: timedSecs(CASE_SECS), expert: S.settings.expert,
      banner: isChallenge ? 'İtiraz! Aynı vakayı şimdi sen çöz.' : 'Cümleyi yüksek sesle oku. Fiilimsiyi bul ve türünü söyle.',
      onAnswer: res => {
        attempts.push({ name: S.players[pi].name, res, label: isChallenge ? 'itiraz' : null });
        if (res.correct) return finish(pi);
        if (!isChallenge) {
          const lp = leftOf(cur);
          return offerChallenge(m, 'vaka', res, who(lp), () => ask(lp, true), () => finish(null));
        }
        finish(null);
      },
    });
    ask(cur, false);
  }

  function flowTuzak() {
    const card = draw('tuzak', S.decks);
    const m = openModal({ kind: 'card card-tuzak', label: 'Tuzak kartı' });
    const cur = S.current;
    const attempts = [];
    const finish = winner => {
      const got = winner != null ? award(winner, 'altin') : false;
      if (winner != null) addLog(awardText(S.players[winner].name, 'altin', got));
      save();
      updateSide();
      revealTrap(m, card, {
        attempts, winnerName: winner != null ? S.players[winner].name : null, got,
        onContinue: () => { m.close(); afterTask(); },
      });
    };
    const ask = (pi, isChallenge) => askTrap(m, card, {
      who: who(pi), secs: timedSecs(CASE_SECS),
      banner: isChallenge ? 'İtiraz! Aynı soruyu şimdi sen cevapla.' : 'Evet ya da hayır de, sonra nedenini seç. İkisi de doğruysa altın maske!',
      onAnswer: res => {
        attempts.push({ name: S.players[pi].name, res, label: isChallenge ? 'itiraz' : null });
        if (res.correct) return finish(pi);
        if (!isChallenge) {
          const lp = leftOf(cur);
          return offerChallenge(m, 'tuzak', res, who(lp), () => ask(lp, true), () => finish(null));
        }
        finish(null);
      },
    });
    ask(cur, false);
  }

  /* ----- Üret ----- */

  function rootVariants(root) {
    const r = trLower(root);
    const out = [r];
    if (r.endsWith('t')) out.push(r.slice(0, -1) + 'd');           // git- → gid-
    if (r === 'de' || r === 'ye') out.push(r[0] + 'i');            // de- → di-
    return out.sort((a, b) => b.length - a.length);
  }

  function classifySuffix(rest) {
    for (const g of D.SUFFIX_GROUPS.zarf) {
      if (g.ends && g.ends.some(e => rest.endsWith(e) && rest.length >= e.length)) return { type: 'zarf', label: g.label };
    }
    let best = null;
    const tryFrom = (s, neg) => {
      for (const type of COLORS) {
        for (const g of D.SUFFIX_GROUPS[type]) {
          for (const v of g.v) {
            if (s.startsWith(v)) {
              const len = v.length + (neg ? 2 : 0);
              if (!best || len > best.len) best = { type, label: g.label, len, neg };
            }
          }
        }
      }
    };
    tryFrom(rest, false);
    if (/^m[ae]/.test(rest)) tryFrom(rest.slice(2), true);
    return best;
  }

  // Türetilen sözcüğün ekine bakan yardımcı kontrol (son kararı hakemler verir)
  function analyzeWord(root, input) {
    const words = trLower(input).replace(/[.,!?;:"“”'’()]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const roots = rootVariants(root);
    const strip = w => {
      for (const r of roots) if (w.startsWith(r)) return w.slice(r.length);
      return null;
    };
    if (words.length === 2) {
      const [a, b] = words.map(strip);
      if (a == null || b == null) return { kind: 'noroot' };
      if (words[0] === words[1] && ['a', 'e', 'ya', 'ye'].includes(a)) return { kind: 'match', type: 'zarf', label: '-a -a / -e -e' };
      if (/^[aeıiuü]?r$/.test(a) && /^m[ae]z$/.test(b)) return { kind: 'match', type: 'zarf', label: '-r -maz' };
      return { kind: 'unknown' };
    }
    if (words.length > 2) return { kind: 'unknown' };
    const rest = strip(words[0]);
    if (rest == null) return { kind: 'noroot' };
    const best = classifySuffix(rest);
    if (!best) return { kind: 'unknown' };
    return { kind: 'match', type: best.type, label: best.label, neg: best.neg };
  }

  function produceHint(kok, target, word, sentence) {
    const out = [];
    const a = analyzeWord(kok.k, word);
    if (!a) out.push({ cls: 'info', text: 'Sözcük yazılmadı; cevap sesli söylendiyse hakemler dinlediklerine göre karar versin.' });
    else if (a.kind === 'noroot') out.push({ cls: 'warn', text: `⚠ Sözcük “${kok.k}-” köküyle başlamıyor gibi görünüyor.` });
    else if (a.kind === 'unknown') out.push({ cls: 'info', text: '? Ek, Defter\'deki listede bulunamadı. Hakemler karar versin.' });
    else if (a.type === target) out.push({ cls: 'ok', text: `✓ Defter: ${a.label} eki → ${D.TYPES[a.type].label}${a.neg ? ' (olumsuz)' : ''}. Ek istenen türde.` });
    else out.push({ cls: 'warn', text: `⚠ ${a.label} eki ${D.TYPES[a.type].label} ekine benziyor; istenen tür ${D.TYPES[target].label}.` });
    if (word && sentence) {
      const ws = tokenize(word).map(norm).join(' ');
      const ss = tokenize(sentence).map(norm).join(' ');
      if (ws && !(' ' + ss + ' ').includes(' ' + ws)) out.push({ cls: 'warn', text: '⚠ Türetilen sözcük cümlede geçmiyor.' });
    }
    return out;
  }

  function animateMaskDie(slot) {
    return new Promise(async resolve => {
      let c = 'isim';
      for (let k = 0; k < 10; k++) {
        c = COLORS[Math.floor(Math.random() * 3)];
        slot.replaceChildren(maskIcon(c, 58));
        slot.dataset.c = c;
        beep('roll');
        await sleep(80);
      }
      resolve(c);
    });
  }

  function flowUret() {
    const kok = draw('kok', S.decks);
    const pi = S.current;
    const m = openModal({ kind: 'card card-uret', label: 'Üret: kök kartı' });
    let color = null;

    const rollStep = () => {
      const slot = h('div', { class: 'mask-die' }, h('span', { class: 'q' }, '?'));
      const btn = h('button', {
        class: 'btn btn-primary btn-lg', type: 'button',
        onclick: async () => {
          btn.disabled = true;
          color = await animateMaskDie(slot);
          slot.classList.add('landed');
          await sleep(650);
          produceStep();
        },
      }, 'Maske zarını at');
      m.set(
        cardTop('kok', DECK_LABEL.kok, who(pi)),
        h('div', { class: 'kok-card' }, h('span', { class: 'kok-label' }, 'Fiil kökü'), h('span', { class: 'kok-root' }, kok.k + '-')),
        h('p', { class: 'lead center' }, 'Maske zarı hangi türde fiilimsi türeteceğini gösterir.'),
        h('div', { class: 'row-center' }, slot),
        h('div', { class: 'row-center' }, btn));
      btn.focus({ preventScroll: true });
    };

    const produceStep = () => {
      const timerHost = h('div', { class: 'timer-host' });
      const wordIn = h('input', { type: 'text', class: 'text-in', id: 'uret-word', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: `ör. ${kok.k}…` });
      const sentIn = h('textarea', { class: 'text-in', id: 'uret-sent', rows: '2', placeholder: 'Sözcüğü bir cümlede kullan…' });
      let done = false;
      const go = timeout => {
        if (done) return;
        done = true;
        stopTimer();
        judgeStep(wordIn.value.trim(), sentIn.value.trim(), timeout);
      };
      m.set(
        cardTop('kok', `${DECK_LABEL.kok} · ${kok.k}-`, who(pi), timerHost),
        h('p', { class: `produce-task pt-${color}` }, maskIcon(color, 44),
          h('span', null, h('b', null, `${kok.k}-`), ' kökünden bir ', h('b', null, D.TYPES[color].label), ' türet ve bir cümlede kullan.')),
        S.settings.expert ? h('p', { class: 'banner' }, 'Uzman kuralı: Ekini de söylemelisin.') : null,
        h('label', { class: 'field', for: 'uret-word' }, h('span', null, 'Türettiğin sözcük'), wordIn),
        h('label', { class: 'field', for: 'uret-sent' }, h('span', null, 'Cümlen ', h('small', { class: 'muted' }, '(yazabilir ya da sesli söyleyebilirsin)')), sentIn),
        h('div', { class: 'row-center' }, h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => go(false) }, 'Hakemlere sun')));
      wordIn.focus();
      wordIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sentIn.focus(); } });
      startTimer(timerHost, timedSecs(PRODUCE_SECS), () => go(true));
    };

    const judgeStep = (word, sentence, timeout) => {
      const hints = produceHint(kok, color, word, sentence);
      const decide = ok => {
        let got = false;
        if (ok) {
          got = award(pi, color);
          addLog(awardText(S.players[pi].name, color, got));
          beep('good');
        } else {
          addLog(`${S.players[pi].name} Üret görevinde maske kazanamadı.`);
          beep('bad');
        }
        save();
        updateSide();
        const btn = h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => { m.close(); afterTask(); } }, 'Devam');
        m.set(
          cardTop('kok', `${DECK_LABEL.kok} · ${kok.k}- · Sonuç`),
          ok ? h('p', { class: 'result good' }, maskIcon(got ? color : 'empty-' + color, 40), awardText(S.players[pi].name, color, got))
            : h('p', { class: 'result bad' }, 'Hakemler cevabı kabul etmedi.'),
          h('p', { class: 'center' }, 'Örnek: ', h('b', { class: `tt-${color}` }, kok[color])),
          h('div', { class: 'row-center' }, btn));
        btn.focus({ preventScroll: true });
      };
      m.set(
        cardTop('kok', `${DECK_LABEL.kok} · ${kok.k}- · Hakem zamanı`),
        timeout ? h('p', { class: 'banner' }, '⏰ Süre doldu. Süre içinde sesli söylendiyse hakemler yine de onaylayabilir.') : null,
        h('div', { class: 'judge-answer' },
          h('div', null, whoTag(who(pi)), h('span', { class: 'muted' }, ` · istenen: `), h('b', { class: `tt-${color}` }, D.TYPES[color].label)),
          word ? h('p', { class: 'judge-word' }, word) : h('p', { class: 'muted' }, '(sözcük yazılmadı)'),
          sentence ? h('p', { class: 'judge-sent' }, '“', sentence, '”') : null),
        h('ul', { class: 'hints' }, hints.map(x => h('li', { class: 'hint-' + x.cls }, x.text))),
        h('div', { class: 'defter-mini' },
          h('p', null, h('b', null, `${D.TYPES[color].label} ekleri: `), D.SUFFIX_GROUPS[color].map(g => g.label).join(', ')),
          h('p', null, h('b', null, 'Hakem için örnek: '), kok[color], h('span', { class: 'muted' }, ' (kurala uyan başka cevaplar da doğrudur)')),
          h('p', { class: 'muted' }, 'Sözcük cümlede fiilimsi olarak kullanılmalı. Sıfat-fiil istenirken “Yarın gelecek.” kabul edilmez, “Gelecek misafirler” kabul edilir.')),
        h('p', { class: 'lead center' }, 'Diğer dedektifler, Dedektif Defteri\'ne bakarak karar verin:'),
        h('div', { class: 'row-center' },
          h('button', { class: 'btn btn-good btn-lg', type: 'button', onclick: () => decide(true) }, '✓ Doğru, maskeyi ver'),
          h('button', { class: 'btn btn-bad btn-lg', type: 'button', onclick: () => decide(false) }, '✗ Kabul etmiyoruz')),
        h('p', { class: 'center' }, h('button', { class: 'link-btn', type: 'button', onclick: showDefter }, 'Dedektif Defteri\'ni aç')));
    };

    rollStep();
  }

  /* ----- Düello ----- */

  function duelRound(target, card, pair, ctx) {
    // ctx: { kind: 'vaka'|'tuzak', whoOf(i), secs, expert, title, onResolve({ winner, attempts }) }
    const attempts = [];
    let buzzed = false;
    const buzz = side => {
      if (buzzed) return;
      buzzed = true;
      unlisten();
      beep('buzz');
      answer(side, false);
    };
    const unlisten = listen('keydown', e => {
      if (helpOpen() || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = trLower(e.key);
      if (k === 'a') buzz(0);
      else if (k === 'l') buzz(1);
    });
    const buzzers = pair.map((pi, side) => {
      const w = ctx.whoOf(pi);
      return h('button', { type: 'button', class: `buzzer bz-${side}`, style: { '--pc': w.hex }, onclick: () => buzz(side) },
        h('span', { class: 'bz-name' }, w.name), h('span', { class: 'bz-key' }, side === 0 ? 'A tuşu' : 'L tuşu'));
    });
    target.set(
      cardTop(ctx.badge || 'duello', ctx.title),
      h('p', { class: 'lead center' }, ctx.kind === 'tuzak'
        ? 'Koyu yazılı sözcük fiilimsi mi? Bilen önce zile bassın!'
        : 'Cümledeki fiilimsiyi ve türünü bilen önce zile bassın!'),
      ctx.kind === 'tuzak' ? trapSentence(card.s) : h('p', { class: 'sentence static', lang: 'tr' }, card.s),
      h('div', { class: 'buzzers' }, buzzers)
    );
    const answer = (side, second) => {
      const pi = pair[side];
      const w = ctx.whoOf(pi);
      const ask = ctx.kind === 'tuzak' ? askTrap : askCase;
      ask(target, card, {
        kind: ctx.badge || 'duello', title: ctx.title, who: w, secs: ctx.secs, expert: ctx.expert,
        banner: second ? `Rakip yanıldı. Söz sende, ${w.name}!` : `${w.name} zile bastı!`,
        onAnswer: res => {
          attempts.push({ name: w.name, res, label: second ? '2. hak' : 'zil' });
          if (res.correct) return ctx.onResolve({ winner: pi, attempts });
          if (!second) return answer(1 - side, true);
          ctx.onResolve({ winner: null, attempts });
        },
      });
    };
  }

  function flowDuello() {
    const m = openModal({ kind: 'card card-duello', label: 'Düello' });
    const cur = S.current;
    const others = S.players.map((_, i) => i).filter(i => i !== cur);
    const start = rival => {
      const card = draw('vaka', S.decks);
      duelRound(m, card, [cur, rival], {
        kind: 'vaka', whoOf: who, secs: timedSecs(CASE_SECS), expert: S.settings.expert,
        title: `Düello · ${DECK_LABEL.vaka} ${card.id}`,
        onResolve: ({ winner, attempts }) => {
          const got = winner != null ? award(winner, card.t) : false;
          if (winner != null) addLog(`Düello: ${awardText(S.players[winner].name, card.t, got)}`);
          save();
          updateSide();
          revealCase(m, card, {
            attempts, winnerName: winner != null ? S.players[winner].name : null, got, expert: S.settings.expert,
            onContinue: () => { m.close(); afterTask(); },
          });
        },
      });
    };
    if (others.length === 1) return start(others[0]);
    m.set(
      cardTop('duello', 'Düello'),
      h('p', { class: 'lead center' }, whoTag(who(cur)), ' bir rakip seçsin:'),
      h('div', { class: 'rival-row' }, others.map(i => h('button', {
        type: 'button', class: 'rival-btn', style: { '--pc': PAWNS[i].hex }, onclick: () => start(i),
      }, pawnChip(who(i)), h('span', null, S.players[i].name), maskTrack(S.players[i].masks, 18)))));
  }

  /* ---------- Zafer ---------- */

  function confetti() {
    const box = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    const cols = ['var(--mavi)', 'var(--yesil)', 'var(--turuncu)', 'var(--altin)', '#fff'];
    for (let i = 0; i < 70; i++) {
      box.append(h('i', {
        style: {
          left: Math.random() * 100 + '%', background: cols[i % cols.length],
          animationDelay: (Math.random() * 1.2).toFixed(2) + 's', animationDuration: (2.2 + Math.random() * 1.8).toFixed(2) + 's',
          transform: `rotate(${Math.floor(Math.random() * 360)}deg)`,
        },
      }));
    }
    return box;
  }

  function showVictory(wi) {
    phase = 'over';
    stopTimer();
    store.del(SAVE_KEY);
    updateGame();
    const p = S.players[wi];
    const names = S.players.map(x => x.name);
    const settings = { ...S.settings };
    const m = openModal({ kind: 'victory', label: 'Oyun bitti' });
    beep('win');
    m.set(
      confetti(),
      h('p', { class: 'win-kicker' }, '🎩 Baş Dedektif 🎩'),
      h('h2', { class: 'win-name' }, pawnChip(who(wi)), p.name),
      h('p', { class: 'center' }, `${S.turn}. turda her renkten 2 maskeyi topladı!`),
      h('div', { class: 'row-center' }, maskTrack(p.masks, 40)),
      h('ol', { class: 'win-table' }, S.players.map((q, i) => h('li', null, whoTag(who(i)), maskTrack(q.masks, 20)))),
      h('div', { class: 'row-center' },
        h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => { m.close(); newGame(names, settings); renderGame(); startTurn(); } }, 'Aynı oyuncularla yeniden'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { S = null; renderHome(); } }, 'Ana menü'))
    );
  }

  /* ---------- Fuar modu ---------- */

  const FAIR_COLORS = ['#e5383b', '#8e5cf7'];

  function readTally() { return Object.assign({ played: 0, badges: 0 }, store.get(TALLY_KEY, {})); }

  function renderFairStart() {
    stopAll();
    S = null;
    let duo = false;
    const names = ['', ''];
    const paint = () => {
      const tally = readTally();
      app.replaceChildren(h('section', { class: 'setup panel fair-start' },
        h('h2', null, 'Fuar modu'),
        h('p', null, 'Ziyaretçi ', h('b', null, '5 dakikada 4 soru'), ' çözer: 3 Vaka ve 1 Tuzak. Doğru her Vaka cevabı o renkte 1 maske, doğru Tuzak cevabı altın maske kazandırır. ',
          h('b', null, 'En az 3 doğru'), ' “Fiilimsi Dedektifi” rozeti getirir.'),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Ziyaretçi sayısı' },
          h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(!duo), onclick: () => { duo = false; paint(); } }, 'Tek ziyaretçi'),
          h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(duo), onclick: () => { duo = true; paint(); } }, 'İki ziyaretçi (Düello)')),
        duo ? h('p', { class: 'muted' }, 'Düello: görevli kartı okur, ilk zile basan cevaplar; yanılırsa söz diğerine geçer. İlk doğru söyleyen maskeyi alır.') : null,
        h('div', { class: 'name-list' }, Array.from({ length: duo ? 2 : 1 }, (_, i) => h('label', { class: 'name-row' },
          h('span', { class: 'pawn', style: { background: FAIR_COLORS[i] }, 'aria-hidden': 'true' }, String(i + 1)),
          h('input', {
            type: 'text', maxlength: '16', value: names[i], placeholder: duo ? `${i + 1}. Ziyaretçi` : 'Ziyaretçi (isteğe bağlı)', autocomplete: 'off',
            'aria-label': `${i + 1}. ziyaretçinin adı`, oninput: e => { names[i] = e.target.value; },
          })))),
        h('div', { class: 'row-end' },
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: renderHome }, 'Geri'),
          h('button', {
            class: 'btn btn-primary btn-lg', type: 'button',
            onclick: () => startFair(Array.from({ length: duo ? 2 : 1 }, (_, i) => names[i].trim() || (duo ? `${i + 1}. Ziyaretçi` : 'Ziyaretçi'))),
          }, 'Başla')),
        h('div', { class: 'tally' },
          h('h3', null, 'Çetele (bu cihaz)'),
          h('p', null, h('b', null, String(tally.played)), ' ziyaretçi oynadı · ', h('b', null, String(tally.badges)), ' rozet verildi'),
          h('button', {
            class: 'link-btn', type: 'button',
            onclick: () => { if (window.confirm('Çetele sıfırlansın mı?')) { store.set(TALLY_KEY, { played: 0, badges: 0 }); paint(); } },
          }, 'Çeteleyi sıfırla'))
      ));
    };
    paint();
  }

  let F = null;
  function startFair(names) {
    stopAll();
    const decks = { vaka: shuffle(D.VAKA.map((_, i) => i)), tuzak: shuffle(D.TUZAK.map((_, i) => i)), kok: [] };
    const qs = [0, 1, 2].map(() => ({ kind: 'vaka', card: draw('vaka', decks) })).concat([{ kind: 'tuzak', card: draw('tuzak', decks) }]);
    F = {
      visitors: names.map((name, i) => ({ name, hex: FAIR_COLORS[i], masks: { isim: 0, sifat: 0, zarf: 0, altin: 0 }, correct: 0 })),
      qs, qi: 0, results: [], endAt: Date.now() + FAIR_SECS * 1000, over: false,
    };
    const clock = h('span', { class: 'fair-clock', role: 'timer', 'aria-label': 'Kalan süre' }, '5:00');
    const progress = h('div', { class: 'fair-progress' });
    const scores = h('div', { class: 'fair-scores' });
    const stage = h('div', { class: 'fair-stage modal' });
    F.ui = { clock, progress, scores, stage };
    app.replaceChildren(h('section', { class: 'fair' },
      h('div', { class: 'fair-bar' },
        h('div', { class: 'fair-bar-left' }, h('b', null, 'Fuar modu'), progress),
        clock,
        scores),
      stage));
    const target = { set(...kids) { stage.replaceChildren(...clean(kids)); stage.scrollIntoView({ block: 'nearest' }); } };
    F.target = target;
    const tick = () => {
      const left = Math.max(0, Math.ceil((F.endAt - Date.now()) / 1000));
      clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      clock.classList.toggle('low', left <= 30);
      if (left <= 0 && !F.over) finishFair(true);
    };
    tick();
    fairClock = setInterval(tick, 250);
    nextFairQuestion();
  }

  function paintFairBar() {
    const { progress, scores } = F.ui;
    progress.replaceChildren(...F.qs.map((q, i) => h('span', {
      class: 'dot' + (i === F.qi ? ' now' : '') + (F.results[i] === true ? ' ok' : F.results[i] === false ? ' no' : ''),
      title: `${i + 1}. soru (${q.kind === 'vaka' ? 'Vaka' : 'Tuzak'})`,
    }, String(i + 1))));
    scores.replaceChildren(...F.visitors.map(v => h('div', { class: 'fair-score' }, whoTag(v),
      h('span', { class: 'fair-masks' }, ALL_MASKS.flatMap(c => Array.from({ length: v.masks[c] }, () => maskIcon(c, 22)))),
      h('b', null, `${v.correct}/4`))));
  }

  function nextFairQuestion() {
    if (F.over) return;
    if (F.qi >= F.qs.length) return finishFair(false);
    paintFairBar();
    const { kind, card } = F.qs[F.qi];
    const target = F.target;
    const title = `${F.qi + 1}. soru · ${kind === 'vaka' ? DECK_LABEL.vaka : DECK_LABEL.tuzak}`;
    const color = kind === 'vaka' ? card.t : 'altin';
    const done = (winnerIdx, attempts) => {
      if (F.over) return;
      F.results[F.qi] = winnerIdx != null;
      if (winnerIdx != null) { F.visitors[winnerIdx].correct++; F.visitors[winnerIdx].masks[color]++; }
      paintFairBar();
      const last = F.qi === F.qs.length - 1;
      const opts = {
        attempts, winnerName: winnerIdx != null ? F.visitors[winnerIdx].name : null, got: true, expert: false,
        continueLabel: last ? 'Sonucu gör' : 'Sonraki soru',
        onContinue: () => { F.qi++; nextFairQuestion(); },
      };
      if (kind === 'vaka') revealCase(target, card, opts); else revealTrap(target, card, opts);
    };
    if (F.visitors.length === 2) {
      duelRound(target, card, [0, 1], {
        kind, badge: kind, whoOf: i => F.visitors[i], secs: 0, expert: false, title,
        onResolve: ({ winner, attempts }) => done(winner, attempts),
      });
    } else {
      const v = F.visitors[0];
      const ask = kind === 'vaka' ? askCase : askTrap;
      ask(target, card, {
        kind, title, who: v, secs: 0, expert: false,
        banner: kind === 'vaka' ? 'Görevli cümleyi okusun. Fiilimsiyi bul ve türünü söyle.' : 'Son soru! Koyu yazılı sözcük fiilimsi mi?',
        onAnswer: res => done(res.correct ? 0 : null, [{ name: v.name, res }]),
      });
    }
  }

  function finishFair(timeUp) {
    if (F.over) return;
    F.over = true;
    stopTimer();
    clearInterval(fairClock);
    fairClock = null;
    for (const ac of live) ac.abort();
    live.clear();
    paintFairBar();
    const tally = readTally();
    tally.played += F.visitors.length;
    const earners = F.visitors.filter(v => v.correct >= 3);
    tally.badges += earners.length;
    store.set(TALLY_KEY, tally);
    if (earners.length) beep('win');
    let duelLine = null;
    if (F.visitors.length === 2) {
      const [a, b] = F.visitors;
      duelLine = a.correct === b.correct ? 'Düello berabere bitti!' : `Düelloyu ${a.correct > b.correct ? a.name : b.name} kazandı!`;
    }
    F.ui.stage.replaceChildren(...clean([
      earners.length ? confetti() : null,
      h('div', { class: 'card-top' }, h('span', { class: 'deck-badge db-vaka' }, 'Fuar modu · Sonuç')),
      timeUp ? h('p', { class: 'banner' }, '⏰ 5 dakika doldu!') : null,
      duelLine ? h('p', { class: 'lead center' }, duelLine) : null,
      h('div', { class: 'fair-results' }, F.visitors.map(v => h('div', { class: 'fair-result' + (v.correct >= 3 ? ' earned' : '') },
        v.correct >= 3 ? h('div', { class: 'badge-art', 'aria-hidden': 'true' }, maskIcon('altin', 90), h('span', null, '🏅')) : null,
        h('h3', null, v.name),
        h('p', { class: 'big-score' }, `${v.correct} / 4 doğru`),
        v.correct >= 3
          ? h('p', { class: 'result good' }, '“Fiilimsi Dedektifi” rozetini kazandın! Görevliden çıkartmanı al.')
          : h('p', { class: 'muted' }, `Rozet için en az 3 doğru gerekir. ${3 - v.correct} doğru daha!`)))),
      h('p', { class: 'muted center' }, `Çetele: ${tally.played} ziyaretçi · ${tally.badges} rozet`),
      h('div', { class: 'row-center' },
        h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: renderFairStart }, 'Yeni ziyaretçi'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: renderHome }, 'Ana menü'))
    ]));
  }

  /* ---------- Kurallar ve Dedektif Defteri ---------- */

  function showRules() {
    const m = openModal({ kind: 'help-modal', label: 'Kurallar', help: true });
    const sq = k => h('span', { class: `sq-chip sq-${k}` }, D.SQUARES[k].icon, ' ', D.SQUARES[k].label);
    m.set(
      h('h2', null, 'Nasıl oynanır?'),
      h('p', null, h('b', null, 'Fiilimsi'), ', fiile eklenen bir ekle cümlede isim, sıfat ya da zarf görevi üstlenen sözcüktür. Her türün bir maske rengi var: ',
        h('b', { class: 'tt-isim' }, 'isim-fiil mavi'), ', ', h('b', { class: 'tt-sifat' }, 'sıfat-fiil yeşil'), ', ', h('b', { class: 'tt-zarf' }, 'zarf-fiil turuncu'), '.'),
      h('h3', null, 'Amaç'),
      h('p', null, 'Her renkten 2 maske (2 mavi, 2 yeşil, 2 turuncu) toplayan ilk dedektif “Baş Dedektif” olur. ', h('b', null, 'Altın maske'), ' eksik olan herhangi bir rengin yerine geçer.'),
      h('h3', null, 'Bir tur'),
      h('p', null, 'Zar at; piyonun saat yönünde ilerler. Durduğun karenin görevini yap. Doğru cevap bir maske kazandırır; maskenin rengi bulunan fiilimsinin türüdür.'),
      h('h3', null, 'Kareler'),
      h('ul', { class: 'rule-list' },
        h('li', null, sq('vaka'), ' Cümleyi yüksek sesle oku. Fiilimsiye dokun ve türünü seç. İkisi de doğruysa o türün renginde 1 maske.'),
        h('li', null, sq('uret'), ' Kök kartı çıkar ve maske zarını at. Zarın rengindeki türden bir fiilimsi türet ve bir cümlede kullan. Diğer oyuncular Dedektif Defteri\'ne bakarak onaylar; doğruysa o renkte 1 maske.'),
        h('li', null, sq('tuzak'), ' Koyu yazılı sözcük fiilimsi mi? Evet ya da hayır de ve nedenini seç. İkisi de doğruysa 1 altın maske.'),
        h('li', null, sq('duello'), ' Bir rakip seç. Cümle ekrana gelir; bilen zile basar (A ya da L tuşu). Yanılırsa söz rakibe geçer. İlk doğru söyleyen o renkte 1 maske alır.'),
        h('li', null, sq('start'), ' Üzerinde durmak ya da geçmek bir şey kazandırmaz.')),
      h('h3', null, 'İtiraz hakkı'),
      h('p', null, 'Vaka ya da Tuzak sorusunu yanlış cevaplarsan (fiilimsiyi bulup türünü karıştırdığında da) soldaki oyuncu, yani sıradaki oyuncu, cevap verebilir. O doğru bilirse maskeyi o alır.'),
      h('h3', null, 'Takas'),
      h('p', null, 'Aynı renkten fazladan 2 maskeni (gereken 2 maskenin üstündekileri) hazineye verip 1 altın maske alabilirsin. Takas, sıran gelince zar atmadan önce yapılır.'),
      h('h3', null, 'Uzman kuralı (isteğe bağlı)'),
      h('p', null, 'Maske kazanmak için fiilimsinin ekini de seçmek gerekir: ', h('i', null, 'ağlayarak → -arak'), '. Konuyu bitirmiş sınıflar ya da final turu içindir.'),
      h('h3', null, 'Fuar modu'),
      h('p', null, 'Ziyaretçi 5 dakikada 4 soru çözer (3 Vaka, 1 Tuzak) ve en az 3 doğruyla “Fiilimsi Dedektifi” rozeti kazanır. İki ziyaretçi gelirse Düello oynanır. Çetele, bu cihazda kaç ziyaretçinin rozet aldığını sayar.'),
      h('h3', null, 'Kısayollar'),
      h('p', { class: 'muted' }, 'Vaka sorusunda 1, 2, 3 tuşları türü seçer. Düelloda A ve L tuşları zildir.')
    );
  }

  function showDefter() {
    const m = openModal({ kind: 'help-modal', label: 'Dedektif Defteri', help: true });
    m.set(
      h('h2', null, 'Dedektif Defteri'),
      h('p', null, 'Fiilimsiler olumsuz yapılabilir (', h('i', null, 'gelmeyen, yapmamak'), ') ama kip ve kişi eki almaz; bu yüzden genellikle yüklem olmaz.'),
      h('div', { class: 'table-wrap' }, h('table', { class: 'defter' },
        h('thead', null, h('tr', null, ['Tür', 'Maske', 'Ekler', 'Görevi', 'Örnek'].map(t => h('th', { scope: 'col' }, t)))),
        h('tbody', null,
          h('tr', { class: 'row-isim' }, h('th', { scope: 'row' }, 'İsim-fiil'), h('td', null, maskIcon('isim', 26), ' Mavi'), h('td', null, '-mak/-mek, -ma/-me, -ış/-iş/-uş/-üş'), h('td', null, 'Eylemin adıdır'), h('td', null, 'Kitap ', h('i', null, 'okumak'), ' güzeldir.')),
          h('tr', { class: 'row-sifat' }, h('th', { scope: 'row' }, 'Sıfat-fiil'), h('td', null, maskIcon('sifat', 26), ' Yeşil'), h('td', null, '-an, -ası, -maz, -ar, -dık, -acak, -mış'), h('td', null, 'İsmi niteler; isim düşerse adlaşır'), h('td', null, h('i', null, 'Koşan'), ' çocuk, ', h('i', null, 'okuyanlar'))),
          h('tr', { class: 'row-zarf' }, h('th', { scope: 'row' }, 'Zarf-fiil'), h('td', null, maskIcon('zarf', 26), ' Turuncu'), h('td', null, '-ıp, -arak, -ınca, -madan, -ken, -alı, -dıkça, -casına, -maksızın, -a -a, -r -maz'), h('td', null, 'Eylemi zaman ya da durum yönünden niteler'), h('td', null, h('i', null, 'Ağlayarak'), ' koştu.'))))),
      h('p', null, 'Ekler ünlü ve ünsüz uyumuna göre değişir: ', h('i', null, '-dık'), ' eki ', h('i', null, '-dik, -duk, -tık'), ' olabilir ve çoğunlukla iyelik ekiyle gelir (', h('i', null, 'okuduğum kitap'), ').'),
      h('p', { class: 'mnemonic' }, h('b', null, 'Sıfat-fiil ekleri için kodlama: '), '“Anası mazar dıkacakmış” → -an, -ası, -maz, -ar, -dık, -acak, -mış.'),
      h('h3', null, 'Tuzak uyarıları'),
      h('ul', { class: 'rule-list' },
        h('li', null, h('b', null, 'Kalıcı isim: '), 'Bir nesnenin ya da yiyeceğin adı olmuş sözcük fiilimsi değildir: ', h('i', null, 'dondurma, çakmak, dolma, yemek (aş).')),
        h('li', null, h('b', null, 'Çekimli fiil: '), 'Yüklemdeki ', h('i', null, '-acak, -mış, -ar, -maz'), ' zaman ekidir. ', h('i', null, 'Yarın gidecek.'), ' çekimli fiildir; ', h('i', null, 'gidecek öğrenciler'), ' sıfat-fiildir.'),
        h('li', null, h('b', null, 'Olumsuzluk eki: '), h('i', null, 'Bana bakma!'), ' cümlesindeki ', h('i', null, '-ma'), ' olumsuzluk ekidir; sözcük emir kipinde çekimli fiildir.'),
        h('li', null, h('b', null, 'İsme gelen -ken: '), h('i', null, 'çocukken'), ' fiilimsi değildir. ', h('i', null, '-ken'), ' fiile gelirse zarf-fiildir: ', h('i', null, 'oynarken'), '.'))
    );
  }

  /* ---------- Başlat ---------- */

  function paintSoundBtn() {
    const b = $('#btn-sound');
    b.textContent = prefs.sound ? '🔊' : '🔇';
    b.setAttribute('aria-label', prefs.sound ? 'Sesi kapat' : 'Sesi aç');
    b.setAttribute('aria-pressed', String(!prefs.sound));
  }
  $('#btn-sound').addEventListener('click', () => { prefs.sound = !prefs.sound; savePrefs(); paintSoundBtn(); if (prefs.sound) beep('good'); });
  $('#btn-rules').addEventListener('click', showRules);
  $('#btn-defter').addEventListener('click', showDefter);
  $('#brand').addEventListener('click', () => {
    if (F && !F.over && $('.fair') && !window.confirm('Fuar oyunu yarıda kalacak. Ana menüye dönülsün mü?')) return;
    if (S && phase !== 'over') save();
    renderHome();
  });
  paintSoundBtn();

  // Veri denetimi: her Vaka kartında fiilimsi cümlede bulunmalı
  for (const c of D.VAKA) if (!answerSpan(c).length) console.warn('Vaka kartında fiilimsi bulunamadı:', c.id);

  // Test ve hata ayıklama için küçük bir kapı
  window.MF = { analyzeWord, answerSpan, checkCase, state: () => S };

  renderHome();
})();
