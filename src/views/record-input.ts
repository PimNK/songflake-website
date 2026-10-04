// Pointer input on the record canvas: wheel and pinch zoom anchored at the pointer, drag to turn
// the disc, hover, and click/tap. A drag over 4 px is not a click. Wiring only — no layout maths.

export interface RecordInputHandlers {
  zoom(): number;
  zoomAt(zoom: number, x: number, y: number): void;
  /** The pointer moved from (x0, y0) to (x1, y1) while pressed, in canvas px. */
  drag(x0: number, y0: number, x1: number, y1: number): void;
  hover(x: number, y: number, touch: boolean): void;
  leave(): void;
  click(x: number, y: number): void;
  dragging(on: boolean): void;
}

const CLICK_SLOP = 4;

type Local = (e: { clientX: number; clientY: number }) => [number, number];

export function attachRecordInput(canvas: HTMLCanvasElement, h: RecordInputHandlers): void {
  const local: Local = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const [x, y] = local(e);
      h.zoomAt(h.zoom() * Math.exp(-e.deltaY * 0.0015), x, y);
    },
    { passive: false },
  );
  attachPointers(canvas, h, local);
}

function attachPointers(canvas: HTMLCanvasElement, h: RecordInputHandlers, local: Local): void {
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = 0;
  let pinch: { d: number; z: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), z: h.zoom() };
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) {
      const [x, y] = local(e);
      h.hover(x, y, e.pointerType === 'touch');
      return;
    }
    const [x0, y0] = local({ clientX: p.x, clientY: p.y });
    const [x1, y1] = local(e);
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.size === 1) {
      h.drag(x0, y0, x1, y1);
      moved += Math.abs(x1 - x0) + Math.abs(y1 - y0);
      if (moved > CLICK_SLOP) h.dragging(true);
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const [mx, my] = local({ clientX: (a!.x + b!.x) / 2, clientY: (a!.y + b!.y) / 2 });
      h.zoomAt((pinch.z * Math.hypot(a!.x - b!.x, a!.y - b!.y)) / pinch.d, mx, my);
      moved += 10;
    }
  });

  const up = (e: PointerEvent): void => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) h.dragging(false);
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => h.leave());
  canvas.addEventListener('click', (e) => {
    if (moved > CLICK_SLOP) return;
    const [x, y] = local(e);
    h.click(x, y);
  });
}
