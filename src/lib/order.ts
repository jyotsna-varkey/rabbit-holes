// The order of the home stack: holes the reader hasn't seen yet first, shuffled
// once per visit; then the ones they've seen (swiped either way, or finished),
// in the order they went to the back. Kept for the session so a refresh
// doesn't reshuffle. A linked hole (?hole=<id>) goes on top.

/** Fisher–Yates shuffle; returns a new array. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `seen`: holes already swiped or finished, in the order they went to the back (oldest first). */
export function stackOrder(
  ids: readonly string[],
  seen: ReadonlySet<string>,
  first: string | null,
  random: () => number = Math.random,
  saved: readonly string[] | null = null,
): string[] {
  const kept = (saved ?? []).filter((id, i, all) => ids.includes(id) && all.indexOf(id) === i);
  const rest = ids.filter((id) => !kept.includes(id));
  const order = [
    ...kept,
    ...shuffle(rest.filter((id) => !seen.has(id)), random),
    ...[...seen].filter((id) => rest.includes(id)),
  ];
  return first && order.includes(first) ? [first, ...order.filter((id) => id !== first)] : order;
}
