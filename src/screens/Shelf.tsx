import { useEffect, useState, type FormEvent } from 'react';
import { cardById, cards, citationRange } from '../content';
import { getShelf, SHELF_EVENT } from '../lib/storage';

type Props = { onBack(): void; onOpenHole(id: string): void };

const formatDay = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/** Re-read the shelf whenever it changes (a keep, or a sync from another device). */
function useShelf() {
  const [shelf, setShelf] = useState(getShelf);
  useEffect(() => {
    const update = () => setShelf(getShelf());
    window.addEventListener(SHELF_EVENT, update);
    return () => window.removeEventListener(SHELF_EVENT, update);
  }, []);
  return shelf.filter((e) => cards.some((h) => h.id === e.id));
}

/** Optional email sign-in so the shelf follows the reader to other devices. */
function ShelfSync() {
  const [email, setEmail] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    let live = true;
    import('../lib/cloud')
      .then((cloud) => cloud.signedInEmail())
      .then((e) => live && setEmail(e))
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      await (await import('../lib/cloud')).sendSignInLink(draft.trim());
      setState('sent');
    } catch {
      setState('error');
    }
  };

  const signOut = async () => {
    await (await import('../lib/cloud')).signOut();
    setEmail(null);
    setState('idle');
  };

  return (
    <aside className="shelf-sync">
      <h2>Keep your shelf on every device</h2>
      {email ? (
        <p>
          Your shelf is saved to <b>{email}</b>. Sign in with the same email on another phone or laptop and it'll be
          there. <button className="link-button" onClick={signOut}>Sign out</button>
        </p>
      ) : state === 'sent' ? (
        <p>
          Check your inbox for a sign-in link from Supabase. Open it on this device, or on any device where you want your
          shelf.
        </p>
      ) : (
        <>
          <p>Your shelf is saved on this device. To keep it on others too, sign in with your email: no password.</p>
          <form onSubmit={send}>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              aria-label="Email address"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
          </form>
          {state === 'error' && <p className="shelf-sync-error">That didn't send. Check the address and try again.</p>}
        </>
      )}
    </aside>
  );
}

export function Shelf({ onBack, onOpenHole }: Props) {
  const shelf = useShelf();
  return (
    <main className="shelf">
      <header className="home-head">
        <div>
          <h1 className="wordmark">Your shelf</h1>
          <p className="tagline">Claims you've proven</p>
        </div>
        <button className="head-link" onClick={onBack}>Stack</button>
      </header>
      {shelf.length === 0 ? (
        <p className="shelf-empty">Nothing here yet. Finish a hole and choose “Keep it” to put its claim on your shelf.</p>
      ) : (
        <ol className="refs shelf-list">
          {shelf.map((e) => {
            const h = cardById(e.id);
            return (
              <li key={e.id}>
                <a href={`#${h.id}`} onClick={(ev) => { ev.preventDefault(); onOpenHole(h.id); }}>
                  {h.claim}
                </a>
                <sup className="cited">{citationRange(h.knots)}</sup>
                <span className="shelf-date"> Kept {formatDay(e.kept)}.</span>
              </li>
            );
          })}
        </ol>
      )}
      <ShelfSync />
    </main>
  );
}
