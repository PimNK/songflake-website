// Track card for mockup D «Ночная дека». Throwaway demo code, like engine.js.
// Reads LUM and C (the backlight) from d-night.html and the song notes from card-data.js.
(() => {
  'use strict';
  const { TAU, hash, fmt, paintStatic, colourOf } = SF.util;
  const { P, ORDER, AXES, ACC } = SF;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INFO = {
    timeline: [['Идея', 'появляется основная мелодия или идея песни.'], ['Концепция', 'у песни есть структура для основных инструментов.'], ['Готово', 'трек записан, его можно послушать.']],
    listen: 'На что стоит обратить внимание при прослушивании — партии, на которых построен трек. Они же окрашивают лучи снежинки.',
    total: ['насколько сложен ритм: размер, синкопы, смены грува.', 'как далеко уходят мелодии: диапазон, скачки, сколько линий звучит сразу.',
      'насколько трудно сыграть партии.', 'сколько инструментов и слоёв в аранжировке.', 'как построена песня: от куплета и припева до множества частей и поворотов.'],
  };
  const ICO = {
    play: 'M8 5v14l11-7z', pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
    next: 'M6 6l8.5 6L6 18zM16 6h2v12h-2z', prev: 'M18 6l-8.5 6L18 18zM6 6h2v12H6z', x: 'M6 6l12 12M18 6L6 18',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICO[k]}"/></svg>`;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const info = (html, side = '') => `<span class="qi${side}" tabindex="0" aria-label="Пояснение">i<span class="bubble" role="tooltip">${html}</span></span>`;
  const VOLICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" stroke="none"/><path d="M10.5 5.6a3.4 3.4 0 0 1 0 4.8M12.6 3.6a6.2 6.2 0 0 1 0 8.8"/></svg>';
  const NARROW = matchMedia('(max-width: 899px)');

  document.head.insertAdjacentHTML('beforeend', `<style>
.modal{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:24px;background:radial-gradient(70% 70% at 50% 45%,rgba(0,0,0,.55),rgba(0,0,0,.86));backdrop-filter:blur(3px)}
.modal[hidden]{display:none}
.sheet{position:relative;width:min(1100px,100%);height:min(100%,880px);display:grid;grid-template-rows:auto minmax(0,1fr);gap:16px;padding:22px 28px 20px;overflow:hidden;--lead:var(--amber)}
.btn.x{position:absolute;top:14px;right:14px;z-index:2}
.btn.x svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
.btn svg{width:1em;height:1em;fill:currentColor}
/* the top row: the console's player, wider, and the track's big snowflake at its right */
.mtop{display:flex;flex-direction:column;gap:14px;min-width:0;padding-right:46px}
.mscreen{overflow:visible;display:grid;grid-template-columns:minmax(0,1fr) 190px;column-gap:20px}
.mscreen > *{grid-column:1}
.mflake{grid-column:2;grid-row:1/5;align-self:center;width:190px;height:190px;display:grid;place-items:center;margin:-6px 0}
.mflake canvas{animation:sfturn linear infinite}
.mscreen .vfd-top span:first-child{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.mscreen .mtime{flex:none;white-space:nowrap}
.wtime{display:none}
.mtitle.run{text-overflow:clip;mask-image:linear-gradient(90deg,transparent,#000 8px,#000 calc(100% - 8px),transparent)}
.trun{display:inline-flex;animation:trun var(--run,8s) linear infinite}.trun > span{padding-right:1.2em}
@keyframes trun{to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){.trun{animation:none}}
.mscreen .vfd-main{height:56px}
.mtitle{flex:1;min-width:0;margin:0;font:500 40px/1 var(--vfd);color:var(--hot);text-transform:uppercase;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wave{position:relative;height:46px;cursor:pointer;touch-action:none;margin:0 -2px}
.wave canvas{position:absolute;inset:0;width:100%;height:100%}
.wave:focus-visible{outline-offset:4px}
.pins{position:absolute;left:0;right:0;top:-8px;height:0}
.pin{position:absolute;top:0;width:18px;height:18px;margin-left:-9px;display:grid;place-items:center}
.pin::before{content:"";width:7px;height:7px;transform:rotate(45deg);background:var(--hot);box-shadow:0 0 calc(8px*var(--lum)) rgb(var(--g)/.95)}
.pin::after{content:"";position:absolute;top:13px;left:8.5px;width:1px;height:42px;background:linear-gradient(rgb(var(--g)/.5),rgb(var(--g)/.06));pointer-events:none}
.pin.past::before{background:#fff8ec}
.pop{position:absolute;top:22px;left:50%;transform:translateX(-50%);width:max-content;max-width:280px;padding:9px 11px;border-radius:6px;z-index:3;pointer-events:none;opacity:0;transition:opacity .12s;
  font:500 17px/1.12 var(--vfd);letter-spacing:.08em;color:var(--amber);text-shadow:var(--glow);text-align:left;text-transform:uppercase;background:#0c0805;box-shadow:inset 0 0 0 1px rgb(var(--g)/.3),0 0 24px rgb(var(--g)/.15),0 8px 20px #000}
.pop b{display:block;font:500 8.5px/1.2 var(--mono);letter-spacing:.14em;color:var(--label);margin-bottom:4px}
.pin.l .pop{left:0;transform:none}.pin.r .pop{left:auto;right:0;transform:none}
.pin:hover .pop,.pin:focus-visible .pop{opacity:1}
.pnote{display:grid;align-content:start;margin-top:6px;padding-top:8px;border-top:1px dashed rgb(var(--g)/.22);height:calc(3*1.12em + 8px);overflow:hidden;
  font:500 17px/1.12 var(--vfd);letter-spacing:.08em;text-transform:uppercase;color:var(--amber);text-shadow:var(--glow)}
/* hidden copies of every note of the track share the cell with the live one: on a phone the box is as high as the longest */
.pnote > span{grid-area:1/1}.pnote .ghost{visibility:hidden}
.pnote .now:empty::before{content:"· · ·";opacity:.35}
.mtransport .btn.play:not([data-on]) [data-ico=pause]{display:none!important}.mtransport .btn.play[data-on] [data-ico=play]{display:none}
body[data-playing] .mtransport .btn.play:not([data-on]){background:radial-gradient(circle at 50% 28%,#2c2520,#0e0b09);
  box-shadow:0 4px 0 #050403,0 7px 10px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,220,170,.18),inset 0 0 0 2px rgb(var(--g)/.28)}
.mtransport .btn.play[data-on]{background:radial-gradient(circle at 50% 40%,rgb(var(--p)),#120e0b);
  box-shadow:0 4px 0 #050403,0 7px 10px rgba(0,0,0,.7),inset 0 0 0 2px rgb(var(--g)/.75),inset 0 0 16px rgb(var(--g)/.45),0 0 calc(28px*var(--lum)) rgb(var(--g)/calc(.42*var(--lum)))}
.mtransport .btn.play:disabled{opacity:.35;cursor:default}
.mtransport{display:flex;align-items:center;gap:16px}
.mtransport .vol{display:flex;align-items:center;gap:10px;width:204px;margin-left:22px;color:var(--label)}.mtransport .vol .dual{flex:1}
/* four cells */
.mgrid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto minmax(0,1fr);gap:22px 34px;min-height:0;overflow:hidden}
.cell{min-height:0;display:flex;flex-direction:column;gap:10px;padding:13px 0 2px;border-top:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,200,140,.08)}
.ch{display:flex;align-items:center;gap:8px;height:20px}
.ch .lab{font:500 17px/1 var(--vfd);letter-spacing:.08em}
/* timeline: three indicator lamps */
.tl{display:flex;align-items:flex-start;padding:2px 4px 0;height:66px}
.st{display:flex;flex-direction:column;align-items:center;gap:7px;flex:none;width:74px}
.lamp{width:20px;height:20px;border-radius:50%;background:#0b0907;box-shadow:inset 0 1px 2px #000,0 0 0 2px #050403,0 1px 0 2px rgba(255,220,170,.06)}
.lamp.hollow{background:radial-gradient(circle,#0b0907 0 4.5px,var(--lead) 5px 7px,#0b0907 7.5px);box-shadow:0 0 0 2px #050403,0 0 calc(10px*var(--lum)) color-mix(in srgb,var(--lead) 45%,transparent)}
.lamp.half{background:linear-gradient(90deg,var(--lead) 50%,#0b0907 50%);box-shadow:0 0 0 2px #050403,inset 0 0 0 2px var(--lead),0 0 calc(12px*var(--lum)) color-mix(in srgb,var(--lead) 55%,transparent)}
.lamp.full{background:radial-gradient(circle at 40% 35%,#fff,var(--lead) 55%);box-shadow:0 0 0 2px #050403,0 0 calc(16px*var(--lum)) var(--lead),0 0 4px var(--lead)}
.lamp.off{opacity:.5}
.st .lab{color:var(--label)}
.sheet .chip{font-size:17px}
.st.dim .chip{color:var(--off);text-shadow:none}
.gap{flex:var(--w) 1 0;min-width:44px;display:flex;flex-direction:column;align-items:center;padding-top:9px}
.gap i{align-self:stretch;height:2px;border-radius:1px;background:linear-gradient(90deg,color-mix(in srgb,var(--lead) 70%,transparent),color-mix(in srgb,var(--lead) 30%,transparent));box-shadow:0 0 calc(6px*var(--lum)) color-mix(in srgb,var(--lead) 50%,transparent)}
.gap.zero i{background:repeating-linear-gradient(90deg,color-mix(in srgb,var(--lead) 60%,transparent) 0 3px,transparent 3px 7px);box-shadow:none}
.gap.none i{background:repeating-linear-gradient(90deg,#3a322a 0 3px,transparent 3px 7px);box-shadow:none}
/* lit pads, as on the console, but they do not toggle */
.lpads{display:flex;gap:8px;height:46px}.lpads .pad{flex:0 0 96px;height:46px}
.lpads .pad{cursor:default;font-weight:400;color:color-mix(in srgb,var(--cream) 62%,var(--label));text-shadow:0 0 6px rgb(var(--g)/.22);
  box-shadow:0 3px 0 #050403,0 5px 7px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,220,170,.1),inset 0 14px 16px -14px var(--led),0 9px calc(17px*var(--lum)) -9px var(--led)}
.lpads .pad:active{transform:none}
.lpads .pad .led{background:var(--led);box-shadow:0 0 10px var(--led),0 0 3px var(--led)}
/* story */
.story{flex:1;min-height:0;overflow:auto;padding-right:10px;font:500 10px/1.85 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--label);text-shadow:0 0 8px rgb(var(--g)/calc(.38*var(--lum)));scrollbar-color:#3a322a transparent}
.story p{margin:0 0 .8em}
/* complexity: a round CRT with the trace in the lead colour */
.cell.cx{align-items:stretch}
.crt{flex:1;min-height:0;position:relative}
.crt svg{position:absolute;inset:0;margin:auto;width:315px;height:230px;max-width:100%;max-height:100%;overflow:visible}
/* ⓘ */
.qi{position:relative;width:15px;height:15px;border-radius:50%;display:inline-grid;place-items:center;font:600 9px/1 var(--mono);color:var(--label);cursor:help;
  box-shadow:inset 0 0 0 1px rgb(var(--g)/.35)}
.qi:hover,.qi:focus-visible{color:var(--hot);box-shadow:inset 0 0 0 1px rgb(var(--g)/.8),0 0 8px rgb(var(--g)/.4)}
.bubble{position:absolute;left:-10px;top:calc(100% + 8px);z-index:6;width:300px;padding:10px 12px;border-radius:6px;opacity:0;visibility:hidden;transition:opacity .12s;pointer-events:none;
  font:400 10px/1.7 var(--mono);letter-spacing:.07em;text-transform:uppercase;color:var(--cream);text-align:left;white-space:normal;
  background:#0c0805;box-shadow:inset 0 0 0 1px rgb(var(--g)/.3),0 0 26px rgb(var(--g)/.14),0 10px 24px #000}
.qi.r .bubble{left:auto;right:-10px}
.bubble b{color:var(--hot);font-weight:600}
.bubble p{margin:0 0 5px}.bubble p:last-child{margin:0}
.qi:hover .bubble,.qi:focus-visible .bubble{opacity:1;visibility:visible}
body.locked{overflow:hidden}
/* Phones and tablets: a full-height sheet that scrolls, in the order of the site's narrow card — the keys (✕ at
   their right), then the display: caption · time, the title (two lines kept) with the snowflake (96 px) at its
   right, the trace with the pins, the note under it (as high as the track's longest); then the cells, one column. */
@media(max-width:899px){
  .modal{padding:0;place-items:stretch}
  .sheet{width:100%;height:100%;border-radius:0;overflow:auto;overscroll-behavior:contain;scrollbar-color:#3a322a transparent;touch-action:pan-y pinch-zoom;
    grid-template-rows:none;align-content:start;gap:18px;padding:calc(env(safe-area-inset-top,0px) + 14px) 16px calc(env(safe-area-inset-bottom,0px) + 28px)}
  .btn.x{top:calc(env(safe-area-inset-top,0px) + 28px);right:16px}
  .mtop{padding-right:0;gap:14px}
  .mtransport{order:-1;gap:14px;padding-right:48px}
  .mtransport .vol{display:none}
  .mscreen{grid-template-columns:minmax(0,1fr) 96px;column-gap:10px;padding:11px 12px 10px}
  /* on a phone: the caption (Сейчас играет / Пауза) over the title, as in the bottom player; the title in one line
     beside the snowflake, then the trace with the time right at its end */
  .mscreen .vfd-top{grid-column:1;grid-row:1;align-self:end;min-height:17px;margin-bottom:6px}
  .mscreen .vfd-top .mtime{display:none}
  .mscreen .vfd-main{grid-row:2;align-self:start}
  .mscreen .wline,.mscreen .pnote{grid-column:1/-1}
  .mflake{grid-row:1/3;width:96px;height:96px;margin:0}
  .mscreen .vfd-main{height:auto}
  .mtitle{font-size:26px}
  .wline{display:flex;align-items:center;gap:10px;margin-top:12px}
  .wline .wave{flex:1;min-width:0}
  .wtime{display:block;flex:none;font:500 17px/1 var(--vfd);letter-spacing:.06em;white-space:nowrap;opacity:.82}
  .pnote{height:auto;min-height:calc(3*1.12em + 8px)}
  .pop{display:none}
  .mgrid{grid-template-columns:1fr;grid-template-rows:none;row-gap:0;overflow:visible}
  .cell{min-height:auto;padding-bottom:16px}
  .ch{position:relative}.ch .qi{position:static}
  .bubble,.qi.r .bubble{left:0;right:0;width:auto}
  .tl{height:auto;padding-bottom:4px}.st{width:66px}.gap{min-width:28px}
  .lpads{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));height:auto;gap:9px 8px}
  .story{flex:none;overflow:visible;padding-right:0}
  .crt{flex:none;width:min(100% - 24px,440px);margin-inline:auto;aspect-ratio:370/270}
  .crt svg{width:100%;height:100%}
}
@media(max-width:359px){.mtransport{gap:10px}.mtransport .btn.k{width:40px;height:40px}.mtransport .btn.play{width:54px;height:54px}.btn.x{top:calc(env(safe-area-inset-top,0px) + 24px)}}
</style>`);

  const modal = document.createElement('div');
  modal.className = 'modal'; modal.hidden = true;
  modal.innerHTML = `<article class="sheet panel" role="dialog" aria-modal="true" aria-labelledby="mtitle">
    <button class="btn s x" data-k="close" aria-label="Закрыть">${svg('x')}</button>
    <section class="mtop" aria-label="Плеер">
        <div class="vfd mscreen">
          <div class="vfd-top"><span class="mcap"></span><span class="mtime"></span></div>
          <div class="vfd-main"><h2 class="mtitle" id="mtitle"></h2></div>
          <div class="wline"><div class="wave" role="slider" tabindex="0" aria-label="Перемотка" aria-valuemin="0"><canvas></canvas><div class="pins"></div></div><span class="wtime"></span></div>
          <div class="pnote" aria-live="polite"></div>
          <span class="mflake"><canvas></canvas></span>
        </div>
        <div class="transport mtransport">
          <button class="btn k" data-k="prev" aria-label="Предыдущий трек">${svg('prev')}</button>
          <button class="btn play" data-k="play" aria-label="Слушать"><i data-ico="play">${svg('play')}</i><i data-ico="pause">${svg('pause')}</i></button>
          <button class="btn k" data-k="next" aria-label="Следующий трек">${svg('next')}</button>
          <div class="vol">${VOLICON}<div class="dual mvol"><input type="range" min="0" max="100" aria-label="Громкость"></div></div>
        </div>
    </section>
    <section class="mgrid">
      <div class="cell"><div class="ch"><span class="lab">От идеи до записи</span>${info(INFO.timeline.map(([n, t]) => `<p><b>${n}</b> — ${t}</p>`).join(''))}</div><div class="tl"></div></div>
      <div class="cell"><div class="ch"><span class="lab">Основной инструмент</span>${info(esc(INFO.listen), ' r')}</div><div class="lpads"></div></div>
      <div class="cell"><div class="ch"><span class="lab">История</span></div><div class="story"></div></div>
      <div class="cell cx"><div class="ch"><span class="lab">Общая сложность</span>${info(AXES.map((n, i) => `<p><b>${n}</b> — ${INFO.total[i]}</p>`).join('') + '<p>Каждая ось — от 1 до 3; вместе они дают общую сложность, 5–15.</p>', ' r')}</div><div class="crt"></div></div>
    </section>
  </article>`;
  document.body.append(modal);
  const q = (sel) => modal.querySelector(sel);
  const sheet = q('.sheet'), wave = q('.wave'), wcv = wave.querySelector('canvas'), wctx = wcv.getContext('2d');
  let cur = null, back = null, note = '';

  // -------- render one track --------
  const data = (s) => (window.CARD || {})[s.slug] || { y: [s.year, null, s.year], story: '', pins: [], audio: true };
  function timeline(s, lead) {
    const [idea, concept, ready] = data(s).y;
    const st = (name, year, fill, missing) => `<div class="st${year == null ? ' dim' : ''}"><i class="lamp ${year == null ? 'off' : fill}"></i>
      <span class="lab">${name}</span><span class="chip">${year ?? missing}</span></div>`;
    const gap = (a, b) => {
      if (a == null || b == null) return '<div class="gap none" style="--w:1"><i></i></div>';
      const n = b - a;
      return `<div class="gap${n ? '' : ' zero'}" style="--w:${Math.max(n, 0) + 0.6}"><i></i></div>`;
    };
    const mid = concept ?? null;
    return st('Идея', idea, 'hollow') + gap(idea, mid) + st('Концепция', concept, 'half', '—')
      + gap(mid, ready) + st('Готово', ready, 'full', 'ещё нет');
  }
  function radar(s, lead) {
    const n = 5, R = 100, c = [0, 0], ang = (i) => -Math.PI / 2 + (i * TAU) / n;
    const pt = (i, v) => [Math.cos(ang(i)) * R * v, Math.sin(ang(i)) * R * v];
    const poly = (f) => Array.from({ length: n }, (_, i) => pt(i, f(i)).map((v) => v.toFixed(1)).join(',')).join(' ');
    const grid = [1, 2, 3].map((k) => `<polygon points="${poly(() => k / 3)}" fill="none" stroke="rgb(var(--g)/.${k === 3 ? 28 : 14})" stroke-width="1" ${k < 3 ? 'stroke-dasharray="2 4"' : ''}/>`).join('');
    const spokes = Array.from({ length: n }, (_, i) => { const [x, y] = pt(i, 1); return `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgb(var(--g)/.16)"/>`; }).join('');
    const labels = AXES.map((name, i) => {
      const [x, y] = pt(i, 1.24), anchor = Math.abs(x) < 8 ? 'middle' : x > 0 ? 'start' : 'end';
      return `<text x="${x.toFixed(1)}" y="${(y + (y < -50 ? -4 : 6)).toFixed(1)}" text-anchor="${anchor}" class="ax">${name.toUpperCase()} <tspan class="axv">${s.cx[i]}</tspan></text>`;
    }).join('');
    const dots = s.cx.map((v, i) => { const [x, y] = pt(i, v / 3); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#fff" filter="url(#glo)"/>`; }).join('');
    const pairs = AXES.map((nm, i) => `${nm} ${s.cx[i]} из 3`).join(', ');
    return `<svg viewBox="-185 -138 370 270" role="img" aria-label="Радар сложности: ${pairs}">
      <defs><filter id="glo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <radialGradient id="tube"><stop offset="0" stop-color="rgb(var(--p))" stop-opacity=".55"/><stop offset=".8" stop-color="#060301" stop-opacity=".9"/><stop offset="1" stop-color="#000"/></radialGradient></defs>
      <style>.ax{font:500 10px 'Martian Mono',monospace;letter-spacing:.1em;fill:var(--label)}.axv{fill:var(--hot);font-weight:600}</style>
      <circle r="118" fill="url(#tube)" stroke="#000" stroke-width="2"/><circle r="121" fill="none" stroke="rgba(255,220,170,.08)"/>
      ${grid}${spokes}
      <polygon points="${poly((i) => s.cx[i] / 3)}" fill="${lead}" fill-opacity=".14" stroke="${lead}" stroke-width="1.6" stroke-linejoin="round" filter="url(#glo)"/>
      ${dots}${labels}</svg>`;
  }
  function pinsHTML(s, d) {
    const W = wave.clientWidth || 600, out = [];
    for (const [t, text] of d.pins) {
      const last = out[out.length - 1];
      if (last && ((t - last.t) / s.dur) * W < 12) last.items.push([t, text]);
      else out.push({ t, items: [[t, text]] });
    }
    return out.map((g) => {
      const x = (g.t / s.dur) * W, side = x < 130 ? ' l' : W - x < 130 ? ' r' : '';
      const lbl = g.items.map(([t, tx]) => `Заметка на ${fmt(t)}: ${tx}`).join('; ');
      return `<button class="pin${side}" data-t="${g.t}" style="left:${(g.t / s.dur) * 100}%" aria-label="${esc(lbl)}">
        <span class="pop">${g.items.map(([t, tx]) => `<b>${fmt(t)}</b>${esc(tx)}`).join('<br>')}</span></button>`;
    }).join('');
  }
  function render(s) {
    cur = s;
    const d = data(s), lead = colourOf(s.acc[0]);
    sheet.style.setProperty('--lead', lead);
    q('#mtitle').title = s.title;
    fitTitle();
    q('.tl').innerHTML = timeline(s, lead);
    q('.lpads').innerHTML = s.acc.map((a) => `<span class="pad" style="--led:${colourOf(a)}"><i class="led"></i><span>${ACC[a].ru}</span></span>`).join('');
    q('.story').innerHTML = d.story ? d.story.split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join('') : '<p>История этого трека ещё не написана.</p>';
    q('.crt').innerHTML = radar(s, lead);
    q('.pins').innerHTML = d.audio ? pinsHTML(s, d) : '';
    const pn = q('.pnote');
    pn.innerHTML = (d.audio ? d.pins : []).map(([, tx]) => `<span class="ghost" aria-hidden="true">${esc(tx)}</span>`).join('') + '<span class="now"></span>';
    note = null;
    q('[data-k=play]').disabled = !d.audio;
    wave.setAttribute('aria-valuemax', Math.round(s.dur));
    sync(); fitFlake();
  }
  // the title: one line; on a phone a title too long for it runs as a ticker (the copy is aria-hidden)
  function fitTitle() {
    const el = q('#mtitle');
    el.classList.remove('run'); el.textContent = cur.title;
    if (!NARROW.matches || el.scrollWidth <= el.clientWidth + 1) return;
    el.classList.add('run');
    el.innerHTML = `<span class="trun" style="--run:${Math.max(6, cur.title.length * 0.45)}s"><span></span><span aria-hidden="true"></span></span>`;
    el.querySelectorAll('.trun > span').forEach((sp) => (sp.textContent = cur.title));
  }
  // caption, time, play state and the active pin note follow the shared playback
  function sync() {
    if (!cur) return;
    const d = data(cur), mine = P.cur === cur, pos = mine ? P.pos : 0;
    const cap = !d.audio ? (NARROW.matches ? '' : 'Запись скоро появится') : mine && P.playing ? 'Сейчас играет'
      : mine || NARROW.matches ? 'Пауза' : 'Нажмите ▶, чтобы послушать';
    if (q('.mcap').textContent !== cap) q('.mcap').textContent = cap;
    const time = d.audio ? `${fmt(pos)} / ${fmt(cur.dur)}` : '';
    if (q('.mtime').textContent !== time) q('.mtime').textContent = q('.wtime').textContent = time;
    const pb = q('[data-k=play]');
    pb.toggleAttribute('data-on', mine && P.playing); pb.setAttribute('aria-label', mine && P.playing ? 'Пауза' : 'Слушать');
    wave.setAttribute('aria-valuenow', Math.round(pos));
    let txt = '';
    for (const [t, tx] of d.pins) if (mine && t <= pos) txt = tx;
    if (txt !== note) { note = txt; q('.pnote .now').textContent = txt; }
    modal.querySelectorAll('.pin').forEach((p) => p.classList.toggle('past', mine && +p.dataset.t <= pos));
  }

  // -------- the progress line: the console's oscilloscope trace, alive up to the playhead, flat after it --------
  let amp = 0;
  function drawWave(now) {
    if (modal.hidden || !cur) return;
    const W = wave.clientWidth, H = wave.clientHeight, dp = Math.min(2, devicePixelRatio || 1);
    if (wcv.width !== Math.round(W * dp)) { wcv.width = W * dp; wcv.height = H * dp; }
    wctx.setTransform(dp, 0, 0, dp, 0, 0); wctx.clearRect(0, 0, W, H);
    const d = data(cur), mid = H / 2 + 1, mine = P.cur === cur && d.audio, t = still ? 0 : now / 1000;
    amp += ((mine && P.playing ? 1 : mine ? 0.28 : 0) - amp) * 0.08;
    wctx.fillStyle = `rgba(${C.sheen},.16)`;
    for (let x = 0; x <= W; x += W / 20) for (let y = 3; y < H; y += 8) wctx.fillRect(Math.round(x), y, 1, 1);
    for (let x = 0; x <= W; x += W / 100) wctx.fillRect(Math.round(x), mid - 1, 1, 3);
    const X = mine ? (P.pos / cur.dur) * W : 0;
    wctx.lineWidth = 1; wctx.strokeStyle = `rgba(${C.sheen},.38)`;
    wctx.beginPath(); wctx.moveTo(X, mid); wctx.lineTo(W, mid); wctx.stroke();
    wctx.save(); wctx.shadowColor = `rgba(${C.g},.95)`; wctx.shadowBlur = 7 * LUM; wctx.lineJoin = 'round';
    wctx.strokeStyle = C.hot; wctx.lineWidth = 1.5; wctx.beginPath();
    let y = mid;
    for (let x = 0; x <= X; x += 1.5) {
      const env = Math.min(1, x / 14) * (0.55 + 0.45 * Math.sin(x * 0.021 - t * 1.1));
      y = mid + amp * (0.2 + 0.8 * VOL) * env * (H * 0.4) * (Math.sin(x * 0.19 + t * 7) * 0.6 + Math.sin(x * 0.077 - t * 3.2) * 0.4);
      wctx[x ? 'lineTo' : 'moveTo'](x, y);
    }
    wctx.stroke();
    if (mine) { wctx.beginPath(); wctx.arc(X, X > 1 ? y : mid, 2.6, 0, TAU); wctx.fillStyle = '#fff3dc'; wctx.shadowBlur = 12; wctx.fill(); }
    wctx.restore();
  }
  // the big snowflake: one fixed size, so stepping between tracks moves nothing
  function fitFlake() {
    const fc = q('.mflake canvas'), size = NARROW.matches ? 96 : 190;
    paintStatic(fc, cur, ((size - 16) / 2.7) * 1.02, SF.theme().flake);
    const rate = 0.08 * (1 + cur.cx[4] * 0.3);
    fc.style.animationDuration = `${TAU / rate}s`; fc.style.animationDelay = `${-(hash(cur.slug) * 6) / rate}s`;
  }
  // one volume for the page: the card's fader and the console's move together
  const mvol = q('.mvol'), mvi = mvol.querySelector('input'), cvol = document.getElementById('vol');
  const showVol = () => { mvi.value = Math.round(VOL * 100); mvol.style.setProperty('--lo', 0); mvol.style.setProperty('--hi', VOL); };
  mvi.addEventListener('input', () => {
    VOL = mvi.value / 100; showVol();
    if (cvol) { cvol.value = mvi.value; cvol.parentElement.style.setProperty('--hi', VOL); }
  });
  const loop = (now) => { if (!modal.hidden) { sync(); drawWave(now); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);

  // -------- playback from the card: a run in the card's order --------
  const filtered = () => { const m = ORDER.filter(SF.matches); return m.includes(cur) ? m : ORDER; };
  const step = (k) => { const L = filtered(), i = L.indexOf(cur); render(L[(i + k + L.length) % L.length]); };
  const playHere = (pos) => {
    if (P.cur !== cur) SF.select(cur, true);
    P.mode = 'order';
    if (pos != null) P.pos = Math.max(0, Math.min(cur.dur - 0.5, pos));
    SF.refresh(); sync();
  };
  q('[data-k=play]').addEventListener('click', () => {
    if (P.cur === cur) { P.playing = !P.playing; P.mode = 'order'; SF.refresh(); sync(); } else playHere(0);
  });
  q('[data-k=prev]').addEventListener('click', () => step(-1));
  q('[data-k=next]').addEventListener('click', () => step(1));
  const seekAt = (e) => { const b = wave.getBoundingClientRect(); playHere(((e.clientX - b.left) / b.width) * cur.dur); };
  let seeking = false;
  wave.addEventListener('pointerdown', (e) => {
    if (!data(cur).audio) return;
    const pin = e.target.closest('.pin');
    if (pin) return playHere(+pin.dataset.t);
    seeking = true; wave.setPointerCapture(e.pointerId); seekAt(e);
  });
  wave.addEventListener('pointermove', (e) => seeking && seekAt(e));
  wave.addEventListener('pointerup', () => (seeking = false));
  wave.addEventListener('keydown', (e) => {
    if (!data(cur).audio) return;
    const pos = P.cur === cur ? P.pos : 0;
    const to = { ArrowLeft: pos - 5, ArrowRight: pos + 5, Home: 0, End: cur.dur - 1 }[e.key];
    if (to != null) { e.preventDefault(); e.stopPropagation(); playHere(to); }
  });

  // when a track ends: a run from the card goes on in the card's order, a shuffle run picks another random track
  SF.theme().ended = () => {
    if (P.mode !== 'order') return document.querySelector('[data-sf=next]').click();
    const done = P.cur, L = ORDER.filter(SF.matches).length ? ORDER.filter(SF.matches) : ORDER;
    let i = L.indexOf(done), nx = null;
    for (let k = 1; k <= L.length; k++) { const c = L[(i + k) % L.length]; if (data(c).audio) { nx = c; break; } }
    if (!nx) { P.playing = false; P.pos = 0; return SF.refresh(); }
    SF.select(nx, true); P.mode = 'order';
    if (!modal.hidden && cur === done) render(nx);
  };
  document.querySelector('[data-sf=play]')?.addEventListener('click', () => (P.mode = 'shuffle'));

  // -------- open and close --------
  function open(s) {
    if (modal.hidden) back = document.activeElement;
    modal.hidden = false; document.body.classList.add('locked');
    render(s); showVol();
    requestAnimationFrame(() => { render(s); q('[data-k=close]').focus(); });
  }
  function close() {
    modal.hidden = true; document.body.classList.remove('locked');
    if (back && back.focus) back.focus();
  }
  q('[data-k=close]').addEventListener('click', close);
  // the snowflake's size and the pins' sides depend on the width
  NARROW.addEventListener('change', () => !modal.hidden && cur && render(cur));
  addEventListener('resize', () => !modal.hidden && cur && fitTitle());
  // touch: a swipe left / right steps to the next / previous track (≥ 60 px, mostly sideways; not on the trace or a fader)
  let sw = null;
  sheet.addEventListener('pointerdown', (e) => {
    sw = e.pointerType === 'touch' && !e.target.closest('.wave, .dual') ? { x: e.clientX, y: e.clientY } : null;
  });
  sheet.addEventListener('pointercancel', () => (sw = null));
  sheet.addEventListener('pointerup', (e) => {
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    sw = null;
    if (Math.abs(dx) >= 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
  });
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') close();
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.altKey && !e.ctrlKey && !e.metaKey && document.activeElement !== wave) step(e.key === 'ArrowLeft' ? -1 : 1);
    else if (e.key === 'Tab') {
      const f = [...sheet.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter((el) => el.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  SF.theme().open = open;
  // the console's title and snowflake open the playing track's card
  for (const k of ['ptitle', 'pflake']) {
    const el = document.querySelector(`[data-sf=${k}]`);
    if (el) { el.style.cursor = 'pointer'; el.addEventListener('click', () => P.cur && open(P.cur)); }
  }
  SF.openCard = open;
})();
