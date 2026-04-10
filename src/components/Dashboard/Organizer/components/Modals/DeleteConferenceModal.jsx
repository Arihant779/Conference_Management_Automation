import React from 'react';
import { Modal, Btn } from '../common/Primitives';

const DeleteConferenceModal = ({ conf, saving, onClose, onDelete }) => (
  <Modal title="Delete Conference" onClose={onClose} width="max-w-sm">
    <div className="mb-6 space-y-3">
      <p className="text-sm" style={{ color: '#a1a1aa' }}>
        Are you sure you want to delete <span className="text-white font-semibold">"{conf.title}"</span>?
      </p>
      <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <p className="text-xs leading-relaxed" style={{ color: '#f87171' }}>
          This will permanently delete the conference and all associated data — members, teams, tasks, papers, and notifications. This cannot be undone.
        </p>
      </div>
    </div>
    <div className="flex gap-3">
      <Btn variant="secondary" className="flex-1" onClick={onClose}>Cancel</Btn>
      <Btn variant="danger" className="flex-1" disabled={saving} onClick={onDelete}>
        {saving ? 'Deleting…' : 'Delete Permanently'}
      </Btn>
    </div>
  </Modal>
);

export default DeleteConferenceModal;
