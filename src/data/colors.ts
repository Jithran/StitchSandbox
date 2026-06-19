import anchorRaw from './anchor-colors.json';
import cosmoRaw from './cosmo-colors.json';
import { DMC_COLORS } from './dmc';

export type Brand = 'DMC' | 'Anchor' | 'Cosmo' | 'Custom';
export type LibraryBrand = 'DMC' | 'Anchor' | 'Cosmo';

export interface ThreadColor {
  /** Canonical code as stored in a pattern document. */
  code: string;
  brand: Brand;
  /** Display number or label. */
  number: string;
  name: string;
  hex: string;
}

const ANCHOR_PREFIX = 'anchor:';
const COSMO_PREFIX = 'cosmo:';
const CUSTOM_PREFIX = 'custom:';

interface ConvertedRaw {
  number: string;
  name: string;
  dmc: string;
  hex: string;
}

const dmcByCode = new Map(DMC_COLORS.map((c) => [c.code, c]));
const anchorByNumber = new Map((anchorRaw as ConvertedRaw[]).map((a) => [a.number, a]));
const cosmoByNumber = new Map((cosmoRaw as ConvertedRaw[]).map((a) => [a.number, a]));

export const DMC_THREADS: ThreadColor[] = DMC_COLORS.map((c) => ({
  code: c.code,
  brand: 'DMC',
  number: c.code,
  name: c.name,
  hex: c.hex,
}));

export const ANCHOR_THREADS: ThreadColor[] = (anchorRaw as ConvertedRaw[]).map((a) => ({
  code: `${ANCHOR_PREFIX}${a.number}`,
  brand: 'Anchor',
  number: a.number,
  name: a.name,
  hex: `#${a.hex}`,
}));

export const COSMO_THREADS: ThreadColor[] = (cosmoRaw as ConvertedRaw[]).map((a) => ({
  code: `${COSMO_PREFIX}${a.number}`,
  brand: 'Cosmo',
  number: a.number,
  name: a.name,
  hex: `#${a.hex}`,
}));

/** Resolve any stored code to a hex color. Bare codes are treated as DMC for
 *  backward compatibility with patterns made before brands existed. */
export function colorHex(code: string): string {
  if (code.startsWith(ANCHOR_PREFIX)) {
    return hashHex(anchorByNumber.get(code.slice(ANCHOR_PREFIX.length))?.hex);
  }
  if (code.startsWith(COSMO_PREFIX)) {
    return hashHex(cosmoByNumber.get(code.slice(COSMO_PREFIX.length))?.hex);
  }
  if (code.startsWith(CUSTOM_PREFIX)) {
    return `#${code.slice(CUSTOM_PREFIX.length, CUSTOM_PREFIX.length + 6)}`;
  }
  return dmcByCode.get(code)?.hex ?? '#000000';
}

export function colorInfo(code: string): ThreadColor {
  if (code.startsWith(ANCHOR_PREFIX)) {
    const num = code.slice(ANCHOR_PREFIX.length);
    const a = anchorByNumber.get(num);
    return { code, brand: 'Anchor', number: num, name: a?.name ?? '', hex: hashHex(a?.hex) };
  }
  if (code.startsWith(COSMO_PREFIX)) {
    const num = code.slice(COSMO_PREFIX.length);
    const a = cosmoByNumber.get(num);
    return { code, brand: 'Cosmo', number: num, name: a?.name ?? '', hex: hashHex(a?.hex) };
  }
  if (code.startsWith(CUSTOM_PREFIX)) {
    const rest = code.slice(CUSTOM_PREFIX.length);
    const hex = `#${rest.slice(0, 6)}`;
    const label = rest.slice(7);
    return { code, brand: 'Custom', number: label, name: label, hex };
  }
  const c = dmcByCode.get(code);
  return { code, brand: 'DMC', number: code, name: c?.name ?? '', hex: c?.hex ?? '#000000' };
}

export function searchThreads(brand: LibraryBrand, query: string): ThreadColor[] {
  const list =
    brand === 'DMC' ? DMC_THREADS : brand === 'Anchor' ? ANCHOR_THREADS : COSMO_THREADS;
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => c.number.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
}

/** Build a self-contained custom color code that carries its own hex + label. */
export function customCode(hex: string, label: string): string {
  const clean = hex.replace('#', '').toLowerCase().padEnd(6, '0').slice(0, 6);
  const safeLabel = label.trim().replace(/:/g, ' ') || 'custom';
  return `${CUSTOM_PREFIX}${clean}:${safeLabel}`;
}

function hashHex(raw: string | undefined): string {
  if (!raw) return '#000000';
  return raw.startsWith('#') ? raw : `#${raw}`;
}
