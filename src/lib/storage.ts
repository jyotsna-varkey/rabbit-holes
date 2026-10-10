// Everything a reader keeps lives in this browser for now: the shelf, which
// holes they finished and when, and their swipes. All access is guarded so a
// private window or blocked storage just means nothing is remembered.

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export type ShelfEntry = { id: string; kept: string };

export const getShelf = () => read<ShelfEntry[]>('rh.shelf', []);
export const isKept = (id: string) => getShelf().some((e) => e.id === id);

/** Fired whenever the shelf changes; `source` says whether the reader or a sync did it. */
export const SHELF_EVENT = 'rh:shelf';
export function setShelf(entries: ShelfEntry[], source: 'local' | 'cloud' = 'local') {
  write('rh.shelf', entries);
  try {
    window.dispatchEvent(new CustomEvent(SHELF_EVENT, { detail: source }));
  } catch {
    // ignore
  }
}

export function keep(id: string) {
  if (isKept(id)) return;
  setShelf([{ id, kept: today() }, ...getShelf()]);
  // Ask the browser not to clear this site's storage (and the shelf with it) on its own.
  navigator.storage?.persist?.().catch(() => {});
}
export function unkeep(id: string) {
  setShelf(getShelf().filter((e) => e.id !== id));
}

export const getFinished = () => read<Record<string, string>>('rh.finished', {});
export function markFinished(id: string) {
  write('rh.finished', { ...getFinished(), [id]: today() });
}

/** Whether this reader has swiped a card yet (the home hint is for first-timers). */
export const hasSwiped = () => read<unknown[]>('rh.swipes', []).length > 0;

export function logSwipe(id: string, dir: 'in' | 'not-now') {
  const log = read<{ id: string; dir: string; at: number }[]>('rh.swipes', []);
  write('rh.swipes', [...log.slice(-199), { id, dir, at: Date.now() }]);
}

/** Holes this reader has opened or finished, so the stack can show new ones first. */
export function openedHoles() {
  const swipes = read<{ id: string; dir: string }[]>('rh.swipes', []);
  return new Set([
    ...swipes.filter((s) => s.dir === 'in').map((s) => s.id),
    ...Object.keys(getFinished()),
  ]);
}
