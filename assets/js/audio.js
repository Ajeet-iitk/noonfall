/* NOONFALL — procedural audio. No samples, everything synthesised. */
(function (NS) {
  'use strict';
  const U = NS.Util;

  class Audio {
    constructor() {
      this.ctx = null;
      this.ready = false;
      this.master = null;
      this.musicBus = null;
      this.sfxBus = null;
      this.reverb = null;
      this.wind = null;
      this.enabled = true;
      this.musicOn = true;
      this.musicVol = 0.5;
      this.sfxVol = 0.7;
      this.step = 0;
      this.nextTime = 0;
      this.beatDur = 4.0;
      this.chordIndex = 0;
      this.melodyTimer = 0;
      this.tension = 0;
      this.seed = Math.random() * 1000;
    }

    init() {
      if (this.ready) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());
      this.ready = true;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 22;
      comp.ratio.value = 3;
      comp.attack.value = 0.01;
      comp.release.value = 0.28;

      this.master = ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(comp);
      comp.connect(ctx.destination);

      // reverb
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this._impulse(3.4, 2.6);
      const revGain = ctx.createGain();
      revGain.gain.value = 0.42;
      this.reverb.connect(revGain);
      revGain.connect(this.master);

      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicFilter = ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 1400;
      this.musicBus.connect(this.musicFilter);
      this.musicFilter.connect(this.master);
      const musicSend = ctx.createGain();
      musicSend.gain.value = 0.5;
      this.musicFilter.connect(musicSend);
      musicSend.connect(this.reverb);

      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = this.sfxVol;
      this.sfxBus.connect(this.master);
      const sfxSend = ctx.createGain();
      sfxSend.gain.value = 0.28;
      this.sfxBus.connect(sfxSend);
      sfxSend.connect(this.reverb);

      this._startWind();
      this.nextTime = ctx.currentTime + 0.3;
      this.startMusic();
    }

    _impulse(seconds, decay) {
      const ctx = this.ctx;
      const rate = ctx.sampleRate;
      const len = Math.floor(rate * seconds);
      const buf = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (1 - t * 0.2);
        }
      }
      return buf;
    }

    _noiseBuffer(seconds) {
      const ctx = this.ctx;
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }

    _startWind() {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this._noiseBuffer(5);
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 420;
      f.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.value = 0.028;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.055;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain);
      lfoGain.connect(f.frequency);
      lfo.start();
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start();
      this.wind = g;
    }

    resume() {
      if (!this.ready) this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    setMuted(m) {
      this.enabled = !m;
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.15);
    }

    setMusic(on) {
      this.musicOn = on;
      if (!this.ready) return;
      this.musicBus.gain.setTargetAtTime(on ? 0.3 * this.musicVol : 0, this.ctx.currentTime, 0.6);
    }

    setMusicVolume(v) {
      this.musicVol = v;
      if (this.ready && this.musicOn) this.musicBus.gain.setTargetAtTime(0.3 * v, this.ctx.currentTime, 0.2);
    }

    setSfxVolume(v) {
      this.sfxVol = v;
      if (this.ready) this.sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
    }

    setTension(v) {
      this.tension = v;
      if (!this.ready) return;
      const f = 900 + v * 3200;
      this.musicFilter.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.5);
    }

    startMusic() {
      if (!this.ready) return;
      this.musicOn = true;
      this.musicBus.gain.setTargetAtTime(0.3 * this.musicVol, this.ctx.currentTime, 2.0);
    }

    stopMusic() {
      if (!this.ready) return;
      this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.8);
    }

    /* ---------------------------------------------------------------- */
    /* voices                                                            */
    /* ---------------------------------------------------------------- */

    _tone(o) {
      const ctx = this.ctx;
      const t = ctx.currentTime + (o.delay || 0);
      const osc = ctx.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.freq, t);
      if (o.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.glide), t + o.dur);
      if (o.detune) osc.detune.value = o.detune;
      const g = ctx.createGain();
      const peak = o.gain === undefined ? 0.2 : o.gain;
      const atk = o.attack === undefined ? 0.005 : o.attack;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      let node = osc;
      if (o.filter) {
        const f = ctx.createBiquadFilter();
        f.type = o.filter.type || 'lowpass';
        f.frequency.setValueAtTime(o.filter.freq, t);
        if (o.filter.to) f.frequency.exponentialRampToValueAtTime(o.filter.to, t + o.dur);
        f.Q.value = o.filter.q || 0.8;
        node.connect(f);
        node = f;
      }
      node.connect(g);
      const send = ctx.createGain();
      send.gain.value = o.send === undefined ? 0.3 : o.send;
      g.connect(send);
      send.connect(this.reverb);
      g.connect(this.sfxBus);
      osc.start(t);
      osc.stop(t + o.dur + 0.05);
    }

    _noise(o) {
      const ctx = this.ctx;
      const t = ctx.currentTime + (o.delay || 0);
      const src = ctx.createBufferSource();
      src.buffer = this._noiseBuffer(o.dur + 0.2);
      const f = ctx.createBiquadFilter();
      f.type = o.type || 'bandpass';
      f.frequency.setValueAtTime(o.freq || 800, t);
      if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
      f.Q.value = o.q || 1.1;
      const g = ctx.createGain();
      const peak = o.gain === undefined ? 0.2 : o.gain;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + (o.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      const send = ctx.createGain();
      send.gain.value = o.send === undefined ? 0.35 : o.send;
      src.connect(f); f.connect(g); g.connect(send); send.connect(this.reverb);
      g.connect(this.sfxBus);
      src.start(t);
      src.stop(t + o.dur + 0.1);
    }

    /* ---------------------------------------------------------------- */
    /* game sounds                                                       */
    /* ---------------------------------------------------------------- */

    sfx(name, arg) {
      if (!this.ready || !this.enabled) return;
      switch (name) {
        case 'jump':
          this._tone({ type: 'triangle', freq: 320, glide: 480, dur: 0.16, gain: 0.1, attack: 0.005, send: 0.2 });
          this._noise({ freq: 900, to: 2400, dur: 0.09, gain: 0.03, q: 1.4 });
          break;
        case 'jump2':
          this._tone({ type: 'sine', freq: 520, glide: 760, dur: 0.18, gain: 0.08, send: 0.3 });
          break;
        case 'land':
          this._tone({ type: 'sine', freq: 150, glide: 62, dur: 0.22, gain: 0.16, attack: 0.002, send: 0.12 });
          this._noise({ type: 'lowpass', freq: 700, to: 180, dur: 0.14, gain: 0.06, q: 0.7 });
          break;
        case 'step':
          this._noise({ type: 'lowpass', freq: 420, to: 220, dur: 0.06, gain: 0.022, q: 0.8, send: 0.05 });
          break;
        case 'drop': {
          const base = arg && arg.pitch ? arg.pitch : 880;
          [1, 1.5, 2.0].forEach((m, i) => {
            this._tone({ type: 'sine', freq: base * m, dur: 1.1 + i * 0.3, gain: 0.12 / (i + 1), attack: 0.004, send: 0.7, delay: i * 0.05 });
          });
          break;
        }
        case 'glyph':
          [392, 466.16, 587.33, 783.99].forEach((f, i) => {
            this._tone({ type: 'triangle', freq: f, dur: 2.4, gain: 0.07, attack: i === 0 ? 0.02 : 0.12 + i * 0.06, send: 0.9, delay: i * 0.09 });
          });
          break;
        case 'death':
          this._tone({ type: 'sine', freq: 220, glide: 40, dur: 0.9, gain: 0.2, attack: 0.003, send: 0.5 });
          this._noise({ freq: 1600, to: 120, dur: 0.7, gain: 0.14, q: 0.9, send: 0.6 });
          this._tone({ type: 'sawtooth', freq: 110, glide: 30, dur: 1.2, gain: 0.05, filter: { freq: 800, to: 120 }, send: 0.4 });
          break;
        case 'win':
          [293.66, 349.23, 440, 587.33, 698.46].forEach((f, i) => {
            this._tone({ type: 'triangle', freq: f, dur: 3.2, gain: 0.085, attack: 0.05 + i * 0.14, send: 0.8, delay: i * 0.11 });
          });
          this._tone({ type: 'sine', freq: 73, dur: 4, gain: 0.18, attack: 0.3, send: 0.5 });
          break;
        case 'ui':
          this._tone({ type: 'sine', freq: arg || 660, dur: 0.16, gain: 0.06, send: 0.4 });
          break;
        case 'uiLow':
          this._tone({ type: 'sine', freq: 330, dur: 0.22, gain: 0.07, send: 0.4 });
          break;
        case 'unlock':
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            this._tone({ type: 'triangle', freq: f, dur: 1.6, gain: 0.09, attack: 0.01, send: 0.8, delay: i * 0.07 });
          });
          break;
        case 'whisper':
          this._noise({ type: 'bandpass', freq: 2400, to: 700, dur: 0.5, gain: 0.05, q: 2.2, send: 0.8 });
          break;
        case 'mote':
          this._tone({ type: 'sawtooth', freq: 700, glide: 300, dur: 0.3, gain: 0.04, filter: { freq: 2000, to: 400 }, send: 0.5 });
          break;
        case 'well':
          this._tone({ type: 'sine', freq: 55, dur: 5.5, gain: 0.22, attack: 1.2, send: 0.6 });
          this._tone({ type: 'triangle', freq: 110, dur: 4.5, gain: 0.06, attack: 1.6, send: 0.9 });
          break;
        case 'secret':
          this._tone({ type: 'sine', freq: 1046.5, dur: 2.6, gain: 0.07, attack: 0.02, send: 0.95 });
          this._tone({ type: 'sine', freq: 1568, dur: 2.0, gain: 0.04, attack: 0.4, send: 0.95, delay: 0.12 });
          break;
      }
    }

    /* ---------------------------------------------------------------- */
    /* ambient score                                                     */
    /* ---------------------------------------------------------------- */

    update(dt, opts) {
      if (!this.ready || !this.musicOn || !this.enabled) return;
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;

      // scheduling with a small lookahead
      const horizon = ctx.currentTime + 0.6;
      let guard = 0;
      while (this.nextTime < horizon && guard++ < 16) {
        this._scheduleBeat(this.nextTime, opts || {});
        this.nextTime += this.beatDur;
      }
    }

    _scheduleBeat(t, opts) {
      const chords = [
        { root: 73.42, notes: [146.83, 174.61, 220.0, 261.63] },      // Dm add9
        { root: 58.27, notes: [116.54, 146.83, 174.61, 220.0] },      // Bb maj7
        { root: 87.31, notes: [174.61, 220.0, 261.63, 329.63] },      // F
        { root: 65.41, notes: [130.81, 164.81, 196.0, 246.94] }       // C
      ];
      this.beatDur = 4.0;
      if (this.step % 1 === 0) {
        // pad
        const c = chords[Math.floor(this.step) % chords.length];
        c.notes.forEach((f, i) => {
          this._pad(f, t + i * 0.09, 4.6, 0.05 - i * 0.006);
        });
        this._bass(c.root, t, 5.0);
      }

      // sparse bells, seeded but wandering
      this.melodyTimer -= 1;
      if (Math.random() < 0.55) {
        const scale = [587.33, 698.46, 783.99, 880.0, 1046.5, 1174.66];
        const f = scale[(Math.random() * scale.length) | 0];
        const d = t + Math.random() * 2.4;
        this._bell(f, d, 0.035 + Math.random() * 0.02);
      }
      this.step++;
    }

    _pad(freq, t, dur, gain) {
      const ctx = this.ctx;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + 1.6);
      g.gain.linearRampToValueAtTime(gain * 0.65, t + dur * 0.55);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(700, t);
      f.frequency.linearRampToValueAtTime(1500, t + 1.8);
      f.frequency.linearRampToValueAtTime(600, t + dur);
      f.Q.value = 0.4;
      const send = ctx.createGain();
      send.gain.value = 0.55;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) pan.pan.value = (Math.random() * 2 - 1) * 0.5;
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator();
        o.type = i === 0 ? 'triangle' : 'sine';
        o.frequency.value = freq;
        o.detune.value = (i - 1) * 6 + (Math.random() * 4 - 2);
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.1);
      }
      f.connect(g);
      if (pan) { g.connect(pan); pan.connect(this.musicBus); }
      else g.connect(this.musicBus);
      g.connect(send);
      send.connect(this.reverb);
    }

    _bass(freq, t, dur) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.1, t + 0.9);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.musicBus);
      const send = ctx.createGain();
      send.gain.value = 0.18;
      g.connect(send); send.connect(this.reverb);
      o.start(t); o.stop(t + dur + 0.1);
    }

    _bell(freq, t, gain) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const mod = ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.value = freq * 2.01;
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(freq * 1.4, t);
      mg.gain.exponentialRampToValueAtTime(1, t + 2);
      mod.connect(mg); mg.connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
      o.connect(g);
      g.connect(this.musicBus);
      const send = ctx.createGain();
      send.gain.value = 0.8;
      g.connect(send); send.connect(this.reverb);
      o.start(t); o.stop(t + 3.6);
      mod.start(t); mod.stop(t + 3.6);
    }
  }

  NS.Audio = Audio;
})(window.Noonfall = window.Noonfall || {});
