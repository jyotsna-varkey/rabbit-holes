import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { cardById } from '../content';
import { HoleCard, type HoleCardHandle } from '../components/HoleCard';
import { getShelf, logSwipe } from '../lib/storage';

type Props = {
  order: string[];
  setOrder(ids: string[]): void;
  hidden: boolean;
  onEnter(id: string, from: DOMRect | null, fling?: number): void;
  onShelf(): void;
};


export function Home({ order, setOrder, hidden, onEnter, onShelf }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-14, 0, 14]);
  const [taut, setTaut] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const top = useRef<HoleCardHandle>(null);
  const topCard = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  /** Until the first swipe of this visit, the top card leans right then left now and then. */
  const swiped = useRef(false);
  const idleSince = useRef(performance.now());

  // The nudge (PLAN step 44): after a moment of stillness the card leans right,
  // then left, then settles, showing both ways it can go. It stops after the
  // first swipe, and never moves while a finger is on it.
  useEffect(() => {
    if (hidden) return;
    let raf = 0;
    let nudging = 0; // the offset the nudge last set; it only ever moves the card it placed
    const bump = (u: number) => Math.sin(Math.PI * u) ** 2;
    const frame = (now: number) => {
      if (!swiped.current && !dragging.current && !leaving) {
        const since = now - idleSince.current;
        const t = since < 1400 ? -1 : ((since - 1400) % 5200) / 1000;
        const nx = t < 0 || t > 1.7 ? 0 : t < 0.8 ? 34 * bump(t / 0.8) : -26 * bump((t - 0.8) / 0.9);
        // Never touch a card the reader has moved (it may be on its way in).
        if ((nx !== 0 || nudging !== 0) && Math.abs(x.get() - nudging) < 0.5) {
          x.set(nx);
          nudging = nx;
        }
      } else nudging = 0;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [hidden, leaving, x]);

  const shelfCount = getShelf().length;

  const goIn = async (velocity = 0) => {
    if (leaving) return;
    setLeaving(true);
    swiped.current = true;
    const id = order[0];
    logSwipe(id, 'in');
    // Carry straight on: the whole card grows into the page from where the
    // swipe left it, at the swipe's speed (PLAN step 44).
    setTaut(true);
    onEnter(id, topCard.current?.getBoundingClientRect() ?? top.current?.startRect() ?? null, Math.abs(velocity) / 500);
    // Reset the card once the page has covered the stack.
    setTimeout(() => {
      x.set(0);
      setTaut(false);
      setLeaving(false);
    }, 700);
  };

  const notNow = async (velocity = 0) => {
    if (leaving) return;
    setLeaving(true);
    swiped.current = true;
    logSwipe(order[0], 'not-now');
    await animate(x, -window.innerWidth * 1.3, { type: 'tween', duration: 0.28, ease: 'easeIn', velocity });
    flushSync(() => setOrder([...order.slice(1), order[0]]));
    x.set(0);
    setLeaving(false);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    dragging.current = false;
    idleSince.current = performance.now();
    if (info.offset.x > 90 || info.velocity.x > 650) goIn(info.velocity.x);
    else if (info.offset.x < -90 || info.velocity.x < -650) notNow(info.velocity.x);
    else animate(x, 0, { type: 'spring', stiffness: 420, damping: 28 });
  };

  const visible = order.slice(0, 3);

  return (
    <main className="home" hidden={hidden} aria-hidden={hidden}>
      <header className="home-head">
        <div>
          <h1 className="wordmark">Rabbit Holes</h1>
          <p className="tagline">The free encyclopedia, one thread at a time</p>
        </div>
        <button className="head-link" onClick={onShelf}>
          Shelf{shelfCount ? ` (${shelfCount})` : ''}
        </button>
      </header>

      <div className="stack" role="list">
        {visible
          .map((id, k) => ({ id, k }))
          .reverse()
          .map(({ id, k }) => (
            <div
              key={id}
              role="listitem"
              className={`stack-slot slot-${k}`}
              style={{ zIndex: 10 - k }}
              aria-hidden={k > 0}
            >
              {k === 0 ? (
                <motion.div
                  ref={topCard}
                  className="stack-drag"
                  style={{ x, rotate }}
                  drag={leaving ? false : 'x'}
                  dragMomentum={false}
                  onPointerDown={() => { dragging.current = true; }}
                  onPointerUp={() => { dragging.current = false; idleSince.current = performance.now(); }}
                  onDragEnd={onDragEnd}
                  whileTap={{ cursor: 'grabbing' }}
                >
                  <HoleCard ref={top} hole={cardById(id)} rotate={rotate} taut={taut} live={!hidden} />
                </motion.div>
              ) : (
                <div className="stack-drag">
                  <HoleCard hole={cardById(id)} live={false} />
                </div>
              )}
            </div>
          ))}
      </div>

      <p className="swipe-hint">
        <span>← not now</span>
        <span>swipe right to go in →</span>
      </p>
    </main>
  );
}
