import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  citationRange, holesAsset, pageOf, passageUrl, type Hole,
} from '../content';
import { Infobox } from '../components/Infobox';
import { Thread, type ThreadHandle } from '../components/Thread';
import { isKept, keep, markFinished, unkeep } from '../lib/storage';
import { tick } from '../lib/haptics';
import type { Pt } from '../lib/rope';
import { edgePull, type PullKind } from '../lib/edgePull';

export type EndingHandle = {
  /** Where the hole's thread plugs into the destination card. */
  socket(): Pt | null;
};

type Props = {
  hole: Hole;
  top: number;
  height: number;
  active: boolean;
  onNext(): void;
  /** Scrolling up past the top of the ending pulls back to the last page. */
  onPull(dist: number, kind: PullKind): boolean | void;
  onPullEnd(dist: number, kind: PullKind): void;
};

/** Centre of a dot inside the journey list, in the list's own coordinates. */
function dotCentre(dot: HTMLElement | null, list: HTMLElement | null): Pt | null {
  if (!dot || !list) return null;
  const d = dot.getBoundingClientRect();
  const l = list.getBoundingClientRect();
  return { x: d.left - l.left + d.width / 2, y: d.top - l.top + d.height / 2 };
}

/** Section names as a reader would say them. */
const sectionLabel = (section: string) => (section === 'lead' ? 'Introduction' : section);

export const Ending = forwardRef<EndingHandle, Props>(function Ending(
  { hole, top, height, active, onNext, onPull, onPullEnd },
  ref,
) {
  const scroller = useRef<HTMLDivElement>(null);
  const cb = useRef({ active, onPull, onPullEnd });
  cb.current = { active, onPull, onPullEnd };
  useEffect(() => edgePull(scroller.current!, {
    edge: 'top',
    enabled: () => cb.current.active,
    onMove: (d, kind) => cb.current.onPull(d, kind),
    onEnd: (d, kind) => cb.current.onPullEnd(d, kind),
  }), []);
  const journey = useRef<HTMLOListElement>(null);
  const right = useRef<HTMLElement>(null);
  const thread = useRef<ThreadHandle>(null);
  // Dots the thread runs through: start card, each knot, end card.
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const [stage, setStage] = useState(0); // 0 waiting · 1 swung in · 2 locked · 3 cited · 4 references
  const [kept, setKept] = useState(() => isKept(hole.id));
  const n = hole.knots.length;
  const last = hole.knots[hole.knots.length - 1];

  useImperativeHandle(ref, () => ({
    socket() {
      const dot = dots.current[n + 1];
      if (!dot) return null;
      const box = dot.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    },
  }));

  // The fall (PLAN step 45): the beads you followed down the margin drop, on
  // their thread, into the diagonal journey. Each starts where it hung in the
  // margin column (the last one beside where its passage was) and falls into
  // its place on the diagonal; the thread is drawn through them all the way.
  const falling = useRef(false);
  const fall = () => {
    const section = journey.current?.closest('section');
    if (!section || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = section.getBoundingClientRect();
    const claim = section.querySelector('.end-claim')?.getBoundingClientRect();
    const marginX = Math.max(22, (claim ? claim.left - box.left : 16) - 24);
    const restY = box.height * 0.42;
    falling.current = true;
    for (let k = 0; k < n; k++) {
      const bead = dots.current[k + 1];
      if (!bead) continue;
      const r = bead.getBoundingClientRect();
      const fx = r.left - box.left + r.width / 2, fy = r.top - box.top + r.height / 2;
      const sx = marginX + (k % 2 ? 3 : -3), sy = restY - (n - 1 - k) * 46;
      bead.style.transition = 'none';
      bead.style.transform = `translate(${(sx - fx).toFixed(1)}px, ${(sy - fy).toFixed(1)}px)`;
    }
    void journey.current?.offsetWidth; // start from the margin before falling
    requestAnimationFrame(() => {
      for (let k = 0; k < n; k++) {
        const bead = dots.current[k + 1];
        if (!bead) continue;
        // Held a beat in the margin column while the page lands, then they drop.
        bead.style.transition = `transform 1.05s cubic-bezier(0.34, 1.2, 0.5, 1) ${300 + k * 70}ms, box-shadow 0.35s ${260 * k + 900}ms`;
        bead.style.transform = '';
      }
      setTimeout(() => { falling.current = false; }, 1350 + n * 70);
    });
  };

  useEffect(() => {
    if (!active) return;
    markFinished(hole.id);
    fall();
    const timers = [
      setTimeout(() => setStage(1), 40),
      setTimeout(() => { setStage(2); tick(); }, 1300),
      setTimeout(() => setStage(3), 1300 + 260 * n + 300),
      setTimeout(() => setStage(4), 1300 + 260 * n + 800),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hole.id, n]);

  // The pages sit on one straight diagonal, from the start card (top left) to
  // the end card (bottom right): each row's picture goes where the line is at
  // that height. Names sit on the side away from the line.
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const placeOnDiagonal = () => {
    const list = journey.current;
    const s = dotCentre(dots.current[0], list);
    const e = dotCentre(dots.current[n + 1], list);
    if (!list || !s || !e || e.y <= s.y) return;
    for (const li of rows.current) {
      if (!li) continue;
      const t = (li.offsetTop + li.offsetHeight / 2 - s.y) / (e.y - s.y);
      const x = `${Math.round(s.x + t * (e.x - s.x))}px`;
      const side = s.x + t * (e.x - s.x) <= list.clientWidth / 2 ? 'right' : 'left';
      if (li.style.getPropertyValue('--x') !== x) li.style.setProperty('--x', x);
      if (li.dataset.side !== side) li.dataset.side = side;
    }
  };

  // The full thread, start card to end card, through every page on the way.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      placeOnDiagonal();
      const pins = dots.current.map((d) => dotCentre(d, journey.current));
      // While the beads fall the thread hangs a little loose, then pulls taut.
      if (pins.length === n + 2 && pins.every(Boolean)) thread.current?.update(pins as Pt[], falling.current ? 1.03 : 1.0, dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const toggleKeep = () => {
    if (kept) unkeep(hole.id);
    else keep(hole.id);
    setKept(!kept);
  };

  return (
    <section className={`page ending stage-${stage}`} style={{ top, height }} aria-label="The hole, cited">
      <div ref={scroller} className="page-scroll">
        <p className="end-kicker">Rabbit hole · {n} knots</p>
        <h1 className="end-claim">
          {hole.claim}
          <span className="cite-swap">
            <sup className="cn">[<i>citation needed</i>]</sup>
            <sup className="cited">{citationRange(hole.knots.length)}</sup>
          </span>
        </h1>
        <p className="end-payoff">{hole.payoff}</p>

        {/* The whole journey: start card, every page the thread passed through, end card. */}
        <ol ref={journey} className="journey end-diagram" aria-label="The pages this hole passed through">
          <Thread
            ref={thread}
            spans={n + 1}
            colors={Array(n + 1).fill(stage >= 2 ? 'var(--visited)' : 'var(--thread)')}
            className="end-thread"
            points={12}
          />
          <li className="j-card j-start">
            <span ref={(el) => { dots.current[0] = el; }} className="j-cap" />
            <Infobox endpoint={hole.start} className="end-left" credit={false} />
          </li>
          {hole.knots.map((k, i) => {
            const img = pageOf(k.page)?.image;
            return (
              <li key={i} ref={(el) => { rows.current[i] = el; }} className="j-knot" data-side="right">
                <a href={passageUrl(k)} target="_blank" rel="noopener">
                  {/* The page's picture is the knot: the thread runs through it. */}
                  <span
                    ref={(el) => { dots.current[i + 1] = el; }}
                    className="end-knot"
                    style={{ transitionDelay: `${260 * i}ms` }}
                  >
                    {img ? <img src={holesAsset(img.file) ?? ''} alt="" loading="lazy" /> : <span className="j-noimg" />}
                  </span>
                  <span className="j-text">
                    <span className="j-title">{k.page}<sup>[{i + 1}]</sup></span>
                    <span className="j-section">{sectionLabel(k.section)}</span>
                  </span>
                </a>
              </li>
            );
          })}
          <li className="j-card j-end">
            <span ref={(el) => { dots.current[n + 1] = el; }} className="j-cap" />
            <Infobox ref={right} endpoint={hole.end} className="end-right" credit={false} />
          </li>
        </ol>

        <div className="end-after">
          <h2 className="wk-h2">References</h2>
          <ol className="refs">
            {hole.knots.map((k, i) => (
              <li key={i}>
                <a className="ref-up" href={passageUrl(k)} target="_blank" rel="noopener" aria-label={`Open ${k.page} at this passage`}>^</a>{' '}
                <a href={passageUrl(k)} target="_blank" rel="noopener"><i>{k.page}</i></a>
                {'. '}
                {k.hatnote}
              </li>
            ))}
          </ol>

          <nav className="doors" aria-label="What next">
            <a className="door" href={passageUrl(last)} target="_blank" rel="noopener">
              <span className="door-title">Go deeper</span>
              <span className="door-sub">Open {last.page} on Wikipedia at the last passage, or any reference above</span>
            </a>
            <button className="door" onClick={onNext}>
              <span className="door-title">Next hole</span>
              <span className="door-sub">Back to the stack</span>
            </button>
            <button className={`door ${kept ? 'is-kept' : ''}`} onClick={toggleKeep} aria-pressed={kept}>
              <span className="door-title">{kept ? 'On your shelf' : 'Keep it'}</span>
              <span className="door-sub">{kept ? 'Tap to take it off' : 'Add this proven claim to your shelf'}</span>
            </button>
          </nav>

          <footer className="art-foot">
            Passages quoted from English Wikipedia, available under{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>:{' '}
            {[...new Set(hole.knots.map((k) => k.page))].map((t, i) => (
              <span key={t}>
                {i > 0 && ', '}
                <a href={pageOf(t).permalink} target="_blank" rel="noopener">{t}</a>
              </span>
            ))}
            . Images:{' '}
            {[hole.start, hole.end].map((e, i) => {
              const c = pageOf(e.page).image?.credit;
              return c ? (
                <span key={i}>
                  {i > 0 && '; '}
                  <a href={c.filePage} target="_blank" rel="noopener">{c.artist}</a>, {c.license}
                </span>
              ) : null;
            })}
            . Claims and bridge lines are ours.
          </footer>
        </div>
      </div>
    </section>
  );
});
