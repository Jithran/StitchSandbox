import raw from './dmc-colors.json';

export interface DmcColor {
  code: string;
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
}

interface RawDmc {
  floss: string;
  description: string;
  r: number;
  g: number;
  b: number;
  hex: string;
}

// The source `hex` field is unreliable (some values are malformed), so we
// derive hex from the clean r/g/b integers instead.
function toHex(r: number, g: number, b: number): string {
  const part = (n: number) => n.toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export const DMC_COLORS: DmcColor[] = (raw as RawDmc[]).map((c) => ({
  code: c.floss,
  name: c.description,
  hex: toHex(c.r, c.g, c.b),
  r: c.r,
  g: c.g,
  b: c.b,
}));

const byCode = new Map(DMC_COLORS.map((c) => [c.code, c]));

export function getDmc(code: string): DmcColor | undefined {
  return byCode.get(code);
}

export function dmcHex(code: string): string {
  return byCode.get(code)?.hex ?? '#000000';
}

export function searchDmc(query: string): DmcColor[] {
  const q = query.trim().toLowerCase();
  if (!q) return DMC_COLORS;
  return DMC_COLORS.filter(
    (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
  );
}
