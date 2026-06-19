export enum StitchKind {
  Full = 'full',
  Half = 'half',
  Quarter = 'quarter',
  ThreeQuarter = 'threeQuarter',
}

export enum Diagonal {
  Slash = 'slash', // bottom-left to top-right (/)
  Backslash = 'backslash', // top-left to bottom-right (\)
}

export enum Corner {
  TopLeft = 'TL',
  TopRight = 'TR',
  BottomLeft = 'BL',
  BottomRight = 'BR',
}

export enum ToolType {
  Full = 'full',
  Half = 'half',
  Quarter = 'quarter',
  ThreeQuarter = 'threeQuarter',
  Backstitch = 'backstitch',
  Eraser = 'eraser',
  Pan = 'pan',
  Select = 'select',
}

export enum LengthUnit {
  Centimeters = 'cm',
  Inches = 'inch',
}

/** A single placed stitch within one cell. */
export interface StitchPart {
  kind: StitchKind;
  colorCode: string;
  /** Half + ThreeQuarter: orientation of the long diagonal. */
  diagonal?: Diagonal;
  /** Quarter + ThreeQuarter: which corner the quarter points to. */
  corner?: Corner;
}

/**
 * Backstitch lives on its own layer as straight segments between sub-grid
 * nodes. Endpoints are in cell units snapped to 0.5, so corner-to-corner,
 * corner-to-edge-midpoint and midpoint-to-midpoint are all expressible.
 */
export interface BackstitchSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  colorCode: string;
}

export interface PatternDocument {
  name: string;
  /** Grid size in stitches. */
  width: number;
  height: number;
  /** Fabric count: stitches per inch (e.g. 14, 18, 28). */
  count: number;
  unit: LengthUnit;
  /** "col,row" -> stitch parts in that cell. */
  cells: Record<string, StitchPart[]>;
  backstitches: BackstitchSegment[];
  /** DMC codes selected into the working palette. */
  palette: string[];
}

export const SCHEMA_VERSION = 1;

export interface SerializedDocument {
  schema: number;
  document: PatternDocument;
}
