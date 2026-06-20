import { loadAutosave, clearAutosave } from './storage';
import { usedColors } from './document';
import { type PatternDocument } from './types';

// Local project library, kept entirely in the browser via IndexedDB. Metadata
// (for the project browser) and the heavy cell data live in separate stores so
// listing stays light. The id of the open project is held in localStorage for a
// synchronous read at startup.

const DB_NAME = 'stitchsandbox';
const DB_VERSION = 1;
const META_STORE = 'projectMeta';
const DOC_STORE = 'projectDocs';
const CURRENT_KEY = 'stitchsandbox:currentProject';

export interface ProjectMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  count: number;
  colorCount: number;
  createdAt: number;
  updatedAt: number;
  thumbnail: string | null;
}

interface DocRecord {
  id: string;
  doc: PatternDocument;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DOC_STORE)) db.createObjectStore(DOC_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function request<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = run(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

function getMeta(id: string): Promise<ProjectMeta | undefined> {
  return request(META_STORE, 'readonly', (s) => s.get(id));
}

function metaFromDoc(
  id: string,
  doc: PatternDocument,
  thumbnail: string | null,
  createdAt: number,
): ProjectMeta {
  return {
    id,
    name: doc.name,
    width: doc.width,
    height: doc.height,
    count: doc.count,
    colorCount: usedColors(doc).size,
    createdAt,
    updatedAt: Date.now(),
    thumbnail,
  };
}

function writeBoth(meta: ProjectMeta, docRec: DocRecord): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction([META_STORE, DOC_STORE], 'readwrite');
        tx.objectStore(META_STORE).put(meta);
        tx.objectStore(DOC_STORE).put(docRec);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export function listProjects(): Promise<ProjectMeta[]> {
  return request<ProjectMeta[]>(META_STORE, 'readonly', (s) => s.getAll()).then((all) =>
    all.sort((a, b) => b.updatedAt - a.updatedAt),
  );
}

export function loadProjectDoc(id: string): Promise<PatternDocument | null> {
  return request<DocRecord | undefined>(DOC_STORE, 'readonly', (s) => s.get(id)).then(
    (rec) => rec?.doc ?? null,
  );
}

/** Upsert a project: writes both its metadata and its document. Preserves the
 *  original createdAt and falls back to the existing thumbnail when none given. */
export async function saveProject(
  id: string,
  doc: PatternDocument,
  thumbnail?: string | null,
): Promise<void> {
  const existing = await getMeta(id);
  const createdAt = existing?.createdAt ?? Date.now();
  const meta = metaFromDoc(id, doc, thumbnail ?? existing?.thumbnail ?? null, createdAt);
  await writeBoth(meta, { id, doc });
}

export async function createProject(doc: PatternDocument, thumbnail?: string | null): Promise<string> {
  const id = crypto.randomUUID();
  await saveProject(id, doc, thumbnail ?? null);
  return id;
}

export async function duplicateProject(id: string): Promise<string | null> {
  const doc = await loadProjectDoc(id);
  const meta = await getMeta(id);
  if (!doc || !meta) return null;
  const copy: PatternDocument = { ...structuredClone(doc), name: `${doc.name} copy` };
  return createProject(copy, meta.thumbnail);
}

export async function renameProject(id: string, name: string): Promise<void> {
  const doc = await loadProjectDoc(id);
  const meta = await getMeta(id);
  if (!doc || !meta) return;
  doc.name = name;
  await writeBoth({ ...meta, name, updatedAt: Date.now() }, { id, doc });
}

export function deleteProject(id: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction([META_STORE, DOC_STORE], 'readwrite');
        tx.objectStore(META_STORE).delete(id);
        tx.objectStore(DOC_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export function getCurrentProjectId(): string | null {
  return localStorage.getItem(CURRENT_KEY);
}

export function setCurrentProjectId(id: string): void {
  localStorage.setItem(CURRENT_KEY, id);
}

/** One-time import of the old single-document autosave into the library. Returns
 *  the new project's id, or null when there was nothing to migrate. */
export async function migrateLegacyAutosave(): Promise<string | null> {
  const doc = loadAutosave();
  if (!doc) return null;
  const id = await createProject(doc, null);
  clearAutosave();
  return id;
}
