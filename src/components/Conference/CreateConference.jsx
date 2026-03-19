import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const CreateConference = ({ onCancel, onSuccess }) => {
  const { user, fetchConferences } = useApp();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    title: '',
    theme: '',
    location: '',
    start_date: '',
    end_date: '',
    description: '',
    template: 'modern',
    banner_url: '',
  });

  const update = (field) => (e) => setData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create the conference row
      const { data: inserted, error: insertError } = await supabase
        .from('conference')
        .insert({
          title: data.title,
          theme: data.theme,
          description: data.description,
          location: data.location,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          template: data.template,
          banner_url: data.banner_url || null,
          conference_head_id: user?.id ?? null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Call RPC to insert organizer role.
      //    The function runs as security definer (postgres owner) so it
      //    bypasses RLS on conference_user — no permission denied errors.
      const { error: roleError } = await supabase.rpc('add_conference_organizer', {
        p_conference_id: inserted.conference_id,
      });
      if (roleError) throw roleError;

      // Refetch conferences so UserDashboard's roleMap picks up the new organizer row
      await fetchConferences();

      onSuccess(inserted);
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = data.title && data.theme && data.start_date && data.location;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 flex items-center justify-center">
      <div className="max-w-5xl w-full bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

        {/* Sidebar */}
        <div className="bg-slate-950/50 p-8 border-r border-white/5 md:w-1/3 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <span className="font-bold text-white tracking-wide">Studio</span>
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">Create Event</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Design a world-class experience for your attendees in just a few steps.
            </p>

            <div className="mt-12 space-y-6">
              {[
                { num: 1, label: 'Basic Details', sub: 'Name, date, and theme' },
                { num: 2, label: 'Look & Feel', sub: 'Branding and cover' },
              ].map(({ num, label, sub }, i) => (
                <React.Fragment key={num}>
                  {i > 0 && <div className="w-0.5 h-12 bg-slate-800 ml-5" />}
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step >= num ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-500'
                      }`}>
                      {num}
                    </div>
                    <div>
                      <span className={`block font-bold ${step >= num ? 'text-white' : 'text-slate-500'}`}>{label}</span>
                      <span className="text-xs text-slate-500">{sub}</span>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          <button onClick={onCancel} className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors mt-8">
            <ArrowRight className="rotate-180" size={16} /> Cancel & Exit
          </button>
        </div>

        {/* Form Area */}
        <div className="p-10 md:w-2/3 bg-slate-900/30">
          <form onSubmit={handleSubmit} className="h-full flex flex-col">

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-6 flex-1">
                <h3 className="text-2xl font-bold text-white mb-6">Conference Essentials</h3>

                <div className="space-y-5">
                  <Field label="Conference Name">
                    <Input required value={data.title} onChange={update('title')} placeholder="e.g. Future Tech Summit 2025" />
                  </Field>

                  <div className="grid grid-cols-2 gap-5">
                    <Field label="Topic / Theme">
                      <Input required value={data.theme} onChange={update('theme')} placeholder="e.g. AI Ethics" />
                    </Field>
                    <Field label="Start Date">
                      <Input required type="date" value={data.start_date} onChange={update('start_date')} className="[color-scheme:dark]" />
                    </Field>
                  </div>

                  <Field label="End Date (optional)">
                    <Input type="date" value={data.end_date} onChange={update('end_date')} className="[color-scheme:dark]" />
                  </Field>

                  <Field label="Location">
                    <Input required value={data.location} onChange={update('location')} placeholder="City, Country or Online" />
                  </Field>

                  <Field label="Description">
                    <textarea
                      className="w-full p-4 bg-black/20 border border-white/10 focus:border-indigo-500 rounded-xl h-28 transition-all outline-none resize-none text-white focus:bg-black/40"
                      value={data.description}
                      onChange={update('description')}
                      placeholder="What is this event about?"
                    />
                  </Field>
                </div>

                <div className="flex justify-end pt-8">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceed}
                    className="bg-white text-slate-900 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                  >
                    Next Step <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="flex-1 flex flex-col">
                <h3 className="text-2xl font-bold text-white mb-6">Visual Identity</h3>

                <div className="space-y-6">
                  <Field label="Banner Image URL">
                    <Input value={data.banner_url} onChange={update('banner_url')} placeholder="https://..." />
                  </Field>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1">
                      Select Template
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {['modern', 'classic', 'minimal'].map((t) => (
                        <div
                          key={t}
                          onClick={() => setData((prev) => ({ ...prev, template: t }))}
                          className={`cursor-pointer border-2 rounded-2xl p-4 transition-all relative overflow-hidden ${data.template === t
                              ? 'border-indigo-500 bg-indigo-500/10'
                              : 'border-slate-800 hover:border-slate-600 bg-slate-900/40'
                            }`}
                        >
                          <div className={`h-24 rounded-lg mb-3 ${t === 'modern' ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                              : t === 'classic' ? 'bg-[#e2e2e2]'
                                : 'bg-slate-800 border border-slate-700'
                            }`} />
                          <h4 className="font-bold text-white capitalize text-sm">{t}</h4>
                          <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${data.template === t ? 'bg-indigo-500 border-indigo-500 scale-100' : 'border-slate-600 scale-90 opacity-50'
                            }`}>
                            {data.template === t && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    {error}
                  </p>
                )}

                <div className="mt-auto flex justify-between border-t border-white/10 pt-8">
                  <button type="button" onClick={() => setStep(1)} className="text-slate-400 hover:text-white font-medium px-4">
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 hover:translate-y-[-2px]"
                  >
                    <CheckCircle size={18} />
                    {loading ? 'Launching…' : 'Launch Event'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
    {children}
  </div>
);

const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full p-4 bg-black/20 border border-white/10 focus:border-indigo-500 rounded-xl transition-all outline-none text-white focus:bg-black/40 ${className}`}
    {...props}
  />
);

export default CreateConference;