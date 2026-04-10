import React from 'react';
import { Send } from 'lucide-react';
import { Modal, Field, Input, Sel, Textarea, Btn } from '../common/Primitives';

const NotificationModal = ({ nForm, setNForm, teams, saving, onClose, onSend }) => (
  <Modal title="Send Announcement" onClose={onClose}>
    <div className="space-y-4">
      <Field label="Title"><Input placeholder="Announcement headline…" value={nForm.title} onChange={e => setNForm({ ...nForm, title: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Target Role">
          <Sel value={nForm.target_role} onChange={e => setNForm({ ...nForm, target_role: e.target.value })}>
            <option value="all">All Members</option><option value="presenter">Presenters</option><option value="reviewer">Reviewers</option><option value="organizer">Organizers</option>
          </Sel>
        </Field>
        <Field label="Target Team">
          <Sel value={nForm.target_team_id} onChange={e => setNForm({ ...nForm, target_team_id: e.target.value })}>
            <option value="">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Sel>
        </Field>
      </div>
      <Field label="Message"><Textarea className="h-28" placeholder="Write your announcement…" value={nForm.message} onChange={e => setNForm({ ...nForm, message: e.target.value })} /></Field>
    </div>
    <div className="flex gap-3 mt-6">
      <Btn variant="secondary" className="flex-1" onClick={onClose}>Cancel</Btn>
      <Btn className="flex-1" onClick={onSend} disabled={saving || !nForm.title.trim() || !nForm.message.trim()}>
        <Send size={14} />{saving ? 'Sending…' : 'Send'}
      </Btn>
    </div>
  </Modal>
);

export default NotificationModal;
