// App state in a React context: a reducer over the persisted AppState, saved through lib/storage.ts after every
// change. Works in memory when storage is blocked or holds a newer version's data.
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { AppState } from '../lib/storage.ts';
import { STATE_VERSION, STORAGE_KEY, browserStorage, clearState, loadState, pruneState, saveState, storedVersion } from '../lib/storage.ts';
import { todayLocal } from '../lib/dates.ts';
import { reducer } from './state.ts';
import type { Action } from './state.ts';

/** Whether changes reach storage: yes, no (blocked or full), or not while a newer version's data is there. */
export type Persistence = 'saved' | 'unavailable' | 'newer';

interface AppStateApi {
  state: AppState;
  dispatch: Dispatch<Action>;
  persistence: Persistence;
  /** Clears storage and returns to the first-run defaults. */
  reset: () => void;
  /** Bumped when the whole state is replaced (reset, or another tab's save), so snapshots taken from it refresh. */
  generation: number;
}

const Ctx = createContext<AppStateApi | null>(null);

function initialPersistence(): Persistence {
  if (!browserStorage()) return 'unavailable';
  const v = storedVersion();
  return v !== null && v > STATE_VERSION ? 'newer' : 'saved';
}

function initialState(): AppState {
  return pruneState(loadState(), todayLocal());
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [persistence, setPersistence] = useState<Persistence>(initialPersistence);
  const [generation, setGeneration] = useState(0);
  const first = useRef(true);
  const skipSave = useRef(false);

  // Save after every change (not the first render: nothing changed yet, and a newer version's data stays put).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const ok = saveState(state);
    setPersistence(ok ? 'saved' : initialPersistence() === 'newer' ? 'newer' : 'unavailable');
  }, [state]);

  // Another tab changed the saved state: follow it (without writing it back).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      skipSave.current = true;
      dispatch({ type: 'replace', state: loadState() });
      setGeneration((g) => g + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const api = useMemo<AppStateApi>(
    () => ({
      state,
      dispatch,
      persistence,
      reset: () => {
        clearState();
        dispatch({ type: 'reset' });
        setGeneration((g) => g + 1);
      },
      generation,
    }),
    [state, persistence, generation],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAppState(): AppStateApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useAppState outside AppStateProvider');
  return api;
}
