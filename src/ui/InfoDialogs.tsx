import { Modal } from './Modal';

interface Props {
  onClose: () => void;
}

export function HelpDialog({ onClose }: Props): React.ReactElement {
  return (
    <Modal className="info-dialog" onClose={onClose}>
      <div className="modal-header">
        <h2>Help</h2>
        <button onClick={onClose}>✕</button>
      </div>

        <div className="info-body">
          <h3>Getting started</h3>
          <p>
            Use <strong>New</strong> to start a pattern: set the grid size in stitches and/or the
            physical size, and pick a fabric count. Add colors with <strong>+ Color</strong> in the
            palette, then draw on the grid.
          </p>

          <h3>Stitch tools</h3>
          <ul>
            <li><strong>Full</strong> (1), <strong>Half</strong> (2), <strong>Quarter</strong> (3) —
              for the half tool, choose the diagonal in the extra toolbar group.</li>
            <li><strong>Backstitch</strong> (4) — drag between grid points; snaps to half-cell nodes
              for corner-to-corner and edge-midpoint lines.</li>
            <li><strong>Eraser</strong> (E), <strong>Select</strong> (S), <strong>Pan</strong> (H).</li>
          </ul>

          <h3>Navigating</h3>
          <ul>
            <li>Scroll to zoom; <strong>F</strong> fits the pattern to the screen.</li>
            <li>Pan by holding <strong>Space</strong> or <strong>Ctrl/⌘</strong> and dragging, or with
              the middle mouse button.</li>
            <li>On touch: one finger draws, two fingers pinch to zoom and pan.</li>
          </ul>

          <h3>Selection, copy &amp; move</h3>
          <ul>
            <li>With the <strong>Select</strong> tool, drag a rectangle. Then mirror, rotate, copy,
              cut or delete it from the toolbar.</li>
            <li><strong>Copy</strong> (Ctrl/⌘+C) / <strong>Cut</strong> (Ctrl/⌘+X) / <strong>Paste</strong>
              (Ctrl/⌘+V) show a floating preview — nudge it with the arrow keys or drag it, then
              confirm with <strong>Enter</strong> or the green checkmark (<strong>Esc</strong> cancels).</li>
          </ul>

          <h3>Canvas</h3>
          <ul>
            <li>Move the whole design with the arrow buttons.</li>
            <li><strong>Resize…</strong> changes the canvas with a 9-point anchor; <strong>Crop…</strong>
              trims to the design with an optional border.</li>
            <li><strong>Text…</strong> turns typed text into stitches; place it like a paste.</li>
          </ul>

          <h3>Export &amp; saving</h3>
          <ul>
            <li><strong>Chart →</strong> exports a print-ready PDF (black-and-white symbols or color),
              with a legend and tiled A4 pages. It is Pattern Keeper compatible.</li>
            <li><strong>Save</strong> / <strong>Open</strong> export and import the pattern as JSON.
              Your work also autosaves in the browser.</li>
          </ul>
        </div>
    </Modal>
  );
}

export function AboutDialog({ onClose }: Props): React.ReactElement {
  return (
    <Modal className="info-dialog" onClose={onClose}>
      <div className="modal-header">
        <h2>About StitchSandbox</h2>
        <button onClick={onClose}>✕</button>
      </div>

        <div className="info-body">
          <p>
            <strong>StitchSandbox</strong> is a browser-based cross-stitch pattern designer. Design on
            a grid with DMC floss colors and full, half, quarter, three-quarter and backstitches, then
            export a print-ready chart that imports into Pattern Keeper.
          </p>
          <p>Version {__APP_VERSION__}</p>
          <p>Made by <strong>Jithran Sikken</strong>.</p>

          <h3>Built with</h3>
          <p>React, Vite and TypeScript, a custom HTML5 Canvas drawing engine, and jsPDF for vector
            PDF export.</p>

          <h3>Credits</h3>
          <ul>
            <li>DMC color data based on{' '}
              <a href="https://github.com/seanockert/rgb-to-dmc" target="_blank" rel="noreferrer">
                seanockert/rgb-to-dmc
              </a>.</li>
            <li>Chart font: a subset of Liberation Sans (SIL Open Font License 1.1).</li>
          </ul>

          <h3>Links</h3>
          <ul>
            <li>
              <a href="https://github.com/Jithran/StitchSandbox" target="_blank" rel="noreferrer">
                Source on GitHub
              </a>
            </li>
            <li>
              <a href="https://stitchsandbox.cloud.jithran.nl" target="_blank" rel="noreferrer">
                stitchsandbox.cloud.jithran.nl
              </a>
            </li>
          </ul>

          <p className="info-copyright">© {new Date().getFullYear()} Jithran Sikken</p>
        </div>
    </Modal>
  );
}
