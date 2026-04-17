import React from 'react';
import { mName } from '../../constants';
import { Modal, Field, Input, Sel, Textarea, Btn } from '../common/Primitives';

const TaskModal = ({
  mode, tkForm, setTkForm,
  teams, members, isOrganizer, userId, saving,
  onClose, onCreate, onSave,
}) => (
  <Modal title={mode === 'addTask' ? 'Add Task' : 'Edit Task'} onClose={onClose} width="max-w-xl">
    <div className="space-y-4">
      <Field label="Task Title"><Input placeholder="Describe the task…" value={tkForm.title} onChange={e => setTkForm({ ...tkForm, title: e.target.value })} /></Field>
      <Field label="Description (optional)"><Textarea className="h-20" placeholder="Additional details…" value={tkForm.description} onChange={e => setTkForm({ ...tkForm, description: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Assign to Team">
          <Sel value={tkForm.team_id} onChange={e => setTkForm({ ...tkForm, team_id: e.target.value })}>
            <option value="">{isOrganizer ? 'No team' : 'Select your team'}</option>
            {teams.filter(t => isOrganizer || t.head_id === userId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Sel>
        </Field>
        <Field label="Assignee">
          <Sel value={tkForm.assignee_id} onChange={e => setTkForm({ ...tkForm, assignee_id: e.target.value })}>
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{mName(m)}</option>)}
          </Sel>
        </Field>
        <Field label="Priority">
          <Sel value={tkForm.priority} onChange={e => setTkForm({ ...tkForm, priority: e.target.value })}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </Sel>
        </Field>
        <Field label="Due Date"><Input type="date" value={tkForm.due_date} onChange={e => setTkForm({ ...tkForm, due_date: e.target.value })} /></Field>
      </div>
    </div>
    <div className="flex gap-3 mt-6">
      <Btn variant="secondary" className="flex-1" onClick={onClose}>Cancel</Btn>
      <Btn className="flex-1" onClick={mode === 'addTask' ? onCreate : onSave} disabled={saving || !tkForm.title.trim()}>
        {saving ? 'Saving…' : mode === 'addTask' ? 'Add Task' : 'Save Changes'}
      </Btn>
    </div>
  </Modal>
);

export default TaskModal;
