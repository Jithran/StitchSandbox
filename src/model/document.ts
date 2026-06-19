import {
  type BackstitchSegment,
  type PatternDocument,
  type SerializedDocument,
  type StitchPart,
  LengthUnit,
  SCHEMA_VERSION,
} from './types';

export interface NewDocumentOptions {
  name: string;
  width: number;
  height: number;
  count: number;
  unit: LengthUnit;
}

export function createDocument(opts: NewDocumentOptions): PatternDocument {
  return {
    name: opts.name,
    width: opts.width,
    height: opts.height,
    count: opts.count,
    unit: opts.unit,
    cells: {},
    backstitches: [],
    palette: [],
  };
}

export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function parseCellKey(key: string): [number, number] {
  const [c, r] = key.split(',');
  return [Number(c), Number(r)];
}

export function inBounds(doc: PatternDocument, col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < doc.width && row < doc.height;
}

const INCH_TO_CM = 2.54;

/** Physical size of the design on the chosen fabric, in the document's unit. */
export function physicalSize(doc: PatternDocument): { width: number; height: number } {
  const perUnit = doc.unit === LengthUnit.Centimeters ? doc.count / INCH_TO_CM : doc.count;
  return { width: doc.width / perUnit, height: doc.height / perUnit };
}

export function stitchesPerCm(count: number): number {
  return count / INCH_TO_CM;
}

export function getCell(doc: PatternDocument, col: number, row: number): StitchPart[] {
  return doc.cells[cellKey(col, row)] ?? [];
}

export function clone(doc: PatternDocument): PatternDocument {
  return structuredClone(doc);
}

/** Offset the entire design (cells + backstitch). Returns false if it would clip. */
export function moveDesign(doc: PatternDocument, dx: number, dy: number): boolean {
  for (const key of Object.keys(doc.cells)) {
    const [c, r] = parseCellKey(key);
    if (!inBounds(doc, c + dx, r + dy)) return false;
  }
  for (const seg of doc.backstitches) {
    if (
      seg.x1 + dx < 0 ||
      seg.y1 + dy < 0 ||
      seg.x2 + dx > doc.width ||
      seg.y2 + dy > doc.height ||
      seg.x1 + dx > doc.width ||
      seg.y1 + dy > doc.height ||
      seg.x2 + dx < 0 ||
      seg.y2 + dy < 0
    ) {
      return false;
    }
  }

  const moved: Record<string, StitchPart[]> = {};
  for (const [key, parts] of Object.entries(doc.cells)) {
    const [c, r] = parseCellKey(key);
    moved[cellKey(c + dx, r + dy)] = parts;
  }
  doc.cells = moved;
  doc.backstitches = doc.backstitches.map((s) => ({
    ...s,
    x1: s.x1 + dx,
    y1: s.y1 + dy,
    x2: s.x2 + dx,
    y2: s.y2 + dy,
  }));
  return true;
}

export function addPaletteColor(doc: PatternDocument, code: string): void {
  if (!doc.palette.includes(code)) doc.palette.push(code);
}

/** DMC codes actually used in the design, for legends/cleanup. */
export function usedColors(doc: PatternDocument): Set<string> {
  const used = new Set<string>();
  for (const parts of Object.values(doc.cells)) {
    for (const p of parts) used.add(p.colorCode);
  }
  for (const s of doc.backstitches) used.add(s.colorCode);
  return used;
}

export function serialize(doc: PatternDocument): string {
  const payload: SerializedDocument = { schema: SCHEMA_VERSION, document: doc };
  return JSON.stringify(payload);
}

export function deserialize(json: string): PatternDocument {
  const parsed = JSON.parse(json) as SerializedDocument;
  if (!parsed.document || typeof parsed.document.width !== 'number') {
    throw new Error('Invalid pattern file');
  }
  return parsed.document;
}

export function segmentsEqual(a: BackstitchSegment, b: BackstitchSegment): boolean {
  const same =
    a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2;
  const swapped =
    a.x1 === b.x2 && a.y1 === b.y2 && a.x2 === b.x1 && a.y2 === b.y1;
  return (same || swapped) && a.colorCode === b.colorCode;
}
