import { useState } from 'react';
import { LengthUnit } from '../model/types';

interface Props {
  onCreate: (opts: {
    name: string;
    width: number;
    height: number;
    count: number;
    unit: LengthUnit;
  }) => void;
  onClose?: () => void;
}

const COUNTS = [11, 14, 16, 18, 20, 22, 25, 28, 32];
const INCH_TO_CM = 2.54;

/** Stitches per unit of length for the given fabric count. */
function stitchesPerUnit(count: number, unit: LengthUnit): number {
  return unit === LengthUnit.Centimeters ? count / INCH_TO_CM : count;
}

export function NewProjectDialog({ onCreate, onClose }: Props): React.ReactElement {
  const [name, setName] = useState('Untitled');
  const [width, setWidth] = useState(70);
  const [height, setHeight] = useState(70);
  const [count, setCount] = useState(14);
  const [unit, setUnit] = useState<LengthUnit>(LengthUnit.Centimeters);

  // While a size field is focused we show its raw text; otherwise the value is
  // derived from the stitch count so both directions stay in sync.
  const [editing, setEditing] = useState<'w' | 'h' | null>(null);
  const [sizeText, setSizeText] = useState('');

  const perUnit = stitchesPerUnit(count, unit);
  const sizeW = width / perUnit;
  const sizeH = height / perUnit;
  const unitLabel = unit === LengthUnit.Centimeters ? 'cm' : 'in';

  const onSizeChange = (axis: 'w' | 'h', text: string) => {
    setEditing(axis);
    setSizeText(text);
    const value = Number(text);
    if (value > 0) {
      const stitches = clampInt(Math.round(value * perUnit), 1, 1000);
      if (axis === 'w') setWidth(stitches);
      else setHeight(stitches);
    }
  };

  const sizeValue = (axis: 'w' | 'h'): string => {
    if (editing === axis) return sizeText;
    return (axis === 'w' ? sizeW : sizeH).toFixed(2);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal new-project" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New pattern</h2>
          {onClose && <button onClick={onClose}>✕</button>}
        </div>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <fieldset>
          <legend>Fabric</legend>
          <div className="field-row">
            <label>
              Count
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {COUNTS.map((c) => (
                  <option key={c} value={c}>
                    {c}-count
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unit
              <select value={unit} onChange={(e) => setUnit(e.target.value as LengthUnit)}>
                <option value={LengthUnit.Centimeters}>centimeters</option>
                <option value={LengthUnit.Inches}>inches</option>
              </select>
            </label>
          </div>
          <p className="hint">{stitchesPerUnit(count, unit).toFixed(2)} stitches / {unitLabel}</p>
        </fieldset>

        <fieldset>
          <legend>Grid size (stitches)</legend>
          <div className="field-row">
            <label>
              Width
              <input
                type="number"
                min={1}
                max={1000}
                value={width}
                onChange={(e) => {
                  setEditing(null);
                  setWidth(clampInt(e.target.value, 1, 1000));
                }}
              />
            </label>
            <label>
              Height
              <input
                type="number"
                min={1}
                max={1000}
                value={height}
                onChange={(e) => {
                  setEditing(null);
                  setHeight(clampInt(e.target.value, 1, 1000));
                }}
              />
            </label>
          </div>
          <p className="hint">{(width * height).toLocaleString()} stitches</p>
        </fieldset>

        <fieldset>
          <legend>Physical size ({unitLabel})</legend>
          <div className="field-row">
            <label>
              Width
              <input
                type="number"
                min={0}
                step={0.1}
                value={sizeValue('w')}
                onChange={(e) => onSizeChange('w', e.target.value)}
                onBlur={() => setEditing(null)}
              />
            </label>
            <label>
              Height
              <input
                type="number"
                min={0}
                step={0.1}
                value={sizeValue('h')}
                onChange={(e) => onSizeChange('h', e.target.value)}
                onBlur={() => setEditing(null)}
              />
            </label>
          </div>
          <p className="hint">
            {sizeW.toFixed(2)} × {sizeH.toFixed(2)} {unitLabel} · rounded to whole stitches
          </p>
        </fieldset>

        <div className="modal-actions">
          <button
            className="primary"
            onClick={() => onCreate({ name: name.trim() || 'Untitled', width, height, count, unit })}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function clampInt(value: string | number, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
