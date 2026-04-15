import React, { useState, useEffect } from 'react';
import { Settings, FileText, CheckCircle, XCircle, AlertCircle, Save } from 'lucide-react';
import { supabase } from '../../../../../Supabase/supabaseclient';
import { Btn } from '../common/Primitives';
import { SpotlightCard, AnimatedSection } from '../common/Effects';
import { useApp } from '../../../../../context/AppContext';

const SubmissionSettingsSection = ({ conf }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf.conference_id || conf.id;

  const [settings, setSettings] = useState({
    allowed_extensions: ['.pdf', '.docx'],
    require_indentation: false,
    indentation_cm: 0.5,
    max_file_size_mb: 10,
    check_font_size: false,
    min_font_size: 10
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('conference')
        .select('submission_settings')
        .eq('conference_id', confId)
        .single();
      
      if (!error && data?.submission_settings) {
        setSettings(data.submission_settings);
      }
      setLoading(false);
    };
    fetchSettings();
  }, [confId]);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('conference')
      .update({ submission_settings: settings })
      .eq('conference_id', confId);
    
    if (error) {
      setMsg({ type: 'error', text: 'Failed to save settings: ' + error.message });
    } else {
      setMsg({ type: 'success', text: 'Submission rules updated successfully!' });
      setTimeout(() => setMsg(null), 3000);
    }
    setSaving(false);
  };

  const toggleExt = (ext) => {
    const next = settings.allowed_extensions.includes(ext)
      ? settings.allowed_extensions.filter(e => e !== ext)
      : [...settings.allowed_extensions, ext];
    setSettings({ ...settings, allowed_extensions: next });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <AnimatedSection className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className={`text-3xl font-black transition-colors duration-500 tracking-tight mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Submission Rules</h2>
          <p className="text-slate-500 font-medium tracking-wide">Configure automated validation for research papers</p>
        </div>
        <Btn onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
        </Btn>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border animate-in fade-in slide-in-from-top-2 duration-300 ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-semibold">{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File Formats */}
        <SpotlightCard className="rounded-2xl">
          <div className={`rounded-2xl p-6 h-full border backdrop-blur-xl transition-all duration-500 ${
            isDark ? 'bg-slate-900/40 border-white/5' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <FileText size={20} />
              </div>
              <h3 className={`font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Accepted File Formats</h3>
            </div>

            <div className="space-y-3">
              {['.pdf', '.docx', '.doc', '.odt'].map(ext => (
                <div 
                  key={ext}
                  onClick={() => toggleExt(ext)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    settings.allowed_extensions.includes(ext)
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-white/5 bg-transparent'
                  }`}
                >
                  <span className={`text-sm font-semibold ${settings.allowed_extensions.includes(ext) ? (isDark ? 'text-amber-300' : 'text-amber-600') : 'text-slate-500'}`}>{ext.toUpperCase()}</span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    settings.allowed_extensions.includes(ext) ? 'bg-amber-500 border-amber-500' : 'border-slate-700'
                  }`}>
                    {settings.allowed_extensions.includes(ext) && <CheckCircle size={12} className="text-white" />}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Max File Size (MB)</label>
              <input 
                type="number"
                value={settings.max_file_size_mb}
                onChange={e => setSettings({ ...settings, max_file_size_mb: parseInt(e.target.value) })}
                className={`w-full p-3 rounded-xl border bg-transparent text-sm focus:border-amber-500 outline-none transition-all ${
                  isDark ? 'border-white/10 text-white' : 'border-zinc-200 text-zinc-900'
                }`}
              />
            </div>
          </div>
        </SpotlightCard>

        {/* Formatting Checks */}
        <SpotlightCard className="rounded-2xl">
          <div className={`rounded-2xl p-6 h-full border backdrop-blur-xl transition-all duration-500 ${
            isDark ? 'bg-slate-900/40 border-white/5' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Settings size={20} />
              </div>
              <h3 className={`font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Formatting Rules</h3>
            </div>

            <div className="space-y-6">
              {/* Indentation */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-zinc-800'}`}>Require PDF Indentation</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Automatically check if paragraphs have the required left indentation (Hanging/First-line).</p>
                </div>
                <div 
                  onClick={() => setSettings({ ...settings, require_indentation: !settings.require_indentation })}
                  className={`w-12 h-6 rounded-full relative transition-all cursor-pointer grow-0 shrink-0 ${
                    settings.require_indentation ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    settings.require_indentation ? 'left-7' : 'left-1'
                  }`} />
                </div>
              </div>

              {settings.require_indentation && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Minimum Indentation (cm)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={settings.indentation_cm}
                    onChange={e => setSettings({ ...settings, indentation_cm: parseFloat(e.target.value) })}
                    className={`w-full p-3 rounded-xl border bg-transparent text-sm focus:border-amber-500 outline-none transition-all ${
                      isDark ? 'border-white/10 text-white' : 'border-zinc-200 text-zinc-900'
                    }`}
                  />
                </div>
              )}

              <hr className="border-white/5" />

              {/* Font Size */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-zinc-800'}`}>Minimum Font Size</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Ensure the main text font size doesn't fall below a specific threshold.</p>
                </div>
                <div 
                  onClick={() => setSettings({ ...settings, check_font_size: !settings.check_font_size })}
                  className={`w-12 h-6 rounded-full relative transition-all cursor-pointer grow-0 shrink-0 ${
                    settings.check_font_size ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    settings.check_font_size ? 'left-7' : 'left-1'
                  }`} />
                </div>
              </div>

              {settings.check_font_size && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Font Size (pt)</label>
                  <input 
                    type="number"
                    value={settings.min_font_size}
                    onChange={e => setSettings({ ...settings, min_font_size: parseInt(e.target.value) })}
                    className={`w-full p-3 rounded-xl border bg-transparent text-sm focus:border-amber-500 outline-none transition-all ${
                      isDark ? 'border-white/10 text-white' : 'border-zinc-200 text-zinc-900'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>
        </SpotlightCard>
      </div>
      
      <div className={`p-4 rounded-xl border flex items-start gap-3 ${
        isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'
      }`}>
        <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-500/80 leading-relaxed italic">
          These rules are enforced during the submission process. If a paper violates these rules, the author will receive a warning and will be prevented from submitting until corrected.
        </p>
      </div>
    </AnimatedSection>
  );
};

export default SubmissionSettingsSection;
