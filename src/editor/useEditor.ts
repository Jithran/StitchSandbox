import { useCallback, useEffect, useRef, useState } from 'react';
import { renderThumbnail } from '../export/thumbnail';
import { EditorEngine, type EditorSnapshot } from '../engine/editor';
import { createDocument, type NewDocumentOptions } from '../model/document';
import {
  createProject,
  deleteProject,
  duplicateProject,
  getCurrentProjectId,
  listProjects,
  loadProjectDoc,
  migrateLegacyAutosave,
  renameProject,
  saveProject,
  setCurrentProjectId,
  type ProjectMeta,
} from '../model/library';
import { LengthUnit, type PatternDocument } from '../model/types';

const DEFAULT_DOC: NewDocumentOptions = {
  name: 'Untitled',
  width: 70,
  height: 70,
  count: 14,
  unit: LengthUnit.Centimeters,
};

export interface Library {
  ready: boolean;
  currentId: string | null;
  projects: ProjectMeta[];
  refresh: () => Promise<void>;
  open: (id: string) => Promise<void>;
  create: (opts: NewDocumentOptions) => Promise<void>;
  importDoc: (doc: PatternDocument) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useEditor(): { engine: EditorEngine; snap: EditorSnapshot; library: Library } {
  const [engine] = useState(() => new EditorEngine());

  const [snap, setSnap] = useState<EditorSnapshot>(() => engine.snapshot());
  const [ready, setReady] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const currentIdRef = useRef<string | null>(null);

  useEffect(() => engine.subscribe(setSnap), [engine]);

  const refresh = useCallback(async () => setProjects(await listProjects()), []);

  const setCurrent = useCallback((id: string) => {
    currentIdRef.current = id;
    setCurrentId(id);
    setCurrentProjectId(id);
  }, []);

  /** Persist the open project immediately (used before switching away). */
  const flush = useCallback(async () => {
    const id = currentIdRef.current;
    if (!id) return;
    const doc = engine.getDocument();
    await saveProject(id, doc, renderThumbnail(doc));
  }, [engine]);

  // Initial load: open the saved current project, else migrate the old autosave,
  // else seed a first project from the engine's default document.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let id = getCurrentProjectId();
      let doc: PatternDocument | null = id ? await loadProjectDoc(id) : null;
      if (!doc) {
        id = await migrateLegacyAutosave();
        doc = id ? await loadProjectDoc(id) : null;
      }
      if (!id || !doc) {
        doc = engine.getDocument();
        id = await createProject(doc, renderThumbnail(doc));
      }
      if (cancelled) return;
      if (doc !== engine.getDocument()) engine.loadDocument(doc);
      setCurrent(id);
      await refresh();
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [engine, refresh, setCurrent]);

  // Debounced autosave of the open project on every change.
  useEffect(() => {
    if (!ready || !currentIdRef.current) return;
    const id = currentIdRef.current;
    const t = setTimeout(() => {
      const doc = engine.getDocument();
      saveProject(id, doc, renderThumbnail(doc));
    }, 800);
    return () => clearTimeout(t);
  }, [snap, ready, engine]);

  const open = useCallback(
    async (id: string) => {
      await flush();
      const doc = await loadProjectDoc(id);
      if (!doc) return;
      engine.loadDocument(doc);
      setCurrent(id);
      await refresh();
    },
    [engine, flush, refresh, setCurrent],
  );

  const create = useCallback(
    async (opts: NewDocumentOptions) => {
      await flush();
      const doc = createDocument(opts);
      const id = await createProject(doc, null);
      engine.loadDocument(doc);
      setCurrent(id);
      await refresh();
    },
    [engine, flush, refresh, setCurrent],
  );

  const importDoc = useCallback(
    async (doc: PatternDocument) => {
      await flush();
      const id = await createProject(doc, renderThumbnail(doc));
      engine.loadDocument(doc);
      setCurrent(id);
      await refresh();
    },
    [engine, flush, refresh, setCurrent],
  );

  const duplicate = useCallback(
    async (id: string) => {
      if (id === currentIdRef.current) await flush();
      await duplicateProject(id);
      await refresh();
    },
    [flush, refresh],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      await renameProject(id, name);
      if (id === currentIdRef.current) engine.setName(name);
      await refresh();
    },
    [engine, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const isCurrent = id === currentIdRef.current;
      if (isCurrent) currentIdRef.current = null; // stop autosave resurrecting it
      await deleteProject(id);
      if (isCurrent) {
        const remaining = await listProjects();
        let nextDoc: PatternDocument;
        let nextId: string;
        if (remaining.length > 0) {
          nextId = remaining[0].id;
          nextDoc = (await loadProjectDoc(nextId)) ?? createDocument(DEFAULT_DOC);
        } else {
          nextDoc = createDocument(DEFAULT_DOC);
          nextId = await createProject(nextDoc, null);
        }
        engine.loadDocument(nextDoc);
        setCurrent(nextId);
      }
      await refresh();
    },
    [engine, refresh, setCurrent],
  );

  const library: Library = {
    ready,
    currentId,
    projects,
    refresh,
    open,
    create,
    importDoc,
    duplicate,
    rename,
    remove,
  };

  return { engine, snap, library };
}
