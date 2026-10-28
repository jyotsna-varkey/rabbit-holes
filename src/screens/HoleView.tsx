import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { holesAsset, pageOf, type Hole } from '../content';
import { ArticlePage, type ArticlePageHandle } from '../components/ArticlePage';
import { MarginRope } from '../lib/marginRope';
import { Ending, type EndingHandle } from './Ending';
import { tick } from '../lib/haptics';
import { hasPulled, markPulled } from '../lib/storage';
import type { PullKind } from '../lib/edgePull';
import type { Pt } from '../lib/rope';

type Props = {
  hole: Hole;
  /** Screen rect of the swiped card, which grows into the page. */
  from: DOMRect | null;
  /** How fast the swipe was going (progress units per second), carried into the grow. */
  fling?: number;
  onClose(): void;
  onNext(): void;
  onSettled(): void;
};

type Phase = 'tumble' | 'reading' | 'ending';

// The margin thread (PLAN step 43): rope this much longer than the gap between
// two beads hangs loose; reading the article it's paid out further, to the dock.
const REST_SLACK = 1.035;
const DOCK_SLACK = 1.12;
// Beads: the current page's is larger. Previous and next rest at these screen
// edges until their passage is on screen, so the thread always shows both ways.
const BEAD_R = { cur: 13, side: 9 };
const EDGE_TOP = 74;
const EDGE_BOTTOM = 30;
// The beads zigzag slightly either side of the margin's centre line.
const ZIG = 3;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function HoleView({ hole, from, fling = 0, onClose, onNext, onSettled }: Props) {
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
  // Where the track rests (it glides on a spring between pages); the pull is
  // added on top of it every frame, so a new gesture can start while it glides.
  const base = useMotionValue(0);
  // Pulling (see onPull): READY px of pull to move on, the wheel at WHEEL_SNAP;
  // the track follows the pull at FOLLOW and the passage lifts at LIFT.
  const READY = 70;
  const WHEEL_SNAP = 110;
  const FOLLOW = 0.35;
  const LIFT = 0.3;
  const pullState = useRef({ f: 0, fv: 0, engaged: false, ready: false, reel: null as null | { last: number; notch: number } });

  const live = useRef({ index: 0, size, phase, pulling: false, busy: false });
  live.current.index = index;
  live.current.size = size;
  live.current.phase = phase;

  const pages = useRef(new Map<number, ArticlePageHandle>());
  const ending = useRef<EndingHandle>(null);
  const dock = useRef<HTMLButtonElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const beadEls = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const el = root.current!;
    const ro = new ResizeObserver(() => {
      const next = { w: el.clientWidth, h: el.clientHeight };
      setSize(next);
      if (!live.current.busy) base.set((live.current.phase === 'ending' ? n : live.current.index) * next.h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [base, n]);

  // The tumble: the start card grows into the article it stands for.
  const grow = useMotionValue(from ? 0 : 1);
  const tumbleTransform = useTransform(grow, (raw) => {
    if (!from) return 'none';
    // The spring may overshoot; the page never grows past the screen.
    const p = Math.min(1, raw);
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
  // The page fades in as it grows, over the card it grows out of.
  const tumbleOpacity = useTransform(grow, [0, 0.4], [from ? 0.2 : 1, 1]);

  // Only the first arrival glides down from the top of the article. Coming back
  // to the first page later (it is rebuilt) opens straight on the passage.
  const entered = useRef(false);
  useEffect(() => {
    const land = () => {
      entered.current = true;
      setPhase('reading');
      onSettled();
    };
    // The page settles onto the passage while it grows: one motion, no pause.
    requestAnimationFrame(() => pages.current.get(0)?.arrive());
    if (!from) {
      land();
      return;
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // One spring, carrying the swipe's speed (PLAN step 44).
    const ctl = animate(grow, 1, {
      ...(reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 190, damping: 26, velocity: Math.min(2.5, fling), restDelta: 0.002 }),
      onComplete: land,
    });
    return () => ctl.stop();
    // Runs once, on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Moving between pages. The page name, knots and thread switch the moment a
  // move starts; the pages then glide on a spring.
  const moves = useRef(0);
  const slide = useCallback((to: number, velocity = 0) => {
    const L = live.current;
    const run = ++moves.current;
    L.busy = true;
    // Start the glide from wherever the pull has the track now, so nothing jumps.
    const S = pullState.current;
    base.set(base.get() + S.f * FOLLOW);
    S.f = 0;
    S.fv = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // A spring that carries the gesture's speed (PLAN step 44), like the preview.
    animate(base, to * L.size.h, reduced
      ? { type: 'tween', duration: 0.12 }
      : { type: 'spring', stiffness: 150, damping: 17, velocity, restDelta: 0.5, restSpeed: 10 });
    // Gestures are held off only briefly, so a reader can pull again while the page settles.
    setTimeout(() => { if (moves.current === run) live.current.busy = false; }, reduced ? 120 : 260);
  }, [base]);

  const cancel = useCallback(() => {
    const L = live.current;
    animate(base, (L.phase === 'ending' ? n : L.index) * L.size.h, { type: 'spring', stiffness: 520, damping: 34 });
  }, [n, base]);

  const commit = useCallback((power = 60) => {
    const L = live.current;
    if (L.phase !== 'reading') return;
    markPulled();
    tick();
    recoilAt.current = performance.now();
    const i = L.index;
    if (i + 1 < n) {
      L.index = i + 1;
      setIndex(i + 1);
      setFocused(true);
    } else {
      L.phase = 'ending';
      setPhase('ending');
    }
    slide(i + 1, 450 + power * 5);
  }, [n, slide]);

  // Back to an earlier page (a visited knot in the top bar, ←, or pulling up
  // past the top of the ending). The first page has nothing before it.
  const goTo = useCallback((to: number, power = 60) => {
    const L = live.current;
    if (L.phase !== 'reading' && L.phase !== 'ending') return;
    const at = L.phase === 'ending' ? n : L.index;
    if (to < 0 || to >= at) return cancel();
    tick();
    recoilAt.current = performance.now();
    L.index = to;
    L.phase = 'reading';
    setIndex(to);
    setPhase('reading');
    setFocused(true);
    slide(to, -(450 + power * 5));
  }, [n, slide, cancel]);
  const back = useCallback((power = 60) => {
    const L = live.current;
    goTo(L.phase === 'ending' ? n - 1 : L.index - 1, power);
  }, [n, goTo]);

  // Pulling the thread (PLAN step 44, from the approved preview). The pull f
  // (> 0 towards the next page) grows with the finger against a soft
  // resistance; past READY there's a buzz and letting go moves on, as does a
  // quick flick. Holding reels it in notch by notch, faster as it goes. The
  // wheel moves on at WHEEL_SNAP. Short of that, everything springs back. The
  // page follows the pull a little and the passage lifts with it.
  const tension = useRef(0);
  const recoilAt = useRef(-1e9);
  const canBack = () => live.current.phase === 'ending' || live.current.index > 0;
  const canForward = () => live.current.phase === 'reading';
  /** Raw travel (px) → pull, with resistance; the first page only gives a little backwards. */
  const toPull = (raw: number, kind: PullKind) => {
    if (kind === 'wheel') return raw * 0.55;
    if (raw >= 0) return canForward() ? 200 * (1 - Math.exp(-raw / 200)) : Math.min(18, raw * 0.15);
    return canBack() ? -200 * (1 - Math.exp(raw / 200)) : Math.max(-18, raw * 0.15);
  };
  const go = (dir: 1 | -1, power: number) => {
    const S = pullState.current;
    S.engaged = false; S.ready = false; S.reel = null;
    if (dir > 0) commit(power);
    else back(power);
  };
  const onPull = (raw: number, kind: PullKind) => {
    const L = live.current, S = pullState.current;
    if (L.busy || (L.phase !== 'reading' && L.phase !== 'ending')) return true;
    if (kind === 'wheel') {
      if (raw >= WHEEL_SNAP && canForward()) { go(1, 90); return true; }
      if (raw <= -WHEEL_SNAP && canBack()) { go(-1, 90); return true; }
    }
    S.engaged = true;
    S.f = toPull(raw, kind);
    S.fv = 0;
    const ready = Math.abs(S.f) > READY && (S.f > 0 ? canForward() : canBack());
    if (ready && !S.ready) tick();
    S.ready = ready;
    return false;
  };
  const onPullEnd = (_raw: number, kind: PullKind, velocity: number) => {
    const S = pullState.current;
    const f = S.f;
    S.engaged = false;
    const flick = kind === 'touch' && Math.abs(velocity) > 0.5 && Math.abs(f) > 22;
    if (!live.current.busy && (S.ready || flick)) {
      if (f > 0 && canForward()) return go(1, Math.abs(f));
      if (f < 0 && canBack()) return go(-1, Math.abs(f));
    }
    S.ready = false;
  };
  const onHold = () => {
    const L = live.current, S = pullState.current;
    if (L.busy || !canForward()) return;
    S.engaged = true;
    S.reel = { last: performance.now(), notch: 0 };
    tick();
  };
  const onHoldEnd = () => {
    const S = pullState.current;
    if (S.reel) { S.reel = null; S.engaged = false; }
  };
  const onTapPassage = () => {
    if (!live.current.busy && canForward()) go(1, 60);
  };
  // The ending scrolls normally; pulling past its top goes back (edgePull: dist ≥ 0).
  const onEndingPull = (dist: number, kind: PullKind) => (live.current.phase === 'ending' ? onPull(-dist, kind) : true);
  const onEndingRelease = (dist: number, kind: PullKind) => onPullEnd(-dist, kind, 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Reading the article, Esc goes back to the thread; on the thread it leaves the hole.
      if (e.key === 'Escape') {
        if (!focusedRef.current && live.current.phase === 'reading') pages.current.get(live.current.index)?.recenter();
        else onClose();
      }
      if (!focusedRef.current) return; // reading the article: arrows scroll it
      if (e.key === 'ArrowDown' && live.current.phase === 'reading') {
        e.preventDefault();
        commit();
      }
      if (e.key === 'ArrowUp' && live.current.phase === 'reading' && live.current.index > 0) {
        e.preventDefault();
        back();
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

  // One loop drives the thread, the beads and the focus veils (PLAN step 43).
  // The thread runs down the left margin from the previous page's bead to this
  // page's (beside the passage) and on to the next page's; it hangs loose,
  // tightens and thins as it's pulled, glints when taut, and never leaves the
  // margin. Reading the article, the lower half runs to the docked knot.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const up = new MarginRope();
    const lo = new MarginRope();
    let P: Pt | null = null, C: Pt | null = null, N: Pt | null = null;
    let baseUp = 200, baseLo = 200;
    let settledAt = 0, lastNudge = 0, nudgeAt = 0;
    const NUDGE = 40;
    const ease = (o: Pt | null, t: Pt | null, k: number): Pt | null => (t ? (o ? { x: lerp(o.x, t.x, k), y: lerp(o.y, t.y, k) } : { ...t }) : null);
    const frame = (now: number) => {
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000));
      last = now;
      const L = live.current;
      const { h } = L.size;
      const i = L.index;
      for (const k of [i - 1, i, i + 1]) pages.current.get(k)?.tick();

      // The pull: springs back when nothing holds it; a held press reels it in.
      const S = pullState.current;
      if (S.reel) {
        const gap = Math.max(45, 150 - S.reel.notch * 11);
        if (now - S.reel.last > gap) {
          S.reel.last = now;
          S.reel.notch++;
          tick();
          S.f = Math.min(READY + 10, S.f + 9);
          if (S.f >= READY + 4) go(1, 120);
        }
      } else if (nudgeAt) {
        // The nudge: a deliberate little tug (up over 0.2 s, held a beat), then let go.
        const e = (now - nudgeAt) / 1000;
        if (e < 0.32) S.f = NUDGE * Math.sin(Math.min(1, e / 0.2) * (Math.PI / 2));
        else { nudgeAt = 0; S.fv = 0; }
      } else if (!S.engaged) {
        const a = -360 * S.f - 22 * S.fv;
        S.fv += a * dt;
        S.f += S.fv * dt;
        if (Math.abs(S.f) < 0.3 && Math.abs(S.fv) < 4) { S.f = 0; S.fv = 0; }
      }
      // The nudge: until a reader's first pull, the thread tugs up every few seconds.
      if (S.engaged || L.busy) nudgeAt = 0; // a real pull or move takes over at once
      if (L.phase === 'reading' && !S.engaged && !L.busy && !nudgeAt && S.f === 0 && focusedRef.current && pages.current.get(i)?.settled()) {
        settledAt ||= now;
        if (now - settledAt > 1200 && now - lastNudge > 4200 && !hasPulled()) { lastNudge = now; nudgeAt = now; }
      } else settledAt = 0;
      tension.current = Math.min(1, Math.abs(S.f) / READY);
      offset.set(base.get() + S.f * FOLLOW);
      pages.current.get(i)?.lift(L.phase === 'reading' ? S.f * LIFT : 0);
      const svgEl = svg.current;
      const rootBox = root.current!.getBoundingClientRect();
      const local = (p: { x: number; y: number } | null | undefined) => (p ? { x: p.x - rootBox.left, y: p.y - rootBox.top } : null);
      const bead = pages.current.get(i)?.bead();
      const cur = local(bead);
      const reading = !focusedRef.current && L.phase === 'reading';
      const zig = (k: number) => (k % 2 ? ZIG : -ZIG);
      const pin = (k: number): Pt | null => {
        if (k < 0 || k >= n) return null;
        const b = local(pages.current.get(k)?.bead());
        const x = (cur?.x ?? 22) + zig(k);
        if (!b) return k < i ? { x, y: EDGE_TOP } : { x, y: h - EDGE_BOTTOM };
        return { x, y: k < i ? Math.max(EDGE_TOP, b.y) : k > i ? Math.min(h - EDGE_BOTTOM, b.y) : b.y };
      };
      P = ease(P, pin(i - 1), 0.25);
      C = ease(C, cur ? { x: cur.x + zig(i), y: cur.y } : null, 0.36);
      N = ease(N, reading ? null : pin(i + 1), 0.25);
      // The rope may swing anywhere in the margin, never into the text.
      const bx = cur?.x ?? 22;
      const band = { min: Math.max(5, bx - 30), max: Math.max(12, (bead ? bead.textLeft - rootBox.left : 46) - 7) };

      // Reading the article: the dock sits at the bottom of the margin.
      const D = { x: cur?.x ?? 22, y: h - 36 };
      if (dock.current) dock.current.style.transform = `translate(${D.x}px, ${D.y}px)`;
      const lower = reading ? D : N;
      const t = tension.current;
      if (t < 0.01 && C) {
        if (P) baseUp = Math.hypot(C.x - P.x, C.y - P.y);
        if (lower) baseLo = Math.hypot(lower.x - C.x, lower.y - C.y);
      }
      // The recoil: a burst of slack just after a page arrives.
      const since = (now - recoilAt.current) / 1000;
      const recoil = since < 0.9 ? 0.04 * (1 - since / 0.9) : 0;
      // Pulling draws the rope in: from loose to dead straight as the pull nears the snap.
      const give = (base: number) => base * Math.max(1, REST_SLACK + recoil - (REST_SLACK - 1) * 1.2 * t);
      const secs = now / 1000;
      const upD = C && P ? up.step(P, C, give(baseUp), secs, 0, dt, band) : (up.reset(), '');
      const loD = C && lower ? lo.step(C, lower, reading ? baseLo * DOCK_SLACK : give(baseLo), secs, 2, dt, band)
        : C ? lo.hang(C, 46, secs, dt, band) : '';
      if (svgEl) {
        const tu = Math.min(1, Math.max(t, up.tension * 6)), tl = Math.min(1, Math.max(t, lo.tension * 6));
        const set = (id: string, d: string, w: number) => {
          for (const el of svgEl.querySelectorAll<SVGPathElement>(`[data-span="${id}"]`)) {
            el.setAttribute('d', d);
            const role = el.dataset.role;
            if (role === 'main') el.setAttribute('stroke-width', (2.4 - 1.3 * w).toFixed(2));
            if (role === 'shadow') el.setAttribute('stroke-width', (3.4 - 1.3 * w).toFixed(2));
            if (role === 'glint') { el.setAttribute('opacity', (w * 0.95).toFixed(2)); el.setAttribute('stroke-dashoffset', (-secs * 90).toFixed(1)); }
          }
        };
        set('up', upD, tu);
        set('lo', loD, tl);
        const halo = svgEl.querySelector<SVGCircleElement>('[data-role="halo"]');
        if (halo && C) {
          halo.setAttribute('cx', C.x.toFixed(1)); halo.setAttribute('cy', C.y.toFixed(1));
          halo.setAttribute('r', (16 + 8 * t).toFixed(1));
        }
      }
      root.current!.style.setProperty('--tension', t.toFixed(3));
      // The beads, each showing its page's picture.
      const place = (el: HTMLSpanElement | null | undefined, p: Pt | null, r: number) => {
        if (!el) return;
        if (!p) { el.style.visibility = 'hidden'; return; }
        el.style.visibility = 'visible';
        el.style.width = el.style.height = `${(r * 2).toFixed(1)}px`;
        el.style.transform = `translate(${(p.x - r).toFixed(1)}px, ${(p.y - r).toFixed(1)}px)`;
      };
      const pop = since < 0.45 ? 1 + 0.25 * Math.sin((since / 0.45) * Math.PI) : 1;
      place(beadEls.current[0], P, BEAD_R.side);
      place(beadEls.current[1], C, (BEAD_R.cur + 1.5 * t) * pop);
      place(beadEls.current[2], reading ? null : N, BEAD_R.side);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [n, offset, base]);

  const { h } = size;
  const shown = [index - 1, index, index + 1].filter((k) => k >= 0 && k < n);
  /** A bead shows its page's picture. */
  const beadStyle = (k: number) => { const f = k >= 0 && k < n ? pageOf(hole.knots[k].page)?.image?.file : undefined; const src = f ? holesAsset(f) : null; return src ? { backgroundImage: `url(${src})` } : undefined; };

  return (
    <div ref={root} className={`hole phase-${phase}`} role="dialog" aria-label={hole.claim}>
      <motion.div className="hole-backdrop" style={{ opacity: backdrop }} />
      <motion.div className="tumbler" style={{ transform: tumbleTransform, clipPath: tumbleClip, opacity: tumbleOpacity }}>
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
              arriveFromTop={k === 0 && !entered.current}
              active={k === index && phase === 'reading'}
              onFocusChange={(f) => { if (k === live.current.index) setFocused(f); }}
              onPull={onPull}
              onPullEnd={onPullEnd}
              onHold={onHold}
              onHoldEnd={onHoldEnd}
              onTapPassage={onTapPassage}
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
              onPullEnd={onEndingRelease}
            />
          )}
        </motion.div>
      </motion.div>

      <svg ref={svg} className="hole-thread" aria-hidden="true">
        {(['up', 'lo'] as const).map((id) => (
          <g key={id}>
            <path data-span={id} data-role="shadow" className="thread-shadow" transform="translate(1 2)" />
            <path data-span={id} data-role="main" className="thread-main" />
            <path data-span={id} data-role="glint" className="thread-glint" />
          </g>
        ))}
        <circle data-role="halo" className="thread-halo" r="16" />
      </svg>
      {[index - 1, index, index + 1].map((k, slot) => (
        <span
          key={slot}
          ref={(el) => { beadEls.current[slot] = el; }}
          className={`bead ${slot === 1 ? 'is-current' : ''}`}
          style={beadStyle(k)}
          aria-hidden="true"
        />
      ))}
      {/* Reading the article: the thread runs down to this knot. Click it to go back to the thread. */}
      <button
        ref={dock}
        className={`thread-dock ${!focused && phase === 'reading' ? 'is-shown' : ''}`}
        tabIndex={!focused && phase === 'reading' ? 0 : -1}
        aria-label="Back to the thread"
        onClick={() => pages.current.get(index)?.recenter()}
      >
        <span className="thread-dock-knot" />
      </button>

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
