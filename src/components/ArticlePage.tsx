import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { holesAsset, loadArticle, pageOf, type Knot } from '../content';
import { anchorPoint, markPassage, type Passage } from '../lib/passage';
import type { Pt } from '../lib/rope';

export type ArticlePageHandle = {
  /** Viewport point where the thread comes down the margin into the passage. */
  entry(): Pt | null;
  /** Viewport point where the thread runs out of the passage. */
  anchor(): Pt | null;
  /** Called every frame while visible: keeps the focus veils on the passage. */
  tick(): void;
  /** First arrival: scroll once from the top of the article down to the passage. */
  arrive(): void;
  /** "Back to the thread". */
  recenter(): void;
};

type Props = {
  knot: Knot;
  top: number;
  height: number;
  /** Start at the top of the article and wait for arrive(), instead of opening on the passage. */
  arriveFromTop: boolean;
  onFocusChange(focused: boolean): void;
};

// The band of the screen the passage is centred in: below the top bar, above the knot.
const BAND_TOP = 64;
const BAND_BOTTOM = 150;
const LOOK_AWAY = 48;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const ArticlePage = forwardRef<ArticlePageHandle, Props>(function ArticlePage(
  { knot, top, height, arriveFromTop, onFocusChange },
  ref,
) {
  const article = pageOf(knot.page);
  const section = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const veilTop = useRef<HTMLDivElement>(null);
  const veilBottom = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const s = useRef({
    passage: null as Passage | null,
    hatnote: null as HTMLElement | null,
    focused: false,
    auto: 0, // rAF id of a running programmatic scroll
    autoActive: false,
    touched: false, // reader has put a finger/wheel on the page since focusing
    restTop: 0,
    arrived: !arriveFromTop,
    arrivePending: false,
  });
  const cb = useRef({ onFocusChange });
  cb.current = { onFocusChange };

  useEffect(() => {
    let live = true;
    loadArticle(knot.page).then(
      (h) => live && setHtml(h),
      () => live && setError(true),
    );
    return () => { live = false; };
  }, [knot.page]);

  /** Where the hatnote should sit so hatnote + passage are centred in the band. */
  const restingOffset = () => {
    const st = s.current;
    if (!st.hatnote || !st.passage || !scroller.current) return null;
    const box = scroller.current.getBoundingClientRect();
    const blockTop = st.hatnote.getBoundingClientRect().top - box.top;
    const blockBottom = st.passage.block.getBoundingClientRect().bottom - box.top;
    const band = height - BAND_TOP - BAND_BOTTOM;
    const tall = blockBottom - blockTop;
    const want = tall < band ? BAND_TOP + (band - tall) * 0.42 : BAND_TOP;
    return scroller.current.scrollTop + blockTop - want;
  };

  const setFocus = (on: boolean) => {
    const st = s.current;
    if (st.focused === on) return;
    st.focused = on;
    section.current?.classList.toggle('is-focused', on);
    cb.current.onFocusChange(on);
  };

  /** While the page travels to the passage it stays sharp; the blur comes in on landing. */
  const landing = (on: boolean) => section.current?.classList.toggle('is-landing', on);

  const scrollTo = (target: number, duration: number, then?: () => void) => {
    const el = scroller.current!;
    const st = s.current;
    cancelAnimationFrame(st.auto);
    const from = el.scrollTop;
    const t0 = performance.now();
    st.autoActive = true;
    landing(true);
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      el.scrollTop = from + (target - from) * ease(t);
      if (t < 1) st.auto = requestAnimationFrame(step);
      else {
        st.autoActive = false;
        st.restTop = el.scrollTop;
        landing(false);
        then?.();
      }
    };
    st.auto = requestAnimationFrame(step);
  };

  const goToPassage = (animated: boolean) => {
    const target = restingOffset();
    if (target == null || !scroller.current) return;
    s.current.touched = false;
    if (!animated || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scroller.current.scrollTop = target;
      s.current.restTop = scroller.current.scrollTop;
      setFocus(true);
      return;
    }
    const distance = Math.abs(target - scroller.current.scrollTop);
    setFocus(true);
    scrollTo(target, Math.min(1500, Math.max(650, 500 + distance * 0.12)));
  };

  // Put the article in the page, mark the passage, add the hatnote.
  useLayoutEffect(() => {
    if (html == null || !body.current) return;
    const root = body.current;
    root.innerHTML = html;
    // Article images ship in /holes; point each one at its bundled file.
    for (const img of Array.from(root.querySelectorAll<HTMLImageElement>('img[data-asset]'))) {
      const src = holesAsset(img.dataset.asset!);
      if (src) img.src = src;
    }
    const passage = markPassage(root, knot.passage, knot.onwardLinkText, knot.nextPage);
    const st = s.current;
    st.passage = passage;
    if (!passage) return;

    // Give the passage its own paragraph so the hatnote sits directly above it.
    const { block, marks } = passage;
    const topLevel = (n: Node) => { while (n.parentNode !== block) n = n.parentNode!; return n; };
    const first = topLevel(marks[0]);
    if (first.previousSibling) {
      const r = document.createRange();
      r.setStartBefore(block.firstChild!);
      r.setEndBefore(first);
      if (r.toString().trim()) {
        const before = document.createElement(block.tagName === 'LI' ? 'div' : 'p');
        before.appendChild(r.extractContents());
        block.parentNode!.insertBefore(before, block);
      }
    }
    const lastNode = topLevel(passage.anchor.classList.contains('rh-exit') ? passage.anchor : marks[marks.length - 1]);
    let tail = lastNode.nextSibling;
    while (tail && tail.nodeType === Node.ELEMENT_NODE && (tail as Element).tagName === 'SUP') tail = tail.nextSibling;
    if (tail) {
      const r = document.createRange();
      r.setStartBefore(tail);
      r.setEndAfter(block.lastChild!);
      if (r.toString().trim()) {
        const after = document.createElement(block.tagName === 'LI' ? 'div' : 'p');
        after.appendChild(r.extractContents());
        block.parentNode!.insertBefore(after, block.nextSibling);
      }
    }
    block.classList.add('rh-passage');

    const hatnote = document.createElement('div');
    hatnote.className = 'rh-hatnote';
    hatnote.setAttribute('role', 'note');
    hatnote.textContent = knot.hatnote;
    block.parentNode!.insertBefore(hatnote, block);
    st.hatnote = hatnote;

    if (st.arrived) goToPassage(false);
    else if (st.arrivePending) goToPassage(true);
  }, [html, knot]);

  // Reading vs. being moved: any scroll the reader makes lifts the focus.
  useEffect(() => {
    const el = scroller.current!;
    const st = s.current;
    const touch = () => {
      st.touched = true;
      if (st.autoActive) {
        cancelAnimationFrame(st.auto);
        st.autoActive = false;
        st.restTop = el.scrollTop;
        section.current?.classList.remove('is-landing');
      }
    };
    const onScroll = () => {
      if (st.autoActive || !st.focused) return;
      if (Math.abs(el.scrollTop - st.restTop) > LOOK_AWAY) setFocus(false);
    };
    el.addEventListener('touchstart', touch, { passive: true });
    el.addEventListener('wheel', touch, { passive: true });
    el.addEventListener('pointerdown', touch);
    el.addEventListener('keydown', touch);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(st.auto);
      el.removeEventListener('touchstart', touch);
      el.removeEventListener('wheel', touch);
      el.removeEventListener('pointerdown', touch);
      el.removeEventListener('keydown', touch);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    entry() {
      const hn = s.current.hatnote;
      if (!hn || !section.current || !body.current) return null;
      const r = hn.getBoundingClientRect();
      // In the gutter just left of the text column (the window edge on a phone).
      const x = Math.max(section.current.getBoundingClientRect().left + 7, body.current.getBoundingClientRect().left - 9);
      return { x, y: r.top + 11 };
    },
    anchor() {
      const p = s.current.passage;
      return p ? anchorPoint(p.anchor) : null;
    },
    tick() {
      const st = s.current;
      if (!st.passage || !st.hatnote || !section.current) return;
      // Images loading above the passage shift it; follow until the reader takes over.
      if (st.focused && st.arrived && !st.autoActive && !st.touched) {
        const want = restingOffset();
        if (want != null && Math.abs(want - scroller.current!.scrollTop) > 1) {
          scroller.current!.scrollTop = want;
          st.restTop = scroller.current!.scrollTop;
        }
      }
      const box = section.current.getBoundingClientRect();
      const a = st.hatnote.getBoundingClientRect().top - box.top - 10;
      const b = st.passage.block.getBoundingClientRect().bottom - box.top + 8;
      const clamp = (v: number) => Math.max(0, Math.min(height, v));
      veilTop.current!.style.height = `${clamp(a)}px`;
      veilBottom.current!.style.transform = `translateY(${clamp(b)}px)`;
    },
    arrive() {
      const st = s.current;
      if (st.arrived) return;
      st.arrived = true;
      if (st.passage) goToPassage(true);
      else st.arrivePending = true;
    },
    recenter() {
      goToPassage(true);
    },
  }), [height]);

  return (
    <section ref={section} className="page" style={{ top, height }} aria-label={article.title}>
      <div ref={scroller} className="page-scroll" tabIndex={-1}>
        <header className="art-head">
          <h1>{article.title}</h1>
          <p className="art-from">From Wikipedia, the free encyclopedia</p>
        </header>
        {error && <p className="art-error">This article couldn't be loaded. Check your connection and try again.</p>}
        {html == null && !error && <p className="art-loading">Loading…</p>}
        <div ref={body} className="art-body" />
        <footer className="art-foot">
          Text from the Wikipedia article{' '}
          <a href={article.permalink} target="_blank" rel="noopener">“{article.title}” (revision {article.revision})</a>,
          available under{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>.
          The bridge line above the highlighted passage is ours, not Wikipedia's.
        </footer>
      </div>
      <div ref={veilTop} className="veil veil-top" />
      <div ref={veilBottom} className="veil veil-bottom" />
    </section>
  );
});
