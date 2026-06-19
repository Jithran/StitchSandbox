import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  className?: string;
  onChange: (n: number) => void;
}

/**
 * Integer number input that stays pleasant to type in: you can clear it and
 * type freely (no clamp-on-keystroke fighting you), focusing selects the value,
 * and it only snaps to a valid clamped number on blur. The parent receives live
 * valid updates while typing.
 */
export function NumberField({ value, min, max, step, className, onChange }: Props): React.ReactElement {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  // Sync from the outside only while not actively editing.
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)));

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      className={className}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw === '') return; // allow an empty field while typing
        const n = Number(raw);
        if (!Number.isNaN(n)) onChange(clamp(n));
      }}
      onBlur={() => {
        focused.current = false;
        const n = Number(text);
        const final = text === '' || Number.isNaN(n) ? value : clamp(n);
        setText(String(final));
        if (final !== value) onChange(final);
      }}
    />
  );
}
