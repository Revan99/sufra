// The phone tab bar: a floating glass capsule of tabs and a round search button. As on iPhone (iOS 26), you can press
// the bar and slide along it: the selection lifts into a glass lens that follows your finger, and the tab under it
// opens when you let go (see useSlideSelect). A plain tap, and the keyboard, work as ordinary links.
import { t } from '../../i18n/index.ts';
import type { MessageKey } from '../../i18n/index.ts';
import type { TabName } from '../router.ts';
import { useSlideSelect } from '../useSlideSelect.ts';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';

export interface TabItem {
  name: TabName;
  icon: IconName;
  label: MessageKey;
  href: string;
}

export function TabBar({ tabs, active, hidden, searchHref }: { tabs: readonly TabItem[]; active: TabName; hidden: boolean; searchHref: string }) {
  const slide = useSlideSelect(
    'x',
    tabs.findIndex((tab) => tab.name === active),
    (i) => {
      const target = tabs[i];
      if (target) window.location.hash = target.href;
    },
    hidden,
  );

  return (
    <nav className={`tabbar${hidden ? ' is-hidden' : ''}`} aria-label={t('nav.label')}>
      <div className={`tabbar-tabs glass${slide.pressed ? ' is-pressed' : ''}${slide.sliding ? ' is-sliding' : ''}`}>
        {slide.lensStyle ? <span className="tab-lens" aria-hidden="true" style={slide.lensStyle} /> : null}
        <ul ref={slide.listRef} className="tabbar-list" {...slide.listProps}>
          {tabs.map((tab, i) => (
            <li key={tab.name}>
              <a className={`tab${i === slide.lit ? ' is-lit' : ''}`} href={tab.href} draggable={false} aria-current={active === tab.name ? 'page' : undefined}>
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
