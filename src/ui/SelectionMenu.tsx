import { useEffect, useRef } from 'react';
import { EditorEngine } from '../engine/editor';

interface Props {
  engine: EditorEngine;
  x: number;
  y: number;
  fillColor: string | null;
  onClose: () => void;
}

interface Item {
  label: string;
  icon: string;
  run: (e: EditorEngine) => void;
  disabled?: boolean;
  divider?: boolean;
  swatch?: boolean;
}

export function SelectionMenu({ engine, x, y, fillColor, onClose }: Props): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('pointerdown', close);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const items: Item[] = [
    { label: 'Copy', icon: '⧉', run: (e) => e.copySelection() },
    { label: 'Duplicate', icon: '❐', run: (e) => e.duplicateSelection() },
    { label: 'Cut & move', icon: '✂', run: (e) => e.cutSelection() },
    { label: 'Mirror horizontal', icon: '⇋', run: (e) => e.mirrorSelectionH(), divider: true },
    { label: 'Mirror vertical', icon: '⥯', run: (e) => e.mirrorSelectionV() },
    { label: 'Rotate right', icon: '⟳', run: (e) => e.rotateSelectionCW() },
    { label: 'Rotate left', icon: '⟲', run: (e) => e.rotateSelectionCCW() },
    {
      label: 'Fill with',
      icon: '▩',
      run: (e) => e.fillSelection(),
      disabled: !fillColor,
      divider: true,
      swatch: true,
    },
    { label: 'Delete', icon: '⌫', run: (e) => e.deleteSelection() },
  ];

  const left = Math.min(x, window.innerWidth - 196);
  const top = Math.min(y, window.innerHeight - items.length * 32 - 12);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          className={item.divider ? 'divider' : ''}
          disabled={item.disabled}
          onClick={() => {
            item.run(engine);
            onClose();
          }}
        >
          <span className="cm-icon">{item.icon}</span>
          <span className="cm-label">{item.label}</span>
          {item.swatch && (
            <span
              className="cm-swatch"
              style={{ background: fillColor ?? 'transparent' }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
