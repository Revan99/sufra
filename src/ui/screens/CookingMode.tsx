// Cooking mode: one step at a time, full screen over the blurred recipe photo, with a countdown when the step names a
// time. A modal <dialog> (showModal) gives the focus trap, Escape and the inert page behind it.
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { CatalogRecipe } from '../../types.ts';
import { stepTimerSeconds, timerClock } from '../../lib/cooking.ts';
import { currentLocale, t } from '../../i18n/index.ts';
import { Icon } from '../components/Icon.tsx';
import { RecipeImage } from '../components/RecipeImage.tsx';

interface StepTimer {
  total: number;
  /** Milliseconds left while paused (or 0 when done). */
  left: number;
  /** When it ends, while running. */
  endAt: number | null;
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export interface StepTimers {
  status: (step: number) => TimerStatus;
  /** Seconds left (the full length before it starts). */
  remaining: (step: number, total: number) => number;
  start: (step: number, total: number) => void;
  pause: (step: number) => void;
  resume: (step: number) => void;
  reset: (step: number) => void;
}

/**
 * Countdowns per step, kept by the recipe page so a running timer survives closing cooking mode or moving on to the
 * next step. `onDone` is called once when a timer reaches zero.
 */
export function useStepTimers(onDone: (step: number) => void): StepTimers {
  const [timers, setTimers] = useState<Readonly<Record<number, StepTimer>>>({});
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const timersRef = useRef(timers);
  timersRef.current = timers;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const running = Object.values(timers).some((x) => x.endAt !== null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const finished = Object.entries(timersRef.current)
        .filter(([, x]) => x.endAt !== null && x.endAt <= now)
        .map(([k]) => Number(k));
      if (finished.length) {
        setTimers((ts) => {
          const next = { ...ts };
          for (const k of finished) {
            const x = next[k];
            if (x) next[k] = { ...x, left: 0, endAt: null };
          }
          return next;
        });
        for (const k of finished) onDoneRef.current(k);
      }
      tick();
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const status = useCallback((step: number): TimerStatus => {
    const x = timersRef.current[step];
    if (!x) return 'idle';
    if (x.endAt !== null) return 'running';
    return x.left > 0 ? 'paused' : 'done';
  }, []);

  const remaining = useCallback((step: number, total: number): number => {
    const x = timersRef.current[step];
    if (!x) return total;
    return Math.max(0, (x.endAt !== null ? x.endAt - Date.now() : x.left) / 1000);
  }, []);

  const set = (step: number, f: (x: StepTimer | undefined) => StepTimer | null) =>
    setTimers((ts) => {
      const next = { ...ts };
      const v = f(ts[step]);
      if (v) next[step] = v;
      else delete next[step];
      return next;
    });

  return {
    status,
    remaining,
    start: (step, total) => set(step, () => ({ total, left: total * 1000, endAt: Date.now() + total * 1000 })),
    pause: (step) => set(step, (x) => (x && x.endAt !== null ? { ...x, left: Math.max(0, x.endAt - Date.now()), endAt: null } : (x ?? null))),
    resume: (step) => set(step, (x) => (x && x.endAt === null && x.left > 0 ? { ...x, endAt: Date.now() + x.left } : (x ?? null))),
    reset: (step) => set(step, () => null),
  };
}

interface Props {
  recipe: CatalogRecipe;
  /** The step it opens on. */
  startAt: number;
  /** Ticked steps (cook progress). */
  done: readonly number[];
  /** Ticks a step (moving forward past it). */
  onTick: (step: number) => void;
  onClose: () => void;
  /** The last step was finished. */
  onFinish: () => void;
  timers: StepTimers;
  /** Text for the polite live region (a timer finishing). */
  announcement: string;
  /** Whether the blurred photo is shown behind (otherwise a dark gradient). */
  showPhoto: boolean;
  photoSizes: string;
  wake: { supported: boolean; on: boolean; toggle: () => void };
}

/** Mounted while cooking: opens as a modal on mount and closes on unmount. */
export function CookingMode({ recipe, startAt, done, onTick, onClose, onFinish, timers, announcement, showPhoto, photoSizes, wake }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const count = recipe.steps.length;
  const [step, setStep] = useState(() => Math.min(Math.max(0, startAt), Math.max(0, count - 1)));

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!d.open) d.showModal();
    const handleClose = () => {
      // A close event queued before the dialog was opened again (StrictMode remounts effects): ignore it.
      if (d.open) return;
      onCloseRef.current();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
    d.addEventListener('close', handleClose);
    return () => {
      d.removeEventListener('close', handleClose);
      if (d.open) d.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  // The step heading takes focus on open and on every step change, so the new step is read out.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const close = () => ref.current?.close();
  const last = step >= count - 1;
  const next = () => {
    if (!done.includes(step)) onTick(step);
    if (last) onFinish();
    else setStep(step + 1);
  };
  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
    const rtl = currentLocale().dir === 'rtl';
    if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
      e.preventDefault();
      if (!last) next();
    } else if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) {
      e.preventDefault();
      prev();
    }
  };

  const text = recipe.steps[step] ?? '';
  const total = stepTimerSeconds(text);
  const status = total !== null ? timers.status(step) : 'idle';

  return (
    <dialog ref={ref} className={`cook${showPhoto ? ' cook-has-photo' : ''}`} aria-labelledby="cook-title" onKeyDown={onKeyDown}>
      <div className="cook-bg" aria-hidden="true">
        {showPhoto ? <RecipeImage recipe={recipe} kind="hero" sizes={photoSizes} plateSize={1} hero className="cook-bg-img" /> : null}
      </div>
      <div className="cook-layout">
        <div className="cook-top">
          <button type="button" className="icon-btn glass-clear cook-round" onClick={close} aria-label={t('cook.close')}>
            <Icon name="close" size={20} />
          </button>
          <p id="cook-title" className="cook-title glass-clear">
            <bdi>{recipe.nativeName ?? recipe.name}</bdi>
          </p>
          {wake.supported ? (
            <button type="button" className={`icon-btn glass-clear cook-round cook-awake${wake.on ? ' is-on' : ''}`} aria-pressed={wake.on} aria-label={t('cook.keepAwake')} onClick={wake.toggle}>
              <Icon name="sun" size={19} />
            </button>
          ) : (
            <span className="cook-round-spacer" aria-hidden="true" />
          )}
        </div>

        <div className="cook-step">
          <div className="cook-progress" aria-hidden="true">
            {recipe.steps.map((_, i) => (
              <span key={i} className={`cook-seg${i <= step || done.includes(i) ? ' is-on' : ''}`} />
            ))}
          </div>
          <h2 ref={headingRef} tabIndex={-1} className="cook-heading">
            <span className="cook-step-label">{t('cook.stepOf', { n: step + 1, total: count })}</span>
            <span className="cook-step-text">{text}</span>
          </h2>
          {total !== null ? (
            <div className={`cook-timer glass-clear${status === 'done' ? ' is-done' : ''}`}>
              <Icon name="timer" size={20} />
              <span className="cook-timer-time num" role="timer">
                {status === 'done' ? t('cook.timerDone') : timerClock(timers.remaining(step, total))}
              </span>
              {status === 'idle' ? (
                <button type="button" className="cook-timer-btn" onClick={() => timers.start(step, total)}>
                  {t('cook.timerStart')}
                </button>
              ) : status === 'running' ? (
                <button type="button" className="cook-timer-btn" onClick={() => timers.pause(step)}>
                  {t('cook.timerPause')}
                </button>
              ) : status === 'paused' ? (
                <button type="button" className="cook-timer-btn" onClick={() => timers.resume(step)}>
                  {t('cook.timerResume')}
                </button>
              ) : null}
              {status !== 'idle' ? (
                <button type="button" className="cook-timer-reset" onClick={() => timers.reset(step)} aria-label={t('cook.timerReset')}>
                  <Icon name="restart" size={18} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="cook-bottom">
          <button type="button" className="cook-prev glass-clear" onClick={prev} aria-disabled={step === 0 || undefined} aria-label={t('cook.prev')}>
            <Icon name="chevronLeft" size={24} className="flip-rtl" />
          </button>
          <button type="button" className="cook-next glass-accent" onClick={next}>
            {last ? t('cook.finish') : t('cook.next')}
            {last ? <Icon name="check" size={19} /> : <Icon name="arrowRight" size={19} className="flip-rtl" />}
          </button>
        </div>
      </div>
      <div className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </div>
    </dialog>
  );
}
