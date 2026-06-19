import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  onClose: () => void;
  /** Called when Enter is pressed inside a text/number field. */
  onSubmit?: () => void;
  className?: string;
  children: ReactNode;
}

const SELECTABLE = /^(text|number|search|email|url|tel|password)$/;

/**
 * Shared modal shell with the usual niceties:
 * - only closes when a click both starts and ends on the backdrop (so dragging
 *   out of a field never closes it),
 * - Escape closes, Enter submits,
 * - the first field is focused (and selected) on open.
 */
export function Modal({ onClose, onSubmit, className, children }: Props): React.ReactElement {
  const downOnBackdrop = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = modalRef.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), select, textarea',
    );
    if (!field) return;
    field.focus();
    if (field instanceof HTMLInputElement && SELECTABLE.test(field.type)) field.select();
  }, []);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && downOnBackdrop.current) onClose();
      }}
    >
      <div
        ref={modalRef}
        className={`modal ${className ?? ''}`}
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
            return;
          }
          if (e.key === 'Enter' && onSubmit && (e.target as HTMLElement).tagName === 'INPUT') {
            e.preventDefault();
            onSubmit();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
