import { useEffect, useMemo, useRef, useState } from 'react';
import { colorHex, colorInfo } from '../data/colors';
import { renderFragmentPreview } from '../engine/renderer';
import { Viewport } from '../engine/viewport';
import { textToFragment, TEXT_FONTS } from '../model/textToStitches';
import { type Fragment } from '../model/transform';

interface Props {
  activeColorCode: string | null;
  onPlace: (frag: Fragment) => void;
  onClose: () => void;
}

export function TextDialog({ activeColorCode, onPlace, onClose }: Props): React.ReactElement {
  const colorCode = activeColorCode ?? '310';
  const info = colorInfo(colorCode);

  const [text, setText] = useState('Hello');
  const [fontFamily, setFontFamily] = useState(TEXT_FONTS[0].value);
  const [bold, setBold] = useState(true);
  const [heightCells, setHeightCells] = useState(16);
  const [halfStitches, setHalfStitches] = useState(true);

  const frag = useMemo(
    () => textToFragment({ text, fontFamily, bold, heightCells, colorCode, halfStitches }),
    [text, fontFamily, bold, heightCells, colorCode, halfStitches],
  );

  const previewRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#fbfaf6';
    ctx.fillRect(0, 0, w, h);
    if (frag.width > 0) {
      const view = new Viewport();
      view.fit(frag.width, frag.height, w, h, 14);
      renderFragmentPreview(ctx, frag, view, 0, 0, false, 1);
    }
  }, [frag]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal text-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            Add text <span className="exp-badge">Experimental</span>
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        <p className="hint">
          Experimental — rasterizing fonts to stitches isn't perfect; tweak the height and the
          smooth-edges option, and check the preview before placing.
        </p>

        <label>
          Text
          <input value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        </label>

        <div className="field-row">
          <label>
            Font
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              {TEXT_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Height (stitches)
            <input
              type="number"
              min={4}
              max={120}
              value={heightCells}
              onChange={(e) => setHeightCells(clampInt(e.target.value, 4, 120))}
            />
          </label>
        </div>

        <div className="text-toggles">
          <label className="inline">
            <input type="checkbox" checked={bold} onChange={(e) => setBold(e.target.checked)} /> Bold
          </label>
          <label className="inline">
            <input
              type="checkbox"
              checked={halfStitches}
              onChange={(e) => setHalfStitches(e.target.checked)}
            />
            Smooth edges (half stitches)
          </label>
        </div>

        <div className="text-color">
          <span className="swatch-dot" style={{ background: colorHex(colorCode) }} />
          Uses active color: {info.brand} {info.number}
          {info.name ? ` — ${info.name}` : ''}
        </div>

        <canvas ref={previewRef} className="text-preview" />
        <p className="hint">
          {frag.width > 0
            ? `${frag.width} × ${frag.height} stitches · place, then position and confirm`
            : 'Type some text to preview.'}
        </p>

        <div className="modal-actions">
          <button className="primary" disabled={frag.width === 0} onClick={() => onPlace(frag)}>
            Place
          </button>
        </div>
      </div>
    </div>
  );
}

function clampInt(value: string, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
