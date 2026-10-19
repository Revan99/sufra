// Notes under a meal or recipe that no longer fits the settings: "Contains egg, which you avoid".
import type { Profile } from '../../types.ts';
import { t } from '../../i18n/index.ts';
import { allergenName, dietName, listJoin, minutes } from '../../i18n/labels.ts';
import type { Conflict } from '../planHelpers.ts';
import { useLibrary } from '../library.tsx';
import { Icon } from './Icon.tsx';

/** Sentences for what in a recipe goes against the user's settings ("Contains egg, which you avoid"). */
export function useConflictLines(conflict: Conflict | null, profile: Profile, totalMinutes: number): string[] {
  const lib = useLibrary();
  if (!conflict) return [];
  const lines: string[] = [];
  if (conflict.allergens.length) lines.push(t('meal.conflict.allergen', { list: listJoin(conflict.allergens.map((a) => allergenName(a).toLocaleLowerCase())) }));
  if (conflict.disliked.length) lines.push(t('meal.conflict.disliked', { list: listJoin(conflict.disliked.map((id) => lib.ingredientIndex.get(id)?.name.toLocaleLowerCase() ?? id)) }));
  if (conflict.diet) lines.push(t('meal.conflict.diet', { diet: dietName(profile.diet) }));
  if (conflict.time && profile.maxTotalMinutes !== null) lines.push(t('meal.conflict.time', { time: minutes(totalMinutes), limit: minutes(profile.maxTotalMinutes) }));
  return lines;
}

/** A warning under a meal or recipe that no longer fits the settings. */
export function ConflictNote({ lines, id }: { lines: readonly string[]; id?: string }) {
  if (!lines.length) return null;
  return (
    <ul className="conflict" id={id}>
      {lines.map((line) => (
        <li key={line}>
          <Icon name="info" size={16} />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
