import { citationRange, holeById, holes } from '../content';
import { getShelf } from '../lib/storage';

type Props = { onBack(): void; onOpenHole(id: string): void };

const formatDay = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

export function Shelf({ onBack, onOpenHole }: Props) {
  const shelf = getShelf().filter((e) => holes.some((h) => h.id === e.id));
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
            const h = holeById(e.id);
            return (
              <li key={e.id}>
                <a href={`#${h.id}`} onClick={(ev) => { ev.preventDefault(); onOpenHole(h.id); }}>
                  {h.claim}
                </a>
                <sup className="cited">{citationRange(h)}</sup>
                <span className="shelf-date"> Kept {formatDay(e.kept)}.</span>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
