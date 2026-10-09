import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import type { Hole } from '../content';
import { ArticlePage, type ArticlePageHandle } from '../components/ArticlePage';
import { Thread, type ThreadHandle } from '../components/Thread';
import { Ending, type EndingHandle } from './Ending';
import { tick } from '../lib/haptics';
import type { Pt } from '../lib/rope';

type Props = {
  hole: Hole;
  /** Screen rect of the card's left endpoint, for the tumble. */
  from: DOMRect | null;
  onClose(): void;
  onNext(): void;
  onOpenHole(id: string): void;
  onSettled(): void;
};

type Phase = 'tumble' | 'reading' | 'ending';

// The knot rests this far above the bottom edge.
const KNOT_LIFT = 56;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function HoleView({ hole, from, onClose, onNext, onOpenHole, onSettled }: Props) {
  const n = hole.knots.length;
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(from ? 'tumble' : 'reading');
  const [focused, setFocused] = useState(true);
  const [pulled, setPulled] = useState(false);

  // Pages sit in one tall track; pulling the thread moves the track.
  const offset = useMotionValue(0);
  const trackY = useTransform(offset, (v) => -v);

  const live = useRef({ index: 0, size, phase, pulling: false, busy: false });
  live.current.index = index;
  live.current.size = size;
  live.current.phase = phase;

  const pages = useRef(new Map<number, ArticlePageHandle>());
  const ending = useRef<EndingHandle>(null);
  const thread = useRef<ThreadHandle>(null);
  const knot = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const el = root.current!;
    const ro = new ResizeObserver(() => {
      const next = { w: el.clientWidth, h: el.clientHeight };
      setSize(next);
      if (!live.current.busy) offset.set(live.current.index * next.h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [offset]);

  // The tumble: the start card grows into the article it stands for.
  const grow = useMotionValue(from ? 0 : 1);
  const tumbleTransform = useTransform(grow, (p) => {
    if (!from) return 'none';
    const s = lerp(from.width / size.w, 1, p);
    return `translate(${lerp(from.left, 0, p)}px, ${lerp(from.top, 0, p)}px) scale(${s})`;
  });
  const tumbleClip = useTransform(grow, (p) => {
    if (!from || p >= 1) return 'none';
    const s0 = from.width / size.w;
    const visible = lerp(from.height / s0, size.h, p);
    return `inset(0 0 ${size.h - visible}px 0 round ${lerp(10 / s0, 0, p)}px)`;
  });
  const backdrop = useTransform(grow, [0, 0.5], [0, 1]);

  useEffect(() => {
    const arrive = () => {
      setPhase('reading');
      onSettled();
      // Let the expanded page paint before it starts to scroll.
      requestAnimationFrame(() => pages.current.get(0)?.arrive());
    };
    if (!from) {
      arrive();
      return;
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctl = animate(grow, 1, {
      ...(reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 120, damping: 20, restDelta: 0.001 }),
      onComplete: arrive,
    });
    return () => ctl.stop();
    // Runs once, on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pulling the thread.
  const commit = useCallback(async (velocity = 0) => {
    const L = live.current;
    if (L.busy || L.phase !== 'reading') return;
    L.busy = true;
    setPulled(true);
    const i = L.index;
    await animate(offset, (i + 1) * L.size.h, { type: 'spring', stiffness: 210, damping: 30, velocity, restDelta: 0.5 });
    tick();
    if (i + 1 < n) {
      thread.current?.shift(3);
      live.current.index = i + 1;
      setIndex(i + 1);
      setFocused(true);
    } else {
      setPhase('ending');
    }
    L.busy = false;
  }, [n, offset]);

  // Back: the previous knot, the last knot from the ending, or the stack from the first knot.
  const back = useCallback(async () => {
    const L = live.current;
    if (L.busy) return;
    if (L.phase === 'reading' && L.index === 0) {
      onClose();
      return;
    }
    if (L.phase !== 'reading' && L.phase !== 'ending') return;
    L.busy = true;
    const to = L.phase === 'ending' ? n - 1 : L.index - 1;
    await animate(offset, to * L.size.h, { type: 'spring', stiffness: 210, damping: 30, restDelta: 0.5 });
    thread.current?.reset();
    live.current.index = to;
    setIndex(to);
    setPhase('reading');
    setFocused(true);
    L.busy = false;
  }, [n, offset, onClose]);

  const cancel = useCallback((velocity = 0) => {
    animate(offset, live.current.index * live.current.size.h, { type: 'spring', stiffness: 380, damping: 32, velocity });
  }, [offset]);

  const drag = useRef<{ y0: number; lastY: number; lastT: number; v: number; moved: boolean } | null>(null);
  const onKnotDown = (e: React.PointerEvent) => {
    if (live.current.busy || live.current.phase !== 'reading') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, lastY: e.clientY, lastT: performance.now(), v: 0, moved: false };
    live.current.pulling = true;
  };
  const onKnotMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const pulledBy = Math.max(0, d.y0 - e.clientY);
    if (pulledBy > 6) d.moved = true;
    const now = performance.now();
    d.v = (d.lastY - e.clientY) / Math.max(1, now - d.lastT); // px/ms, upward positive
    d.lastY = e.clientY;
    d.lastT = now;
    offset.set(live.current.index * live.current.size.h + pulledBy);
  };
  const onKnotUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    live.current.pulling = false;
    const pulledBy = Math.max(0, d.y0 - e.clientY);
    const v = d.v * 1000;
    if (!d.moved) commit();
    else if (pulledBy > live.current.size.h * 0.26 || d.v > 0.55) commit(v);
    else cancel(-v);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' && live.current.phase === 'reading') {
        e.preventDefault();
        commit();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commit, back, onClose]);

  // One loop drives the thread, the knot and the focus veils.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let slack = 1.035;
    const clampPt = (p: Pt, h: number): Pt => ({ x: p.x, y: Math.max(-260, Math.min(h + 260, p.y)) });
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const L = live.current;
      const { w, h } = L.size;
      const i = L.index;
      for (const k of [i - 1, i, i + 1]) pages.current.get(k)?.tick();

      const pulledBy = offset.get() - i * h;
      const rootBox = root.current!.getBoundingClientRect();
      const local = (p: Pt | null | undefined) => (p ? { x: p.x - rootBox.left, y: p.y - rootBox.top } : null);
      const kx = w / 2;
      const knotPt = { x: kx, y: h - KNOT_LIFT - pulledBy };
      const curPage = pages.current.get(i);
      const nextPage = i + 1 < n ? pages.current.get(i + 1) : null;
      // Down the margin into the hatnote, hidden behind the passage, out of the onward word, to the knot.
      const entry = local(curPage?.entry());
      const gx = entry?.x ?? 7;
      const curIn = entry ?? { x: gx, y: -200 };
      const curOut = local(curPage?.anchor()) ?? { x: kx, y: -200 };
      const nextIn = local(nextPage?.entry()) ?? local(ending.current?.socket()) ?? { x: gx, y: h + 200 };
      const nextOut = local(nextPage?.anchor()) ?? nextIn;
      const pins = [
        { x: gx, y: -40 }, clampPt(curIn, h), clampPt(curOut, h), knotPt,
        clampPt(nextIn, h), clampPt(nextOut, h), { x: kx, y: h + 320 },
      ];
      const want = L.pulling || L.busy ? 1.0 : 1.035;
      slack += (want - slack) * Math.min(1, dt * (want < slack ? 24 : 5));
      thread.current?.update(pins, [1.0, 1.0, slack, slack, 1.0, 1.02], dt);
      if (knot.current) knot.current.style.transform = `translate(${knotPt.x}px, ${knotPt.y}px)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [n, offset]);

  const { h } = size;
  const shown = [index - 1, index, index + 1].filter((k) => k >= 0 && k < n);

  return (
    <div ref={root} className={`hole phase-${phase}`} role="dialog" aria-label={hole.claim}>
      <motion.div className="hole-backdrop" style={{ opacity: backdrop }} />
      <motion.div className="tumbler" style={{ transform: tumbleTransform, clipPath: tumbleClip }}>
        <motion.div className="track" style={{ y: trackY }}>
          {shown.map((k) => (
            <ArticlePage
              key={k}
              ref={(el) => {
                if (el) pages.current.set(k, el);
                else pages.current.delete(k);
              }}
              knot={hole.knots[k]}
              top={k * h}
              height={h}
              arriveFromTop={k === 0}
              onFocusChange={(f) => { if (k === live.current.index) setFocused(f); }}
            />
          ))}
          {(index >= n - 2 || phase === 'ending') && (
            <Ending
              ref={ending}
              hole={hole}
              top={n * h}
              height={h}
              active={phase === 'ending'}
              onNext={onNext}
              onOpenHole={onOpenHole}
            />
          )}
        </motion.div>
      </motion.div>

      <Thread
        ref={thread}
        spans={6}
        colors={['var(--visited)', 'transparent', 'var(--thread)', 'var(--thread)', 'transparent', 'var(--thread)']}
        className="hole-thread"
      />

      <button
        ref={knot}
        className="knot"
        onPointerDown={onKnotDown}
        onPointerMove={onKnotMove}
        onPointerUp={onKnotUp}
        onPointerCancel={onKnotUp}
        aria-label={index + 1 < n ? 'Pull the thread to the next page' : 'Pull the thread to the end'}
      >
        <span className="knot-dot" key={index} />
      </button>
      {!pulled && phase === 'reading' && <p className="pull-hint">Pull the thread</p>}

      <header className="hole-bar">
        <button className="bar-close" onClick={onClose} aria-label="Back to the stack">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
        </button>
        <ol className="progress" aria-label={`Knot ${Math.min(index + 1, n)} of ${n}`}>
          {hole.knots.map((_, k) => (
            <li
              key={k}
              className={phase === 'ending' || k < index ? 'is-visited' : k === index ? 'is-current' : ''}
            />
          ))}
        </ol>
        <span className="bar-count">{phase === 'ending' ? 'Cited' : `${index + 1} / ${n}`}</span>
      </header>

      <button
        className={`back-to-thread ${!focused && phase === 'reading' ? 'is-shown' : ''}`}
        onClick={() => pages.current.get(index)?.recenter()}
        tabIndex={!focused && phase === 'reading' ? 0 : -1}
      >
        Back to the thread
      </button>
    </div>
  );
}
