// A modal built on <dialog>: a glass bottom sheet on phones, a centred glass panel on wide screens. Native showModal
// gives the focus trap, Escape and the inert background; this adds backdrop-click closing and focus return.
//
// Two headers: a title with a round close button (Swap, Log food), or Cancel · title · confirm when the sheet edits
// one value that is saved only on confirm (Log weight).
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { t } from '../../i18n/index.ts';
import { Icon } from './Icon.tsx';

export interface SheetConfirm {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}

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
  /** Cancel · title · confirm header instead of title and close. */
  confirm?: SheetConfirm;
  /** Extra class on the dialog, for a sheet's own layout. */
  className?: string;
}

export function Sheet({ open, onClose, title, subtitle, media, children, footer, kind = 'sheet', confirm, className }: Props) {
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

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      className={`sheet sheet-${kind}${className ? ` ${className}` : ''}`}
      role={kind === 'alert' ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subId : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {open ? (
        <div className="sheet-inner">
          <div className="sheet-grip" aria-hidden="true" />
          {confirm ? (
            <header className="sheet-head sheet-head-confirm">
              <button type="button" className="btn btn-quiet btn-sm sheet-cancel" onClick={close}>
                {t('common.cancel')}
              </button>
              <h2 id={titleId} className="sheet-title sheet-title-sm">
                {title}
              </h2>
              <button type="button" className="btn btn-accent btn-sm sheet-confirm" onClick={confirm.onConfirm} aria-disabled={confirm.disabled || undefined}>
                {confirm.label}
              </button>
            </header>
          ) : (
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
              <button type="button" className="icon-btn sheet-close" onClick={close} aria-label={t('common.close')}>
                <Icon name="close" size={16} />
              </button>
            </header>
          )}
          {confirm && subtitle ? (
            <p id={subId} className="sheet-sub">
              {subtitle}
            </p>
          ) : null}
          <div className="sheet-body">{children}</div>
          {footer ? <footer className="sheet-foot">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
