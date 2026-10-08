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
export function keep(id: string) {
  if (!isKept(id)) write('rh.shelf', [{ id, kept: today() }, ...getShelf()]);
}
export function unkeep(id: string) {
  write('rh.shelf', getShelf().filter((e) => e.id !== id));
}

export const getFinished = () => read<Record<string, string>>('rh.finished', {});
export function markFinished(id: string) {
  write('rh.finished', { ...getFinished(), [id]: today() });
}

/** One claim finished on an earlier day, not yet recalled today. `force` shows any finished hole. */
export function pendingRecall(force = false): string | null {
  const finished = Object.entries(getFinished());
  const seen = read<string>('rh.recalled', '');
  const t = today();
  const candidates = finished
    .filter(([, day]) => force || day < t)
    .sort((a, b) => (a[1] < b[1] ? 1 : -1));
  if (!candidates.length) return null;
  const [id] = candidates[0];
  if (!force && seen === `${t}:${id}`) return null;
  return id;
}
export const markRecalled = (id: string) => write('rh.recalled', `${today()}:${id}`);

export function logSwipe(id: string, dir: 'in' | 'not-now') {
  const log = read<{ id: string; dir: string; at: number }[]>('rh.swipes', []);
  write('rh.swipes', [...log.slice(-199), { id, dir, at: Date.now() }]);
}

export const getOrder = () => read<string[] | null>('rh.order', null);
export const saveOrder = (ids: string[]) => write('rh.order', ids);
