// The phone tab bar: a floating glass capsule of tabs and a round search button. As on iPhone (iOS 26), you can press
// the bar and slide along it: the selection lifts into a glass lens that follows your finger, and the tab under it
// opens when you let go. A plain tap, and the keyboard, work as ordinary links.
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { t } from '../../i18n/index.ts';
import type { MessageKey } from '../../i18n/index.ts';
import type { TabName } from '../router.ts';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';

export interface TabItem {
  name: TabName;
  icon: IconName;
  label: MessageKey;
  href: string;
}

/** How far (px) a press moves before it counts as sliding rather than a tap. */
const SLIDE_THRESHOLD = 6;

/** The index of the centre nearest to x. */
export function nearestIndex(centers: readonly number[], x: number): number {
  let best = 0;
  let bestDistance = Infinity;
  centers.forEach((c, i) => {
    const d = Math.abs(x - c);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

/** The lens's left edge for a finger at x: centred under the finger, kept inside the bar. */
export function lensLeft(x: number, lensWidth: number, barWidth: number): number {
  return Math.min(Math.max(0, x - lensWidth / 2), Math.max(0, barWidth - lensWidth));
}

interface Press {
  pointerId: number;
  startX: number;
  sliding: boolean;
}

export function TabBar({ tabs, active, hidden, searchHref }: { tabs: readonly TabItem[]; active: TabName; hidden: boolean; searchHref: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const press = useRef<Press | null>(null);
  const swallowClick = useRef(false);
  const [rest, setRest] = useState<{ x: number; w: number } | null>(null);
  const [slide, setSlide] = useState<{ x: number; over: number } | null>(null);
  const [pressed, setPressed] = useState(false);
  const activeIndex = tabs.findIndex((tab) => tab.name === active);

  // Where the lens rests: over the current tab (none when the screen isn't a tab, such as a recipe).
  const measure = useCallback(() => {
    const li = activeIndex >= 0 ? (listRef.current?.children[activeIndex] as HTMLElement | undefined) : undefined;
    setRest(li ? { x: li.offsetLeft, w: li.offsetWidth } : null);
  }, [activeIndex]);

  useLayoutEffect(() => {
    measure();
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [measure, hidden]);

  const items = () => [...(listRef.current?.children ?? [])] as HTMLElement[];

  const end = (go: boolean) => {
    const p = press.current;
    press.current = null;
    setPressed(false);
    if (p?.sliding && slide) {
      // The press became a slide: open the tab under the lens, and ignore the click the release may fire.
      swallowClick.current = true;
      window.setTimeout(() => (swallowClick.current = false), 0);
      const target = tabs[slide.over];
      if (go && target && target.name !== active) window.location.hash = target.href;
    }
    setSlide(null);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLUListElement>) => {
    if (e.button !== 0 || !e.isPrimary) return;
    press.current = { pointerId: e.pointerId, startX: e.clientX, sliding: false };
    setPressed(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLUListElement>) => {
    const p = press.current;
    const list = listRef.current;
    if (!p || p.pointerId !== e.pointerId || !list) return;
    if (!p.sliding) {
      if (Math.abs(e.clientX - p.startX) < SLIDE_THRESHOLD) return;
      p.sliding = true;
      list.setPointerCapture(e.pointerId);
    }
    const box = list.getBoundingClientRect();
    const els = items();
    const over = nearestIndex(
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2;
      }),
      e.clientX,
    );
    const w = rest?.w ?? els[0]?.offsetWidth ?? 0;
    setSlide((prev) => {
      if (prev && prev.over !== over) navigator.vibrate?.(8);
      return { x: list.offsetLeft + lensLeft(e.clientX - box.left, w, box.width), over };
    });
  };

  const lensW = rest?.w ?? items()[0]?.offsetWidth ?? 0;
  const lensX = slide ? slide.x : (rest?.x ?? 0);
  const lit = slide ? slide.over : activeIndex;
  const showLens = slide !== null || rest !== null;

  return (
    <nav className={`tabbar${hidden ? ' is-hidden' : ''}`} aria-label={t('nav.label')}>
      <div className={`tabbar-tabs glass${pressed ? ' is-pressed' : ''}${slide ? ' is-sliding' : ''}`}>
        {showLens ? <span className="tab-lens" aria-hidden="true" style={{ inlineSize: `${lensW}px`, transform: `translateX(${lensX}px)` }} /> : null}
        <ul
          ref={listRef}
          className="tabbar-list"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => end(true)}
          onPointerCancel={() => end(false)}
          onLostPointerCapture={() => press.current?.sliding && end(true)}
          onClickCapture={(e) => {
            if (!swallowClick.current) return;
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {tabs.map((tab, i) => (
            <li key={tab.name}>
              <a className={`tab${i === lit ? ' is-lit' : ''}`} href={tab.href} draggable={false} aria-current={active === tab.name ? 'page' : undefined}>
                <Icon name={tab.icon} size={20} />
                <span className="tab-label">{t(tab.label)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <a className="tabbar-search glass" href={searchHref} draggable={false} aria-label={t('nav.search')}>
        <Icon name="search" size={22} />
      </a>
    </nav>
  );
}
