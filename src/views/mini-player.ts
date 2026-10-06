// The slim bar pinned to the bottom while something plays and its card is not open:
// title (opens the card), play/pause, close; pins as ticks on its thin progress line.
import { markerFraction } from '../domain/pins';
import { strings } from '../strings';
import { esc } from './html';
import type { Playback } from './playback';

export interface MiniPlayer {
  setCardSlug(slug: string | null): void;
}

const p = strings.player;

export function mountMiniPlayer(playback: Playback, open: (slug: string) => void): MiniPlayer {
  const bar = document.createElement('div');
  bar.className = 'mini';
  bar.hidden = true;
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', p.mini);
  bar.innerHTML = `
    <div class="mini-line"><i></i><span class="mini-ticks"></span></div>
    <button type="button" class="mini-play"></button>
    <button type="button" class="mini-title"></button>
    <button type="button" class="mini-close btn" aria-label="${p.closeMini}">✕</button>`;
  document.body.append(bar);
  const q = <T extends HTMLElement>(s: string): T => bar.querySelector<T>(s)!;
  let cardSlug: string | null = null;
  let ticksFor = '';

  const update = (): void => {
    const song = playback.song;
    const a = playback.audio;
    const started = song !== null && (playback.isPlaying() || a.currentTime > 0);
    bar.hidden = !started || cardSlug === song?.slug;
    document.body.classList.toggle('has-mini', !bar.hidden);
    if (!song || bar.hidden) return;
    const d = a.duration || 0;
    q('.mini-title').innerHTML = esc(song.title);
    q('.mini-play').textContent = playback.isPlaying()
      ? strings.player.pauseGlyph
      : strings.player.playGlyph;
    q('.mini-play').setAttribute('aria-label', playback.isPlaying() ? p.pause : p.play);
    q<HTMLElement>('.mini-line i').style.width = `${d ? (a.currentTime / d) * 100 : 0}%`;
    const key = `${song.slug}|${d}`;
    if (key !== ticksFor) {
      ticksFor = key;
      q('.mini-ticks').innerHTML = song.pins
        .map((pin) => markerFraction(pin.at, d))
        .filter((f): f is number => f !== null)
        .map((f) => `<b style="left:${f * 100}%"></b>`)
        .join('');
    }
  };

  q('.mini-play').addEventListener('click', () => playback.song && playback.toggle(playback.song));
  q('.mini-title').addEventListener('click', () => playback.song && open(playback.song.slug));
  q('.mini-close').addEventListener('click', () => playback.stop());
  playback.subscribe(update);

  return {
    setCardSlug(slug) {
      cardSlug = slug;
      update();
    },
  };
}
