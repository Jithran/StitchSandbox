import { useMemo, useState } from 'react';
import { dmcHex, getDmc, searchDmc } from '../data/dmc';
import { EditorEngine, type EditorSnapshot } from '../engine/editor';

interface Props {
  engine: EditorEngine;
  snap: EditorSnapshot;
}

export function Palette({ engine, snap }: Props): React.ReactElement {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const palette = engine.getDocument().palette;

  return (
    <div className="palette">
      <div className="palette-header">
        <span>Palette</span>
        <button onClick={() => setLibraryOpen(true)}>+ Color</button>
      </div>

      <div className="palette-swatches">
        {palette.length === 0 && <p className="palette-empty">Add DMC colors to start.</p>}
        {palette.map((code) => {
          const dmc = getDmc(code);
          return (
            <button
              key={code}
              className={`swatch ${snap.activeColorCode === code ? 'active' : ''}`}
              style={{ background: dmcHex(code) }}
              title={dmc ? `DMC ${dmc.code} — ${dmc.name}` : code}
              onClick={() => engine.setActiveColor(code)}
            >
              <span className="swatch-code">{code}</span>
            </button>
          );
        })}
      </div>

      {libraryOpen && (
        <ColorLibrary
          onClose={() => setLibraryOpen(false)}
          onPick={(code) => {
            engine.setActiveColor(code);
          }}
        />
      )}
    </div>
  );
}

interface LibraryProps {
  onClose: () => void;
  onPick: (code: string) => void;
}

function ColorLibrary({ onClose, onPick }: LibraryProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchDmc(query), [query]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal library" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>DMC color library</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <input
          autoFocus
          placeholder="Search by number or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="library-grid">
          {results.map((c) => (
            <button
              key={c.code}
              className="library-swatch"
              title={`DMC ${c.code} — ${c.name}`}
              onClick={() => onPick(c.code)}
            >
              <span className="library-chip" style={{ background: c.hex }} />
              <span className="library-meta">
                <strong>{c.code}</strong>
                <em>{c.name}</em>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
