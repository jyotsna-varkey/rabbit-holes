import { useCallback, useEffect, useState } from 'react';
import { holeById, holes, loadArticle, type Hole } from './content';
import { Home } from './screens/Home';
import { HoleView } from './screens/HoleView';
import { Shelf } from './screens/Shelf';
import { openedHoles, SHELF_EVENT } from './lib/storage';
import { stackOrder } from './lib/order';

type View =
  | { name: 'home' }
  | { name: 'hole'; id: string; from: DOMRect | null; run: number }
  | { name: 'shelf' };

// A fresh shuffle on every visit, unopened holes first; ?hole=<id> links one to the top.
const initialOrder = () =>
  stackOrder(holes.map((h) => h.id), openedHoles(), new URLSearchParams(location.search).get('hole'));

/** A stored Supabase session (checked without loading Supabase). */
function hasStoredSession() {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  } catch {
    return false;
  }
}

export default function App() {
  const [order, setOrderState] = useState(initialOrder);
  // Arriving from an emailed sign-in link (?shelf) opens the shelf.
  const [view, setView] = useState<View>(() =>
    new URLSearchParams(location.search).has('shelf') ? { name: 'shelf' } : { name: 'home' },
  );
  const [homeHidden, setHomeHidden] = useState(false);

  const setOrder = useCallback((ids: string[]) => setOrderState(ids), []);

  // Warm the first page of the top hole so the tumble lands on a loaded article.
  useEffect(() => {
    if (order[0]) loadArticle(holeById(order[0]).knots[0].page).catch(() => {});
  }, [order]);

  // Signed-in readers: bring the shelf in from their account on open, and save
  // every keep or removal back to it. Nothing loads for readers who never sign in.
  useEffect(() => {
    let cloud: Promise<typeof import('./lib/cloud')> | null = null;
    const load = () => (cloud ??= import('./lib/cloud'));
    if (/access_token=|error_description=/.test(location.hash) || hasStoredSession()) {
      load().then((c) => c.syncOnOpen()).catch((e) => console.warn('Shelf sync failed', e));
    }
    const onShelf = (e: Event) => {
      if ((e as CustomEvent).detail !== 'local' || !hasStoredSession()) return;
      load().then((c) => c.pushShelf()).catch((err) => console.warn('Shelf sync failed', err));
    };
    window.addEventListener(SHELF_EVENT, onShelf);
    return () => window.removeEventListener(SHELF_EVENT, onShelf);
  }, []);

  // The phone's back gesture leaves a hole or the shelf.
  useEffect(() => {
    const onPop = () => {
      setView({ name: 'home' });
      setHomeHidden(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (next: View) => {
    if (next.name !== 'home' && view.name === 'home') history.pushState({ rh: next.name }, '');
    setView(next);
  };
  const goHome = () => {
    if (history.state?.rh) history.back();
    else {
      setView({ name: 'home' });
      setHomeHidden(false);
    }
  };

  const enter = (hole: Hole, from: DOMRect | null) => {
    go({ name: 'hole', id: hole.id, from, run: Date.now() });
  };

  const openHole = (id: string) => {
    // From the shelf: put the hole on top and go straight in.
    setOrder([id, ...order.filter((o) => o !== id)]);
    if (view.name === 'home') history.pushState({ rh: 'hole' }, '');
    setHomeHidden(true);
    setView({ name: 'hole', id, from: null, run: Date.now() });
  };

  const next = () => {
    if (view.name === 'hole') setOrder([...order.filter((o) => o !== view.id), view.id]);
    goHome();
  };

  return (
    <>
      {view.name !== 'shelf' && (
        <Home
          order={order}
          setOrder={setOrder}
          hidden={homeHidden && view.name === 'hole'}
          onEnter={enter}
          onShelf={() => go({ name: 'shelf' })}
        />
      )}
      {view.name === 'hole' && (
        <HoleView
          key={`${view.id}:${view.run}`}
          hole={holeById(view.id)}
          from={view.from}
          onClose={goHome}
          onNext={next}
          onSettled={() => setHomeHidden(true)}
        />
      )}
      {view.name === 'shelf' && <Shelf onBack={goHome} onOpenHole={openHole} />}
    </>
  );
}
