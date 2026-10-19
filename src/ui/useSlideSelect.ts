// Press and slide to choose, as in the iOS 26 tab bar: pressing a list of links lifts the selection into a glass
// lens, sliding moves the lens with the pointer (along x for the phone tab bar, along y for the wide-screen sidebar),
// and letting go opens the item under it. A press that doesn't move is an ordinary click, and the keyboard works as
// it does for any link. The lens is drawn by the caller inside the list's parent, which must be positioned.
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';

/** How far (px) a press moves before it counts as sliding rather than a tap. */
export const SLIDE_THRESHOLD = 6;

/** The index of the centre nearest to p. */
export function nearestIndex(centers: readonly number[], p: number): number {
  let best = 0;
  let bestDistance = Infinity;
  centers.forEach((c, i) => {
    const d = Math.abs(p - c);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

/** The lens's start edge for a pointer at p: centred under the pointer, kept inside the list. */
export function lensStart(p: number, lensSize: number, listSize: number): number {
  return Math.min(Math.max(0, p - lensSize / 2), Math.max(0, listSize - lensSize));
}

export type SlideAxis = 'x' | 'y';

interface Press {
  pointerId: number;
  start: number;
  sliding: boolean;
}

export interface SlideSelect {
  listRef: RefObject<HTMLUListElement | null>;
  /** Spread on the <ul>. */
  listProps: {
    onPointerDown: (e: ReactPointerEvent<HTMLUListElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLUListElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onLostPointerCapture: () => void;
    onClickCapture: (e: ReactMouseEvent<HTMLUListElement>) => void;
  };
  /** Style for the lens, or null when there is nothing to show (no current item and no slide). */
  lensStyle: CSSProperties | null;
  /** The item to highlight: the one under the lens while sliding, else the current one. */
  lit: number;
  pressed: boolean;
  sliding: boolean;
}

/**
 * `active` is the current item's index (-1 for none); `onPick` gets the index released over after a slide.
 * `remeasure` changes whenever the list may have moved or resized without its own size changing.
 */
export function useSlideSelect(axis: SlideAxis, active: number, onPick: (index: number) => void, remeasure?: unknown): SlideSelect {
  const listRef = useRef<HTMLUListElement>(null);
  const press = useRef<Press | null>(null);
  const swallowClick = useRef(false);
  const [rest, setRest] = useState<{ pos: number; size: number } | null>(null);
  const [slide, setSlide] = useState<{ pos: number; over: number } | null>(null);
  const [pressed, setPressed] = useState(false);

  const start = (r: DOMRect) => (axis === 'x' ? r.left : r.top);
  const extent = (r: DOMRect) => (axis === 'x' ? r.width : r.height);
  const coord = (e: { clientX: number; clientY: number }) => (axis === 'x' ? e.clientX : e.clientY);

  // Where the lens rests: over the current item, measured from the parent's edge (where the lens is positioned).
  const measure = useCallback(() => {
    const list = listRef.current;
    const li = active >= 0 ? (list?.children[active] as HTMLElement | undefined) : undefined;
    const parent = list?.parentElement;
    if (!li || !parent) return setRest(null);
    const r = li.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    setRest(axis === 'x' ? { pos: r.left - p.left, size: li.offsetWidth } : { pos: r.top - p.top, size: li.offsetHeight });
  }, [active, axis]);

  useLayoutEffect(() => {
    measure();
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [measure, remeasure]);

  const items = () => [...(listRef.current?.children ?? [])] as HTMLElement[];
  const itemSize = () => {
    const first = items()[0];
    return rest?.size ?? (first ? (axis === 'x' ? first.offsetWidth : first.offsetHeight) : 0);
  };

  const end = (go: boolean) => {
    const p = press.current;
    press.current = null;
    setPressed(false);
    if (p?.sliding && slide) {
      // The press became a slide: open the item under the lens, and ignore the click the release may fire.
      swallowClick.current = true;
      window.setTimeout(() => (swallowClick.current = false), 0);
      if (go && slide.over !== active) onPick(slide.over);
    }
    setSlide(null);
  };

  const listProps: SlideSelect['listProps'] = {
    onPointerDown: (e) => {
      if (e.button !== 0 || !e.isPrimary) return;
      press.current = { pointerId: e.pointerId, start: coord(e), sliding: false };
      setPressed(true);
    },
    onPointerMove: (e) => {
      const p = press.current;
      const list = listRef.current;
      if (!p || p.pointerId !== e.pointerId || !list) return;
      if (!p.sliding) {
        if (Math.abs(coord(e) - p.start) < SLIDE_THRESHOLD) return;
        p.sliding = true;
        list.setPointerCapture(e.pointerId);
      }
      const box = list.getBoundingClientRect();
      const parent = list.parentElement?.getBoundingClientRect() ?? box;
      const over = nearestIndex(
        items().map((el) => {
          const r = el.getBoundingClientRect();
          return start(r) + extent(r) / 2;
        }),
        coord(e),
      );
      const size = itemSize();
      setSlide((prev) => {
        if (prev && prev.over !== over) navigator.vibrate?.(8);
        return { pos: start(box) - start(parent) + lensStart(coord(e) - start(box), size, extent(box)), over };
      });
    },
    onPointerUp: () => end(true),
    onPointerCancel: () => end(false),
    onLostPointerCapture: () => {
      if (press.current?.sliding) end(true);
    },
    onClickCapture: (e) => {
      if (!swallowClick.current) return;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  const size = itemSize();
  const pos = slide ? slide.pos : (rest?.pos ?? 0);
  const lensStyle: CSSProperties | null =
    slide === null && rest === null
      ? null
      : axis === 'x'
        ? { inlineSize: `${size}px`, transform: `translateX(${pos}px)` }
        : { blockSize: `${size}px`, transform: `translateY(${pos}px)` };

  return { listRef, listProps, lensStyle, lit: slide ? slide.over : active, pressed, sliding: slide !== null };
}
