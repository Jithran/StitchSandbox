import { useEffect, useRef, useState } from 'react';
import { EditorEngine, type EditorSnapshot } from '../engine/editor';
import { loadAutosave, saveAutosave } from '../model/storage';

export function useEditor(): { engine: EditorEngine; snap: EditorSnapshot } {
  const engineRef = useRef<EditorEngine | null>(null);
  if (!engineRef.current) {
    const saved = loadAutosave();
    engineRef.current = new EditorEngine(saved ?? undefined);
  }
  const engine = engineRef.current;
  const [snap, setSnap] = useState<EditorSnapshot>(() => engine.snapshot());

  useEffect(() => engine.subscribe(setSnap), [engine]);

  // Best-effort autosave after every committed gesture.
  useEffect(() => {
    saveAutosave(engine.getDocument());
  }, [engine, snap]);

  return { engine, snap };
}
