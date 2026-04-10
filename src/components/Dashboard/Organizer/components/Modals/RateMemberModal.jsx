import React, { useState } from 'react';
import { supabase } from '../../../../../Supabase/supabaseclient';
import { mName } from '../../constants';
import { Modal, Field, Btn, Textarea } from '../common/Primitives';
import { StarRating } from '../common/StarRating';

import { useApp } from '../../../../../context/AppContext';

/* ══════════════════════════════════════════════════════════
   RATE MEMBER MODAL
   ══════════════════════════════════════════════════════════ */
const RateMemberModal = ({ member, confId, organizerId, existingRating, onSave, onClose }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const [rating, setRating]   = useState(existingRating?.rating || 0);
  const [comment, setComment] = useState(existingRating?.comment || '');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const handleSave = async () => {
    if (!rating) { setError('Please select a star rating.'); return; }
    setSaving(true); setError('');
    const payload = { conference_id: confId, rated_user_id: member.user_id, rater_user_id: organizerId, rating, comment: comment.trim() || null, updated_at: new Date().toISOString() };
    let err;
    if (existingRating?.id) {
      ({ error: err } = await supabase.from('member_ratings').update({ rating, comment: comment.trim() || null, updated_at: payload.updated_at }).eq('id', existingRating.id));
    } else {
      ({ error: err } = await supabase.from('member_ratings').insert([{ ...payload, created_at: new Date().toISOString() }]));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  };

  return (
    <Modal title="Rate Member" onClose={onClose} width="max-w-md">
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6" 
        style={{ 
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.02)', 
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}` 
        }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-black text-sm font-bold shrink-0" style={{ background: '#f5c518' }}>
          {mName(member)[0]?.toUpperCase()}
        </div>
        <div>
          <div className={isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-zinc-900"}>{mName(member)}</div>
          <div className="text-xs text-zinc-500">{member.email}</div>
        </div>
        <div className="ml-auto text-xs text-zinc-500 capitalize rounded-md px-2 py-0.5" 
          style={{ 
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)', 
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}` 
          }}>{member.role}</div>
      </div>
      <div className="mb-6">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Your Rating</label>
        <div className="flex flex-col items-center gap-3 rounded-xl p-5" 
          style={{ 
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.02)', 
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}` 
          }}>
          <StarRating value={rating} onChange={setRating} size={28} />
          <div className="text-xs text-zinc-500 h-4">
            {rating === 1 && 'Poor'}{rating === 2 && 'Fair'}{rating === 3 && 'Good'}{rating === 4 && 'Very Good'}{rating === 5 && 'Excellent'}
          </div>
        </div>
      </div>
      <Field label="Comment (optional)">
        <Textarea rows={3} placeholder="Share feedback about this member's contribution…" value={comment} onChange={e => setComment(e.target.value)} />
      </Field>
      {error && <p className="text-xs text-red-400 mt-3 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}
      <div className="flex gap-3 mt-6">
        <Btn variant="secondary" className="flex-1" onClick={onClose}>Cancel</Btn>
        <Btn className="flex-1" onClick={handleSave} disabled={saving || !rating}>
          {saving ? 'Saving…' : existingRating ? 'Update Rating' : 'Submit Rating'}
        </Btn>
      </div>
    </Modal>
  );
};

export default RateMemberModal;
