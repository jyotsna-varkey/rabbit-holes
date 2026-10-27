import type { ShelfEntry } from './storage';

const isEntry = (e: unknown): e is ShelfEntry =>
  !!e && typeof e === 'object' && typeof (e as ShelfEntry).id === 'string' && typeof (e as ShelfEntry).kept === 'string';

/**
 * Join two shelves (this device's and the one saved to the reader's account):
 * every hole once, with the earliest date it was kept, most recent first.
 */
export function mergeShelves(a: readonly unknown[], b: readonly unknown[]): ShelfEntry[] {
  const byId = new Map<string, ShelfEntry>();
  for (const e of [...a, ...b]) {
    if (!isEntry(e)) continue;
    const seen = byId.get(e.id);
    if (!seen || e.kept < seen.kept) byId.set(e.id, { id: e.id, kept: e.kept });
  }
  return [...byId.values()].sort((x, y) => (x.kept < y.kept ? 1 : x.kept > y.kept ? -1 : 0));
}

/** Where the emailed sign-in link returns: the app (at its base path), opening the shelf. */
export const signInRedirect = (origin: string, base: string) => `${origin}${base}?shelf`;
