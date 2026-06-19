import { colorHex as dmcHex, colorInfo } from '../data/colors';
import { halfCentroidUnit, halfLineUnit, halfTriangleUnit } from '../engine/stitches';
import { usedColors } from '../model/document';
import {
  Corner,
  Diagonal,
  StitchKind,
  type PatternDocument,
  type StitchPart,
} from '../model/types';
import { buildColorUsage, symbolMap, type ColorUsage } from './symbols';

export type ChartMode = 'symbol' | 'color';

export interface ChartOptions {
  mode: ChartMode;
  stitchesPerPage: number;
}

export type PageKind = 'legend' | 'chart' | 'backstitch';

export interface ChartPage {
  canvas: HTMLCanvasElement;
  title: string;
  kind: PageKind;
}

// Every page is a full A4 sheet at a fixed DPI, so all pages share one size and
// one stitch scale — they tile together and print on plain A4.
const DPI = 150;
const PAGE_W = Math.round(8.2677 * DPI); // 1240
const PAGE_H = Math.round(11.6929 * DPI); // 1754
const PAGE_MARGIN = 64;
const TITLE_H = 44;
const NUM_MARGIN = 46;

const GRID_THIN = '#cfcfcf';
const GRID_BOLD = '#1a1a1a';
const INK = '#111';
const INCH_TO_CM = 2.54;
const LEGEND_COUNTS = [14, 16, 18];

function gridArea(): { ox: number; oy: number; availW: number; availH: number } {
  const ox = PAGE_MARGIN + NUM_MARGIN;
  const oy = PAGE_MARGIN + TITLE_H + NUM_MARGIN;
  return {
    ox,
    oy,
    availW: PAGE_W - ox - PAGE_MARGIN,
    availH: PAGE_H - oy - PAGE_MARGIN,
  };
}

function cellSizeFor(stitchesPerPage: number): number {
  const { availW, availH } = gridArea();
  return Math.max(6, Math.floor(Math.min(availW / stitchesPerPage, availH / stitchesPerPage)));
}

export function renderChartPages(doc: PatternDocument, opts: ChartOptions): ChartPage[] {
  const usage = buildColorUsage(doc);
  const cellPx = cellSizeFor(opts.stitchesPerPage);
  const pages: ChartPage[] = [];

  pages.push(renderLegendPage(doc, usage));

  const tiles = tileRanges(doc.width, doc.height, opts.stitchesPerPage);
  const multi = tiles.length > 1;
  for (const tile of tiles) {
    const title = multi ? `${doc.name} — chart ${tile.label}` : `${doc.name} — chart`;
    pages.push({ kind: 'chart', title, canvas: renderChartTile(doc, usage, opts, tile, cellPx, title) });
  }

  return pages;
}

interface Tile {
  c0: number;
  r0: number;
  c1: number;
  r1: number;
  label: string;
}

function tileRanges(width: number, height: number, per: number): Tile[] {
  const cols = Math.ceil(width / per);
  const rows = Math.ceil(height / per);
  const tiles: Tile[] = [];
  for (let pr = 0; pr < rows; pr++) {
    for (let pc = 0; pc < cols; pc++) {
      tiles.push({
        c0: pc * per,
        r0: pr * per,
        c1: Math.min((pc + 1) * per, width),
        r1: Math.min((pr + 1) * per, height),
        label: `${pr + 1}.${pc + 1}`,
      });
    }
  }
  return tiles;
}

function newPage(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  return [canvas, ctx];
}

function drawPageTitle(ctx: CanvasRenderingContext2D, title: string): void {
  ctx.fillStyle = INK;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, PAGE_MARGIN, PAGE_MARGIN + 22);
}

// --- chart tile ----------------------------------------------------------

function renderChartTile(
  doc: PatternDocument,
  usage: ColorUsage[],
  opts: ChartOptions,
  tile: Tile,
  cellPx: number,
  title: string,
): HTMLCanvasElement {
  const [canvas, ctx] = newPage();
  drawPageTitle(ctx, title);
  const symbols = symbolMap(usage);
  const { ox, oy } = gridArea();
  const toX = (col: number) => ox + (col - tile.c0) * cellPx;
  const toY = (row: number) => oy + (row - tile.r0) * cellPx;

  for (let row = tile.r0; row < tile.r1; row++) {
    for (let col = tile.c0; col < tile.c1; col++) {
      const parts = doc.cells[`${col},${row}`];
      if (!parts || parts.length === 0) continue;
      for (const part of parts) drawChartPart(ctx, toX(col), toY(row), cellPx, part, opts.mode, symbols);
    }
  }

  drawGrid(ctx, tile, cellPx, ox, oy);
  drawTileBackstitch(ctx, doc, tile, cellPx, ox, oy);
  drawNumbers(ctx, tile, cellPx, ox, oy);
  drawCenterArrows(ctx, doc, tile, cellPx, ox, oy);
  return canvas;
}

function drawTileBackstitch(
  ctx: CanvasRenderingContext2D,
  doc: PatternDocument,
  tile: Tile,
  cellPx: number,
  ox: number,
  oy: number,
): void {
  if (doc.backstitches.length === 0) return;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.4, cellPx * 0.11);
  for (const seg of doc.backstitches) {
    const clipped = clipSegment(seg.x1, seg.y1, seg.x2, seg.y2, tile);
    if (!clipped) continue;
    const [ax, ay, bx, by] = clipped;
    ctx.strokeStyle = dmcHex(seg.colorCode);
    ctx.beginPath();
    ctx.moveTo(ox + (ax - tile.c0) * cellPx, oy + (ay - tile.r0) * cellPx);
    ctx.lineTo(ox + (bx - tile.c0) * cellPx, oy + (by - tile.r0) * cellPx);
    ctx.stroke();
  }
}

function cellPolygon(part: StitchPart): Array<[number, number]> {
  switch (part.kind) {
    case StitchKind.Full:
      return [[0, 0], [1, 0], [1, 1], [0, 1]];
    case StitchKind.Half:
      return halfTriangleUnit(part);
    case StitchKind.ThreeQuarter:
      return part.diagonal === Diagonal.Backslash
        ? [[0, 0], [1, 1], [0, 1]]
        : [[0, 1], [1, 1], [1, 0]];
    case StitchKind.Quarter:
      return quarterPolygon(part.corner ?? Corner.TopLeft);
  }
}

function quarterPolygon(corner: Corner): Array<[number, number]> {
  switch (corner) {
    case Corner.TopLeft:
      return [[0, 0], [0.5, 0], [0, 0.5]];
    case Corner.TopRight:
      return [[1, 0], [1, 0.5], [0.5, 0]];
    case Corner.BottomLeft:
      return [[0, 1], [0, 0.5], [0.5, 1]];
    case Corner.BottomRight:
      return [[1, 1], [0.5, 1], [1, 0.5]];
  }
}

function symbolAnchor(part: StitchPart): { cx: number; cy: number; scale: number } {
  switch (part.kind) {
    case StitchKind.Full:
      return { cx: 0.5, cy: 0.5, scale: 0.82 };
    case StitchKind.Half: {
      const [cx, cy] = halfCentroidUnit(part);
      return { cx, cy, scale: 0.5 };
    }
    case StitchKind.ThreeQuarter:
      return part.diagonal === Diagonal.Backslash
        ? { cx: 0.34, cy: 0.64, scale: 0.5 }
        : { cx: 0.66, cy: 0.64, scale: 0.5 };
    case StitchKind.Quarter: {
      const anchors: Record<Corner, [number, number]> = {
        [Corner.TopLeft]: [0.24, 0.24],
        [Corner.TopRight]: [0.76, 0.24],
        [Corner.BottomLeft]: [0.24, 0.76],
        [Corner.BottomRight]: [0.76, 0.76],
      };
      const [cx, cy] = anchors[part.corner ?? Corner.TopLeft];
      return { cx, cy, scale: 0.42 };
    }
  }
}

function drawChartPart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  part: StitchPart,
  mode: ChartMode,
  symbols: Map<string, string>,
): void {
  const color = dmcHex(part.colorCode);
  const partial = part.kind !== StitchKind.Full;

  if (mode === 'color') {
    const poly = cellPolygon(part).map(([fx, fy]) => [x + fx * s, y + fy * s] as [number, number]);
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  } else if (partial) {
    drawPartialEdge(ctx, x, y, s, part);
  }

  const glyph = symbols.get(part.colorCode) ?? '?';
  const a = symbolAnchor(part);
  ctx.fillStyle = mode === 'color' ? contrast(color) : INK;
  ctx.font = `${Math.round(s * a.scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, x + a.cx * s, y + a.cy * s + s * 0.04);
}

function drawPartialEdge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  part: StitchPart,
): void {
  ctx.strokeStyle = '#9a9a9a';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  if (part.kind === StitchKind.Quarter) {
    const [fx, fy] = quarterCornerPoint(part.corner ?? Corner.TopLeft);
    ctx.moveTo(x + fx * s, y + fy * s);
    ctx.lineTo(x + 0.5 * s, y + 0.5 * s);
  } else {
    const [[ax, ay], [bx, by]] = halfLineUnit(part);
    ctx.moveTo(x + ax * s, y + ay * s);
    ctx.lineTo(x + bx * s, y + by * s);
  }
  ctx.stroke();
}

function quarterCornerPoint(corner: Corner): [number, number] {
  switch (corner) {
    case Corner.TopLeft:
      return [0, 0];
    case Corner.TopRight:
      return [1, 0];
    case Corner.BottomLeft:
      return [0, 1];
    case Corner.BottomRight:
      return [1, 1];
  }
}

/**
 * Liang-Barsky clip of a segment to a tile's cell-coordinate rectangle.
 * Returns the clipped endpoints, or null if the segment lies fully outside —
 * so backstitch never spills past the tile (and page) edges.
 */
export function clipSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: { c0: number; r0: number; c1: number; r1: number },
): [number, number, number, number] | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rect.c0, rect.c1 - x1, y1 - rect.r0, rect.r1 - y1];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}

// --- shared grid / numbers / arrows -------------------------------------

function drawGrid(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  s: number,
  ox: number,
  oy: number,
): void {
  const x0 = ox;
  const y0 = oy;
  const x1 = ox + (tile.c1 - tile.c0) * s;
  const y1 = oy + (tile.r1 - tile.r0) * s;

  ctx.strokeStyle = GRID_THIN;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = tile.c0 + 1; c < tile.c1; c++) {
    if (c % 10 === 0) continue;
    const x = Math.round(ox + (c - tile.c0) * s) + 0.5;
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
  }
  for (let r = tile.r0 + 1; r < tile.r1; r++) {
    if (r % 10 === 0) continue;
    const y = Math.round(oy + (r - tile.r0) * s) + 0.5;
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
  }
  ctx.stroke();

  ctx.strokeStyle = GRID_BOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let c = tile.c0; c <= tile.c1; c++) {
    if (c % 10 !== 0 && c !== tile.c0 && c !== tile.c1) continue;
    const x = Math.round(ox + (c - tile.c0) * s) + 0.5;
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
  }
  for (let r = tile.r0; r <= tile.r1; r++) {
    if (r % 10 !== 0 && r !== tile.r0 && r !== tile.r1) continue;
    const y = Math.round(oy + (r - tile.r0) * s) + 0.5;
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
  }
  ctx.stroke();
}

function drawNumbers(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  s: number,
  ox: number,
  oy: number,
): void {
  ctx.fillStyle = '#222';
  ctx.font = `${Math.round(Math.min(s * 0.62, 14))}px sans-serif`;
  ctx.textBaseline = 'middle';

  ctx.textAlign = 'center';
  for (let c = tile.c0; c <= tile.c1; c++) {
    if (c % 10 !== 0 || c === 0) continue;
    const x = ox + (c - tile.c0) * s;
    ctx.fillText(String(c), x, oy - s * 0.55);
  }
  ctx.textAlign = 'right';
  for (let r = tile.r0; r <= tile.r1; r++) {
    if (r % 10 !== 0 || r === 0) continue;
    const y = oy + (r - tile.r0) * s;
    ctx.fillText(String(r), ox - s * 0.35, y);
  }
}

function drawCenterArrows(
  ctx: CanvasRenderingContext2D,
  doc: PatternDocument,
  tile: Tile,
  s: number,
  ox: number,
  oy: number,
): void {
  const cx = doc.width / 2;
  const cy = doc.height / 2;
  const size = Math.min(s * 0.6, 14);
  ctx.fillStyle = INK;

  if (cx >= tile.c0 && cx <= tile.c1) {
    const x = ox + (cx - tile.c0) * s;
    const yBase = oy - size - 2;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.6, yBase);
    ctx.lineTo(x + size * 0.6, yBase);
    ctx.lineTo(x, yBase + size);
    ctx.closePath();
    ctx.fill();
  }
  if (cy >= tile.r0 && cy <= tile.r1) {
    const y = oy + (cy - tile.r0) * s;
    const xBase = ox - size - 2;
    ctx.beginPath();
    ctx.moveTo(xBase, y - size * 0.6);
    ctx.lineTo(xBase, y + size * 0.6);
    ctx.lineTo(xBase + size, y);
    ctx.closePath();
    ctx.fill();
  }
}

// --- legend page ---------------------------------------------------------

function sizeLine(doc: PatternDocument, count: number): string {
  const cmW = (doc.width / (count / INCH_TO_CM)).toFixed(1);
  const cmH = (doc.height / (count / INCH_TO_CM)).toFixed(1);
  const inW = (doc.width / count).toFixed(1);
  const inH = (doc.height / count).toFixed(1);
  return `${count} ct  ${doc.width}×${doc.height} stitches  (${cmW} × ${cmH} cm)  (${inW} × ${inH} in)`;
}

function renderLegendPage(doc: PatternDocument, usage: ColorUsage[]): ChartPage {
  const [canvas, ctx] = newPage();
  const left = PAGE_MARGIN;
  const right = PAGE_W - PAGE_MARGIN;

  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(doc.name || 'Untitled pattern', left, PAGE_MARGIN + 20);

  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#333';
  const counts = LEGEND_COUNTS.includes(doc.count) ? LEGEND_COUNTS : [doc.count, ...LEGEND_COUNTS];
  let y = PAGE_MARGIN + 52;
  counts.forEach((c) => {
    ctx.fillText(sizeLine(doc, c), left, y);
    y += 22;
  });
  const totalStitches = Object.values(doc.cells).reduce((n, p) => n + p.length, 0);
  ctx.fillText(
    `${usedColors(doc).size} colors · ${totalStitches.toLocaleString()} stitches · ${doc.backstitches.length} backstitch segments · 2 strands (1 for backstitch)`,
    left,
    y + 4,
  );

  const tableTop = y + 28;
  const available = PAGE_H - PAGE_MARGIN - tableTop;
  const rowH = Math.min(34, available / (usage.length + 1));
  const cols = {
    sym: left + 8,
    swatch: left + 90,
    number: left + 180,
    name: left + 320,
  };

  ctx.textBaseline = 'middle';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = INK;
  let ry = tableTop;
  ctx.fillText('Symbol', cols.sym, ry + rowH / 2);
  ctx.fillText('Color', cols.swatch, ry + rowH / 2);
  ctx.fillText('Thread', cols.number, ry + rowH / 2);
  ctx.fillText('Name', cols.name, ry + rowH / 2);
  ctx.textAlign = 'right';
  ctx.fillText('Count', right - 8, ry + rowH / 2);
  ctx.textAlign = 'left';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  line(ctx, left, right, ry + rowH);
  ry += rowH;

  for (const u of usage) {
    const info = colorInfo(u.colorCode);
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.font = `${Math.round(Math.min(rowH * 0.6, 20))}px sans-serif`;
    ctx.fillText(u.symbol, cols.sym + 26, ry + rowH / 2);

    ctx.fillStyle = dmcHex(u.colorCode);
    ctx.fillRect(cols.swatch, ry + 5, 60, rowH - 10);
    ctx.strokeStyle = '#888';
    ctx.strokeRect(cols.swatch, ry + 5, 60, rowH - 10);

    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${info.brand} ${info.number}`, cols.number, ry + rowH / 2);
    ctx.fillText(truncate(info.name, 36), cols.name, ry + rowH / 2);
    ctx.textAlign = 'right';
    const countText = u.backstitches ? `${u.stitches} +${u.backstitches} bs` : String(u.stitches);
    ctx.fillText(countText, right - 8, ry + rowH / 2);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#ddd';
    line(ctx, left, right, ry + rowH);
    ry += rowH;
  }
  ctx.strokeStyle = '#333';
  ctx.strokeRect(left, tableTop, right - left, ry - tableTop);

  return { canvas, title: `${doc.name} — legend`, kind: 'legend' };
}

function line(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
}

// --- helpers -------------------------------------------------------------

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function contrast(hex: string): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000' : '#fff';
}

export function chartFileName(doc: PatternDocument): string {
  const base = (doc.name || 'pattern').replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
  return `${base || 'pattern'}-chart.pdf`;
}
