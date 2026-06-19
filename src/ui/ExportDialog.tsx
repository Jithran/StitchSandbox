import { useMemo, useState } from 'react';
import { chartFileName, renderChartPages, type ChartMode } from '../export/chart';
import { exportChartPdf } from '../export/pdf';
import { usedColors } from '../model/document';
import { type PatternDocument } from '../model/types';
import { Modal } from './Modal';

interface Props {
  doc: PatternDocument;
  onClose: () => void;
}

const PER_PAGE = [40, 50, 60, 80, 100];

export function ExportDialog({ doc, onClose }: Props): React.ReactElement {
  const [mode, setMode] = useState<ChartMode>('symbol');
  const [perPage, setPerPage] = useState(50);

  const empty = usedColors(doc).size === 0;

  const pages = useMemo(
    () => (empty ? [] : renderChartPages(doc, { mode, stitchesPerPage: perPage })),
    [doc, mode, perPage, empty],
  );

  const previews = useMemo(
    () => pages.map((p) => ({ title: p.title, url: p.canvas.toDataURL('image/png') })),
    [pages],
  );

  return (
    <Modal className="export" onClose={onClose}>
      <div className="modal-header">
        <h2>Export chart</h2>
        <button onClick={onClose}>✕</button>
      </div>

      {empty ? (
        <p className="hint">Draw something first — there are no stitches to export.</p>
      ) : (
        <>
            <div className="export-controls">
              <label>
                Style
                <select value={mode} onChange={(e) => setMode(e.target.value as ChartMode)}>
                  <option value="symbol">Black &amp; white symbols</option>
                  <option value="color">Color blocks + symbols</option>
                </select>
              </label>
              <label>
                Stitches / page
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                  {PER_PAGE.map((n) => (
                    <option key={n} value={n}>
                      {n} × {n}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="primary"
                onClick={() => exportChartPdf(doc, mode, perPage, chartFileName(doc))}
              >
                Download PDF ({pages.length} pages)
              </button>
            </div>

            <div className="export-preview">
              {previews.map((p, i) => (
                <figure key={i}>
                  <img src={p.url} alt={p.title} />
                  <figcaption>{p.title}</figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
    </Modal>
  );
}
