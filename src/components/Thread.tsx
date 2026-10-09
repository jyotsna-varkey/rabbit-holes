import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Rope, type Pt } from '../lib/rope';

export type ThreadHandle = {
  /**
   * Pin the thread to `pins` (consecutive pairs make spans) and advance the
   * physics by `frameDt` seconds. `slack` is per span or shared.
   */
  update(pins: Pt[], slack: number | number[], frameDt: number, gravity?: Pt): void;
  /** Drop the first k spans and keep the rest, so a thread can move on without snapping. */
  shift(k: number): void;
  /** Forget every span; each is laid straight on the next update and falls into place. */
  reset(): void;
};

type Props = {
  spans: number;
  colors: string[];
  className?: string;
  strokeWidth?: number;
  points?: number;
};

const STEP = 1 / 120;

export const Thread = forwardRef<ThreadHandle, Props>(function Thread(
  { spans, colors, className, strokeWidth = 2, points = 18 },
  ref,
) {
  const ropes = useRef<(Rope | null)[]>([]);
  const mains = useRef<(SVGPathElement | null)[]>([]);
  const shadows = useRef<(SVGPathElement | null)[]>([]);
  const carry = useRef(0);

  useImperativeHandle(ref, () => ({
    update(pins, slack, frameDt, gravity) {
      carry.current = Math.min(carry.current + frameDt, STEP * 6);
      let steps = 0;
      while (carry.current >= STEP) {
        carry.current -= STEP;
        steps++;
      }
      for (let s = 0; s < spans; s++) {
        const a = pins[s];
        const b = pins[s + 1];
        if (!a || !b) continue;
        let rope = ropes.current[s];
        if (!rope) rope = ropes.current[s] = new Rope(points, a, b);
        // If an end jumped (a page changed under it), start the span straight and let it fall.
        const [pa, pb] = rope.ends();
        if (Math.hypot(pa.x - a.x, pa.y - a.y) > 140 || Math.hypot(pb.x - b.x, pb.y - b.y) > 140) rope.reset(a, b);
        const sl = Array.isArray(slack) ? slack[s] ?? 1.03 : slack;
        // A taut span is a straight line; skipping the physics also clears any leftover bunching.
        if (sl <= 1.0001) rope.reset(a, b);
        else for (let i = 0; i < steps; i++) rope.step(a, b, sl, STEP, gravity?.x ?? 0, gravity?.y ?? 2200);
        const d = rope.path();
        mains.current[s]?.setAttribute('d', d);
        shadows.current[s]?.setAttribute('d', d);
      }
    },
    shift(k) {
      ropes.current = ropes.current.slice(k);
    },
    reset() {
      ropes.current = [];
    },
  }), [spans, points]);

  return (
    <svg className={className} aria-hidden="true">
      {Array.from({ length: spans }, (_, s) => (
        <g key={s} visibility={colors[s] === 'transparent' ? 'hidden' : undefined}>
          <path
            ref={(el) => { shadows.current[s] = el; }}
            className="thread-shadow"
            transform="translate(1.2 3)"
            strokeWidth={strokeWidth + 1.5}
          />
          <path
            ref={(el) => { mains.current[s] = el; }}
            className="thread-main"
            style={{ stroke: colors[s] ?? colors[colors.length - 1] }}
            strokeWidth={strokeWidth}
          />
        </g>
      ))}
    </svg>
  );
});
