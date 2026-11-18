// Pointer input on a fader (`.dual`: one or two range inputs over one track), shared by the
// filters' ranges and the volume. The whole fader is the hit area: a press anywhere moves the
// nearest thumb there and a drag carries it (mouse, pen or finger). Each move sets the input's
// value and fires its `input` event, so the owners' handlers stay as they are. The keyboard is
// the inputs' own. The maths is domain/fader.ts.
import { nearestThumb, valueAt } from '../domain/fader';

/** The value under the pointer, as the inputs' range and step allow. */
function valueUnder(dual: HTMLElement, input: HTMLInputElement, clientX: number): number {
  const box = dual.getBoundingClientRect();
  const thumb = parseFloat(getComputedStyle(dual).getPropertyValue('--thumb')) || 14;
  const f = (clientX - box.left - thumb / 2) / Math.max(1, box.width - thumb);
  return valueAt(f, Number(input.min), Number(input.max), Number(input.step));
}

function setValue(input: HTMLInputElement, v: number): void {
  if (Number(input.value) === v) return;
  input.value = String(v);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Makes the whole fader a pointer target: press to jump the nearest thumb, drag to move it. */
export function wireFader(dual: HTMLElement): void {
  const inputs = [...dual.querySelectorAll('input')];
  let held: HTMLInputElement | null = null;
  let pressed = false;

  const move = (clientX: number): void => {
    const v = valueUnder(dual, inputs[0]!, clientX);
    if (!held) {
      const i = nearestThumb(
        inputs.map((x) => Number(x.value)),
        v,
      );
      held = i === null ? null : inputs[i]!;
    }
    if (held) setValue(held, v);
  };

  dual.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    pressed = true;
    held = null;
    dual.setPointerCapture(e.pointerId);
    move(e.clientX);
    (held ?? inputs[0]!).focus({ preventScroll: true });
  });
  dual.addEventListener('pointermove', (e) => {
    if (pressed) move(e.clientX);
  });
  const release = (): void => {
    pressed = false;
    held = null;
  };
  dual.addEventListener('pointerup', release);
  dual.addEventListener('pointercancel', release);
}
