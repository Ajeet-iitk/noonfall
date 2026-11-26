/* NOONFALL — boot + main loop */
(function (NS) {
  'use strict';

  function boot() {
    const canvas = document.getElementById('stage');
    const audio = new NS.Audio();
    const engine = new NS.Engine(canvas, audio);

    NS.UI.init(engine, audio);

    // first gesture unlocks audio
    const wake = () => {
      audio.init();
      audio.resume();
      audio.setMuted(NS.UI.save.muted);
      audio.setMusic(NS.UI.save.music !== false);
      audio.setMusicVolume(NS.UI.save.musicVol == null ? 0.5 : NS.UI.save.musicVol);
    };
    window.addEventListener('pointerdown', wake, { once: true });
    window.addEventListener('keydown', wake, { once: true });

    let last = performance.now();
    function frame(t) {
      const dt = Math.min(0.05, Math.max(0.0001, (t - last) / 1000));
      last = t;
      engine.update(dt);
      engine.render();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    window.addEventListener('load', () => engine.resize());
    new ResizeObserver(() => engine.resize()).observe(document.getElementById('stage-wrap'));

    // expose for tinkerers — part of the game, really
    window.NOONFALL = {
      engine, audio, ui: NS.UI,
      version: '1.0.0',
      wink: function () {
        NS.UI.toast('you looked inside.');
        NS.UI.secret('console');
        return 'the dark says hello';
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.Noonfall = window.Noonfall || {});
