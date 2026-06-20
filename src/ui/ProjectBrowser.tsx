import { useState } from 'react';
import { type ProjectMeta } from '../model/library';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';

interface Props {
  projects: ProjectMeta[];
  currentId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ProjectBrowser({
  projects,
  currentId,
  onOpen,
  onNew,
  onDuplicate,
  onRename,
  onDelete,
  onClose,
}: Props): React.ReactElement {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ProjectMeta | null>(null);

  const startRename = (p: ProjectMeta) => {
    setEditingId(p.id);
    setDraftName(p.name);
  };
  const commitRename = (id: string) => {
    const name = draftName.trim();
    if (name) onRename(id, name);
    setEditingId(null);
  };

  return (
    <Modal className="browser" onClose={onClose}>
      <div className="modal-header">
        <h2>My projects</h2>
        <button onClick={onClose}>✕</button>
      </div>

      <p className="browser-note">
        Projects are saved <strong>in this browser only</strong> — not on a server. Clearing your
        browser data deletes them. Use <strong>Export</strong> to back up a project as a file.
      </p>

      <div className="browser-grid">
        <button className="project-card new-card" onClick={onNew}>
          <span className="new-card-plus">+</span>
          <strong>New project</strong>
        </button>

        {projects.map((p) => (
          <div key={p.id} className={`project-card ${p.id === currentId ? 'current' : ''}`}>
            <button
              className="project-thumb"
              title="Open"
              onClick={() => onOpen(p.id)}
            >
              {p.thumbnail ? (
                <img src={p.thumbnail} alt="" />
              ) : (
                <span className="project-thumb-empty">Empty</span>
              )}
              {p.id === currentId && <span className="project-current-badge">Open</span>}
            </button>

            <div className="project-meta">
              {editingId === p.id ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => commitRename(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(p.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
              ) : (
                <strong className="project-name" title={p.name} onDoubleClick={() => startRename(p)}>
                  {p.name}
                </strong>
              )}
              <span className="project-sub">
                {p.width}×{p.height} · {p.count}ct · {p.colorCount} color{p.colorCount === 1 ? '' : 's'}
              </span>
              <span className="project-sub">Edited {timeAgo(p.updatedAt)}</span>
            </div>

            <div className="project-actions">
              <button onClick={() => onOpen(p.id)} className="primary">Open</button>
              <button onClick={() => startRename(p)} title="Rename">Rename</button>
              <button onClick={() => onDuplicate(p.id)} title="Duplicate">Duplicate</button>
              <button onClick={() => setConfirmDelete(p)} title="Delete" className="danger-ghost">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete project?"
          message={
            <>
              Delete <strong>{confirmDelete.name}</strong> from this browser? This can't be undone —
              export it first if you want to keep a copy.
            </>
          }
          onClose={() => setConfirmDelete(null)}
          actions={[
            { label: 'Cancel', variant: 'ghost', onClick: () => setConfirmDelete(null) },
            {
              label: 'Delete',
              variant: 'danger',
              onClick: () => {
                onDelete(confirmDelete.id);
                setConfirmDelete(null);
              },
            },
          ]}
        />
      )}
    </Modal>
  );
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
