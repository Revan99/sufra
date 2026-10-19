// How a planned day's kcal sits against the target, and the sodium limits the day is measured against.
import { KCAL_TOLERANCE } from '../lib/planner.ts';

/** WHO: under 2,000 mg sodium a day for adults. */
export const SODIUM_LIMIT_MG = 2000;

export type KcalStatus = 'in' | 'under' | 'over';

/** On target within ±10% (the planner's tolerance), else under or over. */
export function kcalStatus(kcal: number, target: number): KcalStatus {
  if (kcal < target * (1 - KCAL_TOLERANCE)) return 'under';
  if (kcal > target * (1 + KCAL_TOLERANCE)) return 'over';
  return 'in';
}
