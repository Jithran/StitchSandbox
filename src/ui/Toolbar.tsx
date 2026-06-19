import { type ReactNode } from 'react';
import { EditorEngine, type EditorSnapshot } from '../engine/editor';
import { Diagonal, ToolType } from '../model/types';

function EraserIcon(): React.ReactElement {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  );
}

interface Props {
  engine: EditorEngine;
  snap: EditorSnapshot;
  onNew: () => void;
  onExport: () => void;
  onImport: () => void;
  onExportChart: () => void;
  onResize: () => void;
  onCrop: () => void;
  onText: () => void;
}

const TOOLS: Array<{ tool: ToolType; label: ReactNode; title: string; key: string }> = [
  { tool: ToolType.Full, label: '■', title: 'Full stitch', key: '1' },
  { tool: ToolType.Half, label: '◣', title: 'Half stitch', key: '2' },
  { tool: ToolType.Quarter, label: '¼', title: 'Quarter stitch', key: '3' },
  { tool: ToolType.Backstitch, label: '╲', title: 'Backstitch', key: '4' },
  { tool: ToolType.Eraser, label: <EraserIcon />, title: 'Eraser', key: 'E' },
  { tool: ToolType.Pan, label: '✋', title: 'Pan', key: 'H' },
  { tool: ToolType.Select, label: '⬚', title: 'Select (rectangle)', key: 'S' },
];

export function Toolbar({
  engine,
  snap,
  onNew,
  onExport,
  onImport,
  onExportChart,
  onResize,
  onCrop,
  onText,
}: Props): React.ReactElement {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={onNew}>New</button>
        <button onClick={onExport} title="Save as .json">Save</button>
        <button onClick={onImport}>Open</button>
        <button onClick={onExportChart} title="Export chart to PDF">Chart →</button>
      </div>

      <div className="toolbar-group">
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            title={`${t.title} (${t.key})`}
            className={snap.tool === t.tool ? 'active' : ''}
            onClick={() => engine.setTool(t.tool)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {snap.tool === ToolType.Half && (
        <div className="toolbar-group">
          <button
            className={snap.halfDiagonal === Diagonal.Slash ? 'active' : ''}
            onClick={() => engine.setHalfDiagonal(Diagonal.Slash)}
            title="Slash /"
          >
            /
          </button>
          <button
            className={snap.halfDiagonal === Diagonal.Backslash ? 'active' : ''}
            onClick={() => engine.setHalfDiagonal(Diagonal.Backslash)}
            title="Backslash \"
          >
            \
          </button>
        </div>
      )}

      {snap.tool === ToolType.Select && (
        <div className="toolbar-group" title="Selection">
          <button disabled={!snap.hasSelection} onClick={() => engine.mirrorSelectionH()} title="Mirror horizontal">
            ⇋
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.mirrorSelectionV()} title="Mirror vertical">
            ⥯
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.rotateSelectionCCW()} title="Rotate left">
            ⟲
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.rotateSelectionCW()} title="Rotate right">
            ⟳
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.copySelection()} title="Copy (Ctrl+C)">
            ⧉
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.cutSelection()} title="Cut & move (Ctrl+X)">
            ✂
          </button>
          <button disabled={!snap.hasClipboard} onClick={() => engine.paste()} title="Paste — then position and confirm (Ctrl+V)">
            ▣
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.deleteSelection()} title="Delete (Del)">
            ⌫
          </button>
        </div>
      )}

      <div className="toolbar-group">
        <button disabled={!snap.canUndo} onClick={() => engine.undo()} title="Undo (Ctrl+Z)">
          ↶
        </button>
        <button disabled={!snap.canRedo} onClick={() => engine.redo()} title="Redo (Ctrl+Y)">
          ↷
        </button>
      </div>

      <div className="toolbar-group" title="Move whole design">
        <button onClick={() => engine.shiftDesign(0, -1)}>↑</button>
        <button onClick={() => engine.shiftDesign(-1, 0)}>←</button>
        <button onClick={() => engine.shiftDesign(1, 0)}>→</button>
        <button onClick={() => engine.shiftDesign(0, 1)}>↓</button>
      </div>

      <div className="toolbar-group">
        <button onClick={() => engine.zoom(1.2)} title="Zoom in">＋</button>
        <button onClick={() => engine.zoom(1 / 1.2)} title="Zoom out">－</button>
        <button onClick={() => engine.fit()} title="Fit pattern to screen (F)">⤢ Fit</button>
      </div>

      <div className="toolbar-group">
        <button
          className={snap.realistic ? 'active' : ''}
          onClick={() => engine.toggleRealistic()}
          title="Realistic stitches"
        >
          Stitches
        </button>
        <button
          className={snap.showGrid ? 'active' : ''}
          onClick={() => engine.toggleGrid()}
          title="Toggle grid"
        >
          Grid
        </button>
      </div>

      <div className="toolbar-group" title="Canvas size">
        <button onClick={onResize} title="Resize canvas">Resize…</button>
        <button onClick={onCrop} title="Crop to design">Crop…</button>
        <button onClick={onText} title="Add text as stitches">Text…</button>
      </div>
    </div>
  );
}
