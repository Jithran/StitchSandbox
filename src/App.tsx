import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import './App.css';
import { EditorCanvas } from './editor/EditorCanvas';
import { useEditor } from './editor/useEditor';
import { physicalSize } from './model/document';
import { exportToFile, importFromFile } from './model/storage';
import { CropDialog, ResizeDialog } from './ui/CanvasDialogs';
import { NewProjectDialog } from './ui/NewProjectDialog';
import { Palette } from './ui/Palette';
import { Toolbar } from './ui/Toolbar';

const ExportDialog = lazy(() =>
  import('./ui/ExportDialog').then((m) => ({ default: m.ExportDialog })),
);

export default function App(): React.ReactElement {
  const { engine, snap } = useEditor();
  const [showNew, setShowNew] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        engine.setSpaceHeld(true);
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) engine.redo();
        else engine.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        engine.redo();
      }
      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !isTyping(e.target)) {
        engine.fit();
      }
      if (engine.isPasting() && !isTyping(e.target)) {
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        if (moves[e.key]) {
          e.preventDefault();
          engine.movePaste(...moves[e.key]);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          engine.commitPaste();
          return;
        }
        if (e.key === 'Escape') {
          engine.cancelPaste();
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !isTyping(e.target)) {
        engine.copySelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && !isTyping(e.target)) {
        engine.cutSelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !isTyping(e.target)) {
        engine.paste();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping(e.target)) {
        engine.deleteSelection();
      }
      if (e.key === 'Escape') engine.clearSelection();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') engine.setSpaceHeld(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [engine]);

  const doc = engine.getDocument();
  const size = physicalSize(doc);

  return (
    <div className="app">
      <header className="app-bar">
        <strong>StitchSandbox</strong>
        <span className="doc-name">{snap.name}</span>
        <span className="doc-meta">
          {doc.width}×{doc.height} · {doc.count}-count · {size.width.toFixed(1)}×
          {size.height.toFixed(1)} {doc.unit}
        </span>
      </header>

      <Toolbar
        engine={engine}
        snap={snap}
        onNew={() => setShowNew(true)}
        onExport={() => exportToFile(engine.getDocument())}
        onImport={() => fileInput.current?.click()}
        onExportChart={() => setShowExport(true)}
        onResize={() => setShowResize(true)}
        onCrop={() => setShowCrop(true)}
      />

      <div className="workspace">
        <Palette engine={engine} snap={snap} />
        <div className="canvas-host">
          <EditorCanvas engine={engine} tool={snap.tool} pasting={snap.isPasting} />
        </div>
      </div>

      {showNew && (
        <NewProjectDialog
          onClose={() => setShowNew(false)}
          onCreate={(opts) => {
            engine.newDocument(opts);
            setShowNew(false);
          }}
        />
      )}

      {showExport && (
        <Suspense fallback={null}>
          <ExportDialog doc={engine.getDocument()} onClose={() => setShowExport(false)} />
        </Suspense>
      )}

      {showResize && (
        <ResizeDialog
          doc={engine.getDocument()}
          onClose={() => setShowResize(false)}
          onApply={(w, h, ax, ay) => {
            engine.resizeCanvasTo(w, h, ax, ay);
            setShowResize(false);
          }}
        />
      )}

      {showCrop && (
        <CropDialog
          doc={engine.getDocument()}
          onClose={() => setShowCrop(false)}
          onApply={(border) => {
            engine.cropCanvas(border);
            setShowCrop(false);
          }}
        />
      )}

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            engine.loadDocument(await importFromFile(file));
          } catch {
            alert('Could not read that pattern file.');
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
