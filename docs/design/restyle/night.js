// Theme D «Ночная дека», shared by d-night.html and d-night-mobile.html: the engine's skin,
// the backlight knobs (brightness, tone), the volume fader and the oscilloscope progress line.
// Throwaway demo code, like engine.js. LUM, VOL and C are read by card.js.
const { TAU, fitText } = SF.util;

// set by the console's knobs below: backlight brightness, volume, and the backlight colours
let LUM = 1, VOL = 0.7;
const C = {};

// the sky: seeded dust that turns with the record, like stars round the pole
let seed = 20261111;
const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822519) ^ Math.imul(seed ^ (seed >>> 13), 3266489917)) >>> 0) / 4294967296;
const STARS = Array.from({ length: 620 }, () => {
  const r = 240 + Math.sqrt(rnd()) * 2300, a = rnd() * TAU, m = rnd();
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, m, tw: rnd() * TAU, warm: rnd() < 0.3 };
});

SF.start({
  fonts: ['500 9px "Martian Mono"', '500 16px "Geologica"'],
  flake: { core: '#ffffff', ring: 'rgba(232,238,255,.35)', halo: 'rgba(255,255,255,.55)', glow: 1.25 },
  playerFlake: { mono: '#ffb04a', core: '#ffe9c4', ring: 'rgba(255,176,74,.55)', halo: 'rgba(255,176,74,.7)', centre: '#ffe9c4', glow: 1.6, w: 1.5, minW: 1 },
  styleLed: 'var(--amber)',
  tileR: 36,
  record: {
    fitR: 1085, flakeR: 0.06,
    ring: { stroke: 'rgba(255,196,128,.12)', font: '500 9px "Martian Mono"', chip: 'rgba(8,6,5,.9)', fill: 'rgba(255,200,140,.7)' },
    title: { font: '500 8.5px "Martian Mono"', upper: true, ls: '0.6px', fill: 'rgba(238,220,192,.58)', hi: '#ffe2b0' },
    // a warm lamp under the playing snowflake
    beat(ctx, x, y, R, p) {
      const gr = ctx.createRadialGradient(x, y, R * 0.2, x, y, R * 2.1);
      gr.addColorStop(0, `rgba(${C.g},${Math.min(0.8, (0.16 + 0.26 * p) * LUM)})`); gr.addColorStop(1, `rgba(${C.g},0)`);
      ctx.beginPath(); ctx.arc(x, y, R * 2.1, 0, TAU); ctx.fillStyle = gr; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, R * 1.3, 0, TAU);
      ctx.strokeStyle = `rgba(${C.sheen},${0.18 + 0.5 * p})`; ctx.lineWidth = 1; ctx.stroke();
    },
    disc(ctx, g) {
      const s = g.s;
      // the body: only a darker patch of night, no edge
      const body = ctx.createRadialGradient(0, 0, 0, 0, 0, 1180 * s);
      body.addColorStop(0, 'rgba(0,0,0,.96)'); body.addColorStop(0.7, 'rgba(0,0,0,.85)'); body.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(0, 0, 1180 * s, 0, TAU); ctx.fillStyle = body; ctx.fill();
      // the label's lamp on the inner grooves
      const lamp = ctx.createRadialGradient(0, 0, 150 * s, 0, 0, 640 * s);
      lamp.addColorStop(0, `rgba(${C.g},${Math.min(0.5, 0.2 * LUM)})`); lamp.addColorStop(1, `rgba(${C.g},0)`);
      ctx.beginPath(); ctx.arc(0, 0, 640 * s, 0, TAU); ctx.fillStyle = lamp; ctx.fill();
      // stars
      const c = Math.cos(g.phi), sn = Math.sin(g.phi), hw = g.W, hh = g.H;
      for (const st of STARS) {
        const x = (st.x * c - st.y * sn) * s, y = (st.x * sn + st.y * c) * s;
        if (Math.abs(x) > hw || Math.abs(y) > hh) continue;
        const a = (0.1 + 0.5 * st.m * st.m) * (0.75 + 0.25 * Math.sin(g.t * 0.7 + st.tw));
        ctx.fillStyle = st.warm ? `rgba(255,214,160,${a})` : `rgba(206,224,255,${a})`;
        const z = st.m > 0.9 ? 1.7 : 1.1;
        ctx.fillRect(x - z / 2, y - z / 2, z, z);
      }
      // grooves: lit warm from the console side, cold from the window; they thin out into the dark
      const sh = ctx.createConicGradient(Math.PI - 0.55, 0, 0);
      [[0, '255,236,210', 0.032], [0.085, C.sheen, Math.min(0.7, 0.04 + 0.32 * LUM)], [0.17, '255,236,210', 0.032], [0.52, '255,236,210', 0.032],
        [0.6, '150,190,255', 0.2], [0.68, '255,236,210', 0.032], [1, '255,236,210', 0.032]]
        .forEach(([o, rgb, a]) => sh.addColorStop(o, `rgba(${rgb},${a})`));
      ctx.strokeStyle = sh; ctx.lineWidth = 1;
      for (let r = 214, i = 0; r <= 1150; r += 7.6, i++) {
        const fade = r < 880 ? 1 : Math.max(0, 1 - (r - 880) / 270) ** 1.6;
        ctx.globalAlpha = (0.45 + 0.55 * ((i * 7) % 5) / 4) * fade;
        ctx.beginPath(); ctx.arc(0, 0, r * s, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // the label: a backlit dial
      const L = 186 * s, k = L / 75;
      const run = ctx.createRadialGradient(0, 0, L, 0, 0, 216 * s);
      run.addColorStop(0, 'rgba(3,2,2,1)'); run.addColorStop(1, 'rgba(3,2,2,0)');
      ctx.beginPath(); ctx.arc(0, 0, 216 * s, 0, TAU); ctx.fillStyle = run; ctx.fill();
      const paper = ctx.createRadialGradient(0, 0, 0, 0, 0, L);
      const pl = Math.min(1, 0.25 + 0.6 * LUM);
      paper.addColorStop(0, `rgb(${C.pa.map((v) => v * pl)})`); paper.addColorStop(0.75, `rgb(${C.pa.map((v) => v * pl * 0.5)})`); paper.addColorStop(1, '#0b0501');
      ctx.beginPath(); ctx.arc(0, 0, L, 0, TAU); ctx.fillStyle = paper; ctx.fill();
      ctx.save(); ctx.shadowColor = `rgba(${C.g},.9)`; ctx.shadowBlur = 8 * Math.min(2, k) * LUM;
      ctx.beginPath(); ctx.arc(0, 0, L * 0.9, 0, TAU); ctx.strokeStyle = `rgba(${C.sheen},.55)`; ctx.lineWidth = 1; ctx.stroke();
      ctx.rotate(g.phi); ctx.fillStyle = C.hot; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${1.2 * k}px`;
      fitText(ctx, 'SONGFLAKE', L * 1.36, (z) => `500 ${z}px "Geologica"`, 15 * k);
      ctx.fillText('SONGFLAKE', 0, -L * 0.34);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.fillStyle = `rgba(${C.sheen},.85)`;
      ctx.font = `500 ${Math.max(5.5, 6 * k)}px "Martian Mono"`;
      ctx.fillText(`SIDE A · ${g.Y0} — ${g.Y1}`, 0, L * 0.32);
      ctx.fillText(`${g.n} TRACKS · 33⅓ RPM`, 0, L * 0.54);
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, 7 * k, 0, TAU); ctx.fillStyle = '#020101'; ctx.fill();
    },
  },
});

// the console's knobs: backlight brightness, backlight tone (cold · neutral · warm), volume
(() => {
  const root = document.documentElement, { mix } = SF.util;
  const TONES = [
    { amber: '#8fd0ff', hot: '#e6f5ff', cream: '#dbe6ee', label: '#6d8ba3', off: '#46515b', g: [70, 170, 255], sheen: [130, 200, 255], cr: [219, 230, 238], pa: [12, 44, 86] },
    { amber: '#f1e8d8', hot: '#ffffff', cream: '#ece8e0', label: '#99948a', off: '#55524c', g: [255, 240, 215], sheen: [255, 246, 230], cr: [236, 232, 224], pa: [52, 46, 38] },
    { amber: '#ffb04a', hot: '#ffd9a0', cream: '#eedcc0', label: '#a98a62', off: '#5e5142', g: [255, 150, 50], sheen: [255, 180, 96], cr: [238, 220, 192], pa: [86, 44, 10] },
  ];
  // the knobs remember their last turn in this browser (best effort), so a setting found on one page holds on both
  const store = (id, v) => { try { if (v == null) return localStorage.getItem('sf.night.' + id); localStorage.setItem('sf.night.' + id, v); } catch { return null; } };
  const dial = (el, k0, apply) => {
    if (!el) return apply(k0);
    let k = +(store(el.id) ?? k0), drag = null;
    k0 = k;
    const set = (v) => {
      k = Math.max(0, Math.min(1, v));
      store(el.id, k.toFixed(3));
      el.style.setProperty('--k', k.toFixed(3)); el.setAttribute('aria-valuenow', Math.round(k * 100));
      apply(k);
    };
    el.addEventListener('pointerdown', (e) => { drag = { y: e.clientY, x: e.clientX, k }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => { if (drag) set(drag.k + ((drag.y - e.clientY) + (e.clientX - drag.x)) / 140); });
    el.addEventListener('pointerup', () => (drag = null));
    el.addEventListener('wheel', (e) => { e.preventDefault(); set(k - Math.sign(e.deltaY) * 0.05); }, { passive: false });
    el.addEventListener('keydown', (e) => {
      const d = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05 }[e.key];
      if (d) { e.preventDefault(); set(k + d); } else if (e.key === 'Home') set(0); else if (e.key === 'End') set(1);
    });
    set(k0);
  };
  dial(document.getElementById('dial'), 0.5, (k) => {
    LUM = 0.12 + k * 1.76; root.style.setProperty('--lum', LUM.toFixed(3));
  });
  dial(document.getElementById('tone'), 0.9, (w) => {
    const [a, b, t] = w < 0.5 ? [TONES[0], TONES[1], w * 2] : [TONES[1], TONES[2], w * 2 - 1];
    for (const key in a) {
      C[key] = Array.isArray(a[key]) ? a[key].map((v, i) => Math.round(v + (b[key][i] - v) * t)) : mix(a[key], b[key], t);
      if (!Array.isArray(a[key])) root.style.setProperty('--' + key, C[key]);
    }
    root.style.setProperty('--g', C.g.join(' '));
    root.style.setProperty('--p', C.pa.map((v) => Math.round(v * 0.6)).join(' '));
    const T = SF.theme(), R = T.record;
    R.ring.stroke = `rgba(${C.sheen},.12)`; R.ring.fill = `rgba(${C.sheen},.72)`;
    R.title.fill = `rgba(${C.cr},.58)`; R.title.hi = C.hot;
    Object.assign(T.playerFlake, { mono: C.amber, core: C.hot, centre: C.hot, ring: `rgba(${C.sheen},.55)`, halo: `rgba(${C.sheen},.7)` });
    SF.refresh();
  });
  // playback is simulated, so the fader only drives the trace's swing
  const vol = document.getElementById('vol');
  vol?.addEventListener('input', () => { VOL = vol.value / 100; vol.parentElement.style.setProperty('--hi', VOL); });
})();

// the progress line is an oscilloscope trace: alive up to the playhead, flat after it
(() => {
  const cv = document.getElementById('scope'), host = cv.parentElement, ctx = cv.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let amp = 0;
  const frame = (now) => {
    const W = host.clientWidth, H = host.clientHeight, d = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== W * d) { cv.width = W * d; cv.height = H * d; }
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    const t = still ? 0 : now / 1000, mid = H / 2 + 1;
    const at = parseFloat(host.style.getPropertyValue('--at')) || 0;
    const loaded = document.body.hasAttribute('data-loaded');
    amp += ((document.body.hasAttribute('data-playing') ? 1 : loaded ? 0.28 : 0) - amp) * 0.08;
    // graticule
    ctx.fillStyle = `rgba(${C.sheen},.16)`;
    for (let x = 0; x <= W; x += W / 20) for (let y = 3; y < H; y += 8) ctx.fillRect(Math.round(x), y, 1, 1);
    for (let x = 0; x <= W; x += W / 100) ctx.fillRect(Math.round(x), mid - 1, 1, 3);
    const X = at * W;
    ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${C.sheen},.38)`;
    ctx.beginPath(); ctx.moveTo(X, mid); ctx.lineTo(W, mid); ctx.stroke();
    ctx.save(); ctx.shadowColor = `rgba(${C.g},.95)`; ctx.shadowBlur = 7 * LUM; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.hot; ctx.lineWidth = 1.5; ctx.beginPath();
    let y = mid;
    for (let x = 0; x <= X; x += 1.5) {
      const env = Math.min(1, x / 14) * (0.55 + 0.45 * Math.sin(x * 0.021 - t * 1.1));
      y = mid + amp * (0.2 + 0.8 * VOL) * env * (H * 0.4) * (Math.sin(x * 0.19 + t * 7) * 0.6 + Math.sin(x * 0.077 - t * 3.2) * 0.4);
      ctx[x ? 'lineTo' : 'moveTo'](x, y);
    }
    ctx.stroke();
    if (loaded) { ctx.beginPath(); ctx.arc(X, X > 1 ? y : mid, 2.6, 0, TAU); ctx.fillStyle = '#fff3dc'; ctx.shadowBlur = 12; ctx.fill(); }
    ctx.restore();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
