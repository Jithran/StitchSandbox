import { colorHex } from '../data/colors';
import { parseCellKey } from '../model/document';
import { type PatternDocument } from '../model/types';

/** A small preview of a design (cells as colored blocks) for the project
 *  browser, returned as a PNG data URL. Returns null when there's nothing yet. */
export function renderThumbnail(doc: PatternDocument, maxPx = 160): string | null {
  if (doc.width <= 0 || doc.height <= 0) return null;
  if (Object.keys(doc.cells).length === 0 && doc.backstitches.length === 0) return null;

  const scale = Math.max(1, Math.floor(maxPx / Math.max(doc.width, doc.height)));
  const w = doc.width * scale;
  const h = doc.height * scale;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  for (const [key, parts] of Object.entries(doc.cells)) {
    const part = parts[parts.length - 1];
    if (!part) continue;
    const [c, r] = parseCellKey(key);
    ctx.fillStyle = colorHex(part.colorCode);
    ctx.fillRect(c * scale, r * scale, scale, scale);
  }

  return canvas.toDataURL('image/png');
}
