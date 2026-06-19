import { cellKey } from './document';
import { Corner, Diagonal, StitchKind, type StitchPart } from './types';
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

const SUPERSAMPLE = 6;
const ALPHA_THRESHOLD = 110;
const FULL_COVERAGE = 0.62;
const EMPTY_COVERAGE = 0.28;
// How much more one diagonal must split the cell than the other before we treat
// the edge as diagonal (and use a half stitch) rather than a straight edge.
const DIAGONAL_MARGIN = 0.34;

/**
 * Rasterizes text into a stitch fragment. Each cell samples a supersampled
 * glyph render; high coverage becomes a full stitch, and (when enabled) cells
 * crossed by a *diagonal* edge become a half stitch with the correct
 * orientation and filled corner. Straight (vertical/horizontal) edges snap to
 * full or empty so they don't get spurious half stitches.
 */
export function textToFragment(opts: TextOptions): Fragment {
  const empty: Fragment = { width: 0, height: 0, cells: {}, backstitches: [] };
  if (!opts.text.trim()) return empty;

  const ss = SUPERSAMPLE;
  const half = ss / 2;
  const fontPx = Math.max(8, Math.round(opts.heightCells * ss));
  const font = `${opts.bold ? 'bold ' : ''}${fontPx}px ${opts.fontFamily}`;

  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;
  mctx.font = font;
  const m = mctx.measureText(opts.text);
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
  ctx.fillText(opts.text, leftBearing, ascent);

  const data = ctx.getImageData(0, 0, wpx, hpx).data;
  const inkAt = (px: number, py: number): boolean =>
    px >= 0 && py >= 0 && px < wpx && py < hpx && data[(py * wpx + px) * 4 + 3] > ALPHA_THRESHOLD;

  const widthCells = Math.ceil(wpx / ss);
  const heightCells = Math.ceil(hpx / ss);
  const cells: Record<string, StitchPart[]> = {};

  for (let cy = 0; cy < heightCells; cy++) {
    for (let cx = 0; cx < widthCells; cx++) {
      // Coverage of each quadrant (0..1).
      const quad = [0, 0, 0, 0]; // TL, TR, BL, BR
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          if (!inkAt(cx * ss + sx, cy * ss + sy)) continue;
          const q = (sy < half ? 0 : 2) + (sx < half ? 0 : 1);
          quad[q]++;
        }
      }
      const per = half * half;
      const cTL = quad[0] / per;
      const cTR = quad[1] / per;
      const cBL = quad[2] / per;
      const cBR = quad[3] / per;
      const coverage = (cTL + cTR + cBL + cBR) / 4;

      const part = decideCell(opts, coverage, cTL, cTR, cBL, cBR);
      if (part) cells[cellKey(cx, cy)] = [part];
    }
  }

  return { width: widthCells, height: heightCells, cells, backstitches: [] };
}

function decideCell(
  opts: TextOptions,
  coverage: number,
  cTL: number,
  cTR: number,
  cBL: number,
  cBR: number,
): StitchPart | null {
  const full: StitchPart = { kind: StitchKind.Full, colorCode: opts.colorCode };

  if (coverage >= FULL_COVERAGE) return full;
  if (!opts.halfStitches) return coverage >= 0.45 ? full : null;
  if (coverage < EMPTY_COVERAGE) return null;

  const diagSlash = Math.abs(cTL - cBR); // a "/" edge splits TL vs BR
  const diagBack = Math.abs(cTR - cBL); // a "\" edge splits TR vs BL

  // Straight (vertical/horizontal) edge: both diagonals look similar → no half.
  if (Math.abs(diagSlash - diagBack) < DIAGONAL_MARGIN) {
    return coverage >= 0.5 ? full : null;
  }

  if (diagSlash > diagBack) {
    const corner = cTL >= cBR ? Corner.TopLeft : Corner.BottomRight;
    return { kind: StitchKind.Half, colorCode: opts.colorCode, corner, diagonal: Diagonal.Slash };
  }
  const corner = cTR >= cBL ? Corner.TopRight : Corner.BottomLeft;
  return { kind: StitchKind.Half, colorCode: opts.colorCode, corner, diagonal: Diagonal.Backslash };
}

export const TEXT_FONTS = [
  { label: 'Sans', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Mono', value: 'monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet', value: '"Trebuchet MS", sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Garamond', value: 'Garamond, "Times New Roman", serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
  { label: 'Impact', value: 'Impact, "Arial Black", sans-serif' },
  { label: 'Comic Sans', value: '"Comic Sans MS", "Comic Sans", cursive' },
  { label: 'Brush Script', value: '"Brush Script MT", cursive' },
  { label: 'Cursive', value: 'cursive' },
];
