import { usedColors } from '../model/document';
import { type PatternDocument } from '../model/types';

/**
 * Distinct cross-stitch symbols for the chart. These are real characters from
 * the embedded Noto Sans Symbols 2 subset (see ./font), so they render as
 * selectable text in the vector PDF — a requirement for Pattern Keeper — while
 * looking like proper cross-stitch icons instead of plain letters.
 *
 * The order maximizes visual contrast up front (a "farthest-first" walk over
 * shape family, fill style — solid/outline/line/half/texture — and ink
 * density). Colors are assigned in order, so the first handful look as
 * different as possible from each other; only as more colors are used do
 * subtler shapes and near-duplicates (e.g. a bigger circle) fill in, and they
 * stay far apart in the order.
 */
const SYMBOL_POOL = [
  '●', '△', '▤', '✚', '◈', '◢', '⬛', '▲',
  '★', '⬟', '⬡', '○', '❖', '☆', '◇', '◉',
  '□', '✸', '◆', '◐', '▣', '❂', '◼', '■',
  '⬤', '◎', '▩', '▦', '✦', '✿', '⬢', '◑',
  '▥', '▧', '▨', '▼', '◀', '▶', '▽', '◣',
  '◤', '◥', '✧', '✖', '◯', '⬜',
];

/** Used when a color somehow has no assigned symbol (defensive only). */
export const FALLBACK_SYMBOL = SYMBOL_POOL[0];

/**
 * Mean vertical center of the symbol glyphs, as a fraction of the font size
 * above the baseline (measured from the embedded subset; stdev ≈ 0.03). The
 * glyphs sit around the math axis rather than the em center, so we draw them on
 * the alphabetic baseline and nudge down by this much to center them in a cell.
 */
export const SYMBOL_CENTROID = 0.359;

export interface ColorUsage {
  colorCode: string;
  symbol: string;
  stitches: number;
  backstitches: number;
}

/**
 * Assign a unique symbol to every colour used in the design and count its
 * usage. Colours are ordered by palette position (falling back to first use)
 * so the mapping is stable across exports.
 */
export function buildColorUsage(doc: PatternDocument): ColorUsage[] {
  const used = usedColors(doc);
  const ordered = [
    ...doc.palette.filter((c) => used.has(c)),
    ...[...used].filter((c) => !doc.palette.includes(c)),
  ];

  const stitches = new Map<string, number>();
  for (const parts of Object.values(doc.cells)) {
    for (const part of parts) {
      stitches.set(part.colorCode, (stitches.get(part.colorCode) ?? 0) + 1);
    }
  }
  const backstitches = new Map<string, number>();
  for (const seg of doc.backstitches) {
    backstitches.set(seg.colorCode, (backstitches.get(seg.colorCode) ?? 0) + 1);
  }

  return ordered.map((colorCode, i) => ({
    colorCode,
    symbol: SYMBOL_POOL[i % SYMBOL_POOL.length],
    stitches: stitches.get(colorCode) ?? 0,
    backstitches: backstitches.get(colorCode) ?? 0,
  }));
}

export function symbolMap(usage: ColorUsage[]): Map<string, string> {
  return new Map(usage.map((u) => [u.colorCode, u.symbol]));
}
