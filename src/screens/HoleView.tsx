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
  onSettled(): void;
};

type Phase = 'tumble' | 'reading' | 'ending';

// The knot rests this far above the bottom edge.
const KNOT_LIFT = 56;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function HoleView({ hole, from, onClose, onNext, onSettled }: Props) {
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
      ...(reduced ? { duration: 0.15 } : { type: 'tween', duration: 0.55, ease: [0.22, 1, 0.36, 1] }),
      onComplete: arrive,
    });
    return () => ctl.stop();
    // Runs once, on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Moving between pages. The page name, knots and thread switch the moment a
  // move starts; the pages then slide in a short ease-out. A new tug during a
  // move simply retargets it, so quick tugs in a row each go one page.
  const moves = useRef(0);
  const slide = useCallback((to: number, velocity = 0) => {
    const L = live.current;
    const run = ++moves.current;
    L.busy = true;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    animate(offset, to * L.size.h, {
      type: 'tween',
      duration: reduced ? 0.12 : 0.32,
      ease: [0.22, 1, 0.36, 1],
      velocity,
    }).then(() => {
      if (moves.current === run) live.current.busy = false;
    });
  }, [offset]);

  const cancel = useCallback(() => {
    const L = live.current;
    animate(offset, (L.phase === 'ending' ? n : L.index) * L.size.h, { type: 'spring', stiffness: 520, damping: 34 });
  }, [n, offset]);

  const commit = useCallback((velocity = 0) => {
    const L = live.current;
    if (L.phase !== 'reading') return;
    setPulled(true);
    tick();
    const i = L.index;
    if (i + 1 < n) {
      thread.current?.shift(3);
      L.index = i + 1;
      setIndex(i + 1);
      setFocused(true);
    } else {
      L.phase = 'ending';
      setPhase('ending');
    }
    slide(i + 1, velocity);
  }, [n, slide]);

  // Back: the previous knot, or the last knot from the ending. The first page
  // has nothing before it (← and Esc still leave the hole).
  const back = useCallback((velocity = 0) => {
    const L = live.current;
    if (L.phase === 'reading' && L.index === 0) return cancel();
    if (L.phase !== 'reading' && L.phase !== 'ending') return;
    tick();
    const to = L.phase === 'ending' ? n - 1 : L.index - 1;
    thread.current?.reset();
    L.index = to;
    L.phase = 'reading';
    setIndex(to);
    setPhase('reading');
    setFocused(true);
    slide(to, velocity);
  }, [n, slide, cancel]);

  /** Where the track rests: the current page, or the ending after the last knot. */
  const restingAt = () => (live.current.phase === 'ending' ? n : live.current.index);


  // The same knot goes both ways: tug up for the next page, down for the
  // previous. A small tug is enough and it goes as soon as it's made, without
  // waiting for the finger to lift. Until then the pages give a little.
  const TUG = 14;
  const GIVE = 0.5;
  const drag = useRef<{ y0: number; done: boolean } | null>(null);
  const giveRef = useRef(0);
  const setGive = (g: number) => { giveRef.current = g; };
  const canGo = (dir: 1 | -1) => {
    const L = live.current;
    return dir > 0 ? L.phase === 'reading' : L.phase === 'ending' || (L.phase === 'reading' && L.index > 0);
  };
  const setDragGive = (raw: number) => {
    // Toward a page that exists: follow at half speed. Toward nothing: a stiff, short give.
    const g = canGo(raw > 0 ? 1 : -1) ? raw * GIVE : Math.sign(raw) * Math.min(18, Math.abs(raw) * 0.15);
    setGive(g);
    if (!live.current.busy) offset.set(restingAt() * live.current.size.h + g);
  };
  const endDrag = () => {
    drag.current = null;
    live.current.pulling = false;
    setGive(0);
  };
  const onKnotDown = (e: React.PointerEvent) => {
    const L = live.current;
    if (L.phase !== 'reading' && L.phase !== 'ending') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, done: false };
    L.pulling = true;
  };
  const onKnotMove = (e: React.PointerEvent): void => {
    const d = drag.current;
    if (!d || d.done) return;
    // A mouse that is no longer pressed (its release was lost) isn't pulling.
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) return onKnotUp(e);
    const raw = d.y0 - e.clientY; // upward positive
    if (Math.abs(raw) >= TUG && canGo(raw > 0 ? 1 : -1)) {
      d.done = true;
      setGive(0);
      if (raw > 0) commit();
      else back();
      return;
    }
    setDragGive(raw);
  };
  const onKnotUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const tapped = !d.done && Math.abs(d.y0 - e.clientY) < 6 && e.type === 'pointerup';
    endDrag();
    if (d.done) return;
    if (tapped) {
      if (live.current.phase === 'reading') commit();
      else back();
    } else if (!live.current.busy) cancel();
  };
  // A trackpad or mouse wheel over the knot scrolls the page under it.
  useEffect(() => {
    const el = knot.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      pages.current.get(live.current.index)?.scrollBy(e.deltaY * (e.deltaMode === 1 ? 32 : 1));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' && live.current.phase === 'reading') {
        e.preventDefault();
        commit();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        // On the first page ← leaves the hole; the knot only bounces there.
        if (live.current.phase === 'reading' && live.current.index === 0) onClose();
        else back();
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

      const pulledBy = giveRef.current;
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
        aria-label={
          phase === 'ending'
            ? 'Pull the thread down to go back'
            : index + 1 < n ? 'Pull the thread up for the next page, down to go back' : 'Pull the thread up to the end, down to go back'
        }
      >
        <span className="knot-dot" key={index} />
      </button>
      {!pulled && phase === 'reading' && <p className="pull-hint">Pull the thread ↑</p>}
      {phase === 'ending' && <p className="pull-hint">Pull down to go back ↓</p>}

      <header className="hole-bar">
        <button className="bar-close" onClick={onClose} aria-label="Back to the stack">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
        </button>
        <div className="bar-middle">
          <p className="bar-page" aria-live="polite">
            {phase === 'ending' ? 'The whole thread' : hole.knots[index].page}
          </p>
          <ol className="progress" aria-label={`Knot ${Math.min(index + 1, n)} of ${n}`}>
            {hole.knots.map((_, k) => (
              <li
                key={k}
                className={phase === 'ending' || k < index ? 'is-visited' : k === index ? 'is-current' : ''}
              />
            ))}
          </ol>
        </div>
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
