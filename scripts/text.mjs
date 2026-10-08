// Shared by the fetch script: reading text the way the library quoted it,
// with footnote and [citation needed] superscripts left out.

export function textOf(node) {
  let out = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) out += child.textContent;
    else if (child.nodeType === 1 && child.tagName !== 'SUP' && child.tagName !== 'STYLE') out += textOf(child);
  }
  return out;
}

export const normalize = (s) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
