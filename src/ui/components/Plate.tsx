import { memo } from 'react';
import type { Cuisine } from '../../types.ts';
import { plateArt } from '../plate.ts';

interface Props {
  id: string;
  cuisine: Cuisine;
  size?: number;
  className?: string;
}

/** A recipe's generative plate (decorative; the recipe name is always next to it). */
export const Plate = memo(function Plate({ id, cuisine, size = 64, className }: Props) {
  const art = plateArt(id, cuisine);
  return (
    <svg
      className={`plate${className ? ` ${className}` : ''}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="50" cy="50" r="48" className="plate-shadow" />
      <circle cx="50" cy="50" r="47" className="plate-rim" />
      <path d={art.rim} className={`plate-motif plate-accent-${art.accent}`} />
      <circle cx="50" cy="50" r="37.6" className="plate-ring" />
      <circle cx="50" cy="50" r="36" className="plate-well" />
      {art.food.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill={s.fill ?? 'none'}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={s.opacity}
        />
      ))}
    </svg>
  );
});
