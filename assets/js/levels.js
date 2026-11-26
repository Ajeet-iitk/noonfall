/* NOONFALL — level data. One diorama per level, 1280 x 720 design space. */
(function (NS) {
  'use strict';
  const U = NS.Util;

  const stone = (x, y, r) => ({ kind: 'c', x, y, r });
  const slab = (x, y, w, h, rot) => ({ kind: 'r', x, y, w, h, rot: rot || 0 });
  const anchor = (x, y, w, h) => ({ x, y, w, h });

  function ring(cx, cy, r, count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }

  function prepareStone(s) {
    let poly;
    if (s.kind === 'c') {
      const rnd = U.rng(Math.floor(s.x * 13.37 + s.y * 7.13 + s.r * 91));
      const n = 12;
      poly = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd() * 0.18;
        const rr = s.r * (0.84 + rnd() * 0.2);
        poly.push([s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr]);
      }
      s.poly = poly;
      s.bbox = U.bbox(poly);
    } else {
      const rot = s.rot || 0, cs = Math.cos(rot), sn = Math.sin(rot);
      const hw = s.w / 2, hh = s.h / 2;
      const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
      poly = corners.map(([x, y]) => [s.x + x * cs - y * sn, s.y + x * sn + y * cs]);
      s.poly = poly;
      s.bbox = U.bbox(poly);
    }
    s.cx = s.x; s.cy = s.y;
    return s;
  }

  function prepare(level) {
    level.stones = (level.stones || []).map(prepareStone);
    level.anchors = (level.anchors || []).map((a) => ({
      x: a.x, y: a.y, w: a.w, h: a.h,
      seed: Math.random() * 1000
    }));
    level.drops = (level.drops || []).map((d, i) => ({ x: d.x, y: d.y, id: i, taken: false, bob: Math.random() * 6.28 }));
    level.motes = (level.motes || []).map((m, i) => ({
      x: m.x, y: m.y, hx: m.x, hy: m.y, vx: 0, vy: 0,
      r: m.r || 11, id: i, phase: Math.random() * 6.28, cool: 0, size: m.size || 1
    }));
    level.glyph = level.glyph ? { x: level.glyph.x, y: level.glyph.y, found: false, t: 0 } : null;
    level.bounds = level.bounds || { x0: 0, y0: 0, x1: 1280, y1: 720 };
    level.killY = level.killY || 760;
    return level;
  }

  /* ------------------------------------------------------------------ */
  /* levels                                                              */
  /* ------------------------------------------------------------------ */

  const LEVELS = [
    {
      id: 'wake',
      index: 1,
      title: 'Wake',
      sun: { x: 158, y: 528 },
      spawn: { x: 252, y: 524 },
      anchors: [anchor(40, 540, 340, 80), anchor(870, 600, 360, 96)],
      stones: [stone(500, 596, 66)],
      drops: [{ x: 700, y: 500 }],
      motes: [],
      glyph: { x: 500, y: 408 },
      goal: { x: 1064, y: 560 },
      palette: 'dusk'
    },
    {
      id: 'bridge',
      index: 2,
      title: 'Bridge',
      sun: { x: 236, y: 616 },
      spawn: { x: 140, y: 504 },
      anchors: [anchor(36, 520, 232, 120), anchor(628, 434, 158, 46), anchor(1012, 300, 232, 200)],
      stones: [stone(430, 496, 48), stone(846, 392, 42)],
      drops: [{ x: 520, y: 400 }, { x: 900, y: 300 }],
      motes: [],
      glyph: { x: 700, y: 186 },
      goal: { x: 1118, y: 196 },
      palette: 'dusk'
    },
    {
      id: 'ascent',
      index: 3,
      title: 'Ascent',
      sun: { x: 190, y: 646 },
      spawn: { x: 120, y: 596 },
      anchors: [anchor(30, 612, 190, 108), anchor(590, 470, 150, 34), anchor(948, 236, 200, 44), anchor(420, 190, 130, 34)],
      stones: [stone(330, 556, 44), stone(700, 420, 44), stone(850, 320, 38)],
      drops: [{ x: 400, y: 430 }, { x: 640, y: 330 }],
      motes: [],
      glyph: { x: 300, y: 300 },
      goal: { x: 1050, y: 190 },
      palette: 'dusk'
    },
    {
      id: 'glare',
      index: 4,
      title: 'Glare',
      sun: { x: 168, y: 468 },
      spawn: { x: 70, y: 476 },
      anchors: [anchor(34, 492, 200, 90), anchor(560, 470, 120, 30), anchor(1044, 432, 200, 200)],
      stones: [stone(330, 486, 44), stone(760, 470, 44), stone(910, 380, 34)],
      drops: [{ x: 470, y: 420 }, { x: 800, y: 380 }, { x: 980, y: 300 }],
      motes: [{ x: 640, y: 300 }, { x: 900, y: 240 }],
      glyph: { x: 460, y: 260 },
      goal: { x: 1130, y: 268 },
      palette: 'dusk'
    },
    {
      id: 'crossing',
      index: 5,
      title: 'Crossing',
      sun: { x: 300, y: 380 },
      spawn: { x: 120, y: 512 },
      anchors: [
        anchor(30, 528, 200, 120), anchor(520, 588, 110, 30),
        anchor(320, 470, 110, 26), anchor(520, 400, 110, 26),
        anchor(720, 330, 110, 26), anchor(900, 400, 110, 26),
        anchor(1090, 380, 160, 244)
      ],
      stones: [stone(300, 470, 40), stone(690, 470, 46), stone(880, 560, 40)],
      drops: [{ x: 400, y: 380 }, { x: 760, y: 360 }],
      motes: [{ x: 600, y: 240 }],
      glyph: { x: 700, y: 250 },
      goal: { x: 1160, y: 344 },
      palette: 'dusk'
    },
    {
      id: 'noonfall',
      index: 6,
      title: 'Noonfall',
      sun: { x: 250, y: 500 },
      spawn: { x: 110, y: 636 },
      anchors: [
        anchor(24, 652, 190, 68),
        anchor(300, 600, 100, 22), anchor(470, 558, 120, 28),
        anchor(640, 470, 110, 26), anchor(780, 382, 110, 26),
        anchor(920, 294, 110, 26), anchor(1055, 210, 150, 30)
      ],
      stones: [stone(280, 600, 40), stone(400, 470, 36), stone(540, 300, 32), stone(700, 130, 30), stone(900, 300, 34)],
      drops: [{ x: 360, y: 500 }, { x: 640, y: 300 }, { x: 880, y: 150 }],
      motes: [{ x: 430, y: 300 }, { x: 800, y: 420 }, { x: 980, y: 200 }],
      glyph: { x: 980, y: 60 },
      goal: { x: 1130, y: 174 },
      palette: 'dusk'
    },
    {
      id: 'garden',
      index: 7,
      title: 'The Garden of Absences',
      secret: true,
      sun: { x: 220, y: 300 },
      spawn: { x: 130, y: 560 },
      anchors: [
        anchor(40, 576, 180, 112),
        anchor(300, 560, 100, 22), anchor(480, 500, 100, 22),
        anchor(660, 440, 100, 22), anchor(840, 470, 100, 22),
        anchor(1020, 490, 100, 22), anchor(1070, 512, 170, 180)
      ],
      stones: [stone(620, 320, 34), stone(640, 500, 26), stone(500, 420, 26), stone(800, 440, 26)],
      drops: [{ x: 350, y: 500 }, { x: 650, y: 220 }, { x: 950, y: 430 }],
      motes: [],
      glyph: { x: 640, y: 120 },
      goal: { x: 1150, y: 476 },
      palette: 'moon'
    },
    {
      id: 'longdark',
      index: 8,
      title: 'The Long Dark',
      secret: true,
      sun: { x: 1080, y: 300 },
      spawn: { x: 1150, y: 560 },
      anchors: [
        anchor(1060, 576, 190, 112),
        anchor(960, 550, 100, 22), anchor(800, 530, 100, 22),
        anchor(640, 510, 100, 22), anchor(480, 530, 100, 22),
        anchor(320, 550, 100, 22),
        anchor(30, 540, 190, 148)
      ],
      stones: [stone(900, 500, 40), stone(720, 380, 40), stone(520, 480, 36), stone(320, 600, 40)],
      drops: [{ x: 800, y: 300 }, { x: 480, y: 380 }],
      motes: [{ x: 600, y: 240 }, { x: 400, y: 380 }],
      glyph: { x: 200, y: 300 },
      goal: { x: 120, y: 500 },
      palette: 'moon'
    }
  ];

  LEVELS.forEach((l) => {
    l.__prepared = false;
    l.locked = !!l.secret;
  });

  const DEMO = prepare({
    id: 'demo',
    index: 0,
    sun: { x: 300, y: 330 },
    spawn: { x: 620, y: 420 },
    bounds: { x0: 0, y0: 0, x1: 1280, y1: 720 },
    anchors: [anchor(40, 606, 250, 114), anchor(1042, 646, 238, 74)],
    stones: [
      stone(250, 430, 46), stone(422, 560, 30), stone(986, 462, 54),
      stone(1140, 620, 34), stone(700, 246, 26), stone(868, 320, 22)
    ],
    drops: [{ x: 560, y: 300 }, { x: 860, y: 200 }, { x: 1060, y: 380 }],
    motes: [],
    glyph: null,
    goal: { x: 1186, y: 540 },
    killY: 900
  });

  NS.Levels = {
    LEVELS,
    DEMO,
    prepare(level) {
      if (!level.__prepared) { prepare(level); level.__prepared = true; }
      // reset per-run state
      level.drops.forEach((d) => (d.taken = false));
      if (level.glyph) { level.glyph.found = false; level.glyph.t = 0; }
      return level;
    },
    byId(id) { return LEVELS.find((l) => l.id === id); },
    reset() {
      LEVELS.forEach((l) => { l.__prepared = false; });
    }
  };
})(window.Noonfall = window.Noonfall || {});
