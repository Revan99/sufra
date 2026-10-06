// The app state reducer: pure, over lib/storage.ts's update functions. The provider (AppState.tsx) persists it.
import type { MealOverride, MealSlot, Profile } from '../types.ts';
import type { ISODate } from '../lib/dates.ts';
import type { AppState, ThemeChoice } from '../lib/storage.ts';
import {
  clearDayOverrides,
  clearOverride,
  clearShoppingChecked,
  defaultState,
  parseState,
  pruneState,
  setOverride,
  toggleFavorite,
  toggleShoppingChecked,
  updateProfile,
} from '../lib/storage.ts';

export type Action =
  | { type: 'profile'; patch: Partial<Profile> }
  | { type: 'favorite'; id: string }
  | { type: 'override'; override: MealOverride }
  | { type: 'clearOverride'; date: ISODate; slot: MealSlot; index: number }
  | { type: 'clearDay'; date: ISODate }
  | { type: 'shopToggle'; ingredientId: string; through: ISODate }
  | { type: 'shopClear' }
  | { type: 'onboarded'; profile?: Partial<Profile> }
  | { type: 'theme'; theme: ThemeChoice }
  /** Daily housekeeping; with `known`, also drops overrides for recipes no longer in the library. */
  | { type: 'prune'; today: ISODate; known?: ReadonlySet<string> }
  | { type: 'reset' }
  /** Another tab saved a newer state. */
  | { type: 'replace'; state: AppState };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'profile':
      return updateProfile(state, action.patch);
    case 'favorite':
      return toggleFavorite(state, action.id);
    case 'override':
      return setOverride(state, action.override);
    case 'clearOverride':
      return clearOverride(state, action.date, action.slot, action.index);
    case 'clearDay':
      return clearDayOverrides(state, action.date);
    case 'shopToggle':
      return toggleShoppingChecked(state, action.ingredientId, action.through);
    case 'shopClear':
      return clearShoppingChecked(state);
    case 'onboarded': {
      const next = action.profile ? updateProfile(state, action.profile) : state;
      return next.onboarded ? next : { ...next, onboarded: true };
    }
    case 'theme':
      return state.theme === action.theme ? state : { ...state, theme: action.theme };
    case 'prune': {
      const pruned = pruneState(state, action.today);
      const known = action.known;
      if (!known) return pruned;
      const overrides = pruned.overrides.filter((o) => known.has(o.recipeId));
      return overrides.length === pruned.overrides.length ? pruned : { ...pruned, overrides };
    }
    case 'reset':
      return defaultState();
    case 'replace':
      return parseState(action.state);
    default:
      return state;
  }
}
