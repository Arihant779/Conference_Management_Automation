import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const CreateConference = ({ onCancel, onSuccess }) => {
  const { createConference } = useApp();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: '', 
    theme: '', 
    location: '', 
    date: '', 
    description: '', 
    template: 'modern', 
    banner: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createConference(data);
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 flex items-center justify-center">
      <div className="max-w-5xl w-full bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Sidebar */}
        <div className="bg-slate-950/50 p-8 border-r border-white/5 md:w-1/3 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          
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
              <div className="flex items-center gap-4 group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  step >= 1 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  1
                </div>
                <div>
                  <span className={`block font-bold ${step >= 1 ? 'text-white' : 'text-slate-500'}`}>
                    Basic Details
                  </span>
                  <span className="text-xs text-slate-500">Name, date, and theme</span>
                </div>
              </div>
              
              <div className="w-0.5 h-12 bg-slate-800 ml-5"></div>
              
              <div className="flex items-center gap-4 group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  step >= 2 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  2
                </div>
                <div>
                  <span className={`block font-bold ${step >= 2 ? 'text-white' : 'text-slate-500'}`}>
                    Look & Feel
                  </span>
                  <span className="text-xs text-slate-500">Branding and cover</span>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onCancel} 
            className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors mt-8"
          >
            <ArrowRight className="rotate-180" size={16}/> Cancel & Exit
          </button>
        </div>

        {/* Form Area */}
        <div className="p-10 md:w-2/3 bg-slate-900/30">
          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            {step === 1 ? (
              <div className="space-y-6 flex-1 animate-in slide-in-from-right-4 fade-in duration-300">
                <h3 className="text-2xl font-bold text-white mb-6">Conference Essentials</h3>
                
                <div className="space-y-5">
                  <div className="group">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      Conference Name
                    </label>
                    <input 
                      required 
                      className="w-full p-4 bg-black/20 border border-white/10 focus:border-indigo-500 rounded-xl transition-all outline-none text-white focus:bg-black/40"
                      value={data.name} 
                      onChange={e => setData({...data, name: e.target.value})} 
                      placeholder="e.g. Future Tech Summit 2024" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                        Topic
                      </label>
                      <input 
                        required 
                        className="w-full p-4 bg-black/20 border border-white/10 focus:border-indigo-500 rounded-xl transition-all outline-none text-white focus:bg-black/40"
                        value={data.theme} 
                        onChange={e => setData({...data, theme: e.target.value})} 
                        placeholder="e.g. AI Ethics" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                        Date
                      </label>
                      <input 
                        required 
                        type="date" 
                        className="w-full p-4 bg-black/20 border border-white/10 focus:border-indigo-500 rounded-xl transition-all outline-none text-white focus:bg-black/40 [color-scheme:dark]"
                        value={data.date} 
                        onChange={e => setData({...data, date: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      Location
                    </label>
                    <input 
                      required 
                      className="w-full p-4 bg-black/20 border border-white/10 focus:border-indigo-500 rounded-xl transition-all outline-none text-white focus:bg-black/40"
                      value={data.location} 
                      onChange={e => setData({...data, location: e.target.value})} 
                      placeholder="City, Country or Online" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      Description
                    </label>
                    <textarea 
                      className="w-full p-4 bg-black/20 border border-white/10 focus:border-indigo-500 rounded-xl h-28 transition-all outline-none resize-none text-white focus:bg-black/40"
                      value={data.description} 
                      onChange={e => setData({...data, description: e.target.value})} 
                      placeholder="What is this event about?" 
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-8">
                  <button 
                    type="button" 
                    onClick={() => setStep(2)} 
                    className="bg-white text-slate-900 hover:bg-slate-200 px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                  >
                    Next Step <ArrowRight size={18}/>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 fade-in duration-300">
                <h3 className="text-2xl font-bold text-white mb-6">Visual Identity</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      Banner Image URL
                    </label>
                    <input 
                      className="w-full p-4 bg-black/20 border border-white/10 focus:border-indigo-500 rounded-xl transition-all outline-none text-white focus:bg-black/40"
                      value={data.banner} 
                      onChange={e => setData({...data, banner: e.target.value})} 
                      placeholder="https://..." 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1">
                      Select Template
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {['modern', 'classic', 'minimal'].map(t => (
                        <div 
                          key={t}
                          onClick={() => setData({...data, template: t})}
                          className={`cursor-pointer border-2 rounded-2xl p-4 transition-all relative overflow-hidden group ${
                            data.template === t 
                              ? 'border-indigo-500 bg-indigo-500/10' 
                              : 'border-slate-800 hover:border-slate-600 bg-slate-900/40'
                          }`}
                        >
                          <div className={`h-24 rounded-lg mb-3 ${
                            t === 'modern' 
                              ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                              : t === 'classic' 
                              ? 'bg-[#e2e2e2]' 
                              : 'bg-slate-800 border border-slate-700'
                          }`}></div>
                          <h4 className="font-bold text-white capitalize text-sm">{t}</h4>
                          <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-indigo-500 flex items-center justify-center transition-all ${
                            data.template === t 
                              ? 'bg-indigo-500 scale-100' 
                              : 'border-slate-600 scale-90 opacity-50'
                          }`}>
                            {data.template === t && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex justify-between border-t border-white/10 pt-8">
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="text-slate-400 hover:text-white font-medium px-4"
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 hover:translate-y-[-2px]"
                  >
                    <CheckCircle size={18}/> Launch Event
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

export default CreateConference;
