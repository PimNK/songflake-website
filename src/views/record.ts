// The record canvas: DPR sizing, animation loop, the playing track's pulse, hover tooltip,
// click → card.
// Layout comes from domain/record-layout.ts, drawing from render/record*.ts.
import type { Content } from '../content/load';
import type { Song } from '../content/parse';
import {
  clampPan,
  collisionRadius,
  hitRadius,
  fitScale,
  flakeRadius,
  ringStep,
  ringYears,
  rotateBy,
  sectors,
  stageFlakeScale,
  toScreen,
  transform,
  yearRange,
  zoomAt,
  type Sector,
  type Transform,
  type Viewport,
  type YearRange,
} from '../domain/record-layout';
import { solveLayout, type Placement } from '../domain/record-solve';
import { flakeOf, flakeTurn, sizeFactor, turnOffset, type Flake } from '../domain/snowflake';
import { drawFlakes, flakeTitleFont, type FlakeNode } from '../render/record-flakes';
import { drawDisc, drawSectorNames, drawYearRings } from '../render/record';
import { drawCentreLabel } from '../render/record-label';
import { devicePixelRatioCapped, SpriteCache } from '../render/snowflake';
import { recordTemplate, showTooltip } from './record-controls';
import { attachRecordInput } from './record-input';
import { RecordMotion } from './record-motion';

export interface RecordView {
  setMatch(match: (song: Song) => boolean): void;
  setActive(active: boolean): void;
  /** The track that is playing now: its snowflake pulses. */
  setPlaying(slug: string | null): void;
}

type Node = FlakeNode & { song: Song };

const HOVER_SCALE = 1.18;
/** The playing snowflake swells by up to this much, once per PULSE_MS. */
const PULSE_GROW = 0.16;
const PULSE_MS = 1600;

/** Mounted once for the page's lifetime: observers and listeners are never released. */
export function mountRecord(
  stage: HTMLElement,
  content: Content,
  onOpen: (slug: string) => void,
): RecordView {
  return new RecordStage(stage, content, onOpen);
}

class RecordStage implements RecordView {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tip: HTMLElement;
  private range: YearRange;
  private secs: Sector[];
  private flakes: Map<string, Flake>;
  private sprites = new SpriteCache();
  private motion = new RecordMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  private vp: Viewport = { width: 1, height: 1, zoom: 1, panX: 0, panY: 0, phi: -0.15 };
  private placed = new Map<string, Placement>();
  private dpr = 1;
  private flakeScale = 1;
  private hover: string | null = null;
  private playing: string | null = null;
  private nodes: Node[] = [];
  private match: (song: Song) => boolean = () => true;
  private active = true;
  private onScreen = true;
  private dirty = true;
  private raf = 0;
  private last = 0;

  constructor(
    private stage: HTMLElement,
    private content: Content,
    private onOpen: (slug: string) => void,
  ) {
    stage.innerHTML = recordTemplate();
    this.canvas = stage.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.tip = stage.querySelector<HTMLElement>('.tip')!;
    const { songs, taxonomy } = content;
    this.range = yearRange(songs);
    this.secs = sectors(taxonomy.styles, songs);
    this.flakes = new Map(songs.map((s) => [s.slug, flakeOf(s, taxonomy)]));
    this.wireInput();
    this.observe();
  }

  setMatch(match: (song: Song) => boolean): void {
    this.match = match;
    this.invalidate();
  }

  setActive(active: boolean): void {
    this.active = active;
    this.invalidate();
  }

  setPlaying(slug: string | null): void {
    this.playing = slug;
    this.invalidate();
  }

  /** 0 → 1 → 0 once per PULSE_MS; held at 1 under reduced motion (bigger, no beat). */
  private pulse(): number {
    if (this.motion.reduced) return 1;
    return Math.sin((Math.PI * (performance.now() % PULSE_MS)) / PULSE_MS) ** 2;
  }

  /** Something moves: the spin, or the playing snowflake's pulse. */
  private animating(): boolean {
    return this.motion.busy || (this.playing !== null && !this.motion.reduced);
  }

  private invalidate(): void {
    this.dirty = true;
    this.wake();
  }

  private flakeR(s: Song, zoom: number): number {
    return flakeRadius(sizeFactor(s.complexityTotal), this.flakeScale, zoom);
  }

  /** Collision radius covers the snowflake and its title, in world units. */
  private solve(): void {
    const fit = fitScale(this.vp.width, this.vp.height);
    this.ctx.font = flakeTitleFont(false, 1);
    this.placed = solveLayout(this.content.songs, this.secs, this.range, (s) => {
      const half = this.ctx.measureText(s.title).width / 2;
      return collisionRadius(this.flakeR(s, 1), half, fit);
    });
  }

  private resize(): void {
    const box = this.stage.getBoundingClientRect();
    this.vp = clampPan({
      ...this.vp,
      width: Math.max(1, box.width),
      height: Math.max(1, box.height),
    });
    this.dpr = devicePixelRatioCapped();
    this.canvas.width = Math.round(this.vp.width * this.dpr);
    this.canvas.height = Math.round(this.vp.height * this.dpr);
    this.flakeScale = stageFlakeScale(this.vp.width, this.vp.height);
    this.sprites.clear();
    this.solve();
    this.invalidate();
  }

  private draw(): void {
    const { ctx, vp, secs, range } = this;
    const { songs, taxonomy } = this.content;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, vp.width, vp.height);
    ctx.shadowBlur = 0;
    const t = transform(vp);
    drawDisc(ctx, t, secs, taxonomy);
    drawYearRings(ctx, t, vp.width, vp.height, ringYears(range, ringStep(vp.zoom)), range);
    drawCentreLabel(ctx, t, vp.phi, secs, taxonomy, range, songs.length);
    drawSectorNames(ctx, t, secs, taxonomy, vp.zoom);
    this.nodes = this.layoutNodes(t);
    drawFlakes(ctx, this.nodes, vp.zoom);
  }

  private layoutNodes(t: Transform): Node[] {
    const out: Node[] = [];
    const { vp } = this;
    for (const song of this.content.songs) {
      const p = this.placed.get(song.slug);
      if (!p) continue;
      const [x, y] = toScreen(t, p.x, p.y);
      const on = this.match(song);
      const hovered = on && this.hover === song.slug;
      const pulse = song.slug === this.playing ? this.pulse() : null;
      const grow = (hovered ? HOVER_SCALE : 1) * (1 + PULSE_GROW * (pulse ?? 0));
      const R = this.flakeR(song, vp.zoom) * grow;
      if (x < -R * 2 || y < -R * 2 || x > vp.width + R * 2 || y > vp.height + R * 2) continue;
      const f = this.flakes.get(song.slug)!;
      const sprite = this.sprites.get(song.slug, f.params, f.colours, R, this.dpr);
      const offset = turnOffset(song.slug);
      const rotation = flakeTurn(song.complexity.structure, this.motion.time, offset);
      out.push({ song, x, y, R, rotation, sprite, on, hovered, pulse, title: song.title });
    }
    return out;
  }

  private running(): boolean {
    return this.active && this.onScreen && !document.hidden;
  }

  private frame(now: number): void {
    this.raf = 0;
    if (!this.running()) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.animating()) {
      this.vp = this.motion.step(this.vp, dt);
      this.dirty = true;
    }
    if (this.dirty) this.draw();
    this.dirty = false;
    // Idle (nothing moves, nothing changed): stop; wake() restarts on the next change.
    if (this.animating()) this.raf = requestAnimationFrame((n) => this.frame(n));
  }

  private wake(): void {
    if (this.raf || !this.running()) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((n) => this.frame(n));
  }

  private pick(x: number, y: number): Node | null {
    let best: Node | null = null;
    let bd = Infinity;
    for (const n of this.nodes) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (n.on && d < hitRadius(n.R) && d < bd) [best, bd] = [n, d];
    }
    return best;
  }

  private wireInput(): void {
    attachRecordInput(this.canvas, {
      zoom: () => this.vp.zoom,
      zoomAt: (z, x, y) => {
        this.vp = zoomAt(this.vp, z, x, y);
        this.invalidate();
      },
      drag: (x0, y0, x1, y1) => {
        this.vp = rotateBy(this.vp, x0, y0, x1, y1);
        this.invalidate();
      },
      hover: (x, y, touch) => {
        const n = this.pick(x, y);
        const slug = n ? n.song.slug : null;
        if (slug !== this.hover) {
          this.hover = slug;
          this.invalidate();
        }
        this.canvas.style.cursor = n ? 'pointer' : '';
        if (n && !touch) showTooltip(this.tip, n.song, x, y, this.vp);
        else this.tip.hidden = true;
      },
      leave: () => {
        this.hover = null;
        this.tip.hidden = true;
        this.invalidate();
      },
      click: (x, y) => {
        const n = this.pick(x, y);
        if (n) this.onOpen(n.song.slug);
      },
      dragging: (on) => {
        this.canvas.classList.toggle('dragging', on);
        if (on) this.tip.hidden = true;
      },
    });
  }

  private observe(): void {
    new ResizeObserver(() => this.resize()).observe(this.stage);
    new IntersectionObserver((entries) => {
      this.onScreen = entries.some((e) => e.isIntersecting);
      this.invalidate();
    }).observe(this.stage);
    document.addEventListener('visibilitychange', () => this.invalidate());
    // Titles are measured for the collision solve; re-solve once the web fonts are in.
    void document.fonts?.ready.then(() => {
      this.solve();
      this.invalidate();
    });
  }
}
