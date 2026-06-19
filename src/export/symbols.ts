import { usedColors } from '../model/document';
import { type PatternDocument } from '../model/types';

/**
 * Distinct single characters for the symbol chart. Restricted to plain
 * WinAnsi/Helvetica glyphs so they render as real, parseable text in the
 * vector PDF — a requirement for Pattern Keeper compatibility. Ambiguous
 * shapes (I/l/O/o/0/1) are left out.
 */
const SYMBOL_POOL = [
  'A', 'S', 'T', 'X', 'H', 'K', 'V', 'Z', 'N', 'E', 'F', 'W', 'Y', 'U', 'P',
  'R', 'B', 'C', 'D', 'G', 'J', 'L', 'M', 'Q',
  'a', 'e', 's', 't', 'k', 'm', 'n', 'u', 'v', 'w', 'x', 'z', 'b', 'd', 'f',
  'g', 'h', 'p', 'q', 'r', 'y', 'c',
  '2', '3', '4', '5', '6', '7', '8', '9',
  '@', '#', '$', '%', '&', '=', '+', '?',
];

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
