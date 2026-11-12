// Shared demo engine for the three restyle mockups. Throwaway code: it only exists so the
// three skins show the same page with the same data. Playback is a timer, there is no sound.
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const GA = Math.PI * (3 - Math.sqrt(5));
  const $ = (k, r = document) => r.querySelector(`[data-sf="${k}"]`);
  const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgba = (h, a) => `rgba(${hx(h).join(',')},${a})`;
  const mix = (a, b, t) => {
    const A = hx(a), B = hx(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  const hash = (s) => {
    let h = 2166136261;
    for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296;
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- data (copied from songs/*/index.md and content/taxonomy.yaml for the demo) ----
  const ACC = {
    Guitar: { ru: 'Гитара', c: '#ff9100' }, Vox: { ru: 'Вокал', c: '#00e5ff' },
    Keys: { ru: 'Клавишные', c: '#d500f9' }, Drums: { ru: 'Барабаны', c: '#ff1744' },
    Bass: { ru: 'Бас', c: '#00e676' }, Flute: { ru: 'Флейта', c: '#ffee58' },
    Electric: { ru: 'Электроника', c: '#2979ff' },
  };
  const STYLES = ['Alternative', 'Progressive', 'Electronic', 'Ambient'];
  const AXES = ['Ритм', 'Мелодия', 'Техника', 'Инструменты', 'Структура'];
  // slug, title, style, accents, [rhythm, melody, technique, instruments, structure], year (ready, else the latest)
  const RAW = [
    ['besame', "bésame", 'Alternative', ['Guitar', 'Vox'], [2, 2, 2, 2, 1], 2018],
    ['cornered', "cornered", 'Electronic', ['Keys', 'Drums'], [3, 2, 2, 3, 2], 2026],
    ['crazy-king', "crazy king", 'Progressive', ['Guitar', 'Drums'], [3, 3, 2, 2, 3], 2020],
    ['dd', "dd", 'Progressive', ['Guitar'], [3, 3, 3, 1, 3], 2024],
    ['frogs-dancing', "frog's dancing", 'Ambient', ['Keys'], [1, 2, 1, 1, 1], 2012],
    ['grannysong', "grannysong", 'Progressive', ['Guitar'], [2, 2, 2, 3, 2], 2026],
    ['grustno', "grustno", 'Ambient', ['Vox', 'Keys'], [2, 1, 1, 2, 2], 2024],
    ['immortal', "immortal", 'Ambient', ['Keys'], [1, 2, 1, 2, 2], 2026],
    ['lady', "lady", 'Alternative', ['Guitar', 'Vox', 'Keys'], [2, 2, 2, 2, 2], 2020],
    ['okansong', "okansong", 'Electronic', ['Electric'], [2, 1, 1, 2, 2], 2024],
    ['part-of-your-life', "part of your life", 'Alternative', ['Guitar'], [1, 1, 1, 1, 1], 2012],
    ['red-alarm', "red Alarm", 'Progressive', ['Guitar'], [1, 2, 3, 2, 2], 2015],
    ['river-mirror', "river mirror", 'Progressive', ['Guitar', 'Drums'], [3, 3, 2, 2, 3], 2021],
    ['roll-across-the-sphere', "roll across the sphere", 'Ambient', ['Keys'], [1, 2, 1, 2, 2], 2018],
    ['shine', "shine", 'Alternative', ['Guitar', 'Vox'], [2, 3, 2, 2, 2], 2016],
    ['velotrack', "velotrack", 'Progressive', ['Guitar', 'Bass'], [1, 2, 2, 2, 2], 2025],
  ];
  const SONGS = RAW.map(([slug, title, style, acc, cx, year]) => ({
    slug, title, style, acc, cx, year,
    total: cx.reduce((a, b) => a + b, 0),
    dur: 150 + Math.floor(hash(slug) * 140),
  }));
  const chrono = [...SONGS].sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
  chrono.forEach((s, i) => (s.num = i + 1));
  const ORDER = [...SONGS].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  const Y0 = chrono[0].year, Y1 = chrono[chrono.length - 1].year;
  const rOf = (y) => 300 + ((y - Y0) / (Y1 - Y0)) * 700;
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  // ---- snowflake (CLAUDE.md §5.1–5.2), with a style object so each skin can ink it its own way ----
  let fsSeq = 0;
  const fsIds = new WeakMap();
  const fsId = (fs) => fsIds.get(fs) || (fsIds.set(fs, ++fsSeq), fsSeq);
  const colourOf = (fs, k) => fs.mono || (fs.palette && fs.palette[k]) || ACC[k].c;

  function drawFlake(ctx, s, R, fs) {
    const [rh, me, te, ins, st] = s.cx;
    const rays = st * 2 + 2;
    const rayLen = [0.82, 0.58, 0.47][rh - 1];
    const amp = [0, 0.035, 0.06][me - 1] * R;
    const per = [0, 1.5, 2.5][me - 1];
    const w = Math.max(fs.minW ?? 0.6, 0.021 * R * (fs.w ?? 1));
    const tip = Math.max(0.7, w * 1.25);
    const core = fs.core || '#ffffff';
    const [sa, sb] = fs.stops || [0.3, 0.72];
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = w;
    ctx.shadowBlur = fs.glow ? Math.min(6, Math.max(1, 0.06 * R)) * fs.glow : 0;
    const stroke = (p, g) => { ctx.strokeStyle = p; ctx.shadowColor = g; ctx.stroke(); };
    const dot = (x, y, r, p, g) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = p; ctx.shadowColor = g; ctx.fill();
    };
    const seg = (x1, y1, x2, y2, p, g) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); stroke(p, g); };
    for (let k = 1; k <= ins; k++) {
      const r = (R * 0.72 * k) / (ins + 0.5);
      ctx.beginPath();
      for (let i = 0; i <= rays; i++) {
        const a = (i / rays) * TAU - Math.PI / 2;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); stroke(fs.ring, fs.ring);
    }
    const lead = colourOf(fs, s.acc[0]);
    const grads = {};
    const grad = (c) => {
      if (!grads[c]) {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
        g.addColorStop(0, mix(lead, core, 0.88));
        g.addColorStop(sa, mix(c, core, fs.fade ?? 0.45));
        g.addColorStop(sb, c); g.addColorStop(1, c);
        grads[c] = g;
      }
      return grads[c];
    };
    const N = 36, base = R * rayLen, start = R * 0.05;
    const pts = Array.from({ length: N + 1 }, (_, n) => {
      const t = n / N;
      return [start + t * (base - start), amp * Math.sin(TAU * per * t) * Math.sqrt(t)];
    });
    const tan = (n) => {
      const a = pts[Math.max(0, n - 1)], b = pts[Math.min(N, n + 1)];
      return Math.atan2(b[1] - a[1], b[0] - a[0]);
    };
    for (let i = 0; i < rays; i++) {
      const c = colourOf(fs, s.acc[i % s.acc.length]);
      const p = grad(c);
      ctx.save();
      ctx.rotate((i / rays) * TAU - Math.PI / 2);
      ctx.beginPath();
      pts.forEach(([x, y], n) => ctx[n ? 'lineTo' : 'moveTo'](x, y));
      stroke(p, c);
      if (te > 1) {
        const [mx, my] = pts[N / 2], ta = tan(N / 2), len = base * 0.46;
        for (const side of [-1, 1]) {
          const a = ta + side * 0.78, ex = mx + Math.cos(a) * len, ey = my + Math.sin(a) * len;
          seg(mx, my, ex, ey, p, c); dot(ex, ey, tip, p, c);
          if (te === 3) {
            const fx = mx + Math.cos(a) * len * 0.55, fy = my + Math.sin(a) * len * 0.55, a2 = a + side * 0.8;
            const gx = fx + Math.cos(a2) * len * 0.5, gy = fy + Math.sin(a2) * len * 0.5;
            seg(fx, fy, gx, gy, p, c); dot(gx, gy, tip, p, c);
          }
        }
      }
      const fork = (x, y, ang, len, depth) => {
        if (depth <= 0) return dot(x, y, tip * 1.1, p, c);
        for (const side of [-1, 1]) {
          const b = ang + side * 0.55, ex = x + Math.cos(b) * len, ey = y + Math.sin(b) * len;
          seg(x, y, ex, ey, p, c); fork(ex, ey, b, len * 0.62, depth - 1);
        }
      };
      fork(pts[N][0], pts[N][1], tan(N), base * 0.6, rh - 1);
      ctx.restore();
    }
    dot(0, 0, Math.max(1.4, 0.045 * R), fs.centre || '#ffffff', fs.centre || '#ffffff');
    ctx.restore();
  }

  const dprNow = () => Math.min(2, window.devicePixelRatio || 1);
  function paintStatic(cv, s, R, fs) {
    const d = dprNow(), size = Math.ceil(R * 2.7 + 16);
    cv.width = cv.height = size * d;
    cv.style.width = cv.style.height = size + 'px';
    const c = cv.getContext('2d');
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, size, size);
    if (!s) return;
    c.translate(size / 2, size / 2);
    drawFlake(c, s, R, fs);
  }
  const sprites = new Map();
  function sprite(s, R, fs) {
    const r = Math.max(8, Math.round(R / 4) * 4), k = `${s.slug}|${r}|${fsId(fs)}`;
    let sp = sprites.get(k);
    if (!sp) {
      const half = r * 1.3 + 12, cv = document.createElement('canvas'), d = dprNow();
      cv.width = cv.height = Math.ceil(half * 2 * d);
      const c = cv.getContext('2d');
      c.setTransform(d, 0, 0, d, 0, 0); c.translate(half, half);
      drawFlake(c, s, r, fs);
      sp = { cv, R: r, half };
      sprites.set(k, sp);
    }
    return sp;
  }

  // ---- canvas text helpers for the skins ----
  function arcText(ctx, text, r, a0, font, fill, gap = 0) {
    ctx.save(); ctx.font = font; ctx.fillStyle = fill; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let a = a0;
    for (const ch of text) {
      const wd = ctx.measureText(ch).width + gap, da = wd / r;
      ctx.save(); ctx.rotate(a + da / 2); ctx.fillText(ch, 0, -r); ctx.restore();
      a += da;
    }
    ctx.restore();
    return a - a0;
  }
  function fitText(ctx, text, maxW, font, size) {
    ctx.font = font(size);
    const wd = ctx.measureText(text).width;
    const sz = wd > maxW ? (size * maxW) / wd : size;
    ctx.font = font(sz);
    return sz;
  }

  // ---- state ----
  const F = { styles: new Set(STYLES), acc: new Set(Object.keys(ACC)), cmin: 5, cmax: 15, from: Y0, to: Y1 };
  const matches = (s) => F.styles.has(s.style) && s.acc.some((a) => F.acc.has(a))
    && s.total >= F.cmin && s.total <= F.cmax && s.year >= F.from && s.year <= F.to;
  const P = { cur: null, playing: false, pos: 0, hist: [], mode: 'shuffle' };
  let T = null;
  const listeners = [];
  const changed = () => listeners.forEach((f) => f());

  // ---- record ----
  function layout() {
    const items = chrono.map((s, k) => {
      const a = -Math.PI / 2 + k * GA, r = rOf(s.year);
      return { s, r, x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
    const D = 150;
    for (let it = 0; it < 160; it++) {
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const A = items[i], B = items[j];
        let dx = B.x - A.x, dy = B.y - A.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d >= D) continue;
        const p = ((D - d) / 2) * 0.5; dx /= d; dy /= d;
        A.x -= dx * p; A.y -= dy * p; B.x += dx * p; B.y += dy * p;
      }
      for (const o of items) { const d = Math.hypot(o.x, o.y); o.x *= o.r / d; o.y *= o.r / d; }
    }
    return items;
  }

  function tipHTML(s) {
    return `<b class="tt">${s.title}</b><span class="tm">${s.style} · ${s.year}</span>
      <div class="tax">${AXES.map((n, i) => `<div><span>${n}</span>${[1, 2, 3].map((v) => `<i class="${v <= s.cx[i] ? 'on' : ''}"></i>`).join('')}</div>`).join('')}</div>
      <div class="tacc">${s.acc.map((a) => `<span><i class="led" style="--led:${colourOf(T.flake, a)}"></i>${ACC[a].ru}</span>`).join('')}</div>`;
  }

  function mountRecord(stage) {
    const R = T.record, fs = T.flake;
    const cv = document.createElement('canvas'), tip = document.createElement('div');
    tip.className = 'tip'; tip.hidden = true;
    stage.append(cv, tip);
    cv.setAttribute('aria-label', 'Карта треков в виде пластинки: расстояние от центра — год.');
    const ctx = cv.getContext('2d');
    const LAY = layout();
    let W = 0, H = 0, dpr = 1, zoom = 1, pan = [0, 0], phi = 0, hover = null, drag = null, pts = [];
    const fitOf = () => (Math.min(W, H) / 2 - 16) / (R.fitR || 1070);
    new ResizeObserver(() => {
      const b = stage.getBoundingClientRect();
      W = b.width; H = b.height; dpr = dprNow();
      cv.width = W * dpr; cv.height = H * dpr;
    }).observe(stage);

    const local = (e) => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [x, y] = local(e), px = x - W / 2, py = y - H / 2;
      const z = Math.min(8, Math.max(1, zoom * Math.exp(-e.deltaY * 0.0015)));
      const m = fitOf() * 1070 * (z - 1);
      pan = [px - ((px - pan[0]) * z) / zoom, py - ((py - pan[1]) * z) / zoom].map((v) => Math.max(-m, Math.min(m, v)));
      zoom = z;
    }, { passive: false });
    const angleAt = (x, y) => Math.atan2(y - H / 2 - pan[1], x - W / 2 - pan[0]);
    cv.addEventListener('pointerdown', (e) => {
      const [x, y] = local(e);
      // a touch has no hover before it: find the snowflake under the finger, so a tap opens it
      if (e.pointerType !== 'mouse') hover = (pts.find((p) => Math.hypot(p.x - x, p.y - y) < p.r) || {}).s || null;
      drag = { a: angleAt(x, y), x, y, moved: false };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      const [x, y] = local(e);
      if (drag) {
        if (Math.hypot(x - drag.x, y - drag.y) > 4) drag.moved = true;
        if (drag.moved) { const a = angleAt(x, y); phi += a - drag.a; drag.a = a; tip.hidden = true; }
        return;
      }
      hover = (pts.find((p) => Math.hypot(p.x - x, p.y - y) < p.r) || {}).s || null;
      cv.style.cursor = hover ? 'pointer' : 'grab';
      tip.hidden = !hover;
      if (hover) {
        if (tip.dataset.slug !== hover.slug) { tip.innerHTML = tipHTML(hover); tip.dataset.slug = hover.slug; }
        tip.style.left = Math.min(x + 18, W - tip.offsetWidth - 8) + 'px';
        tip.style.top = Math.min(y + 18, H - tip.offsetHeight - 8) + 'px';
      }
    });
    cv.addEventListener('pointerup', () => {
      if (drag && !drag.moved && hover) (T.open ? T.open(hover) : select(hover, true));
      drag = null;
    });
    cv.addEventListener('pointerleave', () => { hover = null; tip.hidden = true; });

    return function draw(t, dt) {
      if (!W || document.body.dataset.view !== 'record') return;
      if (!reduced && !drag) phi += (0.03 * dt) / zoom ** 1.5;
      const fit = fitOf(), s = fit * zoom, cx = W / 2 + pan[0], cy = H / 2 + pan[1];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(cx, cy);
      const g = { s, fit, phi, t, zoom, Y0, Y1, rOf, n: SONGS.length, P, W, H };
      R.disc(ctx, g);

      const step = zoom < 1.7 ? 5 : zoom < 3 ? 3 : 1;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 1;
      for (let y = Y0; y <= Y1; y++) {
        if (y % step) continue;
        const r = rOf(y) * s;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
        ctx.setLineDash(R.ring.dash || []); ctx.strokeStyle = R.ring.stroke; ctx.stroke(); ctx.setLineDash([]);
        ctx.font = R.ring.font;
        const tw = ctx.measureText(y).width + 10;
        ctx.fillStyle = R.ring.chip; ctx.fillRect(-tw / 2, -r - 8, tw, 16);
        ctx.fillStyle = R.ring.fill; ctx.fillText(y, 0, -r + 0.5);
      }

      const base = (R.flakeR || 0.052) * 1070 * fit * zoom ** 0.45;
      const c = Math.cos(phi), sn = Math.sin(phi);
      pts = [];
      const items = LAY.map((o) => {
        const pl = P.cur === o.s;
        const pulse = pl ? (reduced ? 1 : Math.sin(Math.PI * ((t % 2.2) / 2.2)) ** 2) : 0;
        let rad = (base * (6 + o.s.total)) / 16;
        if (o.s === hover) rad *= 1.18;
        rad *= 1 + 0.16 * pulse;
        return { o, x: (o.x * c - o.y * sn) * s, y: (o.x * sn + o.y * c) * s, R: rad, on: matches(o.s), pl, pulse };
      });
      for (const it of items) {
        if (it.pl && it.on) R.beat(ctx, it.x, it.y, it.R, it.pulse);
        ctx.globalAlpha = it.on ? 1 : R.dim || 0.1;
        const sp = sprite(it.o.s, it.R, fs), k = it.R / sp.R;
        ctx.save(); ctx.translate(it.x, it.y);
        ctx.rotate(reduced ? 0 : t * 0.08 * (1 + it.o.s.cx[4] * 0.3) + hash(it.o.s.slug) * 6);
        ctx.drawImage(sp.cv, -sp.half * k, -sp.half * k, sp.half * 2 * k, sp.half * 2 * k);
        ctx.restore();
        if (it.on) pts.push({ s: it.o.s, x: cx + it.x, y: cy + it.y, r: Math.max(14, it.R * 1.1) });
      }
      ctx.globalAlpha = 1;
      ctx.font = R.title.font;
      if ('letterSpacing' in ctx) ctx.letterSpacing = R.title.ls || '0px';
      const boxes = [];
      for (const it of [...items].sort((a, b) => (b.o.s === hover) - (a.o.s === hover))) {
        if (!it.on) continue;
        const txt = R.title.upper ? it.o.s.title.toUpperCase() : it.o.s.title;
        const wd = ctx.measureText(txt).width, ty = it.y + it.R * 1.2 + 11;
        const b = [it.x - wd / 2 - 3, ty - 8, it.x + wd / 2 + 3, ty + 8], hv = it.o.s === hover;
        const clash = boxes.some((q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1])
          || items.some((j) => {
            if (j === it) return false;
            const dx = Math.max(b[0] - j.x, 0, j.x - b[2]), dy = Math.max(b[1] - j.y, 0, j.y - b[3]);
            return dx * dx + dy * dy < (j.R * 1.05) ** 2;
          });
        if (clash && !hv) continue;
        boxes.push(b);
        ctx.fillStyle = hv || it.pl ? R.title.hi : R.title.fill;
        ctx.fillText(txt, it.x, ty);
      }
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      if (R.over) R.over(ctx, g);
      ctx.restore();
    };
  }

  // ---- player (simulated) ----
  function pool() { const m = SONGS.filter(matches); return m.length ? m : SONGS; }
  function select(s, play) {
    if (P.cur && P.cur !== s) P.hist.push(P.cur);
    P.cur = s; P.pos = 0; P.playing = play;
    heard.add(s);
    paintPlayer(); changed();
  }
  // a shuffle bag: no track comes round again until every track in the pool has been heard
  const heard = new Set();
  function nextRandom() {
    P.mode = 'shuffle';
    const all = pool().filter((s) => s !== P.cur);
    let p = all.filter((s) => !heard.has(s));
    if (!p.length) { heard.clear(); if (P.cur) heard.add(P.cur); p = all; }
    select(p[Math.floor(Math.random() * p.length)] || P.cur, true);
  }
  function paintPlayer() {
    const s = P.cur, set = (k, v) => { const el = $(k); if (el) el.textContent = v; };
    document.body.toggleAttribute('data-playing', P.playing);
    document.body.toggleAttribute('data-loaded', !!s);
    const cap = $('pcap'), ti = $('ptitle'), me = $('pmeta');
    if (cap) cap.textContent = !s ? cap.dataset.idle : P.playing ? cap.dataset.on : cap.dataset.off;
    if (ti) ti.textContent = s ? s.title : ti.dataset.idle;
    if (me) me.textContent = s ? `${s.style} · ${s.year} · сложность ${s.total}/15` : me.dataset.idle || '';
    const fc = $('pflake');
    if (fc) paintStatic(fc, s, +fc.dataset.r, T.playerFlake || T.flake);
    set('ptime', s ? `${fmt(P.pos)} / ${fmt(s.dur)}` : '0:00 / 0:00');
    const line = $('pline');
    if (line) line.style.setProperty('--at', s ? P.pos / s.dur : 0);
  }
  function wirePlayer() {
    $('play')?.addEventListener('click', () => {
      if (!P.cur) return nextRandom();
      P.playing = !P.playing; paintPlayer(); changed();
    });
    $('next')?.addEventListener('click', nextRandom);
    $('prev')?.addEventListener('click', () => {
      const s = P.hist.pop();
      if (s) { P.cur = null; select(s, true); P.hist.pop(); } else if (P.cur) { P.pos = 0; paintPlayer(); }
    });
    $('pline')?.addEventListener('click', (e) => {
      if (!P.cur) return;
      const b = e.currentTarget.getBoundingClientRect();
      P.pos = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)) * P.cur.dur;
      paintPlayer();
    });
    paintPlayer();
  }

  // ---- filters ----
  function wireFilters() {
    const pads = (host, keys, set, label, led) => {
      if (!host) return;
      host.innerHTML = keys.map((k) =>
        `<label class="pad" style="--led:${led(k)}"><input type="checkbox" value="${k}" checked><i class="led"></i><span>${label(k)}</span></label>`).join('');
      host.addEventListener('change', (e) => {
        e.target.checked ? set.add(e.target.value) : set.delete(e.target.value);
        changed();
      });
    };
    pads($('styles'), STYLES, F.styles, (k) => k, () => T.styleLed || 'currentColor');
    pads($('accents'), Object.keys(ACC), F.acc, (k) => ACC[k].ru, (k) => colourOf(T.flake, k));
    const dual = (host, out, lo, hi, a, b) => {
      if (!host) return;
      host.innerHTML = `<input type="range" min="${lo}" max="${hi}" value="${lo}" aria-label="от"><input type="range" min="${lo}" max="${hi}" value="${hi}" aria-label="до">`;
      const [i1, i2] = host.children;
      const show = () => {
        host.style.setProperty('--lo', (F[a] - lo) / (hi - lo));
        host.style.setProperty('--hi', (F[b] - lo) / (hi - lo));
        i1.value = F[a]; i2.value = F[b];
        i1.style.zIndex = F[a] > (lo + hi) / 2 ? 2 : 1;
        if (out) out.textContent = `${F[a]} – ${F[b]}`;
      };
      i1.addEventListener('input', () => { F[a] = Math.min(+i1.value, F[b]); changed(); });
      i2.addEventListener('input', () => { F[b] = Math.max(+i2.value, F[a]); changed(); });
      listeners.push(show);
    };
    dual($('cx'), $('cxval'), 5, 15, 'cmin', 'cmax');
    dual($('yr'), $('yrval'), Y0, Y1, 'from', 'to');
    $('reset')?.addEventListener('click', () => {
      STYLES.forEach((k) => F.styles.add(k));
      Object.keys(ACC).forEach((k) => F.acc.add(k));
      F.cmin = 5; F.cmax = 15; F.from = Y0; F.to = Y1;
      document.querySelectorAll('.pad input').forEach((i) => (i.checked = true));
      changed();
    });
    listeners.push(() => {
      const c = $('count');
      if (c) c.textContent = `${SONGS.filter(matches).length} ${c.dataset.sep || '/'} ${SONGS.length}`;
    });
  }
  // ---- list ----
  function wireList(host) {
    if (!host) return;
    const R0 = T.tileR || 34;
    host.innerHTML = ORDER.map((s) => `<button class="tile" data-slug="${s.slug}">
      <span class="tnum">№ ${String(s.num).padStart(2, '0')}</span>
      <span class="fbox"><canvas></canvas></span>
      <b class="tt">${s.title}</b><span class="tm">${s.style} · ${s.year}</span>
      <span class="dots">${s.acc.map((a) => `<i class="led" style="--led:${colourOf(T.flake, a)}"></i>`).join('')}</span>
    </button>`).join('');
    const tiles = [...host.children];
    tiles.forEach((el, i) => {
      const s = ORDER[i], cv = el.querySelector('canvas');
      paintStatic(cv, s, (R0 * (6 + s.total)) / 16, T.tileFlake || T.flake);
      const rate = 0.08 * (1 + s.cx[4] * 0.3);
      cv.style.animationDuration = `${TAU / rate}s`;
      cv.style.animationDelay = `${-(hash(s.slug) * 6) / rate}s`;
      el.addEventListener('click', () => (T.open ? T.open(s) : select(s, true)));
    });
    listeners.push(() => tiles.forEach((el, i) => {
      el.hidden = !matches(ORDER[i]);
      el.classList.toggle('playing', P.cur === ORDER[i]);
    }));
  }

  function wireView() {
    const tabs = { record: $('tab-record'), list: $('tab-list') };
    const show = (v) => {
      document.body.dataset.view = v;
      for (const k in tabs) tabs[k]?.setAttribute('aria-selected', k === v);
    };
    for (const k in tabs) tabs[k]?.addEventListener('click', () => show(k));
    show('record');
  }

  const ICONS = {
    play: 'M8 5v14l11-7z', pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
    next: 'M6 6l8.5 6L6 18zM16 6h2v12h-2z', prev: 'M18 6l-8.5 6L18 18zM6 6h2v12H6z',
  };
  const BASE_CSS = `[hidden]{display:none!important}
body[data-view=record] [data-sf=list],body[data-view=list] [data-sf=stage],body[data-view=list] .rec-only{display:none}
[data-sf=stage]{touch-action:none}[data-sf=stage] canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab}
.tip{position:absolute;pointer-events:none;z-index:5}
[data-ico]{display:inline-flex}[data-ico] svg{width:1em;height:1em;fill:currentColor}
body:not([data-playing]) [data-ico=pause],body[data-playing] [data-sf=play] [data-ico=play]{display:none}
.pad{position:relative;cursor:pointer;user-select:none}.pad input{position:absolute;opacity:0;pointer-events:none}
.dual{position:relative}.dual input{position:absolute;inset:0;width:100%;height:100%;margin:0;background:none;pointer-events:none;-webkit-appearance:none;appearance:none}
.dual input::-webkit-slider-runnable-track{background:none}.dual input::-moz-range-track{background:none}
.dual input::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;cursor:grab}
.dual input::-moz-range-thumb{pointer-events:auto;cursor:grab;box-sizing:border-box}
@keyframes sfturn{to{transform:rotate(360deg)}}.tile canvas{animation:sfturn linear infinite;display:block}
@media(prefers-reduced-motion:reduce){.tile canvas{animation:none}}`;

  function start(theme) {
    T = theme;
    document.head.insertAdjacentHTML('beforeend', `<style>${BASE_CSS}</style>`);
    document.querySelectorAll('[data-ico]').forEach((el) => {
      el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[el.dataset.ico]}"/></svg>`;
    });
    (T.fonts || []).forEach((f) => document.fonts.load(f));
    wireView(); wireFilters(); wireList($('list')); wirePlayer();
    const draw = mountRecord($('stage'));
    changed();
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (P.playing && P.cur) {
        P.pos += dt;
        if (P.pos >= P.cur.dur) (T.ended ? T.ended() : nextRandom());
        else {
          $('pline')?.style.setProperty('--at', P.pos / P.cur.dur);
          const pt = $('ptime'), txt = `${fmt(P.pos)} / ${fmt(P.cur.dur)}`;
          if (pt && pt.textContent !== txt) pt.textContent = txt;
        }
      }
      draw(now / 1000, dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  const refresh = () => { paintPlayer(); changed(); };
  window.SF = { start, ACC, SONGS, ORDER, AXES, P, select, matches, theme: () => T, refresh,
    util: { TAU, rgba, mix, arcText, fitText, hash, fmt, paintStatic, colourOf: (k) => colourOf(T.flake, k) } };
})();
