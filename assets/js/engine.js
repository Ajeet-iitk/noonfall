/* NOONFALL — engine: world, light, ink, physics, rendering */
(function (NS) {
  'use strict';
  const U = NS.Util;
  const W = 1280, H = 720;

  const PAL = {
    dusk: {
      skyTop: '#070714', skyMid: '#1b0d28', skyLow: '#5d1f2e', horizon: '#c4552f', floor: '#ffa257',
      glowA: '#ff7a3c', glowB: '#ffd08a',
      ink: '#06050b', ink2: '#0b0914', inkLit: '#191325',
      rim: '#8fdcff', rimSoft: '#4f93b5',
      warm: '#ffc98a', warmSoft: '#ff9a5a',
      drop: '#ffd7a0', mote: '#ff6a4a', rune: '#88e7ff',
      fog: '#ff9a5a', haze: '255,170,120'
    },
    moon: {
      skyTop: '#02050e', skyMid: '#08152c', skyLow: '#0e3244', horizon: '#1f6b7e', floor: '#7fd8e8',
      glowA: '#3fb7c9', glowB: '#c8f8ff',
      ink: '#02040a', ink2: '#060b14', inkLit: '#0b1421',
      rim: '#a6f3ff', rimSoft: '#4f8fa8',
      warm: '#c9f2ff', warmSoft: '#7fd4e8',
      drop: '#c7f6ff', mote: '#ff8a6a', rune: '#a6f3ff',
      fog: '#5fc7d8', haze: '140,215,235'
    }
  };

  const MOVE = {
    accel: 3000, air: 2050, max: 330, fric: 3200,
    grav: 2380, jump: 726, maxFall: 1450,
    coyote: 0.095, buffer: 0.13
  };

  class Engine {
    constructor(canvas, audio) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.audio = audio;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.viewW = 1280; this.viewH = 720;
      this.zoom = 1;
      this.cam = { x: 640, y: 360, zoom: 1 };
      this.time = 0;
      this.keys = { left: false, right: false, jump: false };
      this.pointer = { x: -9999, y: -9999, valid: false };
      this.lantern = { x: 200, y: 400 };
      this.tails = [];
      this.particles = [];
      this.shake = 0;
      this.demo = false;
      this.paused = false;
      this.theme = 'dusk';
      this.palette = PAL.dusk;
      this.onEvent = function () {};
      this.level = null;
      this.player = null;
      this.dead = false;
      this.won = false;
      this.grain = this._makeGrain();
      this.glow = document.createElement('canvas');
      this.gctx = this.glow.getContext('2d');
      this.sky = document.createElement('canvas');
      this.inks = null;
      this.stats = { deaths: 0, drops: 0, time: 0 };
      this.trail = [];
      this.lanternTrail = [];
      this.moon = { x: 1092, y: 118, r: 46 };
      this.moonHits = 0;
      this.invert = false;
      this.wings = false;
      this.deathT = 0;
      this.wonT = 0;
      this.stepT = 0;
      this.shadeDirty = true;
      this.debug = /[?&]debug=1/.test(location.search);
      this.resize();
    }

    /* ---------------------------------------------------------------- */
    /* setup                                                             */
    /* ---------------------------------------------------------------- */

    _makeGrain() {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      const img = g.createImageData(128, 128);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 120 + Math.random() * 135;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      return c;
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(320, rect.width || window.innerWidth);
      const h = Math.max(240, rect.height || window.innerHeight);
      this.viewW = w; this.viewH = h;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      // portrait screens show the whole diorama (width fit) so the puzzle reads at a glance;
      // landscape and desktop fill the frame
      const fit = h > w * 1.12 ? w / W : Math.max(w / W, h / H);
      this.zoom = U.clamp(fit, 0.15, 2.2);
      const gw = Math.max(80, Math.round(w / 4));
      const gh = Math.max(45, Math.round(h / 4));
      this.glow.width = gw; this.glow.height = gh;
      if (this.level) this._buildSky();
      this._updateCamera(1);
    }

    setTheme(theme) {
      this.theme = theme === 'moon' ? 'moon' : 'dusk';
      this.palette = PAL[this.theme];
      if (this.level) this._buildSky();
    }

    setLevel(level, opts) {
      opts = opts || {};
      this.demo = !!opts.demo;
      this.level = level;
      this.paused = false;
      this.dead = false;
      this.won = false;
      this.deathT = 0;
      this.wonT = 0;
      this.particles.length = 0;
      this.trail.length = 0;
      this.lanternTrail.length = 0;
      this.shake = 0;
      this.invert = !!opts.invert;
      // theme is a global preference: never let a level reset day/night
      NS.Levels.prepare(level);
      this.lantern.x = level.sun.x;
      this.lantern.y = level.sun.y;
      this.lanternTargetX = level.sun.x;
      this.lanternTargetY = level.sun.y;
      this.pointer.valid = false;
      this.stats = { deaths: 0, drops: 0, time: 0 };
      this.player = this.demo ? null : this._makePlayer(level.spawn.x, level.spawn.y);
      this.cam.x = this.demo ? (level.bounds.x0 + level.bounds.x1) / 2 : this.player.x;
      this.cam.y = this.demo ? (level.bounds.y0 + level.bounds.y1) / 2 : this.player.y;
      this._updateCamera(1, true);
      this._buildSky();
      this._computeShade();
      this.demoT = 0;
    }

    _makePlayer(x, y) {
      return {
        x, y, vx: 0, vy: 0, w: 20, h: 32,
        onGround: false, wasGround: false, face: 1,
        coyote: 0, jumpBuf: 0, jumpHeld: false, jumps: 0,
        sx: 1, sy: 1, blink: 0, anim: 0, airT: 0, glow: 0
      };
    }

    /* ---------------------------------------------------------------- */
    /* geometry / collision                                              */
    /* ---------------------------------------------------------------- */

    _computeShade() {
      const L = this.lantern;
      const tails = [];
      const stones = this.level.stones;
      for (let i = 0; i < stones.length; i++) {
        const s = stones[i];
        const d = Math.max(48, Math.hypot(s.cx - L.x, s.cy - L.y));
        const len = U.clamp(d * 1.30, 200, 630);
        const poly = U.castShadow(s.poly, L.x, L.y, len);
        tails.push({ s, poly, bb: U.bbox(poly), len, d });
      }
      this.tails = tails;
      this.anchors = this.level.anchors;
    }

    anchorAt(x, y) {
      const a = this.anchors;
      for (let i = 0; i < a.length; i++) {
        const r = a[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
      }
      return false;
    }

    shadeAt(x, y) {
      const t = this.tails;
      for (let i = 0; i < t.length; i++) {
        const bb = t[i].bb;
        if (x < bb.x0 || x > bb.x1 || y < bb.y0 || y > bb.y1) continue;
        if (U.inConvex(x, y, t[i].poly)) return true;
      }
      return false;
    }

    solidAt(x, y) {
      return this.anchorAt(x, y) || this.shadeAt(x, y);
    }

    inShade(x, y) {
      const t = this.tails;
      for (let i = 0; i < t.length; i++) {
        const bb = t[i].bb;
        if (x < bb.x0 || x > bb.x1 || y < bb.y0 || y > bb.y1) continue;
        if (U.inConvex(x, y, t[i].poly) && !U.inConvex(x, y, t[i].s.poly)) return true;
      }
      return false;
    }

    _edgeX(p, nx, dir) {
      // only the old stone terraces block sideways; shade is a one-way surface
      const w = p.w / 2, h = p.h / 2;
      const probe = nx + w * dir;
      return this.anchorAt(probe, p.y - h + 5) ||
        this.anchorAt(probe, p.y) ||
        this.anchorAt(probe, p.y + h - 4);
    }

    _edgeY(p, ny, up) {
      const w = p.w / 2, h = p.h / 2;
      const hit = up ? this.anchorAt.bind(this) : this.solidAt.bind(this);
      return hit(p.x - w + 4, ny + h) ||
        hit(p.x, ny + h) ||
        hit(p.x + w - 4, ny + h);
    }

    _moveX(p, dx) {
      const dir = dx > 0 ? 1 : -1;
      const n = Math.max(1, Math.ceil(Math.abs(dx) / 2.5));
      const sx = dx / n;
      for (let i = 0; i < n; i++) {
        const nx = p.x + sx;
        if (this._edgeX(p, nx, dir)) {
          if (p.wasGround) {
            let stepped = false;
            for (let k = 2; k <= 13; k += 2) {
              if (!this._edgeX({ y: p.y - k, w: p.w, h: p.h }, nx, dir)) {
                p.y -= k; p.x = nx; stepped = true; break;
              }
            }
            if (stepped) continue;
          }
          p.vx = 0;
          this._bump(p, sx);
          break;
        }
        p.x = nx;
      }
      // shade is a one-way surface: walking into a rising slope lifts you onto it
      if (p.wasGround && p.vy > -20) {
        const half = p.h / 2;
        const feet = p.y + half;
        let top = null;
        for (let yy = Math.floor(feet - 32); yy <= feet + 5; yy++) {
          if (this.shadeAt(p.x, yy) && !this.shadeAt(p.x, yy - 3)) { top = yy; break; }
        }
        if (top !== null && top < feet && feet - top <= 30) p.y = top - half;
      }
    }

    _bump(p, dir) {
      if (Math.abs(p.vx) > 120) this._spawnDust(p.x + (p.w / 2) * Math.sign(dir), p.y + 8, 2, 'ink');
    }

    _moveY(p, dy) {
      const n = Math.max(1, Math.ceil(Math.abs(dy) / 2.5));
      const sy = dy / n;
      for (let i = 0; i < n; i++) {
        const ny = p.y + sy;
        if (this._edgeY(p, ny, sy < 0)) {
          if (sy > 0) {
            p.onGround = true;
            if (!p.wasGround) this._land(p);
          }
          p.vy = 0;
          break;
        }
        p.y = ny;
      }
    }

    _land(p) {
      const impact = U.clamp(Math.abs(p.vy) / 900, 0.2, 1);
      p.sx = 1 + 0.22 * impact;
      p.sy = 1 - 0.24 * impact;
      this.shake = Math.max(this.shake, 3.4 * impact);
      this._spawnDust(p.x, p.y + p.h / 2, 5 + Math.round(4 * impact), 'ink');
      if (this.audio) this.audio.sfx('land');
    }

    /* ---------------------------------------------------------------- */
    /* update                                                            */
    /* ---------------------------------------------------------------- */

    update(dt) {
      if (!this.level) return;
      dt = Math.min(dt, 1 / 30);
      this.time += dt;
      if (!this.paused) {
        this._updateLantern(dt);
        this._computeShade();
        if (this.demo) this._updateDemo(dt);
        else this._updatePlayer(dt);
        this._updateEntities(dt);
        this._updateParticles(dt);
        this.stats.time += dt;
      }
      this._updateCamera(dt);
      this.shake = Math.max(0, this.shake - dt * 42);
      if (this.audio) this.audio.update(dt);
    }

    _updateLantern(dt) {
      let tx, ty;
      if (this.demo) {
        this.demoT += dt;
        const a = this.demoT * 0.16;
        tx = 640 + Math.cos(a) * 230;
        ty = 300 + Math.sin(a * 1.3) * 120;
        this.lanternTargetX = tx; this.lanternTargetY = ty;
        this.lantern.x = U.spring(this.lantern.x, tx, 4, dt);
        this.lantern.y = U.spring(this.lantern.y, ty, 4, dt);
        return;
      }
      if (this.pointer.valid) {
        const b = this.level.bounds;
        tx = U.clamp(this.pointer.x, b.x0 - 140, b.x1 + 140);
        ty = U.clamp(this.pointer.y, b.y0 - 140, b.y1 + 140);
      } else {
        tx = this.level.sun.x; ty = this.level.sun.y;
      }
      this.lanternTargetX = tx; this.lanternTargetY = ty;
      this.lantern.x = U.spring(this.lantern.x, tx, 13, dt);
      this.lantern.y = U.spring(this.lantern.y, ty, 13, dt);
      this.lanternTrail.push({ x: this.lantern.x, y: this.lantern.y, t: 0 });
      if (this.lanternTrail.length > 22) this.lanternTrail.shift();
      for (const l of this.lanternTrail) l.t += dt;
    }

    _updatePlayer(dt) {
      const p = this.player;
      const lvl = this.level;

      p.sx = U.spring(p.sx, 1, 12, dt);
      p.sy = U.spring(p.sy, 1, 12, dt);
      p.blink -= dt;
      if (p.blink < -3) p.blink = 0.16;

      if (this.won) {
        this.wonT += dt;
        const g = lvl.goal;
        const k = U.clamp((this.wonT - 0.15) / 1.1, 0, 1);
        p.x = U.lerp(p.x, g.x, k * k * 0.14);
        p.y = U.lerp(p.y, g.y, k * k * 0.14);
        p.sy = 1 - k * 0.8; p.sx = 1 - k * 0.8;
        if (Math.random() < 0.5) this._spawnEmber(g.x + U.rand(-40, 40), g.y + U.rand(-40, 40));
        if (this.wonT > 1.8) { this.won = 'done'; this.onEvent('win'); }
        return;
      }

      if (this.dead) {
        this.deathT += dt;
        if (this.deathT > 0.85) this._respawn();
        return;
      }

      const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
      if (dir !== 0) {
        p.face = dir;
        const a = p.onGround ? MOVE.accel : MOVE.air;
        p.vx = U.approach(p.vx, dir * MOVE.max, a * dt);
      } else {
        p.vx = U.approach(p.vx, 0, (p.onGround ? MOVE.fric : MOVE.air * 0.42) * dt);
      }

      p.jumpBuf = Math.max(0, p.jumpBuf - dt);
      const canJump = p.onGround || p.coyote > 0 || p.jumps > 0;
      if (p.jumpBuf > 0 && canJump) {
        const isDouble = !p.onGround && p.coyote <= 0;
        p.vy = -MOVE.jump;
        p.onGround = false;
        p.coyote = 0;
        p.jumpBuf = 0;
        p.jumpHeld = true;
        p.sx = 0.8; p.sy = 1.22;
        if (isDouble) { p.jumps--; if (this.audio) this.audio.sfx('jump2'); this._spawnDust(p.x, p.y + 12, 7, 'ember'); }
        else if (this.audio) this.audio.sfx('jump');
        this._spawnDust(p.x, p.y + p.h / 2, 4, 'ink');
      }
      if (!p.jumpHeld && p.vy < -140) p.vy += MOVE.grav * 1.9 * dt;
      p.vy = Math.min(p.vy + MOVE.grav * dt, MOVE.maxFall);

      p.wasGround = p.onGround;
      p.onGround = false;
      this._moveX(p, p.vx * dt);
      this._moveY(p, p.vy * dt);

      if (!p.onGround && p.vy >= 0) {
        const w = p.w / 2;
        for (let k = 1; k <= 6; k++) {
          if (this.solidAt(p.x - w + 4, p.y + p.h / 2 + k) || this.solidAt(p.x + w - 4, p.y + p.h / 2 + k) || this.solidAt(p.x, p.y + p.h / 2 + k)) {
            p.y += k - 1;
            p.onGround = true;
            if (!p.wasGround) this._land(p);
            break;
          }
        }
      }

      if (p.onGround) {
        p.coyote = MOVE.coyote;
        p.airT = 0;
        if (this.wings) p.jumps = 1;
        if (Math.abs(p.vx) > 30) {
          this.stepT -= dt * (Math.abs(p.vx) / MOVE.max);
          if (this.stepT <= 0) {
            this.stepT = 0.26;
            if (this.audio) this.audio.sfx('step');
            if (Math.random() < 0.5) this._spawnDust(p.x - p.face * 6, p.y + p.h / 2, 1, 'ink');
          }
          p.anim += dt * (6 + Math.abs(p.vx) * 0.03);
        }
      } else {
        p.coyote = Math.max(0, p.coyote - dt);
        p.airT += dt;
        if (this.wings) p.jumps = Math.max(p.jumps, 1);
      }

      if (p.y > lvl.killY) this.die('void');
      if (p.x < lvl.bounds.x0 - 250 || p.x > lvl.bounds.x1 + 250) p.x = U.clamp(p.x, lvl.bounds.x0 - 250, lvl.bounds.x1 + 250);

      // trail
      this.trail.push({ x: p.x, y: p.y, t: 0, f: p.face, a: p.anim });
      if (this.trail.length > 14) this.trail.shift();
      for (const t of this.trail) t.t += dt;
    }

    _updateDemo(dt) {
      if (Math.random() < 0.35) this._spawnEmber(U.rand(80, 1200), U.rand(430, 700));
      if (Math.random() < 0.12) {
        this.particles.push({
          x: U.rand(0, 1280), y: U.rand(80, 600), vx: U.rand(-4, 4), vy: U.rand(-8, -2),
          life: U.rand(4, 9), max: 9, size: U.rand(0.6, 1.8), kind: 'dust', hue: 0
        });
      }
    }

    _respawn() {
      const p = this.player;
      const lvl = this.level;
      p.x = lvl.spawn.x; p.y = lvl.spawn.y;
      p.vx = 0; p.vy = 0; p.jumps = 0; p.onGround = false;
      p.coyote = 0; p.jumpBuf = 0;
      this.dead = false;
      this.deathT = 0;
      for (const m of lvl.motes) { m.x = m.hx; m.y = m.hy; m.vx = 0; m.vy = 0; }
      this.lantern.x = lvl.sun.x; this.lantern.y = lvl.sun.y;
      this._updateCamera(1, true);
      this._computeShade();
      this.onEvent('respawn');
      this._spawnDust(p.x, p.y, 10, 'ember');
    }

    die(cause) {
      if (this.dead || this.won) return;
      this.dead = true;
      this.deathT = 0;
      this.shake = 16;
      this.stats.deaths++;
      const p = this.player;
      for (let i = 0; i < 34; i++) {
        this.particles.push({
          x: p.x + U.rand(-10, 10), y: p.y + U.rand(-14, 14),
          vx: U.rand(-220, 220), vy: U.rand(-320, 120),
          life: U.rand(0.5, 1.4), max: 1.4, size: U.rand(1, 3.4), kind: 'ink'
        });
      }
      if (this.audio) this.audio.sfx('death');
      this.onEvent('death', { cause });
    }

    winLevel() {
      if (this.won) return;
      this.won = true;
      this.wonT = 0;
      this.shake = 5;
      if (this.audio) { this.audio.sfx('well'); this.audio.sfx('win'); }
      this.onEvent('goal');
      for (let i = 0; i < 40; i++) this._spawnEmber(this.level.goal.x, this.level.goal.y);
    }

    _updateEntities(dt) {
      const lvl = this.level;
      const p = this.player;
      if (!p) return;

      for (const d of lvl.drops) {
        if (d.taken) continue;
        d.bob += dt;
        if (Math.hypot(d.x - p.x, d.y - p.y) < 30) {
          d.taken = true;
          this.stats.drops++;
          for (let i = 0; i < 16; i++) this._spawnEmber(d.x, d.y);
          if (this.audio) this.audio.sfx('drop', { pitch: 700 + this.stats.drops * 120 });
          this.onEvent('drop', { index: this.stats.drops, total: lvl.drops.length });
        }
      }

      if (lvl.glyph && !lvl.glyph.found) {
        lvl.glyph.t += dt;
        if (Math.hypot(lvl.glyph.x - p.x, lvl.glyph.y - p.y) < 40) {
          lvl.glyph.found = true;
          if (this.audio) this.audio.sfx('glyph');
          for (let i = 0; i < 26; i++) this._spawnEmber(lvl.glyph.x, lvl.glyph.y);
          this.onEvent('glyph');
        }
      }

      if (!this.demo && !this.won && Math.hypot(lvl.goal.x - p.x, lvl.goal.y - p.y) < 42) this.winLevel();

      for (const m of lvl.motes) {
        if (this.dead) continue;
        m.phase += dt;
        m.cool = Math.max(0, m.cool - dt);
        const L = this.lantern;
        const dx = L.x - m.x, dy = L.y - m.y;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 72 * m.size;
        const ax = (dx / dist) * speed * 4.2 + Math.cos(m.phase * 1.7) * 40;
        const ay = (dy / dist) * speed * 4.2 + Math.sin(m.phase * 1.3) * 40;
        m.vx = U.approach(m.vx, ax, 240 * dt);
        m.vy = U.approach(m.vy, ay, 240 * dt);
        const nx = m.x + m.vx * dt;
        const ny = m.y + m.vy * dt;
        if (this.inShade(nx, ny)) {
          m.vx = -m.vx * 0.7 + U.rand(-40, 40);
          m.vy = -m.vy * 0.7 - 30;
          m.cool = 0.35;
        } else {
          m.x = nx; m.y = ny;
        }
        if (m.x < lvl.bounds.x0 - 100 || m.x > lvl.bounds.x1 + 100) m.vx *= -1;
        if (m.y < lvl.bounds.y0 - 100 || m.y > lvl.bounds.y1 + 100) m.vy *= -1;
        if (Math.random() < 0.5) {
          this.particles.push({
            x: m.x + U.rand(-5, 5), y: m.y + U.rand(-5, 5),
            vx: U.rand(-14, 14), vy: U.rand(-24, 6), life: U.rand(0.4, 1.1), max: 1.1,
            size: U.rand(0.8, 2.2), kind: 'mote'
          });
        }
        if (!this.won && Math.hypot(m.x - p.x, m.y - p.y) < m.r + 12) this.die('glare');
      }
    }

    _spawnDust(x, y, n, kind) {
      for (let i = 0; i < n; i++) {
        this.particles.push({
          x: x + U.rand(-6, 6), y: y + U.rand(-3, 3),
          vx: U.rand(-60, 60), vy: U.rand(-90, -10),
          life: U.rand(0.3, 0.7), max: 0.7,
          size: U.rand(1, 2.8), kind: kind || 'ink'
        });
      }
    }

    _spawnEmber(x, y) {
      this.particles.push({
        x, y, vx: U.rand(-40, 40), vy: U.rand(-70, -10),
        life: U.rand(0.7, 1.8), max: 1.8, size: U.rand(1, 2.6), kind: 'ember'
      });
    }

    _updateParticles(dt) {
      const P = this.particles;
      for (let i = P.length - 1; i >= 0; i--) {
        const q = P[i];
        q.life -= dt;
        if (q.life <= 0) { P.splice(i, 1); continue; }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (q.kind === 'ember') { q.vy -= 12 * dt; q.vx *= 0.995; }
        else if (q.kind === 'dust') { q.vy -= 2 * dt; q.vx += Math.sin(this.time + q.x) * 2 * dt; }
        else if (q.kind === 'mote') { q.vy -= 6 * dt; }
        else { q.vy += 420 * dt; q.vx *= 0.99; }
      }
      if (P.length > 460) P.splice(0, P.length - 460);
    }

    _updateCamera(dt, snap) {
      const lvl = this.level;
      if (!lvl) return;
      const vw = this.viewW / this.zoom, vh = this.viewH / this.zoom;
      const b = lvl.bounds;
      let tx, ty;
      if (this.demo || !this.player) {
        tx = (b.x0 + b.x1) / 2; ty = (b.y0 + b.y1) / 2;
      } else {
        tx = this.player.x + this.player.vx * 0.10;
        ty = this.player.y - 18;
      }
      const cx0 = b.x0 + vw / 2, cx1 = b.x1 - vw / 2;
      const cy0 = b.y0 + vh / 2, cy1 = b.y1 - vh / 2;
      tx = cx0 > cx1 ? (b.x0 + b.x1) / 2 : U.clamp(tx, cx0, cx1);
      ty = cy0 > cy1 ? (b.y0 + b.y1) / 2 : U.clamp(ty, cy0, cy1);
      if (snap) { this.cam.x = tx; this.cam.y = ty; this.cam.zoom = this.zoom; }
      else {
        this.cam.x = U.spring(this.cam.x, tx, 5.5, dt);
        this.cam.y = U.spring(this.cam.y, ty, 5.5, dt);
        this.cam.zoom = U.spring(this.cam.zoom, this.zoom, 6, dt);
      }
    }

    /* ---------------------------------------------------------------- */
    /* input                                                             */
    /* ---------------------------------------------------------------- */

    setKey(name, down) {
      if (!(name in this.keys)) return;
      const was = this.keys[name];
      this.keys[name] = down;
      if (name === 'jump' && this.player) {
        if (down && !was) this.player.jumpBuf = MOVE.buffer;
        this.player.jumpHeld = down;
      }
    }

    setPointer(sx, sy) {
      const wx = this.cam.x + (sx - this.viewW / 2) / this.zoom;
      const wy = this.cam.y + (sy - this.viewH / 2) / this.zoom;
      this.pointer.x = wx;
      this.pointer.y = wy;
      this.pointer.valid = true;
    }

    /* ---------------------------------------------------------------- */
    /* render                                                            */
    /* ---------------------------------------------------------------- */

    render() {
      const ctx = this.ctx;
      const dpr = this.dpr;
      const vw = this.viewW, vh = this.viewH;
      const z = this.cam.zoom;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, vw, vh);

      const shakeX = this.shake ? U.rand(-this.shake, this.shake) : 0;
      const shakeY = this.shake ? U.rand(-this.shake, this.shake) : 0;

      const world = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(vw / 2 + shakeX, vh / 2 + shakeY);
        ctx.scale(z, z);
        ctx.translate(-this.cam.x, -this.cam.y);
      };

      // sky
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._drawSky(ctx, shakeX, shakeY);
      world();
      this._drawHaze(ctx);
      this._drawRays(ctx);
      this._drawMoon(ctx);
      this._drawShade(ctx);
      this._drawAnchors(ctx);
      this._drawGoal(ctx);
      this._drawGlyph(ctx);
      this._drawDrops(ctx);
      this._drawMotes(ctx);
      this._drawLantern(ctx);
      if (this.player && !this.demo) this._drawPlayer(ctx);
      this._drawParticles(ctx);
      if (this.debug) this._drawDebug(ctx);
      this._drawCursor(ctx);

      // glow pass
      this._drawGlow();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._drawPost(ctx, shakeX, shakeY);
    }

    _buildSky() {
      const c = this.sky;
      c.width = W + 240; c.height = H + 160;
      const g = c.getContext('2d');
      const P = this.palette;
      const ox = 120, oy = 80;
      const grad = g.createLinearGradient(0, 0, 0, c.height);
      grad.addColorStop(0, P.skyTop);
      grad.addColorStop(0.36, P.skyMid);
      grad.addColorStop(0.62, P.skyLow);
      grad.addColorStop(0.84, P.horizon);
      grad.addColorStop(1, P.floor);
      g.fillStyle = grad;
      g.fillRect(0, 0, c.width, c.height);

      // molten glow pools
      const pools = [
        [0.28, 0.93, 700, 0.5], [0.72, 0.99, 620, 0.42], [0.5, 1.02, 900, 0.35]
      ];
      for (const [fx, fy, r, a] of pools) {
        const rg = g.createRadialGradient(c.width * fx, c.height * fy, 10, c.width * fx, c.height * fy, r);
        rg.addColorStop(0, `rgba(255,220,170,${a})`);
        rg.addColorStop(0.5, `rgba(255,150,90,${a * 0.4})`);
        rg.addColorStop(1, 'rgba(255,120,60,0)');
        g.fillStyle = rg;
        g.fillRect(0, 0, c.width, c.height);
      }

      // stars
      const rnd = U.rng(1337);
      for (let i = 0; i < 220; i++) {
        const x = rnd() * c.width;
        const y = rnd() * c.height * 0.62;
        const a = rnd() * 0.5 + 0.08;
        const s = rnd() * 1.2 + 0.3;
        g.fillStyle = `rgba(255,240,230,${a})`;
        g.fillRect(x, y, s, s);
      }

      // distant ridges
      const ridge = (baseY, amp, color, step, seed) => {
        const rr = U.rng(seed);
        g.beginPath();
        g.moveTo(0, c.height);
        let y = baseY;
        for (let x = 0; x <= c.width + step; x += step) {
          y = baseY + Math.sin(x * 0.004 + seed) * amp + (rr() - 0.5) * amp * 0.9;
          g.lineTo(x, y);
        }
        g.lineTo(c.width, c.height);
        g.closePath();
        g.fillStyle = color;
        g.fill();
      };
      ridge(H + oy - 90, 34, 'rgba(40,12,26,0.55)', 46, 3);
      ridge(H + oy - 62, 26, 'rgba(26,8,20,0.72)', 34, 9);
      ridge(H + oy - 38, 18, 'rgba(12,4,12,0.86)', 26, 17);

      // a broken halo, very far away
      g.save();
      g.translate(c.width * 0.70, c.height * 0.20);
      g.rotate(-0.28);
      for (let i = 0; i < 9; i++) {
        g.strokeStyle = `rgba(255,224,196,${0.055 - i * 0.004})`;
        g.lineWidth = 1.1;
        g.beginPath();
        g.arc(0, 0, 150 + i * 19, 0.55 + i * 0.16, 1.55 + i * 0.30);
        g.stroke();
      }
      g.restore();

      // distant monoliths on the horizon
      const mono = (x, w, h, a) => {
        const base = H + oy - 30;
        g.fillStyle = `rgba(20,6,20,${a})`;
        g.beginPath();
        g.moveTo(x - w / 2, base);
        g.lineTo(x - w * 0.30, base - h);
        g.lineTo(x + w * 0.26, base - h * 0.88);
        g.lineTo(x + w / 2, base);
        g.closePath();
        g.fill();
      };
      mono(120, 74, 150, 0.5);
      mono(300, 44, 96, 0.38);
      mono(1000, 96, 190, 0.55);
      mono(1150, 52, 120, 0.42);
      mono(620, 36, 68, 0.3);

      // dust band
      const dz = U.rng(77);
      for (let i = 0; i < 160; i++) {
        const x = dz() * c.width;
        const y = c.height * 0.72 + dz() * c.height * 0.16;
        g.fillStyle = `rgba(255,225,195,${0.03 + dz() * 0.10})`;
        g.fillRect(x, y, dz() * 1.6 + 0.4, dz() * 1.6 + 0.4);
      }

      // haze bands
      for (let i = 0; i < 5; i++) {
        const y = H * 0.55 + i * 30;
        const rg = g.createLinearGradient(0, y - 24, 0, y + 24);
        rg.addColorStop(0, 'rgba(255,190,150,0)');
        rg.addColorStop(0.5, `rgba(255,200,160,${0.05 + i * 0.008})`);
        rg.addColorStop(1, 'rgba(255,190,150,0)');
        g.fillStyle = rg;
        g.fillRect(0, y - 24, c.width, 48);
      }
    }

    _drawSky(ctx, sx, sy) {
      const z = this.cam.zoom;
      const img = this.sky;
      const scale = Math.max((this.viewW / z) / W, (this.viewH / z) / H) * 1.02;
      const dw = img.width * scale;
      const dh = img.height * scale;
      const px = this.viewW / 2 + sx - (this.cam.x - W / 2) * z * 0.14 - dw / 2 + 60 * z;
      const py = this.viewH / 2 + sy - (this.cam.y - H / 2) * z * 0.14 - dh / 2 + 40 * z;
      ctx.drawImage(img, px, py, dw, dh);
    }

    _screenToWorld(sx, sy) {
      return {
        x: this.cam.x + (sx - this.viewW / 2) / this.cam.zoom,
        y: this.cam.y + (sy - this.viewH / 2) / this.cam.zoom
      };
    }

    _drawHaze(ctx) {
      const P = this.palette;
      // horizontal fog drifting near the lower third
      for (let i = 0; i < 3; i++) {
        const y = 470 + i * 90 + Math.sin(this.time * 0.13 + i) * 12;
        const x = 640 + Math.sin(this.time * 0.09 + i * 2) * 120;
        const rg = ctx.createRadialGradient(x, y, 20, x, y, 520);
        rg.addColorStop(0, `rgba(${P.haze},0.055)`);
        rg.addColorStop(1, `rgba(${P.haze},0)`);
        ctx.fillStyle = rg;
        ctx.fillRect(x - 520, y - 320, 1040, 640);
      }
    }

    _drawMoon(ctx) {
      const m = this.moon;
      const P = this.palette;
      const g = ctx.createRadialGradient(m.x, m.y, m.r * 0.2, m.x, m.y, m.r * 3.6);
      g.addColorStop(0, `rgba(${P.haze},0.22)`);
      g.addColorStop(0.4, `rgba(${P.haze},0.07)`);
      g.addColorStop(1, `rgba(${P.haze},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3.6, 0, U.TAU); ctx.fill();

      ctx.save();
      ctx.globalAlpha = 0.30;
      const dg = ctx.createLinearGradient(m.x, m.y - m.r, m.x, m.y + m.r);
      dg.addColorStop(0, 'rgba(255,248,236,0.95)');
      dg.addColorStop(1, 'rgba(255,214,180,0.42)');
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, U.TAU); ctx.fill();
      // waning shade
      const sg = ctx.createRadialGradient(m.x + m.r * 0.7, m.y - m.r * 0.5, 2, m.x + m.r * 0.7, m.y - m.r * 0.5, m.r * 1.5);
      sg.addColorStop(0, 'rgba(40,24,44,0.55)');
      sg.addColorStop(1, 'rgba(40,24,44,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, U.TAU); ctx.fill();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = 'rgba(120,80,70,0.5)';
      ctx.beginPath(); ctx.arc(m.x - 14, m.y - 4, 8, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(m.x + 8, m.y + 14, 5.5, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(m.x + 2, m.y - 20, 3.6, 0, U.TAU); ctx.fill();
      ctx.restore();
    }

    _drawRays(ctx) {
      const L = this.lantern;
      const P = this.palette;
      const r = 900;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * U.TAU + this.time * 0.022;
        const spread = 0.065 + Math.sin(i * 2.1) * 0.022;
        const len = r * (0.62 + 0.28 * Math.sin(i * 1.7 + this.time * 0.14));
        const g = ctx.createLinearGradient(L.x, L.y, L.x + Math.cos(a) * len, L.y + Math.sin(a) * len);
        g.addColorStop(0, `rgba(${P.haze},0.055)`);
        g.addColorStop(1, `rgba(${P.haze},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(L.x, L.y);
        ctx.lineTo(L.x + Math.cos(a - spread) * len, L.y + Math.sin(a - spread) * len);
        ctx.lineTo(L.x + Math.cos(a + spread) * len, L.y + Math.sin(a + spread) * len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    _drawShade(ctx) {
      const P = this.palette;
      const L = this.lantern;
      const tails = this.tails;

      // shadow bodies
      for (let i = 0; i < tails.length; i++) {
        const t = tails[i];
        const poly = t.poly;
        if (poly.length < 3) continue;
        const tipX = L.x + (t.s.cx - L.x) * (1 + t.len / Math.max(1, t.d));
        const tipY = L.y + (t.s.cy - L.y) * (1 + t.len / Math.max(1, t.d));
        const bb = t.bb;
        ctx.beginPath();
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k][0], poly[k][1]);
        ctx.closePath();

        const grad = ctx.createLinearGradient(t.s.cx, t.s.cy, tipX, tipY);
        grad.addColorStop(0, P.inkLit);
        grad.addColorStop(0.35, P.ink2);
        grad.addColorStop(1, P.ink);
        ctx.fillStyle = grad;
        ctx.fill();

        // lit upper surface
        ctx.save();
        ctx.clip();
        const sg = ctx.createLinearGradient(0, bb.y0, 0, bb.y0 + Math.max(46, (bb.y1 - bb.y0) * 0.55));
        sg.addColorStop(0, 'rgba(150,205,255,0.20)');
        sg.addColorStop(0.32, 'rgba(110,170,230,0.055)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);

        // ink grain inside the body
        ctx.strokeStyle = 'rgba(150,210,255,0.045)';
        ctx.lineWidth = 1;
        for (let k = 0; k < 4; k++) {
          const off = 14 + k * 13;
          ctx.beginPath();
          ctx.moveTo(t.s.cx - 40, t.s.cy + off);
          ctx.quadraticCurveTo(tipX * 0.5 + t.s.cx * 0.5, tipY * 0.5 + t.s.cy * 0.5 + off, tipX, tipY + off);
          ctx.stroke();
        }
        ctx.restore();

        // cold rim
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const rimGrad = ctx.createLinearGradient(t.s.cx, t.s.cy, tipX, tipY);
        rimGrad.addColorStop(0, 'rgba(150,220,255,0.26)');
        rimGrad.addColorStop(0.5, 'rgba(120,200,255,0.10)');
        rimGrad.addColorStop(1, 'rgba(90,170,230,0.03)');
        ctx.strokeStyle = rimGrad;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';

        // bright walking surface
        const top = t.top || (t.top = this._topChain(poly));
        if (top.length > 1) {
          ctx.beginPath();
          ctx.moveTo(top[0][0], top[0][1]);
          for (let k = 1; k < top.length; k++) ctx.lineTo(top[k][0], top[k][1]);
          const tg = ctx.createLinearGradient(bb.x0, 0, bb.x1, 0);
          tg.addColorStop(0, 'rgba(160,225,255,0.30)');
          tg.addColorStop(0.5, 'rgba(215,245,255,0.75)');
          tg.addColorStop(1, 'rgba(160,220,255,0.22)');
          ctx.strokeStyle = tg;
          ctx.lineWidth = 2;
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.strokeStyle = 'rgba(140,215,255,0.10)';
          ctx.lineWidth = 9;
          ctx.stroke();

          // debris along the surface — this is ground, not glass
          for (let k = 0; k < top.length - 1; k++) {
            const a = top[k], b = top[k + 1];
            const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const n = Math.floor(seg / 30);
            for (let j = 0; j < n; j++) {
              const tt = (j + 0.35) / n;
              const x = a[0] + (b[0] - a[0]) * tt;
              const y = a[1] + (b[1] - a[1]) * tt;
              const hsh = Math.abs(Math.sin(x * 0.31 + y * 0.17 + t.s.cx));
              const sz = 1.4 + hsh * 4.2;
              ctx.fillStyle = 'rgba(5,4,10,0.92)';
              ctx.beginPath(); ctx.arc(x, y + sz * 0.25, sz, 0, U.TAU); ctx.fill();
              ctx.fillStyle = `rgba(190,232,255,${0.08 + hsh * 0.16})`;
              ctx.beginPath(); ctx.arc(x - sz * 0.35, y - sz * 0.5, sz * 0.32, 0, U.TAU); ctx.fill();
              if (hsh > 0.86) {
                ctx.strokeStyle = 'rgba(150,225,255,0.22)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, y - sz);
                ctx.lineTo(x + 2 - hsh * 5, y - sz - 4 - hsh * 6);
                ctx.stroke();
              }
            }
          }
        }
        ctx.restore();
      }

      // stone cores
      for (let i = 0; i < tails.length; i++) {
        const s = tails[i].s;
        ctx.beginPath();
        ctx.moveTo(s.poly[0][0], s.poly[0][1]);
        for (let k = 1; k < s.poly.length; k++) ctx.lineTo(s.poly[k][0], s.poly[k][1]);
        ctx.closePath();
        ctx.fillStyle = P.ink2;
        ctx.fill();
        const g = ctx.createRadialGradient(L.x, L.y, 4, s.cx, s.cy, Math.max(s.bbox.x1 - s.bbox.x0, 40) * 1.5);
        g.addColorStop(0, 'rgba(255,190,140,0.18)');
        g.addColorStop(0.35, 'rgba(150,190,255,0.05)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,230,255,0.22)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }

    _topChain(poly) {
      let imin = 0, imax = 0;
      for (let i = 1; i < poly.length; i++) {
        if (poly[i][0] < poly[imin][0]) imin = i;
        if (poly[i][0] > poly[imax][0]) imax = i;
      }
      const walk = (step) => {
        const out = [];
        let i = imin;
        let guard = 0;
        while (guard++ < 64) {
          out.push(poly[i]);
          if (i === imax) break;
          i = (i + step + poly.length) % poly.length;
        }
        return out;
      };
      const a = walk(1), b = walk(-1);
      const avg = (arr) => arr.reduce((s, p) => s + p[1], 0) / Math.max(1, arr.length);
      return avg(a) <= avg(b) ? a : b;
    }

    _drawAnchors(ctx) {
      const P = this.palette;
      const a = this.anchors || [];
      for (const r of a) {
        ctx.save();
        // body
        const g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
        g.addColorStop(0, '#141020');
        g.addColorStop(0.15, '#0a0813');
        g.addColorStop(1, '#050409');
        ctx.fillStyle = g;
        U.roundRect(ctx, r.x, r.y, r.w, r.h, 6);
        ctx.fill();
        // top glow line
        ctx.strokeStyle = `rgba(140,235,255,0.55)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r.x + 8, r.y + 1);
        ctx.lineTo(r.x + r.w - 8, r.y + 1);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(120,200,255,0.10)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(r.x + 8, r.y + 3);
        ctx.lineTo(r.x + r.w - 8, r.y + 3);
        ctx.stroke();
        // runes
        const rnd = U.rng(Math.floor(r.x * 7 + r.y * 13));
        ctx.strokeStyle = 'rgba(120,220,255,0.30)';
        ctx.lineWidth = 1.4;
        const step = 46;
        for (let x = r.x + 26; x < r.x + r.w - 16; x += step) {
          const y = r.y + 18 + rnd() * Math.min(26, r.h - 26);
          ctx.beginPath();
          ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    _drawGoal(ctx) {
      const g = this.level.goal;
      const P = this.palette;
      const t = this.time;
      ctx.save();
      const rg = ctx.createRadialGradient(g.x, g.y, 2, g.x, g.y, 120);
      rg.addColorStop(0, 'rgba(0,0,0,1)');
      rg.addColorStop(0.28, 'rgba(4,3,10,0.98)');
      rg.addColorStop(0.45, `rgba(90,40,70,0.35)`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(g.x, g.y, 120, 0, U.TAU); ctx.fill();

      for (let i = 0; i < 3; i++) {
        const r = 30 + i * 7;
        const a0 = t * (0.6 + i * 0.28) + i;
        ctx.strokeStyle = i % 2 ? `rgba(180,240,255,${0.5 - i * 0.12})` : `rgba(255,190,150,${0.4 - i * 0.1})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(g.x, g.y, r, a0, a0 + 1.6 + i * 0.4);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.95)';
      ctx.beginPath(); ctx.arc(g.x, g.y, 24, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,245,255,0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(g.x, g.y, 24, 0, U.TAU); ctx.stroke();

      // pulling dust
      for (let i = 0; i < 6; i++) {
        const a = t * 1.2 + i * 1.05;
        const rr = 46 + ((t * 34 + i * 17) % 70);
        const x = g.x + Math.cos(a) * rr;
        const y = g.y + Math.sin(a) * rr;
        ctx.fillStyle = `rgba(210,240,255,${0.5 - (rr - 46) / 160})`;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
      ctx.restore();
    }

    _drawGlyph(ctx) {
      const gl = this.level.glyph;
      if (!gl || gl.found) return;
      const P = this.palette;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.2);
      ctx.save();
      ctx.translate(gl.x, gl.y);
      ctx.rotate(Math.sin(this.time * 0.4) * 0.15);
      ctx.strokeStyle = `rgba(255,215,170,${0.18 + pulse * 0.4})`;
      ctx.lineWidth = 1.8;
      const s = 15;
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.8, 0); ctx.closePath();
      ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, s * 0.5);
      ctx.moveTo(-s * 0.45, 0); ctx.lineTo(s * 0.45, 0);
      ctx.stroke();
      ctx.restore();
    }

    _drawDrops(ctx) {
      const P = this.palette;
      for (const d of this.level.drops) {
        if (d.taken) continue;
        const y = d.y + Math.sin(d.bob * 2) * 5;
        const r = 9;
        ctx.save();
        const g = ctx.createRadialGradient(d.x, y, 1, d.x, y, r * 3.2);
        g.addColorStop(0, 'rgba(255,240,210,0.9)');
        g.addColorStop(0.22, 'rgba(255,205,140,0.55)');
        g.addColorStop(1, 'rgba(255,160,90,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(d.x, y, r * 3.2, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,208,1)';
        ctx.beginPath(); ctx.arc(d.x, y, r * 0.62, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,170,0.7)';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(d.x, y, r, 0, U.TAU); ctx.stroke();
        ctx.restore();
      }
    }

    _drawMotes(ctx) {
      const P = this.palette;
      for (const m of this.level.motes) {
        ctx.save();
        ctx.translate(m.x, m.y);
        const dim = m.cool > 0 ? 0.4 : 1;
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, m.r * 4);
        g.addColorStop(0, `rgba(255,230,200,${0.9 * dim})`);
        g.addColorStop(0.2, `rgba(255,120,80,${0.55 * dim})`);
        g.addColorStop(1, 'rgba(255,80,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, m.r * 4, 0, U.TAU); ctx.fill();
        // jagged body
        ctx.beginPath();
        const n = 9;
        for (let i = 0; i < n * 2; i++) {
          const a = (i / (n * 2)) * U.TAU + this.time * 1.2 + m.phase;
          const rr = i % 2 === 0 ? m.r : m.r * 0.62;
          const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(20,8,10,${dim})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,170,120,${0.9 * dim})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = `rgba(255,235,200,${dim})`;
        ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
    }

    _drawPlayer(ctx) {
      const p = this.player;
      const P = this.palette;
      if (this.dead) {
        const k = U.clamp(this.deathT / 0.3, 0, 1);
        ctx.save();
        ctx.globalAlpha = 1 - k;
        this._playerShape(ctx, p, P);
        ctx.restore();
        return;
      }
      if (this.won === 'done') return;
      // ink trail
      const tr = this.trail;
      ctx.save();
      for (let i = 0; i < tr.length; i++) {
        const t = tr[i];
        const a = (i / tr.length) * 0.18;
        if (a <= 0.002) continue;
        ctx.fillStyle = `rgba(6,5,12,${a})`;
        ctx.beginPath();
        ctx.ellipse(t.x - t.f * 4, t.y + 6, 9 * (i / tr.length), 12 * (i / tr.length), 0, 0, U.TAU);
        ctx.fill();
      }
      ctx.restore();
      this._playerShape(ctx, p, P);
    }

    _playerShape(ctx, p, P) {
      const squashY = p.sy, squashX = p.sx;
      ctx.save();
      ctx.translate(p.x, p.y + p.h / 2);
      ctx.scale(p.face * squashX, squashY);
      const moving = Math.abs(p.vx) > 30;
      const bob = p.onGround && moving ? Math.sin(p.anim) * 1.6 : 0;
      ctx.translate(0, -16 + bob);

      // scarf / wisp
      ctx.strokeStyle = 'rgba(10,8,18,0.95)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5, 2);
      const sway = Math.sin(this.time * 6) * 3 - p.vx * 0.02;
      ctx.quadraticCurveTo(-16, 6 + sway, -22 - Math.abs(p.vx) * 0.03, 10 + sway * 1.6);
      ctx.stroke();

      // body: teardrop cloak
      const bg = ctx.createLinearGradient(-10, -16, 10, 14);
      bg.addColorStop(0, '#161226');
      bg.addColorStop(0.45, '#08060f');
      bg.addColorStop(1, '#020205');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.bezierCurveTo(9, -15, 11, -2, 10, 7);
      ctx.quadraticCurveTo(9, 13, 3, 14);
      ctx.lineTo(-4, 14);
      ctx.quadraticCurveTo(-10, 13, -10, 6);
      ctx.bezierCurveTo(-11, -3, -8, -15, 0, -17);
      ctx.closePath();
      ctx.fill();

      // rim light (facing the lantern)
      const L = this.lantern;
      const ang = Math.atan2(L.y - (p.y), L.x - p.x);
      ctx.save();
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(Math.cos(ang) * 14, Math.sin(ang) * 14, 1, 0, 0, 22);
      rg.addColorStop(0, 'rgba(255,205,155,0.22)');
      rg.addColorStop(1, 'rgba(255,180,120,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(-16, -20, 32, 40);
      ctx.restore();
      ctx.strokeStyle = 'rgba(150,225,255,0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // eyes
      const blink = p.blink > 0 && p.blink < 0.16;
      if (!blink) {
        ctx.fillStyle = 'rgba(255,232,190,0.95)';
        ctx.beginPath(); ctx.ellipse(3.2, -4, 1.9, 2.6, 0, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-3.4, -4, 1.7, 2.4, 0, 0, U.TAU); ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,232,190,0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(1.4, -4); ctx.lineTo(5, -4); ctx.moveTo(-5, -4); ctx.lineTo(-1.8, -4); ctx.stroke();
      }
      ctx.restore();

      // little feet
      if (p.onGround) {
        ctx.fillStyle = 'rgba(3,2,6,1)';
        const s = Math.sin(p.anim) * 3;
        ctx.beginPath(); ctx.ellipse(p.x - 5 + s, p.y + p.h / 2 + 1, 4.5, 2.4, 0, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(p.x + 5 - s, p.y + p.h / 2 + 1, 4.5, 2.4, 0, 0, U.TAU); ctx.fill();
      }
    }

    _drawLantern(ctx) {
      const L = this.lantern;
      const P = this.palette;
      const t = this.time;
      ctx.save();

      // light thread to the player
      if (this.player && !this.demo) {
        const p = this.player;
        ctx.strokeStyle = 'rgba(255,215,170,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 12);
        const mx = (p.x + L.x) / 2 + Math.sin(t * 2) * 12;
        const my = (p.y + L.y) / 2 + Math.cos(t * 1.7) * 12;
        ctx.quadraticCurveTo(mx, my, L.x, L.y);
        ctx.stroke();
      }

      // halo
      const g = ctx.createRadialGradient(L.x, L.y, 2, L.x, L.y, 132);
      g.addColorStop(0, 'rgba(255,246,225,0.85)');
      g.addColorStop(0.05, 'rgba(255,220,170,0.62)');
      g.addColorStop(0.18, 'rgba(255,160,90,0.24)');
      g.addColorStop(0.5, 'rgba(255,120,70,0.06)');
      g.addColorStop(1, 'rgba(255,100,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(L.x, L.y, 132, 0, U.TAU); ctx.fill();

      // core
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath(); ctx.arc(L.x, L.y, 5.4, 0, U.TAU); ctx.fill();

      // glass frame
      ctx.strokeStyle = 'rgba(255,225,180,0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(L.x, L.y - 13);
      ctx.lineTo(L.x + 7, L.y);
      ctx.lineTo(L.x, L.y + 13);
      ctx.lineTo(L.x - 7, L.y);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,170,0.25)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(L.x, L.y, 13, 0, U.TAU);
      ctx.stroke();
      ctx.restore();
    }

    _drawParticles(ctx) {
      const P = this.palette;
      for (const q of this.particles) {
        const a = U.clamp(q.life / q.max, 0, 1);
        if (q.kind === 'ink') {
          ctx.fillStyle = `rgba(8,6,14,${a})`;
        } else if (q.kind === 'mote') {
          ctx.fillStyle = `rgba(255,140,90,${a * 0.85})`;
        } else if (q.kind === 'dust') {
          ctx.fillStyle = `rgba(255,235,200,${a * 0.28})`;
        } else {
          ctx.fillStyle = `rgba(255,225,180,${a * 0.9})`;
        }
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (0.4 + a * 0.7), 0, U.TAU);
        ctx.fill();
      }
    }

    _drawCursor(ctx) {
      if (this.demo || !this.pointer.valid || this.paused) return;
      const x = this.pointer.x, y = this.pointer.y;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,235,205,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, U.TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,245,225,0.95)';
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,235,205,0.22)';
      ctx.beginPath();
      ctx.moveTo(x - 15, y); ctx.lineTo(x - 11, y);
      ctx.moveTo(x + 11, y); ctx.lineTo(x + 15, y);
      ctx.moveTo(x, y - 15); ctx.lineTo(x, y - 11);
      ctx.moveTo(x, y + 11); ctx.lineTo(x, y + 15);
      ctx.stroke();
      ctx.restore();
    }

    _drawDebug(ctx) {      ctx.save();
      ctx.strokeStyle = 'rgba(0,255,180,0.5)';
      ctx.lineWidth = 1;
      for (const t of this.tails) {
        ctx.beginPath();
        ctx.moveTo(t.poly[0][0], t.poly[0][1]);
        for (let i = 1; i < t.poly.length; i++) ctx.lineTo(t.poly[i][0], t.poly[i][1]);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,0,0,0.8)';
      ctx.beginPath();
      ctx.moveTo(this.lantern.x - 10, this.lantern.y); ctx.lineTo(this.lantern.x + 10, this.lantern.y);
      ctx.moveTo(this.lantern.x, this.lantern.y - 10); ctx.lineTo(this.lantern.x, this.lantern.y + 10);
      ctx.stroke();
      ctx.restore();
    }

    _drawGlow() {
      const g = this.gctx;
      const gw = this.glow.width, gh = this.glow.height;
      const vw = this.viewW, vh = this.viewH;
      const z = this.cam.zoom;
      const sx = gw / vw, sy = gh / vh;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, gw, gh);
      g.save();
      g.setTransform(sx * z, 0, 0, sy * z, sx * (vw / 2 - this.cam.x * z), sy * (vh / 2 - this.cam.y * z));
      g.globalCompositeOperation = 'lighter';

      // lantern
      const L = this.lantern;
      let rg = g.createRadialGradient(L.x, L.y, 1, L.x, L.y, 150);
      rg.addColorStop(0, 'rgba(255,240,210,0.85)');
      rg.addColorStop(0.25, 'rgba(255,170,100,0.35)');
      rg.addColorStop(1, 'rgba(255,120,60,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(L.x, L.y, 150, 0, U.TAU); g.fill();

      // drops
      for (const d of this.level.drops) {
        if (d.taken) continue;
        const y = d.y + Math.sin(d.bob * 2) * 5;
        rg = g.createRadialGradient(d.x, y, 1, d.x, y, 44);
        rg.addColorStop(0, 'rgba(255,240,205,0.8)');
        rg.addColorStop(0.4, 'rgba(255,190,120,0.22)');
        rg.addColorStop(1, 'rgba(255,160,90,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(d.x, y, 44, 0, U.TAU); g.fill();
      }
      // motes
      for (const m of this.level.motes) {
        rg = g.createRadialGradient(m.x, m.y, 1, m.x, m.y, 60);
        rg.addColorStop(0, 'rgba(255,150,100,0.55)');
        rg.addColorStop(1, 'rgba(255,90,50,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(m.x, m.y, 60, 0, U.TAU); g.fill();
      }
      // player eyes / rim
      if (this.player && !this.demo && !this.dead) {
        rg = g.createRadialGradient(this.player.x, this.player.y - 4, 1, this.player.x, this.player.y - 4, 34);
        rg.addColorStop(0, 'rgba(255,225,180,0.35)');
        rg.addColorStop(1, 'rgba(255,200,150,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(this.player.x, this.player.y - 4, 34, 0, U.TAU); g.fill();
      }
      // shade halo
      g.globalCompositeOperation = 'lighter';
      for (const t of this.tails) {
        g.beginPath();
        g.moveTo(t.poly[0][0], t.poly[0][1]);
        for (let i = 1; i < t.poly.length; i++) g.lineTo(t.poly[i][0], t.poly[i][1]);
        g.closePath();
        g.fillStyle = 'rgba(70,150,220,0.10)';
        g.fill();
        g.strokeStyle = 'rgba(120,210,255,0.22)';
        g.lineWidth = 3.2;
        g.stroke();
      }
      g.restore();

      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.9;
      ctx.drawImage(this.glow, 0, 0, vw, vh);
      ctx.restore();
    }

    _drawPost(ctx, sx, sy) {
      const vw = this.viewW, vh = this.viewH;

      // vignette
      const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.32, vw / 2, vh / 2, Math.max(vw, vh) * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(0.65, 'rgba(0,0,0,0.18)');
      vg.addColorStop(1, 'rgba(0,0,0,0.62)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, vw, vh);

      // grain
      ctx.save();
      ctx.globalAlpha = 0.055;
      ctx.globalCompositeOperation = 'overlay';
      const gx = (Math.random() * 128) | 0, gy = (Math.random() * 128) | 0;
      for (let y = -128; y < vh + 128; y += 128) {
        for (let x = -128; x < vw + 128; x += 128) {
          ctx.drawImage(this.grain, x - gx, y - gy);
        }
      }
      ctx.restore();

      // fade for death / respawn
      if (this.dead) {
        const k = U.clamp(this.deathT / 0.85, 0, 1);
        ctx.fillStyle = `rgba(4,3,8,${k * 0.72})`;
        ctx.fillRect(0, 0, vw, vh);
      }
      if (this.won) {
        const k = U.clamp(this.wonT / 1.6, 0, 1);
        ctx.fillStyle = `rgba(255,246,232,${k * k * 0.9})`;
        ctx.fillRect(0, 0, vw, vh);
      }
    }
  }

  NS.Engine = Engine;
  NS.PAL = PAL;
})(window.Noonfall = window.Noonfall || {});
