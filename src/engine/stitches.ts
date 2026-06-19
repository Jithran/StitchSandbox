import { Corner, Diagonal } from '../model/types';

/** Which corner a fractional position (0..1, 0..1) inside a cell belongs to. */
export function cornerFromFraction(fx: number, fy: number): Corner {
  const left = fx < 0.5;
  const top = fy < 0.5;
  if (top && left) return Corner.TopLeft;
  if (top && !left) return Corner.TopRight;
  if (!top && left) return Corner.BottomLeft;
  return Corner.BottomRight;
}

/** The diagonal whose line passes through the given corner. */
export function diagonalForCorner(corner: Corner): Diagonal {
  return corner === Corner.TopLeft || corner === Corner.BottomRight
    ? Diagonal.Backslash
    : Diagonal.Slash;
}

/** Snap a cell-unit coordinate to the nearest half-cell node. */
export function snapNode(value: number): number {
  return Math.round(value * 2) / 2;
}

/** Local corner coordinates (0..1) for a corner. */
export function cornerPoint(corner: Corner): [number, number] {
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
