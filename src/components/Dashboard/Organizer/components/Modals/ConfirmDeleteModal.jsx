import React from 'react';
import { mName } from '../../constants';
import { Modal, Btn } from '../common/Primitives';

const ConfirmDeleteModal = ({ member, onClose, onConfirm }) => (
  <Modal title="Remove Member" onClose={onClose} width="max-w-sm">
    <p className="text-sm mb-6" style={{ color: '#a1a1aa' }}>Remove <span className="text-white font-semibold">{mName(member)}</span> from this conference?</p>
    <div className="flex gap-3">
      <Btn variant="secondary" className="flex-1" onClick={onClose}>Cancel</Btn>
      <Btn variant="danger" className="flex-1" onClick={() => { onConfirm(member.id); onClose(); }}>Remove</Btn>
    </div>
  </Modal>
);

export default ConfirmDeleteModal;
