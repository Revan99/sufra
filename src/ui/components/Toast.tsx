// A polite live region with a visible toast: confirms actions (swap, favorite, copy) for everyone, including
// screen reader users, with an optional action such as Undo.
//
// Timing (WCAG 2.2.1): a plain message hides after a few seconds, but never while the pointer is over it, it has
// keyboard focus, or the page is hidden. A toast with an action (Undo, View day) stays until it is dismissed,
// replaced by the next toast, or the user moves to another screen, so there is always time to reach it.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { t } from '../../i18n/index.ts';
import { Icon } from './Icon.tsx';

interface ToastAction {
  label: string;
  run: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
}

type Notify = (message: string, action?: ToastAction) => void;

/** How long a message without an action stays up, not counting time paused. */
export const TOAST_MS = 5000;

const Ctx = createContext<Notify>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const nextId = useRef(1);
  const timer = useRef(0);
  const left = useRef(0);
  const startedAt = useRef(0);
  const holds = useRef(new Set<'hover' | 'focus' | 'hidden'>());

  const stop = () => {
    window.clearTimeout(timer.current);
    timer.current = 0;
  };

  const dismiss = useCallback(() => {
    stop();
    setToast(null);
  }, []);

  const run = useCallback(() => {
    stop();
    if (left.current <= 0 || holds.current.size) return;
    startedAt.current = Date.now();
    timer.current = window.setTimeout(() => setToast(null), left.current);
  }, []);

  const hold = useCallback((why: 'hover' | 'focus' | 'hidden', on: boolean) => {
    if (on) {
      if (timer.current) left.current -= Date.now() - startedAt.current;
      stop();
      holds.current.add(why);
    } else {
      holds.current.delete(why);
      run();
    }
  }, [run]);

  const notify = useCallback<Notify>(
    (message, action) => {
      setToast({ id: nextId.current++, message, action });
      holds.current.delete('hover');
      holds.current.delete('focus');
      left.current = action ? 0 : TOAST_MS;
      run();
    },
    [run],
  );

  useEffect(() => {
    const onVisibility = () => hold('hidden', document.visibilityState === 'hidden');
    // An action belongs to the screen it was offered on.
    const onRoute = () => setToast((cur) => (cur?.action ? null : cur));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('hashchange', onRoute);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('hashchange', onRoute);
    };
  }, [hold]);

  const value = useMemo(() => notify, [notify]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
        {toast ? (
          <div
            className="toast"
            key={toast.id}
            onPointerEnter={() => hold('hover', true)}
            onPointerLeave={() => hold('hover', false)}
            onFocus={() => hold('focus', true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hold('focus', false);
            }}
          >
            <span className="toast-msg">{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  // Dismiss first, so a toast the action raises (a confirmation) replaces this one instead of
                  // being cleared with it.
                  const action = toast.action;
                  dismiss();
                  action?.run();
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            <button type="button" className="icon-btn toast-close" onClick={dismiss} aria-label={t('common.dismiss')}>
              <Icon name="close" size={20} />
            </button>
          </div>
        ) : null}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): Notify {
  return useContext(Ctx);
}
