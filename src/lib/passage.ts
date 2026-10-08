// Finds a quoted passage inside a rendered Wikipedia article and wraps it in
// highlight marks. Matching ignores <sup> (footnotes, [citation needed]),
// curly vs straight quotes and runs of whitespace, the same way the fetch
// script verified it.

const BLOCKS = 'p, li, blockquote, dd';

const fold = (c: string) =>
  c === '‘' || c === '’' ? "'" : c === '“' || c === '”' ? '"' : /\s/.test(c) ? ' ' : c;

export const normalize = (s: string) => Array.from(s, fold).join('').replace(/ +/g, ' ').trim();

type CharPos = { node: Text; off: number };

function indexText(block: Element) {
  const chars: CharPos[] = [];
  let text = '';
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child as Text;
        const data = t.data;
        for (let i = 0; i < data.length; i++) {
          const c = fold(data[i]);
          if (c === ' ' && (text.length === 0 || text.endsWith(' '))) continue;
          text += c;
          chars.push({ node: t, off: i });
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = (child as Element).tagName;
        if (tag !== 'SUP' && tag !== 'STYLE') walk(child);
      }
    }
  };
  walk(block);
  return { text, chars };
}

export type Passage = {
  block: HTMLElement;
  marks: HTMLElement[];
  /** Where the thread leaves the passage: the onward link, or the passage's last word. */
  anchor: HTMLElement;
  onward: HTMLAnchorElement | null;
};

export function markPassage(root: HTMLElement, passage: string, onward?: string): Passage | null {
  const want = normalize(passage);
  for (const block of Array.from(root.querySelectorAll<HTMLElement>(BLOCKS))) {
    const { text, chars } = indexText(block);
    const at = text.indexOf(want);
    if (at < 0) continue;

    const start = chars[at];
    const end = chars[at + want.length - 1];

    // Text nodes from start to end, in document order, with the slice of each to wrap.
    const spans: { node: Text; from: number; to: number }[] = [];
    let inside = false;
    const seen = new Set<Text>();
    for (const c of chars) {
      if (seen.has(c.node)) continue;
      seen.add(c.node);
      if (c.node === start.node) inside = true;
      if (inside) {
        spans.push({
          node: c.node,
          from: c.node === start.node ? start.off : 0,
          to: c.node === end.node ? end.off + 1 : c.node.length,
        });
      }
      if (c.node === end.node) break;
    }

    const marks: HTMLElement[] = [];
    for (const { node, from, to } of spans) {
      if (from >= to) continue;
      let target = node;
      if (from > 0) target = target.splitText(from);
      if (to - from < target.length) target.splitText(to - from);
      const mark = document.createElement('mark');
      mark.className = 'rh-hl';
      target.parentNode!.insertBefore(mark, target);
      mark.appendChild(target);
      marks.push(mark);
    }
    if (!marks.length) return null;

    let link: HTMLAnchorElement | null = null;
    if (onward) {
      const candidates = Array.from(block.querySelectorAll<HTMLAnchorElement>('a[data-target]')).filter(
        (a) => a.dataset.target!.toLowerCase() === onward.toLowerCase(),
      );
      link = candidates.find((a) => a.querySelector('mark.rh-hl') || a.closest('mark.rh-hl')) ?? candidates[0] ?? null;
      link?.classList.add('rh-onward');
    }

    let anchor: HTMLElement;
    if (link) {
      anchor = link;
    } else {
      anchor = document.createElement('span');
      anchor.className = 'rh-exit';
      const last = marks[marks.length - 1];
      last.parentNode!.insertBefore(anchor, last.nextSibling);
    }
    return { block, marks, anchor, onward: link };
  }
  return null;
}

/** The point the thread passes through: bottom-centre of the anchor's last line box. */
export function anchorPoint(el: HTMLElement) {
  const rects = el.getClientRects();
  const r = rects.length ? rects[rects.length - 1] : el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.bottom - 3 };
}
