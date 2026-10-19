import { Icon } from './Icon.tsx';

/** The app mark: a white leaf on a saffron rounded square (same drawing as the app icon). */
export function Mark({ size = 34 }: { size?: number }) {
  return (
    <span className="mark" style={{ inlineSize: size, blockSize: size, borderRadius: size * 0.32 }} aria-hidden="true">
      <Icon name="leaf" size={Math.round(size * 0.53)} />
    </span>
  );
}
