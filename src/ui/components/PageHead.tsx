import type { ReactNode } from 'react';

/**
 * A screen's header: a small line above the large title, with controls on the end side (a glass capsule, a
 * segmented range, a search field). The title is the screen's h1 and takes focus on navigation.
 */
export function PageHead({ sub, title, children, className }: { sub?: ReactNode; title: string; children?: ReactNode; className?: string }) {
  return (
    <header className={`page-head${className ? ` ${className}` : ''}`}>
      <div className="page-head-text">
        {sub ? <p className="page-sub">{sub}</p> : null}
        <h1 tabIndex={-1} className="page-title">
          {title}
        </h1>
      </div>
      {children ? <div className="page-head-end">{children}</div> : null}
    </header>
  );
}
