import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { holeById, type Hole } from '../content';
import { HoleCard, type HoleCardHandle } from '../components/HoleCard';
import { getShelf, hasSwiped, logSwipe } from '../lib/storage';

type Props = {
  order: string[];
  setOrder(ids: string[]): void;
  hidden: boolean;
  onEnter(hole: Hole, from: DOMRect | null): void;
  onShelf(): void;
};


export function Home({ order, setOrder, hidden, onEnter, onShelf }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-14, 0, 14]);
  const [taut, setTaut] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showHint, setShowHint] = useState(() => !hasSwiped());
  const top = useRef<HoleCardHandle>(null);

  const shelfCount = getShelf().length;

  const goIn = async () => {
    if (leaving) return;
    setLeaving(true);
    const hole = holeById(order[0]);
    logSwipe(hole.id, 'in');
    setShowHint(false);
    setTaut(true);
    await animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    await new Promise((r) => setTimeout(r, 90));
    onEnter(hole, top.current?.startRect() ?? null);
    setTaut(false);
    setLeaving(false);
  };

  const notNow = async (velocity = 0) => {
    if (leaving) return;
    setLeaving(true);
    logSwipe(order[0], 'not-now');
    setShowHint(false);
    await animate(x, -window.innerWidth * 1.3, { type: 'tween', duration: 0.28, ease: 'easeIn', velocity });
    flushSync(() => setOrder([...order.slice(1), order[0]]));
    x.set(0);
    setLeaving(false);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 90 || info.velocity.x > 650) goIn();
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
                  className="stack-drag"
                  style={{ x, rotate }}
                  drag={leaving ? false : 'x'}
                  dragMomentum={false}
                  onDragEnd={onDragEnd}
                  whileTap={{ cursor: 'grabbing' }}
                >
                  <HoleCard ref={top} hole={holeById(id)} rotate={rotate} taut={taut} live={!hidden} />
                </motion.div>
              ) : (
                <div className="stack-drag">
                  <HoleCard hole={holeById(id)} live={false} />
                </div>
              )}
            </div>
          ))}
      </div>

      {showHint && (
        <p className="swipe-hint">
          <span>← not now</span>
          <span>swipe right to go in →</span>
        </p>
      )}
    </main>
  );
}
