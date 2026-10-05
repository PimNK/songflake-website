// Pin markers above the waveform: a small diamond with a hairline, popover on hover/focus,
// click seeks and plays. On touch the first tap shows the popover, the second seeks.
// Markers closer than ~12 px merge into one whose popover lists both (grouping: domain/pins.ts).
import { formatTime, groupMarkers, type Pin } from '../domain/pins';
import { strings } from '../strings';
import { esc } from './html';

/** Half the widest popover (220 px) plus a margin: closer to an end than this, it opens inwards. */
const POP_HALF = 120;

// A shown popover closes on a tap anywhere else.
document.addEventListener('pointerdown', (e) => {
  if ((e.target as HTMLElement).closest('.pin')) return;
  document.querySelectorAll('.pin.show').forEach((x) => x.classList.remove('show'));
});

/** A merged marker seeks to its first pin; its label and popover list every pin it holds. */
export function renderMarkers(
  layer: HTMLElement,
  pins: readonly Pin[],
  duration: number,
  onPick: (pin: Pin) => void,
): void {
  layer.replaceChildren();
  const width = layer.getBoundingClientRect().width;
  if (!(duration > 0) || !width) return;
  for (const group of groupMarkers(pins, duration, width)) {
    const b = document.createElement('button');
    b.type = 'button';
    // Near either end of the bar the popover opens inwards, so it never sticks out of the card.
    const x = group.fraction * width;
    const side = x < POP_HALF ? ' start' : width - x < POP_HALF ? ' end' : '';
    b.className = `pin${side}`;
    b.style.left = `${group.fraction * 100}%`;
    b.setAttribute(
      'aria-label',
      group.pins.map((p) => strings.player.pinAt(formatTime(p.at), p.text)).join('; '),
    );
    b.innerHTML = `<span class="pop">${group.pins
      .map((p) => `<span><b>${formatTime(p.at)}</b>${esc(p.text)}</span>`)
      .join('')}</span>`;
    let pointer = 'mouse';
    b.addEventListener('pointerdown', (e) => (pointer = e.pointerType));
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pointer === 'touch' && !b.classList.contains('show')) {
        layer.querySelectorAll('.pin.show').forEach((x) => x.classList.remove('show'));
        b.classList.add('show');
        return;
      }
      pointer = 'mouse';
      b.classList.remove('show');
      onPick(group.pins[0]!);
    });
    layer.append(b);
  }
}
