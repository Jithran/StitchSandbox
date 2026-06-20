import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import './App.css';
import { colorHex } from './data/colors';
import { EditorCanvas } from './editor/EditorCanvas';
import { useEditor } from './editor/useEditor';
import { type EditorSnapshot } from './engine/editor';
import { physicalSize } from './model/document';
import { exportToFile, importFromFile } from './model/storage';
import { ToolType } from './model/types';
import { CropDialog, ResizeDialog } from './ui/CanvasDialogs';
import { AboutDialog, HelpDialog } from './ui/InfoDialogs';
import { InstallPrompt } from './ui/InstallPrompt';
import { NewProjectDialog } from './ui/NewProjectDialog';
import { Palette } from './ui/Palette';
import { ProjectBrowser } from './ui/ProjectBrowser';
import { PwaReloadPrompt } from './ui/PwaReloadPrompt';
import { SelectionMenu } from './ui/SelectionMenu';
import { TextDialog } from './ui/TextDialog';
import { Toolbar } from './ui/Toolbar';

const ExportDialog = lazy(() =>
  import('./ui/ExportDialog').then((m) => ({ default: m.ExportDialog })),
);

const TOOL_KEYS: Record<string, ToolType> = {
  '1': ToolType.Full,
  '2': ToolType.Half,
  '3': ToolType.Quarter,
  '4': ToolType.Backstitch,
  e: ToolType.Eraser,
  i: ToolType.Picker,
  r: ToolType.Replace,
  h: ToolType.Pan,
  s: ToolType.Select,
};

export default function App(): React.ReactElement {
  const { engine, snap, library } = useEditor();
  const [showNew, setShowNew] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
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
      if (!e.ctrlKey && !e.metaKey && !isTyping(e.target) && !engine.isPasting()) {
        const tool = TOOL_KEYS[e.key.toLowerCase()];
        if (tool) engine.setTool(tool);
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

  // Every project autosaves to its own slot, so New/Open never discard work.
  const openFilePicker = () => fileInput.current?.click();

  return (
    <div className="app">
      <header className="app-bar">
        <span className="brand">
          <img className="brand-logo" src="/favicon.svg" alt="" width="26" height="26" />
          <strong className="brand-name">
            Stitch<span className="brand-accent">Sandbox</span>
          </strong>
        </span>
        <input
          className="doc-name"
          value={snap.name}
          size={Math.max(snap.name.length, 4)}
          title="Rename pattern"
          aria-label="Pattern name"
          onChange={(e) => engine.setName(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={(e) => {
            if (!e.target.value.trim()) engine.setName('Untitled');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        <span className="doc-meta">
          {doc.width}×{doc.height} · {doc.count}-count · {size.width.toFixed(1)}×
          {size.height.toFixed(1)} {doc.unit}
        </span>
        <div className="app-bar-actions">
          <AutosaveStatus snap={snap} />
          <button onClick={() => setShowHelp(true)}>Help</button>
          <button onClick={() => setShowAbout(true)}>About</button>
        </div>
      </header>

      <Toolbar
        engine={engine}
        snap={snap}
        onNew={() => setShowNew(true)}
        onProjects={() => {
          setShowBrowser(true);
          library.prepare();
        }}
        onExport={() => exportToFile(engine.getDocument())}
        onImport={openFilePicker}
        onExportChart={() => setShowExport(true)}
        onResize={() => setShowResize(true)}
        onCrop={() => setShowCrop(true)}
        onText={() => setShowText(true)}
      />

      <div className="workspace">
        <Palette engine={engine} snap={snap} />
        <div className="canvas-host">
          <EditorCanvas
            engine={engine}
            tool={snap.tool}
            pasting={snap.isPasting}
            onContextMenu={(x, y) => setMenu({ x, y })}
          />
        </div>
      </div>

      {menu && (
        <SelectionMenu
          engine={engine}
          x={menu.x}
          y={menu.y}
          fillColor={snap.activeColorCode ? colorHex(snap.activeColorCode) : null}
          onClose={() => setMenu(null)}
        />
      )}

      {showBrowser && (
        <ProjectBrowser
          projects={library.projects}
          currentId={library.currentId}
          onOpen={(id) => {
            library.open(id);
            setShowBrowser(false);
          }}
          onNew={() => {
            setShowBrowser(false);
            setShowNew(true);
          }}
          onDuplicate={(id) => library.duplicate(id)}
          onRename={(id, name) => library.rename(id, name)}
          onDelete={(id) => library.remove(id)}
          onClose={() => setShowBrowser(false)}
        />
      )}

      {showNew && (
        <NewProjectDialog
          onClose={() => setShowNew(false)}
          onCreate={(opts) => {
            library.create(opts);
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

      {showText && (
        <TextDialog
          activeColorCode={snap.activeColorCode}
          onClose={() => setShowText(false)}
          onPlace={(frag) => {
            engine.floatFragment(frag);
            setShowText(false);
          }}
        />
      )}

      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}

      <InstallPrompt />
      <PwaReloadPrompt />

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            await library.importDoc(await importFromFile(file));
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

/** Reassures that work persists in the browser; the actual write happens in
 *  useEditor on every snapshot. Briefly flashes "Saving…" on each change. */
function AutosaveStatus({ snap }: { snap: EditorSnapshot }): React.ReactElement {
  const [saving, setSaving] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaving(true);
    const t = setTimeout(() => setSaving(false), 700);
    return () => clearTimeout(t);
  }, [snap]);
  return (
    <span
      className={`autosave ${saving ? 'saving' : ''}`}
      title="Projects are saved automatically in this browser, not on a server"
    >
      {saving ? 'Saving…' : 'Saved'} <span className="autosave-where">in this browser</span>
    </span>
  );
}
