import { beforeAll, describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { markPassage, normalize } from '../../src/lib/passage';

function dom(html: string) {
  const { document, Node, Text } = parseHTML(`<!doctype html><html><body><div id="root">${html}</div></body></html>`);
  // linkedom has no Text.splitText; browsers do. Same behaviour as the DOM spec.
  if (!Text.prototype.splitText) {
    Text.prototype.splitText = function (this: Text, offset: number) {
      const tail = this.ownerDocument.createTextNode(this.data.slice(offset));
      this.data = this.data.slice(0, offset);
      this.parentNode?.insertBefore(tail, this.nextSibling);
      return tail;
    };
  }
  Object.assign(globalThis, { document, Node });
  return document.getElementById('root') as unknown as HTMLElement;
}

beforeAll(() => {
  dom('');
});

describe('normalize', () => {
  it('folds curly quotes and runs of whitespace', () => {
    expect(normalize('It’s  “fine”\n here')).toBe('It\'s "fine" here');
  });
});

describe('markPassage', () => {
  it('finds a passage across links, ignoring footnote superscripts', () => {
    const root = dom('<p>Before. The <a data-target="Mocha">port</a> grew rich.<sup>[1]</sup> After.</p>');
    const p = markPassage(root, 'The port grew rich.');
    expect(p).not.toBeNull();
    expect(p!.marks.map((m) => m.textContent).join('')).toBe('The port grew rich.');
  });

  it('picks the onward link inside the passage', () => {
    const root = dom(
      '<p>See <a data-target="Lloyd\'s of London">Lloyd\'s</a>. Then <a data-target="Lloyd\'s of London">Lloyd\'s of London</a> grew.</p>',
    );
    const p = markPassage(root, "Then Lloyd's of London grew.", "Lloyd's of London");
    expect(p!.onward!.textContent).toBe("Lloyd's of London");
    expect(p!.anchor).toBe(p!.onward);
  });

  it('ignores a matching link that sits outside the passage', () => {
    const root = dom(
      '<p><a data-target="Copper sheathing">copper sheath</a> came first. The navy lost the colonies.</p>',
    );
    const p = markPassage(root, 'The navy lost the colonies.', 'copper sheath', 'Copper sheathing');
    expect(p!.onward).toBeNull();
    expect(p!.anchor.className).toBe('rh-exit');
  });

  it('only accepts an onward link that leads to the next page', () => {
    const root = dom('<p>Cook named the <a data-target="Hawaiian Islands">Sandwich Islands</a>.</p>');
    expect(markPassage(root, 'Cook named the Sandwich Islands.', 'Sandwich Islands', 'Hawaiian Islands')!.onward).not.toBeNull();
    const again = dom('<p>Cook named the <a data-target="Hawaiian Islands">Sandwich Islands</a>.</p>');
    expect(markPassage(again, 'Cook named the Sandwich Islands.', 'Sandwich Islands', 'Tahiti')!.onward).toBeNull();
  });

  it('adds an exit point after the passage when there is no onward link', () => {
    const root = dom('<p>One sentence. Two sentence.</p>');
    const p = markPassage(root, 'One sentence.');
    expect(p!.onward).toBeNull();
    expect(p!.anchor.className).toBe('rh-exit');
  });

  it('returns null when the passage is not there', () => {
    const root = dom('<p>Nothing to see.</p>');
    expect(markPassage(root, 'Something else.')).toBeNull();
  });
});
