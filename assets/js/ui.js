/* NOONFALL — interface, progress, secrets */
(function (NS) {
  'use strict';
  const U = NS.Util;
  const I = NS.I18N;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

  const STORE = 'noonfall.v2';

  const DEFAULTS = {
    lang: 'en', theme: 'dusk', muted: false, music: true, musicVol: 0.5,
    completed: {}, unlocked: { wake: true }, whispers: {}, deaths: 0,
    seenEnd: false, best: {}, ink: {}, wings: false
  };

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const s = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), raw);
      s.completed = raw.completed || {};
      s.unlocked = Object.assign({ wake: true }, raw.unlocked || {});
      s.whispers = raw.whispers || {};
      s.best = raw.best || {};
      s.ink = raw.ink || {};
      return s;
    } catch (e) { return JSON.parse(JSON.stringify(DEFAULTS)); }
  }

  const UI = {
    engine: null,
    audio: null,
    save: null,
    mode: 'title',
    level: null,
    levelIdx: 0,
    glyphCount: 0,
    hintTimer: 0,
    deathThrottle: 0,

    init(engine, audio) {
      this.engine = engine;
      this.audio = audio;
      this.save = load();
      I.set(this.save.lang || 'en');
      document.documentElement.setAttribute('data-theme', this.save.theme || 'dusk');
      engine.setTheme(this.save.theme || 'dusk');
      engine.wings = !!this.save.wings;
      if (this.save.muted) { document.body.classList.add('muted'); }
      this.bind();
      this.applyLang();
      this.applyAudio();
      this.glyphCount = 0;
      engine.onEvent = (type, data) => this.onEvent(type, data);
      this.titleDemo();
    },

    /* -------------------------------------------------------------- */
    persist() { try { localStorage.setItem(STORE, JSON.stringify(this.save)); } catch (e) { } },

    /* -------------------------------------------------------------- */
    bind() {
      const self = this;
      $('#btn-begin').addEventListener('click', () => self.begin());
      $$('[data-nav]').forEach((b) => b.addEventListener('click', () => {
        const n = b.getAttribute('data-nav');
        if (n === 'play') self.begin();
        else if (n === 'chronicle') self.openChronicle();
        else if (n === 'whispers') self.openWhispers();
        else if (n === 'credits') self.openCredits();
        self.closeNav();
      }));

      $('#btn-sound').addEventListener('click', () => {
        self.save.muted = !self.save.muted;
        document.body.classList.toggle('muted', self.save.muted);
        self.audio.setMuted(self.save.muted);
        if (!self.save.muted) { self.audio.resume(); self.audio.sfx('ui'); }
        self.persist();
        self.toast(self.save.muted ? 'sound off' : 'sound on');
      });
      $('#btn-theme').addEventListener('click', () => self.toggleTheme());
      $('#btn-lang').addEventListener('click', () => self.cycleLang());
      $('#btn-burger').addEventListener('click', (e) => { e.stopPropagation(); $('#nav').classList.toggle('open'); });
      $('#brand').addEventListener('click', () => { if (self.mode === 'title') self.openCredits(); else self.toTitle(); });

      $$('[data-close]').forEach((b) => b.addEventListener('click', () => self.closeModals()));

      $('#btn-pause').addEventListener('click', () => self.pause(true));
      $('#btn-resume').addEventListener('click', () => self.pause(false));
      $('#btn-restart').addEventListener('click', () => self.restart());
      $('#btn-relevel').addEventListener('click', () => self.restart());
      $('#btn-tomenu').addEventListener('click', () => self.toTitle());
      $('#btn-next').addEventListener('click', () => self.next());
      $('#btn-again').addEventListener('click', () => self.restart());
      $('#btn-endagain').addEventListener('click', () => self.toTitle());
      $('#btn-endwhisper').addEventListener('click', () => self.openWhispers());

      const musicVol = $('#music-vol');
      if (musicVol) {
        musicVol.addEventListener('input', () => {
          self.save.musicVol = parseFloat(musicVol.value);
          self.audio.setMusicVolume(self.save.musicVol);
          self.persist();
        });
      }
      const musicBtn = $('#btn-music');
      if (musicBtn) {
        const paint = () => {
          const on = self.save.music !== false;
          musicBtn.textContent = I.t(on ? 'common.on' : 'common.off');
          musicBtn.classList.toggle('off', !on);
        };
        paint();
        this._paintMusic = paint;
        musicBtn.addEventListener('click', () => {
          self.save.music = !(self.save.music !== false);
          self.audio.setMusic(self.save.music);
          self.audio.sfx('ui');
          self.persist();
          paint();
        });
      }

      const author = $('#author-sigil');
      let authorHits = 0;
      author.addEventListener('click', () => {
        authorHits++;
        if (authorHits >= 5) {
          $('#credit-extra').textContent = I.t('credits.found');
          self.secret('author');
          authorHits = 0;
        } else if (authorHits === 3) {
          $('#credit-extra').textContent = '· · ·';
        }
      });

      // canvas pointer
      const canvas = $('#stage');
      canvas.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        self.engine.setPointer(e.clientX - r.left, e.clientY - r.top);
      });
      canvas.addEventListener('pointerdown', (e) => {
        const r = canvas.getBoundingClientRect();
        self.engine.setPointer(e.clientX - r.left, e.clientY - r.top);
        self.onCanvasClick();
      });

      // touch controls
      $$('[data-touch]').forEach((b) => {
        const key = b.getAttribute('data-touch');
        const on = (e) => { e.preventDefault(); self.engine.setKey(key, true); };
        const off = (e) => { e.preventDefault(); self.engine.setKey(key, false); };
        b.addEventListener('pointerdown', on);
        b.addEventListener('pointerup', off);
        b.addEventListener('pointercancel', off);
        b.addEventListener('pointerleave', off);
      });

      // keyboard
      window.addEventListener('keydown', (e) => self.onKey(e));
      window.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'a' || k === 'arrowleft') self.engine.setKey('left', false);
        if (k === 'd' || k === 'arrowright') self.engine.setKey('right', false);
        if (k === ' ' || k === 'w' || k === 'arrowup') self.engine.setKey('jump', false);
      });
      window.addEventListener('blur', () => { self.engine.setKey('left', false); self.engine.setKey('right', false); self.engine.setKey('jump', false); });

      // console
      const input = $('#console-in');
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { self.execConsole(input.value.trim()); input.value = ''; }
        if (e.key === 'Escape') self.toggleConsole(false);
      });

      window.addEventListener('resize', () => { self.engine.resize(); });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && self.mode === 'playing') self.pause(true);
      });

      if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) {
        document.body.classList.add('is-touch');
      }
    },

    /* -------------------------------------------------------------- */
    /* language / theme / audio                                       */
    /* -------------------------------------------------------------- */

    applyLang() {
      I.set(this.save.lang);
      $('#lang-label').textContent = (I.tiers[I.lang] || I.tiers.en).code;
      $$('[data-i18n]').forEach((el) => {
        const v = I.t(el.getAttribute('data-i18n'));
        if (typeof v === 'string') el.textContent = v;
      });
      if (this.level) {
        $('#hud-name').textContent = I.level(this.level.index - 1).name;
        $('#pause-name').textContent = I.level(this.level.index - 1).name;
      }
      this.renderTally();
      if (this._paintMusic) this._paintMusic();
      if ($('#modal-chronicle').classList.contains('open')) this.buildChronicle();
      if ($('#modal-whispers').classList.contains('open')) this.buildWhispers();
    },

    cycleLang() {
      const order = ['en', 'hi', 'hg'];
      const i = order.indexOf(I.lang);
      this.save.lang = order[(i + 1) % order.length];
      this.applyLang();
      this.persist();
      this.audio.sfx('ui');
      this.toast(I.t('nav.lang') + ' · ' + (I.tiers[I.lang] || I.tiers.en).name);
    },

    toggleTheme() {
      const t = document.documentElement.getAttribute('data-theme') === 'moon' ? 'dusk' : 'moon';
      document.documentElement.setAttribute('data-theme', t);
      this.save.theme = t;
      this.engine.setTheme(t);
      this.persist();
      this.audio.sfx('ui', t === 'moon' ? 520 : 700);
      this.toast(t === 'moon' ? 'moon' : 'dusk');
    },

    applyAudio() {
      if (this.save.muted) { document.body.classList.add('muted'); this.audio.setMuted(true); }
      this.audio.setMusic(this.save.music !== false);
      this.audio.setMusicVolume(this.save.musicVol == null ? 0.5 : this.save.musicVol);
      const s = $('#music-vol');
      if (s) s.value = this.save.musicVol == null ? 0.5 : this.save.musicVol;
    },

    /* -------------------------------------------------------------- */
    /* level flow                                                     */
    /* -------------------------------------------------------------- */

    titleDemo() {
      const demo = NS.Levels.DEMO;
      this.engine.setLevel(demo, { demo: true });
      this.engine.setTheme(this.save.theme || 'dusk');
      this.mode = 'title';
      $('#hud').classList.add('hidden');
      this.showScreen('title');
      this.renderTally();
    },

    begin() {
      if (this.audio) { this.audio.resume(); this.audio.sfx('uiLow'); }
      this.closeModals();
      const levels = NS.Levels.LEVELS.filter((l) => !l.secret);
      let target = levels.find((l) => !this.save.completed[l.id]) || levels[0];
      this.startLevel(target);
    },

    startLevel(level) {
      if (!level) return;
      if (this.mode === 'playing' && this.level === level) { this.pause(false); return; }
      this.audio.resume();
      const curtain = $('#curtain');
      curtain.classList.add('show');
      const self = this;
      setTimeout(() => {
        self.engine.setLevel(level, {});
        self.engine.wings = !!self.save.wings;
        self.level = level;
        self.levelIdx = level.index - 1;
        self.mode = 'playing';
        self.glyphCount = self.save.glyphsFound ? Object.keys(self.save.glyphsFound).length : 0;
        self.showScreen(null);
        $('#hud').classList.remove('hidden');
        $('#hud-name').textContent = I.level(level.index - 1).name;
        $('#hud-index').textContent = String(level.index).padStart(2, '0');
        $('#pause-name').textContent = I.level(level.index - 1).name;
        self.updateInk();
        self.showHint(I.hint(level.index - 1), 9000);
        self.audio.sfx('well');
        curtain.classList.remove('show');
        self.engine.resize();
      }, 420);
    },

    next() {
      if (!this.level) { this.begin(); return; }
      if (this.level.index >= 6 && !this.level.secret) {
        this.showEnd();
        return;
      }
      const nxt = NS.Levels.LEVELS.find((l) => l.index === this.level.index + 1 && !l.secret);
      if (nxt && this.save.unlocked[nxt.id]) this.startLevel(nxt);
      else this.toTitle();
    },

    restart() {
      if (!this.level) return;
      this.pause(false);
      this.startLevel(this.level);
    },

    toTitle() {
      this.pause(false);
      this.closeModals();
      this.engine.wings = !!this.save.wings;
      this.engine.setLevel(NS.Levels.DEMO, { demo: true });
      this.engine.setTheme(this.save.theme || 'dusk');
      this.mode = 'title';
      this.level = null;
      $('#hud').classList.add('hidden');
      this.showScreen('title');
      this.applyLang();
    },

    pause(on) {
      if (this.mode !== 'playing') return;
      this.engine.paused = !!on;
      if (on) {
        this.showScreen('pause');
        this.audio.setTension(0);
      } else {
        this.showScreen(null);
      }
    },

    onEvent(type, data) {
      if (type === 'win') this.onWin();
      else if (type === 'death') this.onDeath();
      else if (type === 'respawn') { /* flash handled in engine */ }
      else if (type === 'drop') this.onDrop(data);
      else if (type === 'glyph') this.onGlyph();
      else if (type === 'goal') { this.showHint('', 0); }
    },

    onWin() {
      const lvl = this.level;
      const st = this.engine.stats;
      const idx = lvl.index - 1;
      this.mode = 'won';
      const prev = this.save.best[lvl.id];
      const ms = Math.round(st.time * 1000);
      if (!prev || ms < prev) this.save.best[lvl.id] = ms;
      this.save.ink[lvl.id] = Math.max(this.save.ink[lvl.id] || 0, st.drops);
      this.save.completed[lvl.id] = true;
      const nextLvl = NS.Levels.LEVELS.find((l) => l.index === lvl.index + 1 && !l.secret);
      if (nextLvl) this.save.unlocked[nextLvl.id] = true;
      if (this.save.deaths >= 13) this.secret('abyss');
      this.persist();

      $('#win-kicker').textContent = String(lvl.index).padStart(2, '0') + ' · ' + I.level(idx).name;
      $('#win-ink').textContent = st.drops + '/' + lvl.drops.length;
      $('#win-time').textContent = U.fmtTime(ms);
      $('#win-deaths').textContent = String(st.deaths);
      const glyph = lvl.glyph && lvl.glyph.found;
      $('#win-whisper').textContent = glyph ? '“' + this.glyphLine(idx) + '”' : '';
      const isLast = lvl.index >= 6 && !lvl.secret;
      $('#btn-next').textContent = isLast ? I.t('win.done') : I.t('win.next');
      $('#btn-next').style.display = '';
      this.showScreen('win');
      this.audio.setTension(0);
    },

    onDeath() {
      this.save.deaths = (this.save.deaths || 0) + 1;
      this.persist();
      if (this.save.deaths >= 13) this.secret('abyss');
    },

    onDrop(d) {
      this.updateInk();
      if (d.index >= d.total) {
        this.toast(I.t('toasts.allInk'), false);
        this.secret('ink');
      }
    },

    onGlyph() {
      const lvl = this.level;
      if (!this.save.glyphsFound) this.save.glyphsFound = {};
      this.save.glyphsFound[lvl.id] = true;
      const n = Object.keys(this.save.glyphsFound).length;
      this.glyphCount = n;
      this.persist();
      this.toast(I.t('toasts.glyph'), this.glyphLine(lvl.index - 1));
      const mainCount = NS.Levels.LEVELS.filter((l) => !l.secret).length;
      if (n >= mainCount) {
        this.save.unlocked.longdark = true;
        this.secret('glyphs');
      }
    },

    glyphLine(i) {
      const en = [
        'the sun is not angry. it is only thorough.',
        'a shadow is the shape a world makes when it flinches.',
        'we built the well so the light would have somewhere to go.',
        'the moths were people who looked too long.',
        'there was a sea here. the light drank it.',
        'when it is over, walk west. do not turn around.'
      ];
      const hi = [
        'सूरज नाराज़ नहीं है। वह बस पूरा करता है।',
        'साया वह आकार है जो दुनिया डरकर बनाती है।',
        'हमने कुआँ बनाया ताकि रोशनी को जाने की जगह मिले।',
        'पतंगें वे लोग थीं जिन्होंने बहुत देर देखा।',
        'यहाँ समुद्र था। रोशनी ने उसे पी लिया।',
        'जब सब ख़त्म हो, पश्चिम चलो। पीछे मत देखो।'
      ];
      const hg = [
        'suraj gussa nahi hai. bas pura karta hai.',
        'saaya woh shape hai jo duniya darr ke banati hai.',
        'humne well banaya taaki light ko jaane ki jagah mile.',
        'moths woh log the jinhone bahut der dekha.',
        'yahan samundar tha. light ne pi liya.',
        'jab sab khatam ho, west chalo. peeche mat dekho.'
      ];
      const arr = I.lang === 'hi' ? hi : I.lang === 'hg' ? hg : en;
      return arr[i] || en[i] || '';
    },

    updateInk() {
      const st = this.engine.stats;
      const total = this.level ? this.level.drops.length : 3;
      const dots = $$('#ink-meter .ink-dot');
      dots.forEach((d, i) => d.classList.toggle('on', i < st.drops));
      $('#ink-count').textContent = st.drops + '/' + total;
    },

    showHint(text, ms) {
      const el = $('#hud-hint');
      el.textContent = text || '';
      el.classList.toggle('show', !!text);
      clearTimeout(this.hintTimer);
      if (text && ms) this.hintTimer = setTimeout(() => el.classList.remove('show'), ms);
    },

    showScreen(name) {
      ['title', 'pause', 'win', 'end'].forEach((n) => {
        const el = $('#screen-' + n);
        if (el) el.classList.toggle('hidden', n !== name);
      });
      document.body.classList.toggle('ui-mode', name === 'title' || !name && false);
      document.body.classList.toggle('playing', name === null);
    },

    /* -------------------------------------------------------------- */
    /* end / credits / modals                                         */
    /* -------------------------------------------------------------- */

    showEnd() {
      this.mode = 'end';
      this.save.seenEnd = true;
      this.persist();
      $('#hud').classList.add('hidden');
      this.showScreen('end');
      this.audio.sfx('unlock');
      this.engine.setTheme(this.save.theme);
    },

    openChronicle() { this.buildChronicle(); this.openModal('chronicle'); },
    openWhispers() { this.buildWhispers(); this.openModal('whispers'); },
    openCredits() { this.openModal('credits'); },
    openModal(name) {
      this.closeModals();
      const m = $('#modal-' + name);
      if (m) m.classList.add('open');
      $('#nav').classList.remove('open');
      this.audio.sfx('ui');
    },
    closeModals() { $$('.modal').forEach((m) => m.classList.remove('open')); },
    closeNav() { $('#nav').classList.remove('open'); },

    buildChronicle() {
      const grid = $('#chronicle-grid');
      grid.innerHTML = '';
      const pal = ['rgba(255,150,90,.22)', 'rgba(255,180,120,.2)', 'rgba(140,220,255,.16)', 'rgba(255,120,90,.2)', 'rgba(180,160,255,.16)', 'rgba(255,170,110,.2)', 'rgba(120,220,230,.18)', 'rgba(180,200,255,.15)'];
      NS.Levels.LEVELS.forEach((lvl, i) => {
        const locked = !this.save.unlocked[lvl.id];
        const done = !!this.save.completed[lvl.id];
        const card = document.createElement('div');
        card.className = 'lvlcard' + (locked ? ' locked' : '') + (lvl.secret ? ' secret' : '');
        card.style.setProperty('--cardglow', pal[i % pal.length]);
        card.style.animationDelay = (i * 0.04) + 's';
        const info = I.level(lvl.index - 1);
        card.innerHTML =
          '<div class="lvl-top"><span class="lvl-num">' + String(lvl.index).padStart(2, '0') +
          (lvl.secret ? ' · sealed' : '') + '</span>' +
          '<svg class="lvl-glyph" viewBox="0 0 24 24"><path d="M12 2l7 10-7 10-7-10z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg></div>' +
          '<h3 class="lvl-name">' + escapeHtml(locked && lvl.secret ? '???' : info.name) + '</h3>' +
          '<p class="lvl-tag">' + escapeHtml(locked ? I.t('chronicle.locked') : info.tag) + '</p>' +
          '<div class="lvl-foot"><span>' + (done ? '✦ ' + U.fmtTime(this.save.best[lvl.id]) : (locked ? '—' : '·')) + '</span>' +
          (locked ? '' : '<button class="lvl-enter" data-lvl="' + lvl.id + '">' + I.t('chronicle.play') + '</button>') +
          '</div>';
        grid.appendChild(card);
        if (!locked) {
          const btn = card.querySelector('[data-lvl]');
          if (btn) btn.addEventListener('click', () => {
            this.closeModals();
            this.startLevel(lvl);
          });
        }
      });
    },

    buildWhispers() {
      const list = $('#whisper-list');
      list.innerHTML = '';
      const found = NS.I18N.whispers.filter((w) => this.save.whispers[w.id]);
      const head = document.createElement('div');
      head.className = 'whisper';
      head.style.gridTemplateColumns = '1fr auto';
      head.innerHTML = '<span class="whisper-text">' + I.t('whispers.count') + ' · ' + found.length + ' / ' + I.whispers.length + '</span><span class="whisper-tag">NOONFALL</span>';
      list.appendChild(head);
      NS.I18N.whispers.forEach((w, i) => {
        const has = !!this.save.whispers[w.id];
        const row = document.createElement('div');
        row.className = 'whisper ' + (has ? 'found' : 'locked');
        row.style.animationDelay = (i * 0.03) + 's';
        row.innerHTML = '<span class="whisper-mark"><span>' + (has ? '✦' : '·') + '</span></span>' +
          '<span class="whisper-text">' + escapeHtml(has ? I.whisper(w.id) : I.t('whispers.lockedHint')) + '</span>' +
          '<span class="whisper-tag">' + (has ? '№ ' + String(i + 1).padStart(2, '0') : '—') + '</span>';
        list.appendChild(row);
      });
    },

    renderTally() {
      const n = NS.I18N.whispers.filter((w) => this.save.whispers[w.id]).length;
      const el = $('#whisper-tally');
      if (el) el.textContent = n + ' / ' + NS.I18N.whispers.length + ' ' + I.t('whispers.title').toLowerCase();
      const c = NS.Levels.LEVELS.filter((l) => !l.secret && this.save.completed[l.id]).length;
      const p = $('#title-progress');
      if (p) p.textContent = c + ' / 6 ' + I.t('chronicle.title').toLowerCase();
    },

    /* -------------------------------------------------------------- */
    /* secrets                                                        */
    /* -------------------------------------------------------------- */

    secret(id) {
      if (this.save.whispers[id]) return false;
      this.save.whispers[id] = true;
      this.persist();
      this.audio.sfx('secret');
      const w = NS.I18N.whispers.find((x) => x.id === id);
      const idx = NS.I18N.whispers.indexOf(w);
      this.toast(I.t('toasts.secret') + ' · №' + String(idx + 1).padStart(2, '0'), I.whisper(id));
      this.renderTally();
      return true;
    },

    onCanvasClick() {
      if (this.mode !== 'playing' && this.mode !== 'title') return;
      const m = this.engine.moon;
      const p = this.engine.pointer;
      if (!p.valid) return;
      if (Math.hypot(p.x - m.x, p.y - m.y) < m.r * 1.5) {
        this.moonHits = (this.moonHits || 0) + 1;
        this.audio.sfx('ui', 900 + this.moonHits * 40);
        if (this.moonHits >= 7) {
          this.secret('moon');
          this.toast(I.t('toasts.moon'));
          this.moonHits = 0;
        } else if (this.moonHits >= 4) {
          this.toast('· ' + this.moonHits + ' ·');
        }
      }
    },

    konami() {
      this.save.unlocked.garden = true;
      this.persist();
      this.audio.sfx('unlock');
      this.toast(I.t('toasts.konami'));
      this.secret('konami');
      this.renderTally();
      if ($('#modal-chronicle').classList.contains('open')) this.buildChronicle();
    },

    umbra() {
      this.save.wings = true;
      this.engine.wings = true;
      this.persist();
      this.toast(I.t('toasts.umbra'));
      this.audio.sfx('unlock');
      this.secret('umbra');
    },

    /* -------------------------------------------------------------- */
    /* input                                                          */
    /* -------------------------------------------------------------- */

    keyBuf: '',
    onKey(e) {
      if (e.target && e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') { this.engine.setKey('left', true); e.preventDefault(); }
      if (k === 'd' || k === 'arrowright') { this.engine.setKey('right', true); e.preventDefault(); }
      if (k === ' ' || k === 'w' || k === 'arrowup') { this.engine.setKey('jump', true); e.preventDefault(); }
      if (k === 'r' && this.mode === 'playing') this.restart();
      if (k === 'm') { $('#btn-sound').click(); }
      if (k === 'escape') {
        if ($('#console').classList.contains('hidden') === false) { this.toggleConsole(false); return; }
        if ($$('.modal.open').length) { this.closeModals(); return; }
        if (this.mode === 'playing') this.pause(!this.engine.paused);
      }
      if (k === '`' || k === '~') { e.preventDefault(); this.toggleConsole(); }
      if (k === 'h' && this.mode === 'playing') {
        const el = $('#hud-hint');
        this.showHint(el.classList.contains('show') ? '' : I.hint(this.level.index - 1), 8000);
      }
      this.trackKeys(e);
    },

    trackKeys(e) {
      const kon = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
      const k = e.key.toLowerCase();
      this._raw = (this._raw || []).concat(k).slice(-24);
      if (this._raw.slice(-kon.length).join(',') === kon.join(',')) {
        this._raw = [];
        this.konami();
        return;
      }
      this._seq = ((this._seq || '') + (k.length === 1 ? k : '')).slice(-16);
      if (this._seq.endsWith('umbra')) { this._seq = ''; this.umbra(); }
      else if (this._seq.endsWith('night')) { this._seq = ''; this.toggleTheme(); }
    },

    toggleConsole(on) {
      const el = $('#console');
      const show = on === undefined ? el.classList.contains('hidden') : on;
      el.classList.toggle('hidden', !show);
      if (show) {
        this.engine.keys.left = this.engine.keys.right = this.engine.keys.jump = false;
        setTimeout(() => $('#console-in').focus(), 30);
        this.toast(I.t('consoleHint'));
      } else {
        $('#console-in').blur();
      }
    },

    execConsole(cmd) {
      const c = (cmd || '').toLowerCase();
      if (!c) return;
      this.secret('console');
      if (c === 'help') this.toast('help · night · umbra · garden · whisper · who · 13');
      else if (c === 'night' || c === 'moon') this.toggleTheme();
      else if (c === 'dusk') { if (document.documentElement.getAttribute('data-theme') === 'moon') this.toggleTheme(); }
      else if (c === 'umbra') this.umbra();
      else if (c === 'garden') { this.save.unlocked.garden = true; this.persist(); this.konami(); }
      else if (c === 'longdark') { this.save.unlocked.longdark = true; this.persist(); this.toast(I.t('toasts.unlockLong')); }
      else if (c === 'whisper' || c === 'whispers') {
        const missing = NS.I18N.whispers.filter((w) => !this.save.whispers[w.id]);
        if (missing.length) {
          const w = missing[0];
          this.toast('hint · ' + w.id, w.en.slice(0, 74) + '…');
        } else this.toast('you have heard everything.');
      } else if (c === 'who') this.toast('you are the shade. i am the light.');
      else if (c === '13') this.toast('the abyss counts with you.');
      else if (c === 'hello' || c === 'hi') this.toast('hello, shade.');
      else this.toast('…' + cmd);
    },

    /* -------------------------------------------------------------- */
    toast(title, sub) {
      const wrap = $('#toasts');
      const el = document.createElement('div');
      el.className = 'toast';
      el.innerHTML = '<i></i><span>' + escapeHtml(title) + '</span>' + (sub ? '<small>' + escapeHtml(sub) + '</small>' : '');
      wrap.appendChild(el);
      setTimeout(() => el.remove(), 4200);
      while (wrap.children.length > 3) wrap.firstChild.remove();
    }
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  NS.UI = UI;
})(window.Noonfall = window.Noonfall || {});
