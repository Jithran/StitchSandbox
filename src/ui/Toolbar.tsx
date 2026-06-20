import { useEffect, useRef, useState, type ReactNode } from 'react';
import { colorHex, colorInfo } from '../data/colors';
import { EditorEngine, type EditorSnapshot } from '../engine/editor';
import { Diagonal, ToolType } from '../model/types';
import {
  ChartIcon,
  CopyIcon,
  CutIcon,
  EraserIcon,
  ExportIcon,
  FitIcon,
  ImportIcon,
  MirrorHIcon,
  MirrorVIcon,
  MoreIcon,
  MoveIcon,
  NewIcon,
  PanIcon,
  PasteIcon,
  RedoIcon,
  RotateCCWIcon,
  RotateCWIcon,
  SelectIcon,
  TrashIcon,
  UndoIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './icons';

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
  { tool: ToolType.Pan, label: <PanIcon />, title: 'Pan', key: 'H' },
  { tool: ToolType.Select, label: <SelectIcon />, title: 'Select (rectangle)', key: 'S' },
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
        <button onClick={onNew} title="New pattern" aria-label="New pattern">
          <NewIcon />
          <span className="btn-label">New</span>
        </button>
        <button onClick={onExport} title="Download as .json" aria-label="Export to file">
          <ExportIcon />
          <span className="btn-label">Export</span>
        </button>
        <button onClick={onImport} title="Open a .json file" aria-label="Import from file">
          <ImportIcon />
          <span className="btn-label">Import</span>
        </button>
        <button onClick={onExportChart} title="Export chart to PDF" aria-label="Export chart to PDF">
          <ChartIcon />
          <span className="btn-label">Chart</span>
        </button>
      </div>

      <div className="toolbar-group">
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            title={`${t.title} (${t.key})`}
            aria-label={t.title}
            aria-pressed={snap.tool === t.tool}
            className={`tool-btn ${snap.tool === t.tool ? 'active' : ''}`}
            onClick={() => engine.setTool(t.tool)}
          >
            {t.label}
          </button>
        ))}
        <ActiveColorChip code={snap.activeColorCode} />
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
          <button disabled={!snap.hasSelection} onClick={() => engine.mirrorSelectionH()} title="Mirror horizontal" aria-label="Mirror horizontal">
            <MirrorHIcon />
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.mirrorSelectionV()} title="Mirror vertical" aria-label="Mirror vertical">
            <MirrorVIcon />
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.rotateSelectionCCW()} title="Rotate left" aria-label="Rotate left">
            <RotateCCWIcon />
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.rotateSelectionCW()} title="Rotate right" aria-label="Rotate right">
            <RotateCWIcon />
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.copySelection()} title="Copy (Ctrl+C)" aria-label="Copy">
            <CopyIcon />
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.cutSelection()} title="Cut & move (Ctrl+X)" aria-label="Cut and move">
            <CutIcon />
          </button>
          <button disabled={!snap.hasClipboard} onClick={() => engine.paste()} title="Paste — then position and confirm (Ctrl+V)" aria-label="Paste">
            <PasteIcon />
          </button>
          <button disabled={!snap.hasSelection} onClick={() => engine.deleteSelection()} title="Delete (Del)" aria-label="Delete selection">
            <TrashIcon />
          </button>
        </div>
      )}

      <div className="toolbar-group">
        <button disabled={!snap.canUndo} onClick={() => engine.undo()} title="Undo (Ctrl+Z)" aria-label="Undo">
          <UndoIcon />
        </button>
        <button disabled={!snap.canRedo} onClick={() => engine.redo()} title="Redo (Ctrl+Y)" aria-label="Redo">
          <RedoIcon />
        </button>
      </div>

      <div className="toolbar-group">
        <button onClick={() => engine.zoom(1.2)} title="Zoom in" aria-label="Zoom in">
          <ZoomInIcon />
        </button>
        <button onClick={() => engine.zoom(1 / 1.2)} title="Zoom out" aria-label="Zoom out">
          <ZoomOutIcon />
        </button>
        <button onClick={() => engine.fit()} title="Fit pattern to screen (F)" aria-label="Fit to screen">
          <FitIcon />
          <span className="btn-label">Fit</span>
        </button>
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

      <MoreMenu engine={engine} onResize={onResize} onCrop={onCrop} onText={onText} />
    </div>
  );
}

function ActiveColorChip({ code }: { code: string | null }): React.ReactElement {
  if (!code) {
    return (
      <span className="active-color empty" title="No color selected — pick one from the palette">
        <span className="active-color-dot" />
      </span>
    );
  }
  const info = colorInfo(code);
  return (
    <span
      className="active-color"
      title={`Drawing with ${info.brand} ${info.number}${info.name ? ` — ${info.name}` : ''}`}
    >
      <span className="active-color-dot" style={{ background: colorHex(code) }} />
      <span className="active-color-code">{info.number}</span>
    </span>
  );
}

function MoreMenu({
  engine,
  onResize,
  onCrop,
  onText,
}: {
  engine: EditorEngine;
  onResize: () => void;
  onCrop: () => void;
  onText: () => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const pick = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div className="toolbar-group more-menu" ref={ref}>
      <button
        className={open ? 'active' : ''}
        onClick={() => setOpen((v) => !v)}
        title="More tools"
        aria-label="More tools"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreIcon />
        <span className="btn-label">More</span>
      </button>

      {open && (
        <div className="more-popover" role="menu">
          <div className="more-section">
            <span className="more-heading">
              <MoveIcon size={14} /> Move design
            </span>
            <div className="move-pad">
              <button onClick={() => engine.shiftDesign(0, -1)} title="Move up" aria-label="Move design up">↑</button>
              <button onClick={() => engine.shiftDesign(-1, 0)} title="Move left" aria-label="Move design left">←</button>
              <button onClick={() => engine.shiftDesign(1, 0)} title="Move right" aria-label="Move design right">→</button>
              <button onClick={() => engine.shiftDesign(0, 1)} title="Move down" aria-label="Move design down">↓</button>
            </div>
          </div>
          <div className="more-section">
            <button className="more-item" onClick={() => pick(onResize)}>Resize canvas…</button>
            <button className="more-item" onClick={() => pick(onCrop)}>Crop to design…</button>
            <button className="more-item" onClick={() => pick(onText)}>Add text…</button>
          </div>
        </div>
      )}
    </div>
  );
}
