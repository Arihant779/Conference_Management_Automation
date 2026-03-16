import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../Supabase/supabaseclient';
import { useApp } from '../../../context/AppContext';

/* ─── constants ─────────────────────────────────────────────────────────── */

const EMPTY_AUTHOR = {
  salutation: 'Mr.',
  first_name: '',
  middle_name: '',
  last_name: '',
  designation: '',
  department: '',
  organization: '',
  email: '',
  mobile: '',
  orcid_id: '',
};

// Full domain list matching the volunteer preferences
const RESEARCH_AREAS = [
  // Computer Science & AI
  'Artificial Intelligence', 'Machine Learning', 'Deep Learning',
  'Computer Vision', 'Natural Language Processing', 'Reinforcement Learning',
  'Generative AI & LLMs', 'Robotics & Automation', 'Data Science & Analytics',
  'Big Data & Cloud Computing', 'Cybersecurity & Privacy', 'Blockchain & Web3',
  'Human-Computer Interaction', 'Augmented & Virtual Reality', 'Quantum Computing',
  'Edge Computing & IoT', 'Software Engineering', 'Database Systems',
  'Computer Networks', 'Distributed Systems',
  // Physical Sciences
  'Quantum Mechanics & Quantum Physics', 'Astrophysics & Cosmology',
  'Particle Physics & High Energy Physics', 'Condensed Matter Physics',
  'Optics & Photonics', 'Nuclear Physics', 'Thermodynamics',
  'Nanotechnology', 'Materials Science', 'Fluid Dynamics',
  'Acoustics', 'Plasma Physics',
  // Life Sciences & Medicine
  'Bioinformatics & Computational Biology', 'Genomics & Proteomics',
  'Neuroscience', 'Biotechnology', 'Medical Imaging',
  'Drug Discovery & Pharmacology', 'Climate & Environmental Science',
  'Ecology & Biodiversity', 'Agricultural Science',
  'Public Health & Epidemiology', 'Biomedical Engineering',
  // Engineering & Applied Sciences
  'Electrical Engineering', 'Mechanical Engineering', 'Civil & Structural Engineering',
  'Aerospace Engineering', 'Chemical Engineering', 'Energy Systems & Sustainability',
  'Renewable Energy', 'Autonomous Vehicles', 'Advanced Manufacturing',
  // Social Sciences & Humanities
  'Economics & Finance', 'Education Technology', 'Cognitive Science',
  'Philosophy & Ethics of AI', 'Policy & Governance', 'Digital Humanities',
  'Communication & Journalism', 'Psychology', 'Sociology',
];

/* ─── style helpers ─────────────────────────────────────────────────────── */
const inputCls =
  'w-full p-3 rounded-lg bg-black border border-white/10 text-slate-200 outline-none focus:border-indigo-500 transition-colors';
const smallInputCls =
  'w-full p-2 rounded-lg bg-black border border-white/10 text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors';

const FormField = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold mb-1">{label}</label>
    {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
    {children}
  </div>
);

const AuthorField = ({ label, children }) => (
  <div>
    <label className="block text-xs text-slate-500 mb-1">{label}</label>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const PaperSubmission = ({ conf }) => {
  const { user } = useApp();

  const [form, setForm] = useState({
    paper_title: '',
    abstract: '',
    keywords: '',
    research_area: '',
    message_to_editor: '',
  });
  const [file, setFile]       = useState(null);
  const [authors, setAuthors] = useState([{ ...EMPTY_AUTHOR }]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);
  const [existingPapers, setExistingPapers] = useState([]);

  const confId = conf?.conference_id ?? conf?.id ?? null;

  // ── Guard: warn if conf is missing ──────────────────────────────────────
  useEffect(() => {
    if (!confId) {
      console.error('[PaperSubmission] conf.conference_id is undefined — paper will be orphaned!', conf);
    }
  }, [confId, conf]);

  // ── Check if this user already submitted to this conference ─────────────
  useEffect(() => {
    if (!confId || !user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('paper')
        .select('paper_id, paper_title, status')
        .eq('conference_id', confId)
        .eq('author_id', user.id);
      setExistingPapers(data || []);
    })();
  }, [confId, user?.id]);

  const updateForm   = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const updateAuthor = (idx, field) => (e) =>
    setAuthors((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: e.target.value } : a)));
  const addAuthor    = () => setAuthors((prev) => [...prev, { ...EMPTY_AUTHOR }]);
  const removeAuthor = (idx) => setAuthors((prev) => prev.filter((_, i) => i !== idx));

  /* ── Submit ─────────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Guard: must have a conference
    if (!confId) {
      setError('Conference ID is missing. Cannot submit paper.');
      return;
    }

    // Guard: must be logged in
    const userId = user?.id;
    if (!userId) {
      setError('You must be logged in to submit a paper.');
      return;
    }

    // Guard: must upload a file
    if (!file) {
      setError('Please attach your paper file before submitting.');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload file to Supabase Storage bucket "papers"
      const ext      = file.name.split('.').pop();
      const filePath = `${confId}/${userId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('papers')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('papers').getPublicUrl(filePath);
      const file_url = urlData?.publicUrl ?? null;

      console.log('[PaperSubmission] file uploaded:', file_url);

      // 2. Insert paper row
      // IMPORTANT: status must be 'pending' so it appears in the organiser's review queue.
      //            author_id = user.id which is the Supabase auth UUID = users.user_id FK.
      const { data: paper, error: paperError } = await supabase
        .from('paper')
        .insert({
          paper_title:        form.paper_title.trim(),
          abstract:           form.abstract.trim(),
          keywords:           form.keywords.trim() || null,
          research_area:      form.research_area,
          message_to_editor:  form.message_to_editor.trim() || null,
          file_url,
          author_id:          userId,          // auth.uid() == users.user_id
          conference_id:      confId,          // never null — guarded above
          status:             'pending',       // ← was 'submitted', now matches organiser filter
        })
        .select()
        .single();

      if (paperError) throw new Error(`Paper insert failed: ${paperError.message}`);

      console.log('[PaperSubmission] paper inserted:', paper.paper_id);

      // 3. Insert paper_author rows
      if (authors.length > 0) {
        const { error: authorsError } = await supabase
          .from('paper_author')
          .insert(
            authors.map((a, idx) => ({
              paper_id:     paper.paper_id,
              author_order: idx + 1,
              salutation:   a.salutation,
              first_name:   a.first_name.trim(),
              middle_name:  a.middle_name.trim()   || null,
              last_name:    a.last_name.trim(),
              designation:  a.designation.trim()   || null,
              department:   a.department.trim()    || null,
              organization: a.organization.trim()  || null,
              email:        a.email.trim()         || null,
              mobile:       a.mobile.trim()        || null,
              orcid_id:     a.orcid_id.trim()      || null,
            }))
          );

        if (authorsError) {
          // Paper was inserted — log but don't block success
          console.error('[PaperSubmission] paper_author insert failed:', authorsError.message);
          throw new Error(`Author details failed to save: ${authorsError.message}`);
        }
      }

      setSuccess(true);
    } catch (err) {
      console.error('[PaperSubmission] error:', err);
      setError(err.message ?? 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ─────────────────────────────────────────────────── */
  if (success) {
    return (
      <div className="max-w-lg mx-auto p-12 text-center text-slate-200">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="text-green-400" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Paper Submitted!</h2>
        <p className="text-slate-400 text-sm">
          Your research paper has been submitted successfully and is now pending review.
        </p>
      </div>
    );
  }

  /* ── Form ───────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto p-8 text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <h2 className="text-3xl font-bold text-white mb-2">Research Paper Submission</h2>
      <p className="text-slate-500 text-sm mb-8">
        Submitting to: <span className="text-indigo-400 font-semibold">{conf?.title ?? 'Unknown Conference'}</span>
      </p>

      {/* Existing submissions warning */}
      {existingPapers.length > 0 && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/25 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              You have already submitted {existingPapers.length} paper{existingPapers.length > 1 ? 's' : ''} to this conference
            </span>
          </div>
          <div className="space-y-1">
            {existingPapers.map(p => (
              <div key={p.paper_id} className="flex items-center gap-2 text-xs text-slate-400">
                <span className={`px-1.5 py-0.5 rounded font-bold uppercase border text-[9px] ${
                  p.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  p.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>{p.status}</span>
                <span className="truncate">{p.paper_title}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">You can still submit another paper if allowed.</p>
        </div>
      )}

      {/* No conf guard */}
      {!confId && (
        <div className="mb-6 bg-red-500/10 border border-red-500/25 rounded-xl px-5 py-4 text-sm text-red-400">
          Conference information is missing. Please go back and re-open this form from a valid conference.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-[#0f1117] border border-white/10 rounded-xl p-8 space-y-8">

          {/* ── Paper details ── */}
          <FormField label="Title" hint="Write in Title Case — NOT IN ALL CAPITALS">
            <input
              required
              type="text"
              value={form.paper_title}
              onChange={updateForm('paper_title')}
              placeholder="e.g. Deep Learning Approaches for Medical Image Segmentation"
              className={inputCls}
            />
          </FormField>

          <FormField label="Abstract" hint="Short background about your research (150–300 words recommended)">
            <textarea
              required
              rows={5}
              value={form.abstract}
              onChange={updateForm('abstract')}
              placeholder="Provide a concise summary of your research..."
              className={inputCls}
            />
          </FormField>

          <FormField label="Keywords" hint="Comma separated, e.g. neural network, image segmentation, transfer learning">
            <input
              type="text"
              value={form.keywords}
              onChange={updateForm('keywords')}
              placeholder="keyword1, keyword2, keyword3"
              className={inputCls}
            />
          </FormField>

          <FormField label="Research Area">
            <select
              required
              value={form.research_area}
              onChange={updateForm('research_area')}
              className={inputCls}
            >
              <option value="">— Select Research Area —</option>
              {RESEARCH_AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Upload Research Paper"
            hint="Accepted formats: .docx, .doc, .odt — Use single column layout, NOT two columns"
          >
            <input
              required
              type="file"
              accept=".docx,.doc,.odt"
              onChange={(e) => setFile(e.target.files[0] ?? null)}
              className={inputCls}
            />
            {file && (
              <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                <CheckCircle size={11} /> {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </FormField>

          <FormField label="Message to the Editor / Reviewer (optional)">
            <textarea
              rows={3}
              value={form.message_to_editor}
              onChange={updateForm('message_to_editor')}
              placeholder="Any special notes for the reviewer..."
              className={inputCls}
            />
          </FormField>

          {/* ── Authors ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Authors' Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">List all authors in the order they appear in the paper</p>
              </div>
              <button
                type="button"
                onClick={addAuthor}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-semibold"
              >
                <PlusCircle size={15} /> Add Author
              </button>
            </div>

            <div className="space-y-4">
              {authors.map((author, idx) => (
                <div key={idx} className="bg-black/30 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-300">
                      Author #{idx + 1}
                      {idx === 0 && (
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase tracking-wider">
                          Corresponding
                        </span>
                      )}
                    </span>
                    {authors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAuthor(idx)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <AuthorField label="Salutation">
                      <select
                        value={author.salutation}
                        onChange={updateAuthor(idx, 'salutation')}
                        className={smallInputCls}
                      >
                        {['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Assoc. Prof.'].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </AuthorField>
                    <AuthorField label="First Name *">
                      <input
                        required
                        value={author.first_name}
                        onChange={updateAuthor(idx, 'first_name')}
                        placeholder="Title Case"
                        className={smallInputCls}
                      />
                    </AuthorField>
                    <AuthorField label="Middle Name">
                      <input
                        value={author.middle_name}
                        onChange={updateAuthor(idx, 'middle_name')}
                        className={smallInputCls}
                      />
                    </AuthorField>
                    <AuthorField label="Last Name *">
                      <input
                        required
                        value={author.last_name}
                        onChange={updateAuthor(idx, 'last_name')}
                        placeholder="Title Case"
                        className={smallInputCls}
                      />
                    </AuthorField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <AuthorField label="Designation">
                      <input
                        value={author.designation}
                        onChange={updateAuthor(idx, 'designation')}
                        placeholder="e.g. PhD Scholar"
                        className={smallInputCls}
                      />
                    </AuthorField>
                    <AuthorField label="Department">
                      <input
                        value={author.department}
                        onChange={updateAuthor(idx, 'department')}
                        placeholder="e.g. Computer Science"
                        className={smallInputCls}
                      />
                    </AuthorField>
                    <AuthorField label="Organization / University">
                      <input
                        value={author.organization}
                        onChange={updateAuthor(idx, 'organization')}
                        placeholder="e.g. IIT Bombay"
                        className={smallInputCls}
                      />
                    </AuthorField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <AuthorField label="Email">
                      <input
                        type="email"
                        value={author.email}
                        onChange={updateAuthor(idx, 'email')}
                        className={smallInputCls}
                      />
                    </AuthorField>
                    <AuthorField label="Mobile">
                      <input
                        value={author.mobile}
                        onChange={updateAuthor(idx, 'mobile')}
                        className={smallInputCls}
                      />
                    </AuthorField>
                    <AuthorField label="ORCID iD">
                      <input
                        value={author.orcid_id}
                        onChange={updateAuthor(idx, 'orcid_id')}
                        placeholder="0000-0000-0000-0000"
                        className={smallInputCls}
                      />
                    </AuthorField>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={loading || !confId}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Upload size={17} />
            {loading ? 'Submitting…' : 'Submit Research Paper'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaperSubmission;