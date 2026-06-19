import { jsPDF } from 'jspdf';
import { dmcHex, getDmc } from '../data/dmc';
import {
  Corner,
  Diagonal,
  StitchKind,
  type PatternDocument,
  type StitchPart,
} from '../model/types';
import { clipSegment, type ChartMode } from './chart';
import { STITCH_FONT_BASE64 } from './font';
import { buildColorUsage, symbolMap, type ColorUsage } from './symbols';

// A4 in points. Everything is vector (lines, filled shapes, embedded-font
// text) so files stay small and Pattern Keeper can parse the grid, symbols
// and floss key. The symbol font is embedded so it renders everywhere.
const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 36;
const TITLE_H = 22;
const NUM_GUTTER = 14;
const ARROW_BAND = 12;
const INCH_TO_CM = 2.54;
const SIZE_COUNTS = [14, 16, 18, 28];
const FONT = 'stitch';

const GRID_THIN: RGB = [205, 205, 205];
const GRID_BOLD: RGB = [26, 26, 26];
const INK: RGB = [17, 17, 17];

type RGB = [number, number, number];

interface Tile {
  c0: number;
  r0: number;
  c1: number;
  r1: number;
  label: string;
}

interface GridLayout {
  ox: number;
  oy: number;
  cellPt: number;
}

export function buildChartPdf(
  doc: PatternDocument,
  mode: ChartMode,
  stitchesPerPage: number,
): jsPDF {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
  pdf.addFileToVFS('Stitch.ttf', STITCH_FONT_BASE64);
  pdf.addFont('Stitch.ttf', FONT, 'normal');
  pdf.setFont(FONT, 'normal');

  const usage = buildColorUsage(doc);
  const symbols = symbolMap(usage);

  drawKeyPage(pdf, doc, usage);

  const tiles = tileRanges(doc.width, doc.height, stitchesPerPage);
  const multi = tiles.length > 1;
  const layout = gridLayout(stitchesPerPage);

  for (const tile of tiles) {
    pdf.addPage('a4', 'portrait');
    pageTitle(pdf, multi ? `${doc.name} — chart ${tile.label}` : `${doc.name} — chart`);
    drawChartTile(pdf, doc, symbols, mode, tile, layout);
  }

  return pdf;
}

export function exportChartPdf(
  doc: PatternDocument,
  mode: ChartMode,
  stitchesPerPage: number,
  fileName: string,
): void {
  buildChartPdf(doc, mode, stitchesPerPage).save(fileName);
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

function gridLayout(stitchesPerPage: number): GridLayout {
  const ox = MARGIN + ARROW_BAND + NUM_GUTTER;
  const oy = MARGIN + TITLE_H + ARROW_BAND + NUM_GUTTER;
  const availW = A4_W - ox - MARGIN;
  const availH = A4_H - oy - MARGIN;
  const cellPt = Math.min(availW / stitchesPerPage, availH / stitchesPerPage);
  return { ox, oy, cellPt };
}

function pageTitle(pdf: jsPDF, title: string): void {
  pdf.setFontSize(12);
  pdf.setTextColor(...INK);
  pdf.text(title, MARGIN, MARGIN + 12);
}

// --- chart tile (with backstitch on the same page) -----------------------

function drawChartTile(
  pdf: jsPDF,
  doc: PatternDocument,
  symbols: Map<string, string>,
  mode: ChartMode,
  tile: Tile,
  layout: GridLayout,
): void {
  const { ox, oy, cellPt } = layout;
  const toX = (col: number) => ox + (col - tile.c0) * cellPt;
  const toY = (row: number) => oy + (row - tile.r0) * cellPt;

  pdf.setFontSize(cellPt * 0.82);
  for (let row = tile.r0; row < tile.r1; row++) {
    for (let col = tile.c0; col < tile.c1; col++) {
      const parts = doc.cells[`${col},${row}`];
      if (!parts || parts.length === 0) continue;
      for (const part of parts) drawCell(pdf, toX(col), toY(row), cellPt, part, mode, symbols);
    }
  }

  drawGrid(pdf, tile, layout);
  drawBackstitch(pdf, doc, tile, layout);
  drawNumbers(pdf, tile, layout);
  drawCenterArrows(pdf, doc, tile, layout);
}

function drawBackstitch(pdf: jsPDF, doc: PatternDocument, tile: Tile, layout: GridLayout): void {
  if (doc.backstitches.length === 0) return;
  const { ox, oy, cellPt } = layout;
  pdf.setLineCap('round');
  pdf.setLineWidth(Math.max(0.7, cellPt * 0.11));
  for (const seg of doc.backstitches) {
    const clipped = clipSegment(seg.x1, seg.y1, seg.x2, seg.y2, tile);
    if (!clipped) continue;
    const [ax, ay, bx, by] = clipped;
    const [r, g, b] = hexToRgb(dmcHex(seg.colorCode));
    pdf.setDrawColor(r, g, b);
    pdf.line(
      ox + (ax - tile.c0) * cellPt,
      oy + (ay - tile.r0) * cellPt,
      ox + (bx - tile.c0) * cellPt,
      oy + (by - tile.r0) * cellPt,
    );
  }
  pdf.setLineCap('butt');
}

function drawCell(
  pdf: jsPDF,
  x: number,
  y: number,
  s: number,
  part: StitchPart,
  mode: ChartMode,
  symbols: Map<string, string>,
): void {
  const hex = dmcHex(part.colorCode);

  if (mode === 'color') {
    const [r, g, b] = hexToRgb(hex);
    pdf.setFillColor(r, g, b);
    fillStitch(pdf, x, y, s, part);
  } else if (part.kind !== StitchKind.Full) {
    pdf.setDrawColor(154, 154, 154);
    pdf.setLineWidth(0.3);
    drawPartialEdge(pdf, x, y, s, part);
  }

  const glyph = symbols.get(part.colorCode) ?? '?';
  const a = symbolAnchor(part);
  pdf.setFontSize(s * a.scale);
  if (mode === 'color') {
    const [cr, cg, cb] = contrast(hex);
    pdf.setTextColor(cr, cg, cb);
  } else {
    pdf.setTextColor(...INK);
  }
  pdf.text(glyph, x + a.cx * s, y + a.cy * s, { align: 'center', baseline: 'middle' });
}

function fillStitch(pdf: jsPDF, x: number, y: number, s: number, part: StitchPart): void {
  const p = (fx: number, fy: number): [number, number] => [x + fx * s, y + fy * s];
  switch (part.kind) {
    case StitchKind.Full:
      pdf.rect(x, y, s, s, 'F');
      break;
    case StitchKind.Half:
    case StitchKind.ThreeQuarter: {
      const t =
        part.diagonal === Diagonal.Backslash
          ? [p(0, 0), p(1, 1), p(0, 1)]
          : [p(0, 1), p(1, 1), p(1, 0)];
      pdf.triangle(t[0][0], t[0][1], t[1][0], t[1][1], t[2][0], t[2][1], 'F');
      break;
    }
    case StitchKind.Quarter: {
      const t = quarterTriangle(p, part.corner ?? Corner.TopLeft);
      pdf.triangle(t[0][0], t[0][1], t[1][0], t[1][1], t[2][0], t[2][1], 'F');
      break;
    }
  }
}

function quarterTriangle(
  p: (fx: number, fy: number) => [number, number],
  corner: Corner,
): Array<[number, number]> {
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

function drawPartialEdge(pdf: jsPDF, x: number, y: number, s: number, part: StitchPart): void {
  if (part.kind === StitchKind.Quarter) {
    const [fx, fy] = quarterCornerPoint(part.corner ?? Corner.TopLeft);
    pdf.line(x + fx * s, y + fy * s, x + 0.5 * s, y + 0.5 * s);
  } else if (part.diagonal === Diagonal.Backslash) {
    pdf.line(x, y, x + s, y + s);
  } else {
    pdf.line(x, y + s, x + s, y);
  }
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

function symbolAnchor(part: StitchPart): { cx: number; cy: number; scale: number } {
  switch (part.kind) {
    case StitchKind.Full:
      return { cx: 0.5, cy: 0.52, scale: 0.82 };
    case StitchKind.Half:
    case StitchKind.ThreeQuarter:
      return part.diagonal === Diagonal.Backslash
        ? { cx: 0.34, cy: 0.66, scale: 0.5 }
        : { cx: 0.66, cy: 0.66, scale: 0.5 };
    case StitchKind.Quarter: {
      const anchors: Record<Corner, [number, number]> = {
        [Corner.TopLeft]: [0.26, 0.28],
        [Corner.TopRight]: [0.74, 0.28],
        [Corner.BottomLeft]: [0.26, 0.76],
        [Corner.BottomRight]: [0.74, 0.76],
      };
      const [cx, cy] = anchors[part.corner ?? Corner.TopLeft];
      return { cx, cy, scale: 0.42 };
    }
  }
}


// --- shared grid / numbers / arrows -------------------------------------

function drawGrid(pdf: jsPDF, tile: Tile, layout: GridLayout): void {
  const { ox, oy, cellPt } = layout;
  const x0 = ox;
  const y0 = oy;
  const x1 = ox + (tile.c1 - tile.c0) * cellPt;
  const y1 = oy + (tile.r1 - tile.r0) * cellPt;

  pdf.setLineWidth(0.3);
  pdf.setDrawColor(...GRID_THIN);
  for (let c = tile.c0 + 1; c < tile.c1; c++) {
    if (c % 10 === 0) continue;
    const x = ox + (c - tile.c0) * cellPt;
    pdf.line(x, y0, x, y1);
  }
  for (let r = tile.r0 + 1; r < tile.r1; r++) {
    if (r % 10 === 0) continue;
    const y = oy + (r - tile.r0) * cellPt;
    pdf.line(x0, y, x1, y);
  }

  pdf.setLineWidth(1);
  pdf.setDrawColor(...GRID_BOLD);
  for (let c = tile.c0; c <= tile.c1; c++) {
    if (c % 10 !== 0 && c !== tile.c0 && c !== tile.c1) continue;
    const x = ox + (c - tile.c0) * cellPt;
    pdf.line(x, y0, x, y1);
  }
  for (let r = tile.r0; r <= tile.r1; r++) {
    if (r % 10 !== 0 && r !== tile.r0 && r !== tile.r1) continue;
    const y = oy + (r - tile.r0) * cellPt;
    pdf.line(x0, y, x1, y);
  }
}

function drawNumbers(pdf: jsPDF, tile: Tile, layout: GridLayout): void {
  const { ox, oy, cellPt } = layout;
  pdf.setFontSize(Math.min(cellPt * 0.85, 9));
  pdf.setTextColor(34, 34, 34);

  for (let c = tile.c0; c <= tile.c1; c++) {
    if (c % 10 !== 0 || c === 0) continue;
    const x = ox + (c - tile.c0) * cellPt;
    pdf.text(String(c), x, oy - 3, { align: 'center', baseline: 'bottom' });
  }
  for (let r = tile.r0; r <= tile.r1; r++) {
    if (r % 10 !== 0 || r === 0) continue;
    const y = oy + (r - tile.r0) * cellPt;
    pdf.text(String(r), ox - 4, y, { align: 'right', baseline: 'middle' });
  }
}

function drawCenterArrows(pdf: jsPDF, doc: PatternDocument, tile: Tile, layout: GridLayout): void {
  const { ox, oy, cellPt } = layout;
  const cx = doc.width / 2;
  const cy = doc.height / 2;
  const size = Math.min(ARROW_BAND, 10);
  pdf.setFillColor(...INK);

  if (cx >= tile.c0 && cx <= tile.c1) {
    const x = ox + (cx - tile.c0) * cellPt;
    const yb = oy - NUM_GUTTER - size;
    pdf.triangle(x - size * 0.6, yb, x + size * 0.6, yb, x, yb + size, 'F');
  }
  if (cy >= tile.r0 && cy <= tile.r1) {
    const y = oy + (cy - tile.r0) * cellPt;
    const xb = ox - NUM_GUTTER - size;
    pdf.triangle(xb, y - size * 0.6, xb, y + size * 0.6, xb + size, y, 'F');
  }
}

// --- key page (Pattern Keeper format) -----------------------------------

function sizeLine(doc: PatternDocument, count: number): string {
  const cmW = (doc.width / (count / INCH_TO_CM)).toFixed(1);
  const cmH = (doc.height / (count / INCH_TO_CM)).toFixed(1);
  const inW = (doc.width / count).toFixed(1);
  const inH = (doc.height / count).toFixed(1);
  return `${count} Count, ${inW}w X ${inH}h in (${cmW} x ${cmH} cm)`;
}

function drawKeyPage(pdf: jsPDF, doc: PatternDocument, usage: ColorUsage[]): void {
  const left = MARGIN;
  const cursor = { y: MARGIN + 14 };

  pdf.setFontSize(18);
  pdf.setTextColor(...INK);
  pdf.text(doc.name || 'Untitled Pattern', left, cursor.y);
  cursor.y += 22;

  pdf.setFontSize(10);
  pdf.setTextColor(40, 40, 40);
  const meta = [
    `Pattern Name: ${doc.name || 'Untitled Pattern'}`,
    `Fabric: Aida ${doc.count}`,
    `        ${doc.width}w X ${doc.height}h Stitches`,
  ];
  for (const line of meta) {
    pdf.text(line, left, cursor.y);
    cursor.y += 14;
  }
  const counts = SIZE_COUNTS.includes(doc.count) ? SIZE_COUNTS : [doc.count, ...SIZE_COUNTS];
  pdf.text('Size(s):', left, cursor.y);
  counts.forEach((c, i) => {
    pdf.text(sizeLine(doc, c), left + 50, cursor.y + i * 14);
  });
  cursor.y += counts.length * 14 + 16;

  const fullStitch = usage.filter((u) => u.stitches > 0);
  const backStitch = usage.filter((u) => u.backstitches > 0);

  drawFlossSection(pdf, 'Floss Used for Full Stitches:', fullStitch, 2, false, cursor);
  if (backStitch.length > 0) {
    cursor.y += 8;
    drawFlossSection(pdf, 'Floss Used for Back Stitches:', backStitch, 1, true, cursor);
  }
}

const COL = { sym: 22, strands: 64, type: 110, number: 150, color: 210, swatch: A4_W - MARGIN - 44 };

function drawFlossSection(
  pdf: jsPDF,
  title: string,
  rows: ColorUsage[],
  strands: number,
  isBack: boolean,
  cursor: { y: number },
): void {
  const left = MARGIN;
  ensureSpace(pdf, cursor, 40);

  pdf.setFontSize(11);
  pdf.setTextColor(...INK);
  pdf.text(title, left, cursor.y);
  cursor.y += 16;

  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text('Symbol', COL.sym - 8, cursor.y);
  pdf.text('Strands', COL.strands, cursor.y);
  pdf.text('Type', COL.type, cursor.y);
  pdf.text('Number', COL.number, cursor.y);
  pdf.text('Color', COL.color, cursor.y);
  pdf.text('Count', COL.swatch, cursor.y);
  cursor.y += 4;
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.5);
  pdf.line(left, cursor.y, A4_W - MARGIN, cursor.y);
  cursor.y += 12;

  const rowH = 14;
  for (const u of rows) {
    if (ensureSpace(pdf, cursor, rowH + 4)) {
      // repeat header after a page break
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Symbol', COL.sym - 8, cursor.y);
      pdf.text('Strands', COL.strands, cursor.y);
      pdf.text('Type', COL.type, cursor.y);
      pdf.text('Number', COL.number, cursor.y);
      pdf.text('Color', COL.color, cursor.y);
      cursor.y += 16;
    }
    const dmc = getDmc(u.colorCode);
    pdf.setFontSize(11);
    pdf.setTextColor(...INK);
    pdf.text(u.symbol, COL.sym, cursor.y, { align: 'center' });
    pdf.setFontSize(9);
    pdf.text(String(strands), COL.strands + 8, cursor.y);
    pdf.text('DMC', COL.type, cursor.y);
    pdf.text(u.colorCode, COL.number, cursor.y);
    pdf.text(truncate(dmc?.name ?? '', 40), COL.color, cursor.y);
    pdf.text(String(isBack ? u.backstitches : u.stitches), COL.swatch, cursor.y);

    const [r, g, b] = hexToRgb(dmcHex(u.colorCode));
    pdf.setFillColor(r, g, b);
    pdf.rect(A4_W - MARGIN - 18, cursor.y - 9, 14, 11, 'F');
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(0.3);
    pdf.rect(A4_W - MARGIN - 18, cursor.y - 9, 14, 11, 'S');

    cursor.y += rowH;
  }
}

function ensureSpace(pdf: jsPDF, cursor: { y: number }, needed: number): boolean {
  if (cursor.y + needed <= A4_H - MARGIN) return false;
  pdf.addPage('a4', 'portrait');
  cursor.y = MARGIN + 14;
  return true;
}

// --- helpers -------------------------------------------------------------

function hexToRgb(hex: string): RGB {
  const m = hex.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function contrast(hex: string): RGB {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? [0, 0, 0] : [255, 255, 255];
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
