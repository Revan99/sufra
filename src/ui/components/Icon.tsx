// Hand-drawn 24 px stroke icons (1.75 stroke, round caps and joins). Decorative: the control carries the label.
import type { ReactNode } from 'react';

const PATHS = {
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3" />
    </>
  ),
  week: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13.5h1M11.5 13.5h1M15.5 13.5h1M7.5 16.8h1M11.5 16.8h1" />
    </>
  ),
  basket: (
    <>
      <path d="M3.5 10h17l-1.7 8.4a2 2 0 0 1-2 1.6H7.2a2 2 0 0 1-2-1.6L3.5 10Z" />
      <path d="M8 10l3-6M16 10l-3-6M9.5 13.5v3M14.5 13.5v3" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5c2.8-1.3 5.6-1.3 8 .5v14c-2.4-1.8-5.2-1.8-8-.5v-14Z" />
      <path d="M20 5.5c-2.8-1.3-5.6-1.3-8 .5v14c2.4-1.8 5.2-1.8 8-.5v-14Z" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  chevronLeft: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  chevronDown: <path d="M5.5 9.5 12 16l6.5-6.5" />,
  arrowLeft: <path d="M19 12H5.5M11 6l-6 6 6 6" />,
  swap: <path d="M4.5 8.5h13l-3.5-3.5M19.5 15.5h-13l3.5 3.5" />,
  heart: <path d="M12 19.5s-7.5-4.4-7.5-10A4.1 4.1 0 0 1 12 7.2a4.1 4.1 0 0 1 7.5 2.3c0 5.6-7.5 10-7.5 10Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.6-3.2 2.7-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.8a3 3 0 0 1 0 5.4M17.5 14.3c1.6.7 2.6 2.3 3 4.7" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12.5 10 17.5 19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M8 11H6.5a2 2 0 0 0-2 2v5.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V13a2 2 0 0 0-2-2H16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13.5 14-14 .5 9-5 14-13 14" />
      <path d="M5 19c3-4 6-6.5 9.5-8.5" />
    </>
  ),
  flame: <path d="M12 20.5c-3.6 0-6-2.4-6-5.8 0-3.9 3.6-5.4 4.2-10.2 2.4 1.4 4 3.6 4.3 6.2.8-.6 1.3-1.5 1.5-2.6 1.3 1.5 2 3.3 2 5.3 0 4-2.6 7.1-6 7.1Z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.2" />
    </>
  ),
  undo: <path d="M9 7.5 4.5 12 9 16.5M5 12h9a5 5 0 0 1 0 10h-2" />,
  restart: <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" />,
  sparkle: <path d="M12 3.5c.7 4.2 2.3 5.8 6.5 6.5-4.2.7-5.8 2.3-6.5 6.5-.7-4.2-2.3-5.8-6.5-6.5 4.2-.7 5.8-2.3 6.5-6.5ZM18.5 16c.3 1.5.9 2.1 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.4 2.2-1 2.5-2.5Z" />,
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />,
  calendarPlus: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4M12 12.5v5M9.5 15h5" />
    </>
  ),
  screen: (
    <>
      <rect x="6.5" y="3" width="11" height="18" rx="2.5" />
      <path d="M10.5 18h3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </>
  ),
  play: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="M10 9.2v5.6l4.8-2.8Z" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
