// Checks a knot against a stored article snapshot, using the same passage
// matching the app uses at runtime. Shared by the fetch script and the data tests.

import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { markPassage, normalize } from '../src/lib/passage.ts';

export const keyOf = (title) => title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Parse article HTML into a DOM and make it the global document, as markPassage expects. */
export function loadDom(html) {
  const { document, Node, Text } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  // linkedom has no Text.splitText; browsers do. Same behaviour as the DOM spec.
  if (!Text.prototype.splitText) {
    Text.prototype.splitText = function (offset) {
      const tail = this.ownerDocument.createTextNode(this.data.slice(offset));
      this.data = this.data.slice(0, offset);
      this.parentNode?.insertBefore(tail, this.nextSibling);
      return tail;
    };
  }
  Object.assign(globalThis, { document, Node });
  return document.body;
}

/** Heading of the section a block sits in, or "lead". */
export function sectionOf(block) {
  let sec = block.closest('section');
  while (sec) {
    const heading = sec.querySelector(':scope > h2, :scope > h3, :scope > h4');
    if (heading) return heading.textContent.trim();
    sec = sec.parentElement?.closest('section');
  }
  return 'lead';
}

/** Problems with one knot against its article body; empty when it checks out. */
export function knotProblems(body, knot) {
  const p = markPassage(body, knot.passage, knot.onwardLinkText, knot.nextPage);
  if (!p) return ['passage not found word for word'];
  const problems = [];
  const section = sectionOf(p.block);
  if (section !== knot.section) problems.push(`section is "${section}", hole says "${knot.section}"`);
  if (knot.onwardLinkText && !p.onward) {
    problems.push(`onward link "${knot.onwardLinkText}" → ${knot.nextPage} not found inside the passage`);
  }
  return problems;
}

export async function snapshotBody(root, page) {
  return loadDom(await readFile(`${root}holes/snapshots/pages/${keyOf(page)}.html`, 'utf8'));
}

export { normalize };
