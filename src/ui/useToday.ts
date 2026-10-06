// The local calendar date, kept current: re-read when the app comes back to the foreground, gains focus, and at
// the next local midnight while it stays open.
import { useEffect, useState } from 'react';
import { todayLocal } from '../lib/dates.ts';
import type { ISODate } from '../lib/dates.ts';

/** Milliseconds from `now` until just after the next local midnight. */
export function msUntilMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return Math.max(1000, next.getTime() - now.getTime());
}

export function useToday(): ISODate {
  const [today, setToday] = useState<ISODate>(() => todayLocal());
  useEffect(() => {
    let timer = 0;
    const refresh = () => {
      setToday(todayLocal());
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, msUntilMidnight(new Date()));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    timer = window.setTimeout(refresh, msUntilMidnight(new Date()));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, []);
  return today;
}
