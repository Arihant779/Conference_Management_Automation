import React, { useState } from 'react';
import { PlusCircle, Trash2, Upload, CheckCircle } from 'lucide-react';
import { supabase } from '../../../Supabase/supabaseclient';
import { useApp } from '../../../context/AppContext';

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

const RESEARCH_AREAS = [
  'Artificial Intelligence',
  'Machine Learning',
  'Cyber Security',
  'Data Science',
  'Software Engineering',
];

const PaperSubmission = ({ conf }) => {
  const { user } = useApp();

  const [form, setForm] = useState({
    paper_title: '',
    abstract: '',
    keywords: '',
    research_area: '',
    message_to_editor: '',
  });
  const [file, setFile] = useState(null);
  const [authors, setAuthors] = useState([{ ...EMPTY_AUTHOR }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const updateForm = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const updateAuthor = (idx, field) => (e) =>
    setAuthors((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: e.target.value } : a)));

  const addAuthor = () => setAuthors((prev) => [...prev, { ...EMPTY_AUTHOR }]);
  const removeAuthor = (idx) => setAuthors((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Upload file to Supabase Storage bucket "papers"
      let file_url = null;
      if (file) {
        const ext = file.name.split('.').pop();
        const filePath = `${conf.conference_id}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('papers')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('papers').getPublicUrl(filePath);
        file_url = urlData.publicUrl;
      }

      // 2. Insert paper row
      const { data: paper, error: paperError } = await supabase
        .from('paper')
        .insert({
          paper_title: form.paper_title,
          abstract: form.abstract,
          keywords: form.keywords,
          research_area: form.research_area,
          message_to_editor: form.message_to_editor,
          file_url,
          author_id: user?.id ?? null,
          conference_id: conf?.conference_id ?? null,
          status: 'submitted',
        })
        .select()
        .single();

      if (paperError) throw paperError;

      // 3. Insert paper_author rows
      if (authors.length > 0) {
        const { error: authorsError } = await supabase
          .from('paper_author')
          .insert(
            authors.map((a, idx) => ({
              paper_id: paper.paper_id,
              author_order: idx + 1,
              salutation: a.salutation,
              first_name: a.first_name,
              middle_name: a.middle_name || null,
              last_name: a.last_name,
              designation: a.designation || null,
              department: a.department || null,
              organization: a.organization || null,
              email: a.email || null,
              mobile: a.mobile || null,
              orcid_id: a.orcid_id || null,
            }))
          );
        if (authorsError) throw authorsError;
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message ?? 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="max-w-6xl mx-auto p-8 text-slate-200">
      <h2 className="text-3xl font-bold text-white mb-6">Research Paper Submission</h2>

      <form onSubmit={handleSubmit}>
        <div className="bg-[#0f1117] border border-white/10 rounded-xl p-8 space-y-8">

          <FormField label="Title">
            <input
              required
              type="text"
              value={form.paper_title}
              onChange={updateForm('paper_title')}
              placeholder="Please write in Title Case (NOT IN ALL CAPITALS)"
              className={inputCls}
            />
          </FormField>

          <FormField label="Abstract">
            <textarea
              required
              rows={4}
              value={form.abstract}
              onChange={updateForm('abstract')}
              placeholder="Short background information about the research"
              className={inputCls}
            />
          </FormField>

          <FormField label="Keywords">
            <input
              type="text"
              value={form.keywords}
              onChange={updateForm('keywords')}
              placeholder="Comma separated list (leave space after comma)"
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
              <option value="">Select Research Area</option>
              {RESEARCH_AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Select Research Paper">
            <input
              type="file"
              accept=".docx,.doc,.odt"
              onChange={(e) => setFile(e.target.files[0] ?? null)}
              className={inputCls}
            />
            <p className="text-xs text-slate-400 mt-2">
              (.docx or .doc or .odt only) — Use single column layout, NOT two columns
            </p>
          </FormField>

          <FormField label="Message to the Editor or Reviewer">
            <textarea
              rows={4}
              value={form.message_to_editor}
              onChange={updateForm('message_to_editor')}
              placeholder="Write any special message..."
              className={inputCls}
            />
          </FormField>

          {/* Authors */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Authors' Details</h3>
              <button
                type="button"
                onClick={addAuthor}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <PlusCircle size={16} /> Add Author
              </button>
            </div>

            <div className="space-y-4">
              {authors.map((author, idx) => (
                <div key={idx} className="bg-black/30 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-400">Author #{idx + 1}</span>
                    {authors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAuthor(idx)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <AuthorField label="Salutation">
                      <select value={author.salutation} onChange={updateAuthor(idx, 'salutation')} className={smallInputCls}>
                        {['Mr.', 'Ms.', 'Dr.', 'Prof.'].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </AuthorField>
                    <AuthorField label="First Name">
                      <input required value={author.first_name} onChange={updateAuthor(idx, 'first_name')} placeholder="Title Case" className={smallInputCls} />
                    </AuthorField>
                    <AuthorField label="Middle Name">
                      <input value={author.middle_name} onChange={updateAuthor(idx, 'middle_name')} className={smallInputCls} />
                    </AuthorField>
                    <AuthorField label="Last Name">
                      <input required value={author.last_name} onChange={updateAuthor(idx, 'last_name')} placeholder="Title Case" className={smallInputCls} />
                    </AuthorField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <AuthorField label="Designation">
                      <input value={author.designation} onChange={updateAuthor(idx, 'designation')} className={smallInputCls} />
                    </AuthorField>
                    <AuthorField label="Department">
                      <input value={author.department} onChange={updateAuthor(idx, 'department')} className={smallInputCls} />
                    </AuthorField>
                    <AuthorField label="Organization">
                      <input value={author.organization} onChange={updateAuthor(idx, 'organization')} className={smallInputCls} />
                    </AuthorField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <AuthorField label="Email">
                      <input type="email" value={author.email} onChange={updateAuthor(idx, 'email')} className={smallInputCls} />
                    </AuthorField>
                    <AuthorField label="Mobile">
                      <input value={author.mobile} onChange={updateAuthor(idx, 'mobile')} className={smallInputCls} />
                    </AuthorField>
                    <AuthorField label="ORCID iD">
                      <input value={author.orcid_id} onChange={updateAuthor(idx, 'orcid_id')} placeholder="0000-0000-0000-0000" className={smallInputCls} />
                    </AuthorField>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-colors"
          >
            <Upload size={18} />
            {loading ? 'Submitting…' : 'Submit Research Paper'}
          </button>
        </div>
      </form>
    </div>
  );
};

const inputCls = 'w-full p-3 rounded-lg bg-black border border-white/10 text-slate-200 outline-none focus:border-indigo-500 transition-colors';
const smallInputCls = 'w-full p-2 rounded-lg bg-black border border-white/10 text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors';

const FormField = ({ label, children }) => (
  <div>
    <label className="block text-sm font-semibold mb-2">{label}</label>
    {children}
  </div>
);

const AuthorField = ({ label, children }) => (
  <div>
    <label className="block text-xs text-slate-500 mb-1">{label}</label>
    {children}
  </div>
);

export default PaperSubmission;