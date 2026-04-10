/* ── Shared Constants & Utilities for Organizer Dashboard ── */

export const cls = (...c) => c.filter(Boolean).join(' ');

export const mName = (m) =>
  m?.full_name || m?.user_name || m?.email || m?.user_email || m?.user_id?.slice(0, 8) || '?';

// ── THEME TOKENS (yellow/dark palette matching reference image) ──
// bg-surface   = #16181f  (card/panel bg)
// bg-base      = #0f1117  (page bg)
// bg-sidebar   = #13151c  (sidebar bg)
// accent       = #f5c518  (yellow gold)
// accent-dim   = #c9a010  (darker gold)
// border       = rgba(255,255,255,0.07)
// text-muted   = #6b7280

export const ROLE_STYLE = {
  organizer: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  reviewer:  'bg-sky-500/15    text-sky-300    border-sky-500/30',
  presenter: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  member:    'bg-zinc-500/15   text-zinc-400   border-zinc-500/25',
};

export const PRIORITY_STYLE = {
  high:   'bg-red-500/15 text-red-400 border-red-500/25',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  low:    'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
};

export const TEAM_COLORS = [
  '#f5c518','#f97316','#ec4899','#8b5cf6',
  '#10b981','#3b82f6','#ef4444','#06b6d4',
];

export const VOLUNTEER_ROLE_LABELS = {
  logistics_head:    'Logistics Team',
  outreach_head:     'Outreach Team Head',
  organizer_head:    'Organizing Team Head',
  technical_head:    'Reviewing Team Head',
  program_coord:     'Event Management Team',
  social_coord:      'Social Media Coord.',
  volunteer_coord:   'Volunteer Coordinator',
  design_lead:       'Design Lead',
  web_lead:          'Website Lead',
  security_coord:    'Security Coordinator',
  registration_head: 'Registration Team',
  sponsorship_head:  'Sponsorship Team',
  hospitality_head:  'Hospitality Team',
  publication_head:  'Publications Team',
  finance_head:      'Finance Team',
};

export const TEAM_TYPES = Object.entries(VOLUNTEER_ROLE_LABELS).map(([id, label]) => ({ id, label }));
