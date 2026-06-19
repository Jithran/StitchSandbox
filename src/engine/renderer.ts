import { colorHex as dmcHex } from '../data/colors';
import { parseCellKey } from '../model/document';
import { type Fragment } from '../model/transform';
import {
  Corner,
  Diagonal,
  StitchKind,
  type PatternDocument,
  type StitchPart,
} from '../model/types';
import { cornerPoint, halfIsSlash, halfTriangleUnit } from './stitches';
import { Viewport } from './viewport';

export interface RenderOptions {
  realistic: boolean;
  showGrid: boolean;
}

const FABRIC_COLOR = '#fbfaf6';
const GRID_THIN = '#e2e0d8';
const GRID_BOLD = '#9a988e';
const GRID_EDGE = '#5c5b54';
const CENTER_MARK = '#c0392b';

const RULER = 20;
const RULER_BG = '#23232a';
const RULER_TEXT = '#b9b9c2';

export function render(
  ctx: CanvasRenderingContext2D,
  doc: PatternDocument,
  view: Viewport,
  opts: RenderOptions,
): void {
  const { canvas } = ctx;

  // Clear the full backing buffer independent of the current (dpr-scaled)
  // transform. Clearing in user space breaks when devicePixelRatio < 1
  // (e.g. the browser is zoomed out), leaving uncleared trails.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const tl = view.cellToScreen(0, 0);
  const br = view.cellToScreen(doc.width, doc.height);
  ctx.fillStyle = FABRIC_COLOR;
  ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

  // Only iterate cells that carry stitches.
  for (const [key, parts] of Object.entries(doc.cells)) {
    if (parts.length === 0) continue;
    const [col, row] = parseCellKey(key);
    drawCell(ctx, view, col, row, parts, opts.realistic);
  }

  drawBackstitches(ctx, doc, view);

  if (opts.showGrid) drawGrid(ctx, doc, view);
}

/** Draws a detached fragment at (atCol,atRow) — used for the floating paste preview. */
export function renderFragmentPreview(
  ctx: CanvasRenderingContext2D,
  frag: Fragment,
  view: Viewport,
  atCol: number,
  atRow: number,
  realistic: boolean,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const [key, parts] of Object.entries(frag.cells)) {
    const [lc, lr] = parseCellKey(key);
    drawCell(ctx, view, atCol + lc, atRow + lr, parts, realistic);
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, view.scale * 0.14);
  for (const seg of frag.backstitches) {
    const a = view.cellToScreen(atCol + seg.x1, atRow + seg.y1);
    const b = view.cellToScreen(atCol + seg.x2, atRow + seg.y2);
    ctx.strokeStyle = dmcHex(seg.colorCode);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Sticky column/row rulers along the top and left edges. Drawn last so they
 *  stay readable on top of stitches, selection dimming and paste previews. */
export function renderRulers(
  ctx: CanvasRenderingContext2D,
  doc: PatternDocument,
  view: Viewport,
  viewW: number,
  viewH: number,
): void {
  const step = view.scale >= 24 ? 1 : view.scale >= 13 ? 5 : 10;

  ctx.save();
  ctx.fillStyle = RULER_BG;
  ctx.fillRect(0, 0, viewW, RULER);
  ctx.fillRect(0, 0, RULER, viewH);

  ctx.fillStyle = RULER_TEXT;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let c = 0; c < doc.width; c++) {
    if (!(step === 1 || c === 0 || (c + 1) % step === 0)) continue;
    const x = view.cellToScreen(c + 0.5, 0).x;
    if (x < RULER + 4 || x > viewW) continue;
    ctx.fillText(String(c + 1), x, RULER / 2);
  }
  for (let r = 0; r < doc.height; r++) {
    if (!(step === 1 || r === 0 || (r + 1) % step === 0)) continue;
    const y = view.cellToScreen(0, r + 0.5).y;
    if (y < RULER + 4 || y > viewH) continue;
    ctx.fillText(String(r + 1), RULER / 2, y);
  }

  // Hide the column ruler bleeding into the row ruler at the corner.
  ctx.fillStyle = RULER_BG;
  ctx.fillRect(0, 0, RULER, RULER);
  ctx.restore();
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  view: Viewport,
  col: number,
  row: number,
  parts: StitchPart[],
  realistic: boolean,
): void {
  const o = view.cellToScreen(col, row);
  const s = view.scale;
  for (const part of parts) {
    const color = dmcHex(part.colorCode);
    if (realistic) drawRealistic(ctx, o.x, o.y, s, part, color);
    else drawFlat(ctx, o.x, o.y, s, part, color);
  }
}

function point(ox: number, oy: number, s: number, fx: number, fy: number): [number, number] {
  return [ox + fx * s, oy + fy * s];
}

function fillPoly(
  ctx: CanvasRenderingContext2D,
  color: string,
  pts: Array<[number, number]>,
): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawFlat(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  s: number,
  part: StitchPart,
  color: string,
): void {
  const p = (fx: number, fy: number) => point(ox, oy, s, fx, fy);
  switch (part.kind) {
    case StitchKind.Full:
      ctx.fillStyle = color;
      ctx.fillRect(ox, oy, s, s);
      break;
    case StitchKind.Half:
      fillPoly(ctx, color, halfTriangleUnit(part).map(([fx, fy]) => p(fx, fy)));
      break;
    case StitchKind.Quarter:
      fillPoly(ctx, color, quarterTriangle(p, part.corner ?? Corner.TopLeft));
      break;
    case StitchKind.ThreeQuarter: {
      const diag = part.diagonal ?? Diagonal.Slash;
      const corner = part.corner ?? Corner.TopLeft;
      fillPoly(ctx, color, halfTriangle(p, diag));
      fillPoly(ctx, color, quarterTriangle(p, oppositeAcross(corner, diag)));
      break;
    }
  }
}

type LocalPoint = (fx: number, fy: number) => [number, number];

function halfTriangle(p: LocalPoint, diag: Diagonal): Array<[number, number]> {
  // Fills the lower triangle bounded by the diagonal.
  return diag === Diagonal.Slash
    ? [p(0, 1), p(1, 1), p(1, 0)] // below the "/"
    : [p(0, 0), p(1, 1), p(0, 1)]; // below the "\"
}

function quarterTriangle(p: LocalPoint, corner: Corner): Array<[number, number]> {
  switch (corner) {
    case Corner.TopLeft:
      return [p(0, 0), p(0.5, 0), p(0, 0.5)];
    case Corner.TopRight:
      return [p(1, 0), p(1, 0.5), p(0.5, 0)];
    case Corner.BottomLeft:
      return [p(0, 1), p(0, 0.5), p(0.5, 1)];
    case Corner.BottomRight:
      return [p(1, 1), p(0.5, 1), p(1, 0.5)];
  }
}

/** For a three-quarter the quarter sits in the corner opposite the half's body. */
function oppositeAcross(corner: Corner, _diag: Diagonal): Corner {
  return corner;
}

function drawRealistic(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  s: number,
  part: StitchPart,
  color: string,
): void {
  const p = (fx: number, fy: number) => point(ox, oy, s, fx, fy);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, s * 0.2);
  const inset = 0.12;

  const line = (a: [number, number], b: [number, number], shade?: string) => {
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.strokeStyle = shade ?? color;
    ctx.stroke();
  };

  const slash: [[number, number], [number, number]] = [
    p(inset, 1 - inset),
    p(1 - inset, inset),
  ];
  const backslash: [[number, number], [number, number]] = [
    p(inset, inset),
    p(1 - inset, 1 - inset),
  ];

  switch (part.kind) {
    case StitchKind.Full:
      line(slash[0], slash[1]);
      line(backslash[0], backslash[1], shadeColor(color, -0.12));
      break;
    case StitchKind.Half:
      line(...(halfIsSlash(part) ? slash : backslash));
      break;
    case StitchKind.Quarter: {
      const corner = part.corner ?? Corner.TopLeft;
      const [cx, cy] = cornerPoint(corner);
      line(p(lerp(cx, 0.5, inset), lerp(cy, 0.5, inset)), p(0.5, 0.5));
      break;
    }
    case StitchKind.ThreeQuarter: {
      const diag = part.diagonal ?? Diagonal.Slash;
      line(...(diag === Diagonal.Backslash ? backslash : slash));
      const corner = part.corner ?? Corner.TopLeft;
      const [cx, cy] = cornerPoint(corner);
      line(p(lerp(cx, 0.5, inset), lerp(cy, 0.5, inset)), p(0.5, 0.5), shadeColor(color, -0.12));
      break;
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function drawBackstitches(
  ctx: CanvasRenderingContext2D,
  doc: PatternDocument,
  view: Viewport,
): void {
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, view.scale * 0.14);
  for (const seg of doc.backstitches) {
    const a = view.cellToScreen(seg.x1, seg.y1);
    const b = view.cellToScreen(seg.x2, seg.y2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = dmcHex(seg.colorCode);
    ctx.stroke();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, doc: PatternDocument, view: Viewport): void {
  const s = view.scale;
  const showThin = s >= 7;

  ctx.beginPath();
  ctx.strokeStyle = GRID_THIN;
  ctx.lineWidth = 1;
  if (showThin) {
    for (let c = 0; c <= doc.width; c++) {
      if (c % 10 === 0) continue;
      const x = view.cellToScreen(c, 0).x;
      ctx.moveTo(x, view.cellToScreen(0, 0).y);
      ctx.lineTo(x, view.cellToScreen(0, doc.height).y);
    }
    for (let r = 0; r <= doc.height; r++) {
      if (r % 10 === 0) continue;
      const y = view.cellToScreen(0, r).y;
      ctx.moveTo(view.cellToScreen(0, 0).x, y);
      ctx.lineTo(view.cellToScreen(doc.width, 0).x, y);
    }
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.strokeStyle = GRID_BOLD;
  ctx.lineWidth = 1.5;
  for (let c = 0; c <= doc.width; c += 10) {
    const x = view.cellToScreen(c, 0).x;
    ctx.moveTo(x, view.cellToScreen(0, 0).y);
    ctx.lineTo(x, view.cellToScreen(0, doc.height).y);
  }
  for (let r = 0; r <= doc.height; r += 10) {
    const y = view.cellToScreen(0, r).y;
    ctx.moveTo(view.cellToScreen(0, 0).x, y);
    ctx.lineTo(view.cellToScreen(doc.width, 0).x, y);
  }
  ctx.stroke();

  // Outer edge.
  ctx.strokeStyle = GRID_EDGE;
  ctx.lineWidth = 2;
  const a = view.cellToScreen(0, 0);
  const b = view.cellToScreen(doc.width, doc.height);
  ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);

  drawCenterMarks(ctx, doc, view);
}

function drawCenterMarks(
  ctx: CanvasRenderingContext2D,
  doc: PatternDocument,
  view: Viewport,
): void {
  const cx = doc.width / 2;
  const cy = doc.height / 2;
  ctx.strokeStyle = CENTER_MARK;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  const topX = view.cellToScreen(cx, 0);
  ctx.moveTo(topX.x, view.cellToScreen(0, 0).y);
  ctx.lineTo(topX.x, view.cellToScreen(0, doc.height).y);
  const leftY = view.cellToScreen(0, cy);
  ctx.moveTo(view.cellToScreen(0, 0).x, leftY.y);
  ctx.lineTo(view.cellToScreen(doc.width, 0).x, leftY.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function shadeColor(hex: string, amount: number): string {
  const m = hex.replace('#', '');
  const r = clampByte(parseInt(m.slice(0, 2), 16) + amount * 255);
  const g = clampByte(parseInt(m.slice(2, 4), 16) + amount * 255);
  const b = clampByte(parseInt(m.slice(4, 6), 16) + amount * 255);
  return `rgb(${r},${g},${b})`;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}
