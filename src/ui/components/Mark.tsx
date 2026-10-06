/** The app mark (same drawing as the app icon). */
export function Mark({ size = 72 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" className="mark-bg" />
      <circle cx="32" cy="32" r="21" className="mark-plate" />
      <circle cx="32" cy="32" r="15.5" className="mark-well" />
      <path d="M22.5 41.5c0-10.5 7-18 19-19 .6 12-6.6 19-19 19Z" className="mark-leaf" />
      <path d="M22.5 41.5c4.2-5.4 8.4-9 13.4-11.8" className="mark-vein" />
      <circle cx="40.5" cy="39" r="3.2" className="mark-dot" />
    </svg>
  );
}
