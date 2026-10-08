import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  articleOf, citationRange, connections, endpointInfo, fragmentUrl, type Hole,
} from '../content';
import { Infobox } from '../components/Infobox';
import { Thread, type ThreadHandle } from '../components/Thread';
import { isKept, keep, markFinished, unkeep } from '../lib/storage';
import { tick } from '../lib/haptics';
import type { Pt } from '../lib/rope';

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
  onOpenHole(id: string): void;
};

/** Points the knots sit at, along a sagging curve from the start card to the end card. */
function knotPositions(n: number, a: Pt, b: Pt, sag: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / (n + 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + 4 * sag * t * (1 - t) };
  });
}

export const Ending = forwardRef<EndingHandle, Props>(function Ending(
  { hole, top, height, active, onNext, onOpenHole },
  ref,
) {
  const diagram = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLElement>(null);
  const right = useRef<HTMLElement>(null);
  const thread = useRef<ThreadHandle>(null);
  const knotEls = useRef<(HTMLSpanElement | null)[]>([]);
  const [stage, setStage] = useState(0); // 0 waiting · 1 swung in · 2 locked · 3 cited · 4 references
  const [kept, setKept] = useState(() => isKept(hole.id));
  const n = hole.knots.length;
  const end = endpointInfo(hole.end);
  const links = connections(hole);

  const sockets = () => {
    const l = left.current;
    const r = right.current;
    if (!l || !r) return null;
    return {
      a: { x: l.offsetLeft + l.offsetWidth / 2, y: l.offsetTop + l.offsetHeight },
      b: { x: r.offsetLeft, y: r.offsetTop + 26 },
    };
  };

  useImperativeHandle(ref, () => ({
    socket() {
      const r = right.current;
      if (!r) return null;
      const box = r.getBoundingClientRect();
      return { x: box.left, y: box.top + 26 };
    },
  }));

  useEffect(() => {
    if (!active) return;
    markFinished(hole.id);
    const timers = [
      setTimeout(() => setStage(1), 40),
      setTimeout(() => { setStage(2); tick(); }, 520),
      setTimeout(() => setStage(3), 520 + 260 * n + 300),
      setTimeout(() => setStage(4), 520 + 260 * n + 800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active, hole.id, n]);

  // The full thread, start card to end card, through every knot.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = sockets();
      if (s) {
        const knots = knotPositions(n, s.a, s.b, 46);
        knots.forEach((k, i) => {
          const el = knotEls.current[i];
          if (el) el.style.transform = `translate(${k.x}px, ${k.y}px)`;
        });
        thread.current?.update([s.a, ...knots, s.b], 1.04, dt);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [n]);

  const toggleKeep = () => {
    if (kept) unkeep(hole.id);
    else keep(hole.id);
    setKept(!kept);
  };

  return (
    <section className={`page ending stage-${stage}`} style={{ top, height }} aria-label="The hole, cited">
      <div className="page-scroll">
        <p className="end-kicker">Rabbit hole · {n} knots</p>
        <h1 className="end-claim">
          {hole.claim}
          <span className="cite-swap">
            <sup className="cn">[<i>citation needed</i>]</sup>
            <sup className="cited">{citationRange(hole)}</sup>
          </span>
        </h1>
        <p className="end-payoff">{hole.payoff}</p>

        <div ref={diagram} className="end-diagram">
          <Thread
            ref={thread}
            spans={n + 1}
            colors={Array(n + 1).fill(stage >= 2 ? 'var(--visited)' : 'var(--thread)')}
            className="end-thread"
            points={12}
          />
          <Infobox ref={left} endpoint={hole.start} className="end-left" credit={false} />
          {hole.knots.map((_, i) => (
            <span
              key={i}
              ref={(el) => { knotEls.current[i] = el; }}
              className="end-knot"
              style={{ transitionDelay: `${260 * i}ms` }}
            >
              <sup>[{i + 1}]</sup>
            </span>
          ))}
          <Infobox ref={right} endpoint={hole.end} className="end-right" credit={false} />
        </div>

        <div className="end-after">
          <h2 className="wk-h2">References</h2>
          <ol className="refs">
            {hole.knots.map((k, i) => (
              <li key={i}>
                <a className="ref-up" href={fragmentUrl(k)} target="_blank" rel="noopener" aria-label={`Open ${k.article} at this passage`}>^</a>{' '}
                <a href={fragmentUrl(k)} target="_blank" rel="noopener"><i>{articleOf(k.article).title}</i></a>
                {'. '}
                {k.hatnote}
              </li>
            ))}
          </ol>

          {links.length > 0 && (
            <>
              <h2 className="wk-h2">See also</h2>
              <ul className="see-also">
                {links.map((c) => (
                  <li key={c.article}>
                    {c.holes.length} more {c.holes.length === 1 ? 'hole passes' : 'holes pass'} through{' '}
                    <i>{articleOf(c.article).title}</i>:{' '}
                    {c.holes.map((h, j) => (
                      <span key={h.id}>
                        {j > 0 && '; '}
                        <a href={`#${h.id}`} onClick={(e) => { e.preventDefault(); onOpenHole(h.id); }}>
                          {h.claim}
                        </a>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </>
          )}

          <nav className="doors" aria-label="What next">
            <a className="door" href={end.url} target="_blank" rel="noopener">
              <span className="door-title">Go deeper</span>
              <span className="door-sub">Read {articleOf(hole.end.article).title} on Wikipedia, or open any reference above</span>
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
            {[...new Set(hole.knots.map((k) => k.article))].map((t, i) => (
              <span key={t}>
                {i > 0 && ', '}
                <a href={articleOf(t).permalink} target="_blank" rel="noopener">{articleOf(t).title}</a>
              </span>
            ))}
            . Images:{' '}
            {[hole.start, hole.end].map((e, i) => {
              const c = articleOf(e.article).image?.credit;
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
