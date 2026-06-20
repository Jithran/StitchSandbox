import { type ReactNode } from 'react';
import { Modal } from './Modal';

export interface ConfirmAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
}

interface Props {
  title: string;
  message: ReactNode;
  actions: ConfirmAction[];
  onClose: () => void;
}

export function ConfirmDialog({ title, message, actions, onClose }: Props): React.ReactElement {
  return (
    <Modal className="confirm" onClose={onClose}>
      <div className="modal-header">
        <h2>{title}</h2>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="confirm-body">{message}</div>
      <div className="modal-actions confirm-actions">
        {actions.map((a) => (
          <button key={a.label} className={a.variant ?? 'ghost'} onClick={a.onClick}>
            {a.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
