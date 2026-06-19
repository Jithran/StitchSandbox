import { cellKey, inBounds, parseCellKey } from './document';
import {
  Corner,
  Diagonal,
  StitchKind,
  type BackstitchSegment,
  type PatternDocument,
  type StitchPart,
} from './types';

export interface Rect {
  c0: number;
  r0: number;
  c1: number;
  r1: number;
}

/** A detached piece of a pattern in local (0,0)-based coordinates. */
export interface Fragment {
  width: number;
  height: number;
  cells: Record<string, StitchPart[]>;
  backstitches: BackstitchSegment[];
}

export type Anchor = 0 | 0.5 | 1;

// --- stitch geometry under flips / rotations ----------------------------
//
// A horizontal flip, vertical flip and 90° rotation all swap the diagonal of
// half / three-quarter stitches; only the corner mapping differs.

const swapDiagonal = (d?: Diagonal): Diagonal | undefined =>
  d === undefined ? undefined : d === Diagonal.Slash ? Diagonal.Backslash : Diagonal.Slash;

const MIRROR_H: Record<Corner, Corner> = {
  [Corner.TopLeft]: Corner.TopRight,
  [Corner.TopRight]: Corner.TopLeft,
  [Corner.BottomLeft]: Corner.BottomRight,
  [Corner.BottomRight]: Corner.BottomLeft,
};
const MIRROR_V: Record<Corner, Corner> = {
  [Corner.TopLeft]: Corner.BottomLeft,
  [Corner.BottomLeft]: Corner.TopLeft,
  [Corner.TopRight]: Corner.BottomRight,
  [Corner.BottomRight]: Corner.TopRight,
};
const ROTATE_CW: Record<Corner, Corner> = {
  [Corner.TopLeft]: Corner.TopRight,
  [Corner.TopRight]: Corner.BottomRight,
  [Corner.BottomRight]: Corner.BottomLeft,
  [Corner.BottomLeft]: Corner.TopLeft,
};
const ROTATE_CCW: Record<Corner, Corner> = {
  [Corner.TopLeft]: Corner.BottomLeft,
  [Corner.BottomLeft]: Corner.BottomRight,
  [Corner.BottomRight]: Corner.TopRight,
  [Corner.TopRight]: Corner.TopLeft,
};

function transformPart(part: StitchPart, corners: Record<Corner, Corner>): StitchPart {
  if (part.kind === StitchKind.Full) return { ...part };
  return {
    ...part,
    diagonal: swapDiagonal(part.diagonal),
    corner: part.corner ? corners[part.corner] : part.corner,
  };
}

// --- fragment extraction / placement ------------------------------------

function normalize(rect: Rect): Rect {
  return {
    c0: Math.min(rect.c0, rect.c1),
    r0: Math.min(rect.r0, rect.r1),
    c1: Math.max(rect.c0, rect.c1),
    r1: Math.max(rect.r0, rect.r1),
  };
}

function segmentInRect(seg: BackstitchSegment, rect: Rect): boolean {
  return (
    seg.x1 >= rect.c0 &&
    seg.x1 <= rect.c1 &&
    seg.x2 >= rect.c0 &&
    seg.x2 <= rect.c1 &&
    seg.y1 >= rect.r0 &&
    seg.y1 <= rect.r1 &&
    seg.y2 >= rect.r0 &&
    seg.y2 <= rect.r1
  );
}

export function extractFragment(doc: PatternDocument, region: Rect): Fragment {
  const rect = normalize(region);
  const cells: Record<string, StitchPart[]> = {};
  for (const [key, parts] of Object.entries(doc.cells)) {
    const [c, r] = parseCellKey(key);
    if (c >= rect.c0 && c < rect.c1 && r >= rect.r0 && r < rect.r1) {
      cells[cellKey(c - rect.c0, r - rect.r0)] = parts.map((p) => ({ ...p }));
    }
  }
  const backstitches = doc.backstitches
    .filter((s) => segmentInRect(s, rect))
    .map((s) => ({
      ...s,
      x1: s.x1 - rect.c0,
      y1: s.y1 - rect.r0,
      x2: s.x2 - rect.c0,
      y2: s.y2 - rect.r0,
    }));
  return { width: rect.c1 - rect.c0, height: rect.r1 - rect.r0, cells, backstitches };
}

export function clearRegion(doc: PatternDocument, region: Rect): void {
  const rect = normalize(region);
  for (const key of Object.keys(doc.cells)) {
    const [c, r] = parseCellKey(key);
    if (c >= rect.c0 && c < rect.c1 && r >= rect.r0 && r < rect.r1) delete doc.cells[key];
  }
  doc.backstitches = doc.backstitches.filter((s) => !segmentInRect(s, rect));
}

/** Place a fragment so its (0,0) lands on (atCol,atRow). Only filled cells are
 *  written, so it pastes "transparently" over existing stitches. */
export function stampFragment(
  doc: PatternDocument,
  frag: Fragment,
  atCol: number,
  atRow: number,
): void {
  for (const [key, parts] of Object.entries(frag.cells)) {
    const [lc, lr] = parseCellKey(key);
    const c = atCol + lc;
    const r = atRow + lr;
    if (inBounds(doc, c, r)) doc.cells[cellKey(c, r)] = parts.map((p) => ({ ...p }));
  }
  for (const s of frag.backstitches) {
    const x1 = atCol + s.x1;
    const y1 = atRow + s.y1;
    const x2 = atCol + s.x2;
    const y2 = atRow + s.y2;
    if (x1 >= 0 && y1 >= 0 && x2 <= doc.width && y2 <= doc.height && x1 <= doc.width && y2 >= 0) {
      doc.backstitches.push({ ...s, x1, y1, x2, y2 });
    }
  }
}

// --- fragment transforms -------------------------------------------------

export function mirrorFragmentH(frag: Fragment): Fragment {
  const cells: Record<string, StitchPart[]> = {};
  for (const [key, parts] of Object.entries(frag.cells)) {
    const [lc, lr] = parseCellKey(key);
    cells[cellKey(frag.width - 1 - lc, lr)] = parts.map((p) => transformPart(p, MIRROR_H));
  }
  const backstitches = frag.backstitches.map((s) => ({
    ...s,
    x1: frag.width - s.x1,
    x2: frag.width - s.x2,
  }));
  return { width: frag.width, height: frag.height, cells, backstitches };
}

export function mirrorFragmentV(frag: Fragment): Fragment {
  const cells: Record<string, StitchPart[]> = {};
  for (const [key, parts] of Object.entries(frag.cells)) {
    const [lc, lr] = parseCellKey(key);
    cells[cellKey(lc, frag.height - 1 - lr)] = parts.map((p) => transformPart(p, MIRROR_V));
  }
  const backstitches = frag.backstitches.map((s) => ({
    ...s,
    y1: frag.height - s.y1,
    y2: frag.height - s.y2,
  }));
  return { width: frag.width, height: frag.height, cells, backstitches };
}

export function rotateFragmentCW(frag: Fragment): Fragment {
  const cells: Record<string, StitchPart[]> = {};
  for (const [key, parts] of Object.entries(frag.cells)) {
    const [lc, lr] = parseCellKey(key);
    cells[cellKey(frag.height - 1 - lr, lc)] = parts.map((p) => transformPart(p, ROTATE_CW));
  }
  const backstitches = frag.backstitches.map((s) => ({
    ...s,
    x1: frag.height - s.y1,
    y1: s.x1,
    x2: frag.height - s.y2,
    y2: s.x2,
  }));
  return { width: frag.height, height: frag.width, cells, backstitches };
}

export function rotateFragmentCCW(frag: Fragment): Fragment {
  const cells: Record<string, StitchPart[]> = {};
  for (const [key, parts] of Object.entries(frag.cells)) {
    const [lc, lr] = parseCellKey(key);
    cells[cellKey(lr, frag.width - 1 - lc)] = parts.map((p) => transformPart(p, ROTATE_CCW));
  }
  const backstitches = frag.backstitches.map((s) => ({
    ...s,
    x1: s.y1,
    y1: frag.width - s.x1,
    x2: s.y2,
    y2: frag.width - s.x2,
  }));
  return { width: frag.height, height: frag.width, cells, backstitches };
}

// --- canvas resize / crop ------------------------------------------------

/** Resize the canvas, positioning the existing content per anchor (0/0.5/1).
 *  Content that would fall outside a shrunk canvas is dropped. */
export function resizeCanvas(
  doc: PatternDocument,
  newW: number,
  newH: number,
  anchorX: Anchor,
  anchorY: Anchor,
): void {
  const dx = Math.round((newW - doc.width) * anchorX);
  const dy = Math.round((newH - doc.height) * anchorY);
  offsetContent(doc, dx, dy, newW, newH);
  doc.width = newW;
  doc.height = newH;
}

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Content extent in node coordinates (cells occupy [col,col+1]). */
export function contentBounds(doc: PatternDocument): Bounds | null {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  let has = false;

  for (const key of Object.keys(doc.cells)) {
    if (doc.cells[key].length === 0) continue;
    has = true;
    const [c, r] = parseCellKey(key);
    left = Math.min(left, c);
    top = Math.min(top, r);
    right = Math.max(right, c + 1);
    bottom = Math.max(bottom, r + 1);
  }
  for (const s of doc.backstitches) {
    has = true;
    left = Math.min(left, Math.floor(Math.min(s.x1, s.x2)));
    top = Math.min(top, Math.floor(Math.min(s.y1, s.y2)));
    right = Math.max(right, Math.ceil(Math.max(s.x1, s.x2)));
    bottom = Math.max(bottom, Math.ceil(Math.max(s.y1, s.y2)));
  }
  return has ? { left, top, right, bottom } : null;
}

/** Crop the canvas to the content, keeping `border` empty cells around it. */
export function cropToContent(doc: PatternDocument, border: number): boolean {
  const b = contentBounds(doc);
  if (!b) return false;
  const newW = b.right - b.left + border * 2;
  const newH = b.bottom - b.top + border * 2;
  const dx = border - b.left;
  const dy = border - b.top;
  offsetContent(doc, dx, dy, newW, newH);
  doc.width = newW;
  doc.height = newH;
  return true;
}

function offsetContent(
  doc: PatternDocument,
  dx: number,
  dy: number,
  newW: number,
  newH: number,
): void {
  const moved: Record<string, StitchPart[]> = {};
  for (const [key, parts] of Object.entries(doc.cells)) {
    const [c, r] = parseCellKey(key);
    const nc = c + dx;
    const nr = r + dy;
    if (nc >= 0 && nr >= 0 && nc < newW && nr < newH) moved[cellKey(nc, nr)] = parts;
  }
  doc.cells = moved;
  doc.backstitches = doc.backstitches
    .map((s) => ({ ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }))
    .filter(
      (s) =>
        s.x1 >= 0 &&
        s.y1 >= 0 &&
        s.x2 >= 0 &&
        s.y2 >= 0 &&
        s.x1 <= newW &&
        s.x2 <= newW &&
        s.y1 <= newH &&
        s.y2 <= newH,
    );
}
