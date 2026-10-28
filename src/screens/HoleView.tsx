import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import type { Hole } from '../content';
import { ArticlePage, type ArticlePageHandle } from '../components/ArticlePage';
import { Thread, type ThreadHandle } from '../components/Thread';
import { Ending, type EndingHandle } from './Ending';
import { tick } from '../lib/haptics';
import { hasPulled, markPulled } from '../lib/storage';
import type { PullKind } from '../lib/edgePull';
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

// The thread at rest is this much longer than the gap it spans: a slight give
// (a few px of sag over a screen-long span; more read as stretched and loose).
const REST_SLACK = 1.0001;
// Reading the article, the thread hangs this far down from its knot.
const HANG = 120;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function HoleView({ hole, from, onClose, onNext, onSettled }: Props) {
  const n = hole.knots.length;
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(from ? 'tumble' : 'reading');
  const [focused, setFocused] = useState(true);
  const focusedRef = useRef(focused);
  focusedRef.current = focused;

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
  const knotEl = useRef<HTMLSpanElement>(null);
  const tag = useRef<HTMLButtonElement>(null);

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
  // The first-time demo tug, while it plays; any real move stops it first.
  const demo = useRef<{ stop(): void } | null>(null);
  const slide = useCallback((to: number, velocity = 0) => {
    demo.current?.stop();
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
    markPulled();
    tick();
    recoilAt.current = performance.now();
    const i = L.index;
    if (i + 1 < n) {
      thread.current?.shift(2);
      L.index = i + 1;
      setIndex(i + 1);
      setFocused(true);
    } else {
      L.phase = 'ending';
      setPhase('ending');
    }
    slide(i + 1, velocity);
  }, [n, slide]);

  // Back to an earlier page (a visited knot in the top bar, ←, or pulling up
  // past the top of the ending). The first page has nothing before it.
  const goTo = useCallback((to: number) => {
    const L = live.current;
    if (L.phase !== 'reading' && L.phase !== 'ending') return;
    const at = L.phase === 'ending' ? n : L.index;
    if (to < 0 || to >= at) return cancel();
    tick();
    thread.current?.reset();
    recoilAt.current = performance.now();
    L.index = to;
    L.phase = 'reading';
    setIndex(to);
    setPhase('reading');
    setFocused(true);
    slide(to);
  }, [n, slide, cancel]);
  const back = useCallback(() => {
    const L = live.current;
    goTo(L.phase === 'ending' ? n - 1 : L.index - 1);
  }, [n, goTo]);

  /** Where the track rests: the current page, or the ending after the last knot. */
  const restingAt = () => (live.current.phase === 'ending' ? n : live.current.index);

  // Scrolling is the pull (PLAN step 41). Scrolling on past the end of the
  // passage pulls the thread: the pages follow at FOLLOW, the thread tightens
  // (a haptic tick at a third and two thirds), and at SNAP it snaps the next
  // page in without waiting for you to let go. Short of that, letting go drops
  // everything back. On the ending, pulling up past the top goes back.
  const FOLLOW = 0.55;
  const SNAP: Record<PullKind, number> = { touch: 72, wheel: 110 };
  const tension = useRef(0);
  const ticks = useRef(0);
  const recoilAt = useRef(-1e9);
  const settle = () => {
    tension.current = 0;
    ticks.current = 0;
    live.current.pulling = false;
  };
  const pull = (dist: number, kind: PullKind, dir: 1 | -1) => {
    const L = live.current;
    if (L.busy) return true;
    demo.current?.stop();
    const t = Math.min(1, dist / SNAP[kind]);
    tension.current = t;
    L.pulling = t > 0;
    const step = Math.floor(t * 3);
    if (step > ticks.current && step < 3) tick();
    ticks.current = step;
    if (t >= 1) {
      settle();
      if (dir > 0) commit();
      else back();
      return true;
    }
    offset.set(restingAt() * L.size.h + dir * dist * FOLLOW);
    return false;
  };
  const letGo = () => {
    settle();
    if (!live.current.busy) cancel();
  };
  const onPagePull = (dist: number, kind: PullKind) => (live.current.phase === 'reading' ? pull(dist, kind, 1) : true);
  const onEndingPull = (dist: number, kind: PullKind) => (live.current.phase === 'ending' ? pull(dist, kind, -1) : true);

  // A first-time reader sees the thread give a small tug by itself once the
  // passage has landed: no words, just the gesture (demo, declared above).
  useEffect(() => {
    if (phase !== 'reading' || index !== 0 || hasPulled()) return;
    let timer = 0;
    let landedAt = 0;
    // Wait for the passage to land, then a beat.
    const wait = () => {
      const page = pages.current.get(0);
      if (page?.settled()) landedAt ||= performance.now();
      else landedAt = 0;
      if (landedAt && performance.now() - landedAt > 900) tug();
      else timer = window.setTimeout(wait, 100);
    };
    const tug = () => {
      const L = live.current;
      if (L.pulling || L.busy || L.phase !== 'reading' || L.index !== 0) return;
      const rest = restingAt() * L.size.h;
      const ctl = animate(0, 1, {
        duration: 1.1,
        ease: 'linear',
        onUpdate: (p) => {
          // Up quickly, a beat taut, then back down.
          const v = p < 0.3 ? Math.sin((p / 0.3) * (Math.PI / 2)) : p < 0.45 ? 1 : Math.cos(((p - 0.45) / 0.55) * (Math.PI / 2));
          tension.current = v * 0.7;
          offset.set(rest + v * 24);
        },
        onComplete: () => { tension.current = 0; demo.current = null; },
      });
      demo.current = { stop: () => { ctl.stop(); tension.current = 0; demo.current = null; } };
    };
    wait();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

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

  // One loop drives the thread, its knot and the focus veils.
  // On the thread: down the margin into the hatnote, hidden behind the passage,
  // out of the onward link (where a small knot sits), and on down to the next
  // page's hatnote. Slightly slack at rest; pulling draws it dead straight,
  // thicker and brighter, trembling just before it snaps. After a snap it
  // recoils, and the new knot pops as it catches the thread. Reading the
  // article, the thread hangs loose from the knot; tap it to come back.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const clampPt = (p: Pt, h: number): Pt => ({ x: p.x, y: Math.max(-260, Math.min(h + 260, p.y)) });
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const L = live.current;
      const { w, h } = L.size;
      const i = L.index;
      for (const k of [i - 1, i, i + 1]) pages.current.get(k)?.tick();

      const rootBox = root.current!.getBoundingClientRect();
      const local = (p: Pt | null | undefined) => (p ? { x: p.x - rootBox.left, y: p.y - rootBox.top } : null);
      const kx = w / 2;
      const curPage = pages.current.get(i);
      const nextPage = i + 1 < n ? pages.current.get(i + 1) : null;
      const entry = local(curPage?.entry());
      const gx = entry?.x ?? 7;
      const curIn = entry ?? { x: gx, y: -200 };
      const curOut = local(curPage?.anchor()) ?? { x: kx, y: -200 };
      const nextIn = local(nextPage?.entry()) ?? local(ending.current?.socket()) ?? { x: gx, y: h + 200 };
      const nextOut = local(nextPage?.anchor()) ?? nextIn;

      const t = tension.current;
      // Trembling near the snap.
      const shake = t > 0.66 ? ((t - 0.66) / 0.34) * 3 : 0;
      const far = clampPt({ x: nextIn.x + (Math.random() - 0.5) * 2 * shake, y: nextIn.y + (Math.random() - 0.5) * shake }, h);
      const pins = [
        { x: gx, y: -40 }, clampPt(curIn, h), clampPt(curOut, h), far, clampPt(nextOut, h), { x: nextOut.x, y: h + 320 },
      ];
      // The recoil: a burst of slack just after a snap that settles back to rest.
      const since = (now - recoilAt.current) / 1000;
      const recoil = since < 0.9 ? 0.05 * (1 - since / 0.9) : 0;
      const slack = Math.max(1.0, REST_SLACK + recoil - (REST_SLACK - 1) * t * 1.4);
      const loose = !focusedRef.current && L.phase === 'reading';
      thread.current?.update(pins, [1.0, 1.0, slack, 1.0, 1.0], dt, undefined, [null, null, loose ? HANG : null, null, null]);
      root.current!.style.setProperty('--tension', t.toFixed(3));

      // The knot where the thread leaves the passage; it pops when it catches the thread.
      if (knotEl.current) {
        const pop = since < 0.45 ? 1 + 0.7 * Math.sin((since / 0.45) * Math.PI) * (1 - since / 0.45) : 1;
        knotEl.current.style.transform = `translate(${curOut.x}px, ${curOut.y}px) scale(${pop.toFixed(3)})`;
      }
      // Reading the article: the loose end is a tap target that brings the thread back.
      const end = loose ? thread.current?.end(2) : null;
      if (tag.current) {
        tag.current.style.transform = end ? `translate(${end.x}px, ${end.y}px)` : 'translate(-200px, -200px)';
      }
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
              active={k === index && phase === 'reading'}
              onFocusChange={(f) => { if (k === live.current.index) setFocused(f); }}
              onPull={onPagePull}
              onPullEnd={letGo}
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
              onPull={onEndingPull}
              onPullEnd={letGo}
            />
          )}
        </motion.div>
      </motion.div>

      <Thread
        ref={thread}
        spans={5}
        colors={['var(--visited)', 'transparent', 'var(--thread-live)', 'transparent', focused ? 'var(--thread)' : 'transparent']}
        className="hole-thread"
      />
      <span ref={knotEl} className="thread-knot" aria-hidden="true" />
      <button
        ref={tag}
        className="thread-tag"
        tabIndex={-1}
        aria-label="Back to the thread"
        onClick={() => pages.current.get(index)?.recenter()}
      />

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
              >
                {(phase === 'ending' || k < index) && (
                  <button className="progress-back" onClick={() => goTo(k)} aria-label={`Back to ${hole.knots[k].page}`} />
                )}
              </li>
            ))}
          </ol>
        </div>
        <span className="bar-count">{phase === 'ending' ? 'Cited' : `${index + 1} / ${n}`}</span>
      </header>

    </div>
  );
}
