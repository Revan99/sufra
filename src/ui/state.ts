// The app state reducer: pure, over lib/storage.ts's update functions. The provider (AppState.tsx) persists it.
import type { MealOverride, MealSlot, Profile } from '../types.ts';
import type { ISODate } from '../lib/dates.ts';
import type { AppState, ThemeChoice } from '../lib/storage.ts';
import type { FoodLog, MealLog, WeightLog, WeightUnit } from '../lib/tracker.ts';
import { addFood, clearMealLog, logWeight, removeFood, removeWeight, setMealStatus, setWater } from '../lib/tracker.ts';
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
  /** Tracker: a planned meal eaten or skipped (with what it held), or back to planned with `status: null`. */
  | { type: 'mealStatus'; date: ISODate; log: MealLog | { slot: MealSlot; index: number; status: null } }
  | { type: 'logFood'; date: ISODate; food: FoodLog }
  | { type: 'removeFood'; date: ISODate; id: string }
  | { type: 'water'; date: ISODate; glasses: number }
  | { type: 'logWeight'; entry: WeightLog }
  | { type: 'removeWeight'; date: ISODate }
  | { type: 'weightUnit'; unit: WeightUnit }
  /** Daily housekeeping; with `known`, also drops overrides for recipes no longer in the library. */
  | { type: 'prune'; today: ISODate; known?: ReadonlySet<string> }
  | { type: 'reset' }
  /** Another tab saved a newer state. */
  | { type: 'replace'; state: AppState };

function withTracker(state: AppState, tracker: AppState['tracker']): AppState {
  return tracker === state.tracker ? state : { ...state, tracker };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'profile':
      return updateProfile(state, action.patch);
    case 'favorite':
      return toggleFavorite(state, action.id);
    case 'override': {
      // A different recipe for a meal hasn't been eaten yet: its tracker log goes with the old one.
      const next = setOverride(state, action.override);
      const o = action.override;
      return next === state ? state : withTracker(next, clearMealLog(next.tracker, o.date, o.slot, o.index));
    }
    case 'clearOverride': {
      const next = clearOverride(state, action.date, action.slot, action.index);
      return next === state ? state : withTracker(next, clearMealLog(next.tracker, action.date, action.slot, action.index));
    }
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
    case 'mealStatus':
      return withTracker(state, setMealStatus(state.tracker, action.date, action.log));
    case 'logFood':
      return withTracker(state, addFood(state.tracker, action.date, action.food));
    case 'removeFood':
      return withTracker(state, removeFood(state.tracker, action.date, action.id));
    case 'water':
      return withTracker(state, setWater(state.tracker, action.date, action.glasses));
    case 'logWeight':
      return withTracker(state, logWeight(state.tracker, action.entry));
    case 'removeWeight':
      return withTracker(state, removeWeight(state.tracker, action.date));
    case 'weightUnit':
      return state.tracker.unit === action.unit ? state : withTracker(state, { ...state.tracker, unit: action.unit });
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
