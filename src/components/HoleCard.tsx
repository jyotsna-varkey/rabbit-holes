import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { MotionValue } from 'framer-motion';
import type { Hole } from '../content';
import { Infobox } from './Infobox';
import { Thread, type ThreadHandle } from './Thread';

export type HoleCardHandle = {
  /** Screen rect of the left endpoint, where the tumble starts. */
  startRect(): DOMRect | null;
};

type Props = {
  hole: Hole;
  /** Card tilt in degrees; the thread swings with it. */
  rotate?: MotionValue<number>;
  taut?: boolean;
  live: boolean;
};

export const HoleCard = forwardRef<HoleCardHandle, Props>(function HoleCard({ hole, rotate, taut, live }, ref) {
  const ends = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLElement>(null);
  const right = useRef<HTMLElement>(null);
  const thread = useRef<ThreadHandle>(null);
  const tautRef = useRef(taut);
  tautRef.current = taut;

  useImperativeHandle(ref, () => ({
    startRect: () => left.current?.getBoundingClientRect() ?? null,
  }));

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let slack = 1.06;
    let settle = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const l = left.current;
      const r = right.current;
      if (l && r) {
        // From under the start card, across to the side of the end card.
        const a = { x: l.offsetLeft + l.offsetWidth * 0.5, y: l.offsetTop + l.offsetHeight - 1 };
        const b = { x: r.offsetLeft + 1, y: r.offsetTop + r.offsetHeight * 0.5 };
        const want = tautRef.current ? 1.0 : 1.06;
        slack += (want - slack) * Math.min(1, dt * (tautRef.current ? 30 : 6));
        // Gravity in the card's own frame, so tilting the card swings the thread.
        const deg = rotate?.get() ?? 0;
        const rad = (-deg * Math.PI) / 180;
        const g = 2200;
        thread.current?.update([a, b], slack, dt, { x: -Math.sin(rad) * g, y: Math.cos(rad) * g });
      }
      // Cards behind the top one only need to settle once.
      settle += dt;
      if (live || settle < 1.5) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [live, rotate]);

  return (
    <article className="card">
      <p className="card-claim">
        {hole.claim}
        <sup className="cn">[<i>citation needed</i>]</sup>
      </p>
      <div ref={ends} className="card-ends">
        <Thread ref={thread} spans={1} colors={['var(--thread)']} className="card-thread" points={20} />
        <Infobox ref={left} endpoint={hole.start} className="end-left" />
        <Infobox ref={right} endpoint={hole.end} className="end-right" />
      </div>
      <p className="card-meta">
        {hole.knots.length} knots · about {hole.minutes} min
      </p>
    </article>
  );
});
