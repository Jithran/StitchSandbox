import { Corner, Diagonal, type StitchPart } from '../model/types';

/** The big half-cell triangle filled when a half stitch names a filled corner. */
const HALF_TRIANGLE: Record<Corner, Array<[number, number]>> = {
  [Corner.TopLeft]: [
    [0, 0],
    [1, 0],
    [0, 1],
  ],
  [Corner.BottomRight]: [
    [1, 1],
    [0, 1],
    [1, 0],
  ],
  [Corner.TopRight]: [
    [1, 0],
    [1, 1],
    [0, 0],
  ],
  [Corner.BottomLeft]: [
    [0, 1],
    [0, 0],
    [1, 1],
  ],
};

/** Whether a half stitch lies on the slash (/) diagonal. */
export function halfIsSlash(part: StitchPart): boolean {
  if (part.corner) return part.corner === Corner.TopLeft || part.corner === Corner.BottomRight;
  return part.diagonal !== Diagonal.Backslash;
}

/**
 * Unit-square triangle a half stitch fills. An explicit filled corner (set by
 * text rasterization) picks any of the four corner triangles; without one it
 * falls back to the legacy bottom triangle for the manual half tool.
 */
export function halfTriangleUnit(part: StitchPart): Array<[number, number]> {
  if (part.corner) return HALF_TRIANGLE[part.corner];
  return part.diagonal === Diagonal.Backslash
    ? [
        [0, 0],
        [1, 1],
        [0, 1],
      ]
    : [
        [0, 1],
        [1, 1],
        [1, 0],
      ];
}

/** Endpoints (unit square) of a half stitch's diagonal line. */
export function halfLineUnit(part: StitchPart): [[number, number], [number, number]] {
  return halfIsSlash(part)
    ? [
        [0, 1],
        [1, 0],
      ]
    : [
        [0, 0],
        [1, 1],
      ];
}

/** Centroid (unit square) of the filled half triangle, for symbol placement. */
export function halfCentroidUnit(part: StitchPart): [number, number] {
  const t = halfTriangleUnit(part);
  return [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3];
}

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
