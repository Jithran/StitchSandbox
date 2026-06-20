import { useEffect, useMemo, useRef, useState } from 'react';
import { colorHex, colorInfo, customCode, searchThreads, type LibraryBrand } from '../data/colors';
import { EditorEngine, type EditorSnapshot } from '../engine/editor';
import { Modal } from './Modal';

interface Props {
  engine: EditorEngine;
  snap: EditorSnapshot;
}

export function Palette({ engine, snap }: Props): React.ReactElement {
  const [libraryOpen, setLibraryOpen] = useState(false);
  // Which swatch currently has its remove button revealed via long-press (mobile).
  const [revealCode, setRevealCode] = useState<string | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const palette = engine.getDocument().palette;

  const startLongPress = (code: string) => {
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setRevealCode(code);
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Dismiss a revealed remove button when tapping/clicking anywhere else.
  useEffect(() => {
    if (revealCode === null) return;
    const dismiss = (e: PointerEvent) => {
      if (!(e.target as Element).closest('.swatch-remove')) setRevealCode(null);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [revealCode]);

  return (
    <div className="palette">
      <div className="palette-header">
        <span>Palette</span>
        <button onClick={() => setLibraryOpen(true)}>+ Color</button>
      </div>

      {snap.replaceFrom && (
        <p className="palette-replace-hint">Pick the color to replace it with.</p>
      )}

      {palette.length === 0 ? (
        <button className="palette-cta" onClick={() => setLibraryOpen(true)}>
          <span className="palette-cta-icon">+</span>
          <strong>Add colors</strong>
          <span className="palette-cta-sub">
            Pick DMC, Anchor, Cosmo or custom colors to start designing.
          </span>
        </button>
      ) : (
        <div className="palette-swatches">
          {palette.map((code) => {
            const info = colorInfo(code);
            return (
              <button
                key={code}
                className={`swatch ${snap.activeColorCode === code ? 'active' : ''}`}
                style={{ background: colorHex(code) }}
                title={`${info.brand} ${info.number}${info.name ? ` — ${info.name}` : ''}`}
                onClick={() => {
                  // A long-press already revealed the remove button; don't also select.
                  if (longPressFired.current) {
                    longPressFired.current = false;
                    return;
                  }
                  setRevealCode(null);
                  engine.setActiveColor(code);
                }}
                onTouchStart={() => startLongPress(code)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span className="swatch-code">{info.number}</span>
                <span
                  className={`swatch-remove ${revealCode === code ? 'revealed' : ''}`}
                  title="Remove from palette — stitches keep their color"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRevealCode(null);
                    engine.removePaletteColor(code);
                  }}
                >
                  ✕
                </span>
              </button>
            );
          })}
        </div>
      )}

      {libraryOpen && (
        <ColorLibrary onClose={() => setLibraryOpen(false)} onPick={(code) => engine.setActiveColor(code)} />
      )}
    </div>
  );
}

type Tab = LibraryBrand | 'Custom';

interface LibraryProps {
  onClose: () => void;
  onPick: (code: string) => void;
}

function ColorLibrary({ onClose, onPick }: LibraryProps): React.ReactElement {
  const [tab, setTab] = useState<Tab>('DMC');

  return (
    <Modal className="library" onClose={onClose}>
      <div className="modal-header">
        <h2>Color library</h2>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="tabs">
          {(['DMC', 'Anchor', 'Cosmo', 'Custom'] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

      {tab === 'Custom' ? (
        <CustomColor onPick={onPick} />
      ) : (
        <BrandList brand={tab} onPick={onPick} />
      )}
    </Modal>
  );
}

function BrandList({
  brand,
  onPick,
}: {
  brand: LibraryBrand;
  onPick: (code: string) => void;
}): React.ReactElement {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchThreads(brand, query), [brand, query]);

  return (
    <>
      <input
        autoFocus
        placeholder="Search by number or name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {brand !== 'DMC' && (
        <p className="hint">{brand} colors are approximated from their DMC equivalents.</p>
      )}
      <div className="library-grid">
        {results.map((c) => (
          <button
            key={c.code}
            className="library-swatch"
            title={`${c.brand} ${c.number} — ${c.name}`}
            onClick={() => onPick(c.code)}
          >
            <span className="library-chip" style={{ background: c.hex }} />
            <span className="library-meta">
              <strong>{c.number}</strong>
              <em>{c.name}</em>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function CustomColor({ onPick }: { onPick: (code: string) => void }): React.ReactElement {
  const [hex, setHex] = useState('#3b82f6');
  const [label, setLabel] = useState('');
  const add = () => onPick(customCode(hex, label));

  return (
    <div className="custom-color">
      <div className="custom-row">
        <input
          type="color"
          className="color-input"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
        />
        <label>
          Number / label
          <input
            placeholder="e.g. 1 or My Red"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
          />
        </label>
      </div>
      <div className="custom-preview">
        <span className="library-chip" style={{ background: hex }} />
        <span>{hex.toUpperCase()}</span>
      </div>
      <button className="primary" onClick={add}>
        Add color
      </button>
    </div>
  );
}
