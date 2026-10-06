// A modal built on <dialog>: a bottom sheet on phones, a centred dialog on wide screens. Native showModal gives
// the focus trap, Escape and the inert background; this adds backdrop-click closing and focus return.
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { t } from '../../i18n/index.ts';
import { Icon } from './Icon.tsx';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Shown under the title. */
  subtitle?: string;
  /** A picture beside the title (the recipe's photo or plate); decorative. */
  media?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** 'alert' for confirmations (role alertdialog). */
  kind?: 'sheet' | 'alert';
}

export function Sheet({ open, onClose, title, subtitle, media, children, footer, kind = 'sheet' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const subId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const handleClose = () => {
      onCloseRef.current();
      const el = opener.current;
      opener.current = null;
      if (el && el.isConnected) el.focus({ preventScroll: true });
    };
    d.addEventListener('close', handleClose);
    return () => d.removeEventListener('close', handleClose);
  }, []);

  // Close the dialog if the component unmounts while open (a route change), so focus isn't lost.
  useEffect(() => {
    const d = ref.current;
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`sheet sheet-${kind}`}
      role={kind === 'alert' ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subId : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
    >
      {open ? (
        <div className="sheet-inner">
          <div className="sheet-grip" aria-hidden="true" />
          <header className={`sheet-head${media ? ' has-media' : ''}`}>
            {media}
            <div className="sheet-head-text">
              <h2 id={titleId} className="sheet-title">
                {title}
              </h2>
              {subtitle ? (
                <p id={subId} className="sheet-sub">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label={t('common.close')}>
              <Icon name="close" />
            </button>
          </header>
          <div className="sheet-body">{children}</div>
          {footer ? <footer className="sheet-foot">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
