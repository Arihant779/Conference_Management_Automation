import React from 'react';
import { Modal, Field, Sel, Btn } from '../common/Primitives';
import UserPickerPanel from '../Panels/UserPickerPanel';

const AddMemberModal = ({ mForm, setMForm, members, confId, saving, onClose, onAddMember }) => (
  <Modal title="Add Member" onClose={onClose} width="max-w-lg">
    <div className="space-y-4">
      <Field label="Role for New Member">
        <Sel value={mForm.role} onChange={e => setMForm({ ...mForm, role: e.target.value })}>
          <option value="reviewer">Reviewer</option>
          <option value="presenter">Presenter</option>
          <option value="organizer">Organizer</option>
        </Sel>
      </Field>
      <Field label="Select User">
        <UserPickerPanel confId={confId} members={members} onSelect={(user) => onAddMember(user, mForm.role)} />
      </Field>
    </div>
    <div className="flex gap-3 mt-6">
      <Btn variant="secondary" className="flex-1" onClick={onClose}>Cancel</Btn>
    </div>
  </Modal>
);

export default AddMemberModal;
