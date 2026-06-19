import { dmcHex } from '../data/dmc';
import {
  addPaletteColor,
  cellKey,
  clone,
  createDocument,
  inBounds,
  moveDesign,
  segmentsEqual,
  type NewDocumentOptions,
} from '../model/document';
import { History } from '../model/history';
import {
  clearRegion,
  cropToContent,
  extractFragment,
  mirrorFragmentH,
  mirrorFragmentV,
  resizeCanvas,
  rotateFragmentCCW,
  rotateFragmentCW,
  stampFragment,
  type Anchor,
  type Fragment,
  type Rect,
} from '../model/transform';
import {
  Corner,
  Diagonal,
  LengthUnit,
  StitchKind,
  ToolType,
  type BackstitchSegment,
  type PatternDocument,
  type StitchPart,
} from '../model/types';
import { render } from './renderer';
import { cornerFromFraction, diagonalForCorner, snapNode } from './stitches';
import { Viewport } from './viewport';

export interface EditorSnapshot {
  tool: ToolType;
  activeColorCode: string | null;
  halfDiagonal: Diagonal;
  realistic: boolean;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
  name: string;
  hasSelection: boolean;
  hasClipboard: boolean;
}

type Listener = (snap: EditorSnapshot) => void;

enum Gesture {
  None,
  Draw,
  Pan,
  Backstitch,
  Select,
}

export class EditorEngine {
  private doc: PatternDocument;
  readonly view = new Viewport();
  private history = new History();

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cssW = 0;
  private cssH = 0;
  private rafId = 0;

  tool: ToolType = ToolType.Full;
  activeColorCode: string | null = null;
  halfDiagonal: Diagonal = Diagonal.Slash;
  realistic = false;
  showGrid = true;

  private gesture = Gesture.None;
  private spaceHeld = false;
  private panLast = { x: 0, y: 0 };
  private backstitchStart: { x: number; y: number } | null = null;
  private backstitchEnd: { x: number; y: number } | null = null;
  private lastPainted = '';
  private selection: Rect | null = null;
  private selectStart: { c: number; r: number } | null = null;
  private selectMoved = false;
  private clipboard: Fragment | null = null;

  private listeners = new Set<Listener>();

  constructor(doc?: PatternDocument) {
    this.doc =
      doc ??
      createDocument({
        name: 'Untitled',
        width: 70,
        height: 70,
        count: 14,
        unit: LengthUnit.Centimeters,
      });
  }

  // --- lifecycle ---------------------------------------------------------

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    this.fit();
  }

  resize(): void {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.cssW = rect.width;
    this.cssH = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.requestRender();
  }

  fit(): void {
    this.view.fit(this.doc.width, this.doc.height, this.cssW || 800, this.cssH || 600);
    this.requestRender();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }

  snapshot(): EditorSnapshot {
    return {
      tool: this.tool,
      activeColorCode: this.activeColorCode,
      halfDiagonal: this.halfDiagonal,
      realistic: this.realistic,
      showGrid: this.showGrid,
      canUndo: this.history.canUndo(),
      canRedo: this.history.canRedo(),
      name: this.doc.name,
      hasSelection: this.selection !== null,
      hasClipboard: this.clipboard !== null,
    };
  }

  requestRender(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      if (!this.ctx) return;
      // Snap the origin to whole device pixels for rendering only. This keeps
      // every grid line's sub-pixel phase constant while panning, which stops
      // the lines from shimmering between sharp and blurry each frame.
      const dpr = window.devicePixelRatio || 1;
      const realOriginX = this.view.originX;
      const realOriginY = this.view.originY;
      this.view.originX = Math.round(realOriginX * dpr) / dpr;
      this.view.originY = Math.round(realOriginY * dpr) / dpr;
      render(this.ctx, this.doc, this.view, {
        realistic: this.realistic,
        showGrid: this.showGrid,
      });
      this.drawBackstitchPreview();
      this.drawSelection();
      this.view.originX = realOriginX;
      this.view.originY = realOriginY;
    });
  }

  private drawSelection(): void {
    if (!this.ctx || !this.selection) return;
    const a = this.view.cellToScreen(this.selection.c0, this.selection.r0);
    const b = this.view.cellToScreen(this.selection.c1, this.selection.r1);
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(59, 130, 246, 0.14)';
    this.ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([5, 3]);
    this.ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    this.ctx.setLineDash([]);
    this.ctx.restore();
  }

  private drawBackstitchPreview(): void {
    if (!this.ctx || !this.backstitchStart || !this.backstitchEnd) return;
    const a = this.view.cellToScreen(this.backstitchStart.x, this.backstitchStart.y);
    const b = this.view.cellToScreen(this.backstitchEnd.x, this.backstitchEnd.y);
    this.ctx.save();
    this.ctx.strokeStyle = this.activeColorCode ? dmcHex(this.activeColorCode) : '#888';
    this.ctx.lineWidth = Math.max(1.5, this.view.scale * 0.14);
    this.ctx.lineCap = 'round';
    this.ctx.globalAlpha = 0.6;
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  // --- document ----------------------------------------------------------

  getDocument(): PatternDocument {
    return this.doc;
  }

  newDocument(opts: NewDocumentOptions): void {
    this.doc = createDocument(opts);
    this.history.clear();
    this.fit();
    this.emit();
  }

  loadDocument(doc: PatternDocument): void {
    this.doc = doc;
    this.history.clear();
    this.fit();
    this.emit();
  }

  // --- tools / settings --------------------------------------------------

  setTool(tool: ToolType): void {
    this.tool = tool;
    this.emit();
  }

  setActiveColor(code: string): void {
    this.activeColorCode = code;
    addPaletteColor(this.doc, code);
    this.emit();
  }

  setHalfDiagonal(diagonal: Diagonal): void {
    this.halfDiagonal = diagonal;
    this.emit();
  }

  toggleRealistic(): void {
    this.realistic = !this.realistic;
    this.requestRender();
    this.emit();
  }

  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    this.requestRender();
    this.emit();
  }

  setSpaceHeld(held: boolean): void {
    this.spaceHeld = held;
  }

  isPanning(): boolean {
    return this.gesture === Gesture.Pan;
  }

  zoom(factor: number): void {
    this.view.zoomAt(this.cssW / 2, this.cssH / 2, factor);
    this.requestRender();
  }

  // --- history -----------------------------------------------------------

  undo(): void {
    const prev = this.history.undo(this.doc);
    if (prev) {
      this.doc = prev;
      this.requestRender();
      this.emit();
    }
  }

  redo(): void {
    const next = this.history.redo(this.doc);
    if (next) {
      this.doc = next;
      this.requestRender();
      this.emit();
    }
  }

  shiftDesign(dx: number, dy: number): void {
    const before = clone(this.doc);
    if (moveDesign(this.doc, dx, dy)) {
      this.history.push(before);
      this.requestRender();
      this.emit();
    }
  }

  // --- selection operations ---------------------------------------------

  clearSelection(): void {
    if (!this.selection) return;
    this.selection = null;
    this.requestRender();
    this.emit();
  }

  copySelection(): void {
    if (!this.selection) return;
    this.clipboard = extractFragment(this.doc, this.selection);
    this.emit();
  }

  deleteSelection(): void {
    if (!this.selection) return;
    this.history.push(clone(this.doc));
    clearRegion(this.doc, this.selection);
    this.requestRender();
    this.emit();
  }

  paste(): void {
    if (!this.clipboard) return;
    this.history.push(clone(this.doc));
    const at = this.selection ?? { c0: 0, r0: 0, c1: 0, r1: 0 };
    stampFragment(this.doc, this.clipboard, at.c0, at.r0);
    this.selection = {
      c0: at.c0,
      r0: at.r0,
      c1: Math.min(at.c0 + this.clipboard.width, this.doc.width),
      r1: Math.min(at.r0 + this.clipboard.height, this.doc.height),
    };
    this.requestRender();
    this.emit();
  }

  private transformSelection(fn: (f: Fragment) => Fragment): void {
    if (!this.selection) return;
    this.history.push(clone(this.doc));
    const frag = fn(extractFragment(this.doc, this.selection));
    clearRegion(this.doc, this.selection);
    stampFragment(this.doc, frag, this.selection.c0, this.selection.r0);
    this.selection = {
      c0: this.selection.c0,
      r0: this.selection.r0,
      c1: Math.min(this.selection.c0 + frag.width, this.doc.width),
      r1: Math.min(this.selection.r0 + frag.height, this.doc.height),
    };
    this.requestRender();
    this.emit();
  }

  mirrorSelectionH(): void {
    this.transformSelection(mirrorFragmentH);
  }

  mirrorSelectionV(): void {
    this.transformSelection(mirrorFragmentV);
  }

  rotateSelectionCW(): void {
    this.transformSelection(rotateFragmentCW);
  }

  rotateSelectionCCW(): void {
    this.transformSelection(rotateFragmentCCW);
  }

  // --- canvas operations -------------------------------------------------

  resizeCanvasTo(newW: number, newH: number, anchorX: Anchor, anchorY: Anchor): void {
    this.history.push(clone(this.doc));
    resizeCanvas(this.doc, newW, newH, anchorX, anchorY);
    this.selection = null;
    this.fit();
    this.emit();
  }

  cropCanvas(border: number): void {
    const before = clone(this.doc);
    if (cropToContent(this.doc, border)) {
      this.history.push(before);
      this.selection = null;
      this.fit();
      this.emit();
    }
  }

  // --- pointer interaction ----------------------------------------------

  pointerDown(px: number, py: number, button: number, pan = false): void {
    if (pan || this.tool === ToolType.Pan || this.spaceHeld || button === 1) {
      this.gesture = Gesture.Pan;
      this.panLast = { x: px, y: py };
      return;
    }

    if (this.tool === ToolType.Backstitch) {
      const node = this.snapNodeAt(px, py);
      if (!node) return;
      this.gesture = Gesture.Backstitch;
      this.backstitchStart = node;
      this.backstitchEnd = node;
      return;
    }

    if (this.tool === ToolType.Select) {
      const cell = this.cellAt(px, py);
      this.gesture = Gesture.Select;
      this.selectStart = cell;
      this.selectMoved = false;
      this.selection = { c0: cell.c, r0: cell.r, c1: cell.c + 1, r1: cell.r + 1 };
      this.requestRender();
      return;
    }

    this.gesture = Gesture.Draw;
    this.history.push(clone(this.doc));
    this.lastPainted = '';
    this.paintAt(px, py);
  }

  pointerMove(px: number, py: number): void {
    switch (this.gesture) {
      case Gesture.Pan:
        this.view.panBy(px - this.panLast.x, py - this.panLast.y);
        this.panLast = { x: px, y: py };
        this.requestRender();
        break;
      case Gesture.Draw:
        this.paintAt(px, py);
        break;
      case Gesture.Backstitch:
        this.backstitchEnd = this.snapNodeAt(px, py);
        this.requestRender();
        break;
      case Gesture.Select:
        this.updateSelection(px, py);
        break;
    }
  }

  pointerUp(): void {
    if (this.gesture === Gesture.Backstitch) {
      this.commitBackstitch();
    }
    if (this.gesture === Gesture.Select && !this.selectMoved) {
      // A click without dragging deselects.
      this.selection = null;
      this.requestRender();
    }
    this.gesture = Gesture.None;
    this.backstitchStart = null;
    this.backstitchEnd = null;
    this.selectStart = null;
    this.emit();
  }

  private cellAt(px: number, py: number): { c: number; r: number } {
    const p = this.view.screenToCell(px, py);
    return {
      c: clampInt(Math.floor(p.x), 0, this.doc.width - 1),
      r: clampInt(Math.floor(p.y), 0, this.doc.height - 1),
    };
  }

  private updateSelection(px: number, py: number): void {
    if (!this.selectStart) return;
    const cur = this.cellAt(px, py);
    if (cur.c !== this.selectStart.c || cur.r !== this.selectStart.r) this.selectMoved = true;
    this.selection = {
      c0: Math.min(this.selectStart.c, cur.c),
      r0: Math.min(this.selectStart.r, cur.r),
      c1: Math.max(this.selectStart.c, cur.c) + 1,
      r1: Math.max(this.selectStart.r, cur.r) + 1,
    };
    this.requestRender();
  }

  private snapNodeAt(px: number, py: number): { x: number; y: number } | null {
    const c = this.view.screenToCell(px, py);
    const x = snapNode(c.x);
    const y = snapNode(c.y);
    if (x < 0 || y < 0 || x > this.doc.width || y > this.doc.height) return null;
    return { x, y };
  }

  private commitBackstitch(): void {
    if (!this.backstitchStart || !this.backstitchEnd || !this.activeColorCode) return;
    const { x: x1, y: y1 } = this.backstitchStart;
    const { x: x2, y: y2 } = this.backstitchEnd;
    if (x1 === x2 && y1 === y2) return;
    const seg: BackstitchSegment = { x1, y1, x2, y2, colorCode: this.activeColorCode };
    this.history.push(clone(this.doc));
    this.doc.backstitches.push(seg);
    this.requestRender();
  }

  private paintAt(px: number, py: number): void {
    const c = this.view.screenToCell(px, py);
    const col = Math.floor(c.x);
    const row = Math.floor(c.y);
    if (!inBounds(this.doc, col, row)) return;

    const fx = c.x - col;
    const fy = c.y - row;
    const key = `${this.tool}:${col},${row}:${cornerFromFraction(fx, fy)}`;
    if (key === this.lastPainted) return;
    this.lastPainted = key;

    if (this.tool === ToolType.Eraser) {
      this.eraseAt(col, row, c.x, c.y);
      this.requestRender();
      return;
    }
    if (!this.activeColorCode) return;

    const corner = cornerFromFraction(fx, fy);
    const part = this.buildPart(corner);
    if (!part) return;
    this.placePart(col, row, part);
    this.requestRender();
  }

  private buildPart(corner: Corner): StitchPart | null {
    const colorCode = this.activeColorCode;
    if (!colorCode) return null;
    switch (this.tool) {
      case ToolType.Full:
        return { kind: StitchKind.Full, colorCode };
      case ToolType.Half:
        return { kind: StitchKind.Half, colorCode, diagonal: this.halfDiagonal };
      case ToolType.Quarter:
        return { kind: StitchKind.Quarter, colorCode, corner };
      case ToolType.ThreeQuarter:
        return {
          kind: StitchKind.ThreeQuarter,
          colorCode,
          corner,
          diagonal: diagonalForCorner(corner),
        };
      default:
        return null;
    }
  }

  private placePart(col: number, row: number, part: StitchPart): void {
    const key = cellKey(col, row);
    if (part.kind === StitchKind.Quarter) {
      const existing = (this.doc.cells[key] ?? []).filter(
        (p) => p.kind === StitchKind.Quarter && p.corner !== part.corner,
      );
      this.doc.cells[key] = [...existing, part];
    } else {
      this.doc.cells[key] = [part];
    }
  }

  private eraseAt(col: number, row: number, fx: number, fy: number): void {
    delete this.doc.cells[cellKey(col, row)];
    const threshold = 0.35;
    this.doc.backstitches = this.doc.backstitches.filter((s) => {
      const near =
        dist(fx, fy, s.x1, s.y1) < threshold || dist(fx, fy, s.x2, s.y2) < threshold;
      return !near;
    });
  }

  removeBackstitch(seg: BackstitchSegment): void {
    this.history.push(clone(this.doc));
    this.doc.backstitches = this.doc.backstitches.filter((s) => !segmentsEqual(s, seg));
    this.requestRender();
  }
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
