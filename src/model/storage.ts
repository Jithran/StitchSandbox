import { deserialize, serialize } from './document';
import { type PatternDocument } from './types';

// Legacy single-document autosave key. The project library (see ./library)
// migrates this into its first project, after which the key is removed.
const AUTOSAVE_KEY = 'stitchsandbox:autosave';

export function loadAutosave(): PatternDocument | null {
  const json = localStorage.getItem(AUTOSAVE_KEY);
  if (!json) return null;
  try {
    return deserialize(json);
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

export function exportToFile(doc: PatternDocument): void {
  const blob = new Blob([serialize(doc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitize(doc.name)}.stitch.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromFile(file: File): Promise<PatternDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(deserialize(String(reader.result)));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function sanitize(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'pattern';
}
