export interface Point {
  x: number;
  y: number;
}

/**
 * Maps between cell coordinates (one unit = one stitch) and screen pixels.
 * `scale` is pixels per cell; `originX/Y` is the screen pixel where cell (0,0)
 * starts.
 */
export class Viewport {
  scale = 16;
  originX = 0;
  originY = 0;

  private readonly minScale = 3;
  private readonly maxScale = 80;

  screenToCell(px: number, py: number): Point {
    return {
      x: (px - this.originX) / this.scale,
      y: (py - this.originY) / this.scale,
    };
  }

  cellToScreen(cx: number, cy: number): Point {
    return {
      x: cx * this.scale + this.originX,
      y: cy * this.scale + this.originY,
    };
  }

  /** Zoom by `factor`, keeping the cell under (px,py) fixed on screen. */
  zoomAt(px: number, py: number, factor: number): void {
    const before = this.screenToCell(px, py);
    this.scale = clamp(this.scale * factor, this.minScale, this.maxScale);
    const after = this.screenToCell(px, py);
    this.originX += (after.x - before.x) * this.scale;
    this.originY += (after.y - before.y) * this.scale;
  }

  panBy(dx: number, dy: number): void {
    this.originX += dx;
    this.originY += dy;
  }

  /** Center and fit a grid of the given size inside the viewport. */
  fit(width: number, height: number, viewW: number, viewH: number, padding = 40): void {
    const sx = (viewW - padding * 2) / width;
    const sy = (viewH - padding * 2) / height;
    this.scale = clamp(Math.min(sx, sy), this.minScale, this.maxScale);
    this.originX = (viewW - width * this.scale) / 2;
    this.originY = (viewH - height * this.scale) / 2;
  }
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
