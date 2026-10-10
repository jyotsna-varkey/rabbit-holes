// The order of the home stack: shuffled on every visit, holes the reader hasn't
// opened yet first. A linked hole (?hole=<id>) goes on top.

/** Fisher–Yates shuffle; returns a new array. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function stackOrder(
  ids: readonly string[],
  opened: ReadonlySet<string>,
  first: string | null,
  random: () => number = Math.random,
): string[] {
  const order = [
    ...shuffle(ids.filter((id) => !opened.has(id)), random),
    ...shuffle(ids.filter((id) => opened.has(id)), random),
  ];
  return first && order.includes(first) ? [first, ...order.filter((id) => id !== first)] : order;
}
