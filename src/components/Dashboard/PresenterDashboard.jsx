import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Calendar, CheckCircle, Award, Upload, Clock,
  AlertCircle, X, Presentation, ChevronRight, Download,
  RefreshCw, Sparkles, ExternalLink, Send, Info, Star, Bell
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import Sidebar from './Organizer/components/Sidebar';
import AmbientBackground from '../Common/AmbientBackground';
import MemberNotifications from './MemberNotifications';
import FeedbackForm from './FeedbackForm';

/* ─── helpers ──────────────────────────────────────────────────────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

const statusConfig = {
  pending: { label: 'Under Review', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  accepted: { label: 'Accepted', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  rejected: { label: 'Not Accepted', color: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-500' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.pending;
  return (
    <span className={cls('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border', cfg.color)}>
      <span className={cls('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
};

/* 5 time-slots the presenter can pick from */
const TIME_SLOTS = [
  '09:00 – 09:30', '09:30 – 10:00',
  '10:30 – 11:00', '11:00 – 11:30',
  '11:30 – 12:00', '14:00 – 14:30',
  '14:30 – 15:00', '15:00 – 15:30',
  '15:30 – 16:00', '16:30 – 17:00',
];

/* ═══════════════════════════════════════════════════════════════════════════
   SLIDE UPLOAD PANEL — per paper
═══════════════════════════════════════════════════════════════════════════ */
const SlideUploadPanel = ({ paper, onSlideUploaded }) => {
  const { user } = useApp();
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [localUrl, setLocalUrl] = useState(paper.slide_url || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef();

  // Keep localUrl in sync with props
  useEffect(() => {
    if (paper.slide_url) setLocalUrl(paper.slide_url);
  }, [paper.slide_url]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setErr('');
    setUploading(true);

    try {
      const ext = selectedFile.name.split('.').pop();
      const newPath = `${paper.conference_id}/${user?.id || 'unknown'}_${paper.paper_id}.${ext}`;
      const newFullUrl = supabase.storage.from('slides').getPublicUrl(newPath).data.publicUrl;

      // 1. Delete old file ONLY if the path has changed (e.g. extension changed)
      if (paper.slide_url && paper.slide_url !== newFullUrl) {
        try {
          const urlParts = paper.slide_url.split('/storage/v1/object/public/slides/');
          if (urlParts.length === 2) {
            const oldPath = decodeURI(urlParts[1]);
            await supabase.storage.from('slides').remove([oldPath]);
          }
        } catch (delErr) {
          console.error('Failed to delete old slide:', delErr);
        }
      }

      // 2. Upload new file (using upsert: true with fixed path)
      const { error: upErr } = await supabase.storage
        .from('slides')
        .upload(newPath, selectedFile, {
          cacheControl: '0', // disable cache so changes show immediately
          upsert: true
        });

      if (upErr) throw new Error(upErr.message);

      const slideUrl = newFullUrl;

      // 3. Update DB
      const { error: dbErr } = await supabase
        .from('paper')
        .update({ slide_url: slideUrl })
        .eq('paper_id', paper.paper_id);

      if (dbErr) throw new Error(dbErr.message);

      setLocalUrl(slideUrl);
      setSelectedFile(null);
      onSlideUploaded(paper.paper_id, slideUrl);
    } catch (ex) {
      setErr(ex.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (localUrl) {
    return (
      <div className="flex items-center gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3">
        <CheckCircle size={16} className="text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-300">Slides uploaded</p>
          <a
            href={localUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-emerald-500 hover:text-emerald-300 flex items-center gap-1 mt-0.5 transition-colors"
          >
            <ExternalLink size={9} /> View slides
          </a>
        </div>
        <button
          onClick={() => { setLocalUrl(''); inputRef.current?.click(); }}
          className="text-[10px] font-semibold text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        >
          Replace
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.ppt,.pptx,.key" className="hidden" onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!selectedFile ? (
        <label
          className={cls(
            'flex items-center gap-3 border border-dashed border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all'
          )}
        >
          <div className="w-8 h-8 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
            <Upload size={14} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-300">Select presentation slides</p>
            <p className="text-[10px] text-slate-600 mt-0.5">PDF, PPT, PPTX or Keynote</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.ppt,.pptx,.key"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
              <FileText size={14} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(0)} KB · Ready to upload</p>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all"
            >
              <X size={14} />
            </button>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-all"
          >
            {uploading ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <Send size={12} />
            )}
            {uploading ? 'Uploading...' : 'Upload & Save Slides'}
          </button>
        </div>
      )}
      {err && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={11} />{err}</p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TIME PREFERENCE PANEL — multi-select chips, all pre-selected, min 3
═══════════════════════════════════════════════════════════════════════════ */
const MIN_SLOTS = 3;

const TimePreferencePanel = ({ paper, onSaved }) => {
  // Initialise: if already saved use those, else all slots selected
  const initSlots = () => {
    if (Array.isArray(paper.preferred_slots) && paper.preferred_slots.length > 0)
      return new Set(paper.preferred_slots);
    return new Set(TIME_SLOTS); // all selected by default
  };

  const [selected, setSelected] = useState(initSlots);
  const [note, setNote] = useState(paper.preferred_note || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(
    Array.isArray(paper.preferred_slots) && paper.preferred_slots.length > 0
  );
  const [err, setErr] = useState('');

  const toggle = (slot) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slot)) {
        if (next.size <= MIN_SLOTS) {
          setErr(`You must keep at least ${MIN_SLOTS} slots selected.`);
          return prev; // block deselect
        }
        next.delete(slot);
      } else {
        next.add(slot);
      }
      setErr('');
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size < MIN_SLOTS) {
      setErr(`Please keep at least ${MIN_SLOTS} time slots selected.`);
      return;
    }
    setErr('');
    setSaving(true);

    const slotsArray = TIME_SLOTS.filter(s => selected.has(s)); // keep original order

    const { error } = await supabase
      .from('paper')
      .update({
        preferred_slots: slotsArray,
        preferred_note: note || null,
      })
      .eq('paper_id', paper.paper_id);

    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved(paper.paper_id, { preferred_slots: slotsArray, preferred_note: note });
    setSaved(true);
  };

  return (
    <div className="space-y-4">

      {/* ── Saved banner ── */}
      {saved && (
        <div className="flex items-start gap-3 bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-3">
          <CheckCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-300 mb-1.5">
              Time preference saved — {selected.size} slot{selected.size !== 1 ? 's' : ''} available
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TIME_SLOTS.filter(s => selected.has(s)).map(s => (
                <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-300">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setSaved(false)} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-semibold shrink-0">
            Edit
          </button>
        </div>
      )}

      {/* ── Edit mode ── */}
      {!saved && (
        <>
          {/* Instruction */}
          <div className="flex items-start gap-2 bg-[#0d1117] border border-white/6 rounded-xl px-4 py-3">
            <Info size={12} className="text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              All time slots are selected. <span className="text-slate-400">Deselect slots you <strong>cannot</strong> attend.</span> A minimum of <span className="text-purple-400 font-bold">{MIN_SLOTS}</span> slots must remain selected.
              <span className="ml-1 text-slate-600">({selected.size} / {TIME_SLOTS.length} selected)</span>
            </p>
          </div>

          {/* Slot chips grid */}
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map(slot => {
              const isOn = selected.has(slot);
              const wouldHitMin = isOn && selected.size <= MIN_SLOTS;
              return (
                <button
                  key={slot}
                  onClick={() => toggle(slot)}
                  title={wouldHitMin ? `Must keep at least ${MIN_SLOTS} slots` : ''}
                  className={cls(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all select-none',
                    isOn
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-200 hover:bg-purple-500/10'
                      : 'bg-white/3 border-white/8 text-slate-500 hover:border-white/16 hover:text-slate-400',
                    wouldHitMin && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {isOn && <span className="mr-1 text-purple-400">✓</span>}
                  {slot}
                </button>
              );
            })}
          </div>

          {/* Optional note */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Additional Note <span className="normal-case font-normal text-slate-600">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. I am unavailable on the first day morning…"
              className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500 text-white placeholder-slate-600 resize-none transition-colors"
            />
          </div>

          {err && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={11} />{err}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || selected.size < MIN_SLOTS}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
          >
            <Send size={12} />
            {saving ? 'Saving…' : `Save ${selected.size} Slot${selected.size !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PAPER CARD
═══════════════════════════════════════════════════════════════════════════ */
const PaperCard = ({ paper, onSlideUploaded, onTimeSaved }) => {
  const [expanded, setExpanded] = useState(paper.status === 'accepted');
  const isAccepted = paper.status === 'accepted';

  return (
    <div className={cls(
      'bg-[#0d1117] border rounded-2xl overflow-hidden transition-all',
      isAccepted ? 'border-emerald-500/20' : 'border-white/6'
    )}>
      {/* ── Card header ── */}
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cls(
            'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5',
            isAccepted
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-indigo-500/10 border-indigo-500/15 text-indigo-400'
          )}>
            <FileText size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base leading-snug">{paper.paper_title}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {paper.research_area && (
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  {paper.research_area}
                </span>
              )}
              {paper.keywords && (
                <span className="text-[10px] text-slate-600 truncate max-w-[260px]">{paper.keywords}</span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
              <Clock size={10} />
              Submitted {paper.paper_id ? `#${paper.paper_id}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={paper.status} />
          {paper.file_url && (
            <a
              href={paper.file_url}
              target="_blank"
              rel="noreferrer"
              title="Download paper"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/8 text-slate-500 hover:text-white hover:border-white/20 transition-all"
            >
              <Download size={14} />
            </a>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/8 text-slate-500 hover:text-white hover:border-white/20 transition-all"
          >
            <ChevronRight size={14} className={cls('transition-transform', expanded && 'rotate-90')} />
          </button>
        </div>
      </div>

      {/* ── Abstract strip ── */}
      {paper.abstract && (
        <p className="px-5 pb-4 text-sm text-slate-500 leading-relaxed line-clamp-2 border-t border-white/4 pt-3">
          {paper.abstract}
        </p>
      )}

      {/* ── Expanded actions ── */}
      {expanded && (
        <div className="border-t border-white/6 bg-[#080b11]/60 px-5 py-5 space-y-5">

          {/* Upload slides */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Presentation size={14} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Presentation Slides</span>
            </div>
            <SlideUploadPanel paper={paper} onSlideUploaded={onSlideUploaded} />
          </div>

          {/* Time preference — only for accepted papers */}
          {isAccepted && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Clock size={14} className="text-purple-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Presentation Time Preference</span>
              </div>
              <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl px-4 py-3 mb-3">
                <div className="flex items-start gap-2">
                  <Info size={12} className="text-purple-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-purple-300/70 leading-relaxed">
                    Your paper has been <strong className="text-purple-300">accepted</strong>.
                    Please share your preferred date and time slot — the organiser will finalise the schedule accordingly.
                  </p>
                </div>
              </div>
              <TimePreferencePanel paper={paper} onSaved={onTimeSaved} />
            </div>
          )}

          {/* Pending info */}
          {paper.status === 'pending' && (
            <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3">
              <Clock size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-300 mb-0.5">Awaiting Review Decision</p>
                <p className="text-[11px] text-slate-500">Time preference can be set after your paper is accepted.</p>
              </div>
            </div>
          )}

          {/* Rejected info */}
          {paper.status === 'rejected' && (
            <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-300 mb-0.5">Submission Not Selected</p>
                <p className="text-[11px] text-slate-500">
                  Your paper was not selected for presentation. Check reviewer feedback if available.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PRESENTER DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
const PresenterDashboard = ({ conf, onBack }) => {
  const { user, theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf?.conference_id ?? conf?.id;

  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [section, setSection] = useState('overview');

  const nav = [
    { id: 'overview', label: 'My Submissions', icon: FileText },
    { id: 'feedback', label: 'Feedback', icon: Star },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  /* ── fetch this presenter's papers for this conference ─────────────── */
  const fetchPapers = useCallback(async () => {
    if (!confId || !user?.id) return;
    setLoading(true);
    setError('');

    const { data, error: fetchErr } = await supabase
      .from('paper')
      .select(`
        paper_id,
        paper_title,
        abstract,
        keywords,
        research_area,
        status,
        file_url,
        slide_url,
        preferred_slots,
        preferred_note,
        conference_id,
        author_id
      `)
      .eq('conference_id', confId)
      .eq('author_id', user.id)
      .order('paper_id', { ascending: false });

    if (fetchErr) {
      console.error('[PresenterDashboard] fetchPapers error:', fetchErr);
      setError('Failed to load your papers. Please refresh.');
    } else {
      setPapers(data || []);
    }
    setLoading(false);
  }, [confId, user?.id]);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  /* ── local state updaters (so no refetch is needed) ────────────────── */
  const handleSlideUploaded = (paperId, slideUrl) => {
    setPapers(prev => prev.map(p => p.paper_id === paperId ? { ...p, slide_url: slideUrl } : p));
  };

  const handleTimeSaved = (paperId, prefs) => {
    setPapers(prev => prev.map(p => p.paper_id === paperId ? { ...p, ...prefs } : p));
  };

  /* ── derived counts ─────────────────────────────────────────────────── */
  const accepted = papers.filter(p => p.status === 'accepted').length;
  const pending = papers.filter(p => p.status === 'pending').length;
  const withSlides = papers.filter(p => p.slide_url).length;

  return (
    <div className={`relative min-h-screen transition-colors duration-500 selection:bg-amber-500/30 overflow-hidden ${isDark ? 'text-slate-200' : 'text-zinc-800'}`} style={{ fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <AmbientBackground />

      <div className="w-full h-screen flex relative z-10 overflow-hidden">
        <Sidebar nav={nav} section={section} setSection={setSection} isOrganizer={false} onBack={onBack} roleLabel="Presenter" />

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-8">

            {section === 'overview' && (
              <>
                {/* ── Page title ── */}
                <div>
                  <h2 className={`text-2xl font-bold transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Presenter Dashboard</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Manage your submissions, upload slides, and set your presentation time preference.
                  </p>
                </div>

                {/* ── Conference info strip ── */}
                <div className={`border transition-all duration-300 rounded-xl p-4 flex items-center gap-6 flex-wrap ${
                  isDark ? 'bg-[#0d1117] border-white/6' : 'bg-white border-zinc-200 shadow-sm'
                }`}>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Conference</div>
                    <div className={`text-sm font-semibold transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>{conf.title}</div>
                  </div>
                  {conf.start_date && (
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Date</div>
                      <div className={`text-sm flex items-center gap-1.5 transition-colors ${isDark ? 'text-slate-300' : 'text-zinc-600'}`}>
                        <Calendar size={12} className="text-slate-500" />
                        {new Date(conf.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {conf.end_date && conf.end_date !== conf.start_date && (
                          <> – {new Date(conf.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</>
                        )}
                      </div>
                    </div>
                  )}
                  {conf.location && (
                    <div>
                      <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-0.5">Location</div>
                      <div className="text-sm text-slate-300">{conf.location}</div>
                    </div>
                  )}
                </div>

                {/* ── Stats strip ── */}
                {!loading && papers.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Total Submissions', value: papers.length, color: isDark ? 'text-slate-200' : 'text-zinc-800', icon: FileText },
                      { label: 'Accepted',          value: accepted,       color: 'text-emerald-400', icon: CheckCircle },
                      { label: 'Slides Uploaded',   value: withSlides,     color: 'text-blue-400', icon: Presentation },
                    ].map(({ label, value, color, icon: Icon }) => (
                      <div key={label} className={`border rounded-xl p-4 transition-all duration-300 ${
                        isDark ? 'bg-[#0d1117] border-white/6' : 'bg-white border-zinc-200 shadow-sm'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">{label}</span>
                          <Icon size={14} className={cls(color, 'opacity-60')} />
                        </div>
                        <div className={cls('text-2xl font-black transition-colors', color)}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Accepted congratulations banner ── */}
                {accepted > 0 && (
                  <div className="bg-[#0a1a12] border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute right-5 top-5 opacity-6">
                      <Award size={90} className="text-emerald-400" />
                    </div>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                      <Sparkles size={18} className="text-emerald-400" />
                      <h4 className="font-bold text-lg text-white">
                        {accepted === 1 ? 'Your paper has been accepted!' : `${accepted} of your papers have been accepted!`}
                      </h4>
                    </div>
                    <p className="text-sm text-emerald-200/60 relative z-10 max-w-lg">
                      Congratulations! Please upload your presentation slides and submit your preferred time slot below.
                      The organiser will confirm your final schedule.
                    </p>
                  </div>
                )}

                {/* ── Loading ── */}
                {loading && (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-28 bg-white/3 border border-white/5 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                )}

                {/* ── Error ── */}
                {error && (
                  <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-xl p-4">
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* ── No papers ── */}
                {!loading && !error && papers.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-white/6 rounded-2xl">
                    <div className="w-16 h-16 bg-slate-800 border border-white/8 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-600">
                      <FileText size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No Papers Submitted</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                      You have not submitted any papers to this conference yet. 
                      Submit your research through the conference page.
                    </p>
                  </div>
                )}

                {/* ── Paper cards ── */}
                {!loading && papers.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                      Your Submissions ({papers.length})
                    </h3>
                    {papers.map(paper => (
                      <PaperCard
                        key={paper.paper_id}
                        paper={paper}
                        onSlideUploaded={handleSlideUploaded}
                        onTimeSaved={handleTimeSaved}
                      />
                    ))}
                  </div>
                )}

                {/* ── Guide section ── */}
                {!loading && papers.length > 0 && (
                  <div className={`border rounded-2xl p-5 transition-all duration-300 ${
                    isDark ? 'bg-[#0d1117] border-white/6' : 'bg-white border-zinc-200 shadow-sm'
                  }`}>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Presenter Checklist</h4>
                    <div className="space-y-2.5">
                      {[
                        { done: papers.length > 0,                label: 'Submit your research paper',           sub: 'Paper received by the conference' },
                        { done: accepted > 0,                      label: 'Receive acceptance from reviewers',    sub: 'At least one paper accepted' },
                        { done: withSlides > 0,                    label: 'Upload presentation slides',           sub: 'Upload PDF, PPTX or Keynote file' },
                        { done: papers.some(p => Array.isArray(p.preferred_slots) && p.preferred_slots.length >= 3), label: 'Submit your time preference', sub: 'Help the organiser build the schedule' },
                      ].map(({ done, label, sub }) => (
                        <div key={label} className="flex items-start gap-3">
                          <div className={cls(
                            'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5',
                            done ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'border-white/10 text-slate-600'
                          )}>
                            {done && <CheckCircle size={12} />}
                          </div>
                          <div>
                            <p className={cls('text-sm font-semibold', done ? 'text-slate-200' : 'text-slate-500')}>{label}</p>
                            <p className="text-[11px] text-slate-600">{sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {section === 'feedback' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <h2 className={`text-2xl font-bold transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Feedback</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Submit your conference feedback</p>
                </div>
                <FeedbackForm conf={conf} />
              </div>
            )}

            {section === 'notifications' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <h2 className={`text-2xl font-bold transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Notifications</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Conference announcements</p>
                </div>
                <MemberNotifications conf={conf} />
              </div>
            )}

          </div>
        </main>
    </div>
  </div>
);
};

export default PresenterDashboard;