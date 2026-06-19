import { cellKey } from './document';
import { Diagonal, StitchKind, type StitchPart } from './types';
import { type Fragment } from './transform';

export interface TextOptions {
  text: string;
  fontFamily: string;
  bold: boolean;
  /** Target glyph height in stitches. */
  heightCells: number;
  colorCode: string;
  /** Smooth diagonal edges with half stitches instead of blocky full stitches. */
  halfStitches: boolean;
}

const SUPERSAMPLE = 4;
const ALPHA_THRESHOLD = 90;

/**
 * Rasterizes text into a stitch fragment. Each grid cell samples a
 * supersampled glyph render: high coverage becomes a full stitch, and (when
 * enabled) edge cells become a half stitch oriented to match the ink.
 */
export function textToFragment(opts: TextOptions): Fragment {
  const empty: Fragment = { width: 0, height: 0, cells: {}, backstitches: [] };
  const text = opts.text;
  if (!text.trim()) return empty;

  const ss = SUPERSAMPLE;
  const fontPx = Math.max(8, Math.round(opts.heightCells * ss));
  const font = `${opts.bold ? 'bold ' : ''}${fontPx}px ${opts.fontFamily}`;

  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;
  mctx.font = font;
  const m = mctx.measureText(text);
  const ascent = Math.ceil(m.actualBoundingBoxAscent || fontPx * 0.8);
  const descent = Math.ceil(m.actualBoundingBoxDescent || fontPx * 0.2);
  const leftBearing = Math.ceil(Math.max(0, m.actualBoundingBoxLeft));
  const inkWidth = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) || Math.ceil(m.width);
  const wpx = Math.max(1, inkWidth);
  const hpx = Math.max(1, ascent + descent);

  const canvas = document.createElement('canvas');
  canvas.width = wpx;
  canvas.height = hpx;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';
  ctx.fillText(text, leftBearing, ascent);

  const data = ctx.getImageData(0, 0, wpx, hpx).data;
  const widthCells = Math.ceil(wpx / ss);
  const heightCells = Math.ceil(hpx / ss);
  const cells: Record<string, StitchPart[]> = {};
  const fullThreshold = opts.halfStitches ? 0.5 : 0.4;

  for (let cy = 0; cy < heightCells; cy++) {
    for (let cx = 0; cx < widthCells; cx++) {
      let ink = 0;
      let slashInk = 0; // ink in the "/" fill region (x + y > 1)
      let backInk = 0; // ink in the "\" fill region (y > x)
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = cx * ss + sx;
          const py = cy * ss + sy;
          if (px >= wpx || py >= hpx) continue;
          if (data[(py * wpx + px) * 4 + 3] <= ALPHA_THRESHOLD) continue;
          ink++;
          const fx = (sx + 0.5) / ss;
          const fy = (sy + 0.5) / ss;
          if (fx + fy > 1) slashInk++;
          if (fy > fx) backInk++;
        }
      }
      const coverage = ink / (ss * ss);
      if (coverage >= fullThreshold) {
        cells[cellKey(cx, cy)] = [{ kind: StitchKind.Full, colorCode: opts.colorCode }];
      } else if (opts.halfStitches && coverage >= 0.16) {
        cells[cellKey(cx, cy)] = [
          {
            kind: StitchKind.Half,
            colorCode: opts.colorCode,
            diagonal: slashInk >= backInk ? Diagonal.Slash : Diagonal.Backslash,
          },
        ];
      }
    }
  }

  return { width: widthCells, height: heightCells, cells, backstitches: [] };
}

export const TEXT_FONTS = [
  { label: 'Sans', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Mono', value: 'monospace' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
];
