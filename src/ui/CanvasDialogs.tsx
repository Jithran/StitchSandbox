import { useMemo, useState } from 'react';
import { contentBounds, type Anchor } from '../model/transform';
import { type PatternDocument } from '../model/types';

interface ResizeProps {
  doc: PatternDocument;
  onApply: (width: number, height: number, anchorX: Anchor, anchorY: Anchor) => void;
  onClose: () => void;
}

const ANCHORS: Anchor[] = [0, 0.5, 1];

export function ResizeDialog({ doc, onApply, onClose }: ResizeProps): React.ReactElement {
  const [width, setWidth] = useState(doc.width);
  const [height, setHeight] = useState(doc.height);
  const [ax, setAx] = useState<Anchor>(0.5);
  const [ay, setAy] = useState<Anchor>(0.5);

  const grows = width >= doc.width && height >= doc.height;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Resize canvas</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <fieldset>
          <legend>New size (stitches)</legend>
          <div className="field-row">
            <label>
              Width
              <input
                type="number"
                min={1}
                max={1000}
                value={width}
                onChange={(e) => setWidth(clampInt(e.target.value, 1, 1000))}
              />
            </label>
            <label>
              Height
              <input
                type="number"
                min={1}
                max={1000}
                value={height}
                onChange={(e) => setHeight(clampInt(e.target.value, 1, 1000))}
              />
            </label>
          </div>
          <p className="hint">Current: {doc.width} × {doc.height}</p>
        </fieldset>

        <fieldset>
          <legend>Anchor (where the design stays)</legend>
          <div className="anchor-grid">
            {ANCHORS.map((ry) =>
              ANCHORS.map((rx) => (
                <button
                  key={`${rx}-${ry}`}
                  className={`anchor-cell ${ax === rx && ay === ry ? 'active' : ''}`}
                  onClick={() => {
                    setAx(rx);
                    setAy(ry);
                  }}
                  aria-label={`anchor ${rx},${ry}`}
                />
              )),
            )}
          </div>
          {!grows && <p className="warn">Shrinking may cut off part of the design.</p>}
        </fieldset>

        <div className="modal-actions">
          <button className="primary" onClick={() => onApply(width, height, ax, ay)}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

interface CropProps {
  doc: PatternDocument;
  onApply: (border: number) => void;
  onClose: () => void;
}

export function CropDialog({ doc, onApply, onClose }: CropProps): React.ReactElement {
  const [border, setBorder] = useState(0);
  const bounds = useMemo(() => contentBounds(doc), [doc]);

  const newSize = bounds
    ? {
        w: bounds.right - bounds.left + border * 2,
        h: bounds.bottom - bounds.top + border * 2,
      }
    : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crop to design</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {!bounds ? (
          <p className="hint">Nothing to crop — the canvas is empty.</p>
        ) : (
          <>
            <label>
              Border (stitches around the design)
              <input
                type="number"
                min={0}
                max={100}
                value={border}
                onChange={(e) => setBorder(clampInt(e.target.value, 0, 100))}
              />
            </label>
            <p className="hint">
              New size: {newSize!.w} × {newSize!.h} (from {doc.width} × {doc.height})
            </p>
            <div className="modal-actions">
              <button className="primary" onClick={() => onApply(border)}>
                Crop
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function clampInt(value: string, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
