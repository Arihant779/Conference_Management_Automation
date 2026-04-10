import React from 'react';
import { X } from 'lucide-react';
import { cls } from '../../constants';
import { motion } from 'framer-motion';

/* ─── reusable primitives ──────────────────────────────────────────────────── */

export const Modal = ({ title, onClose, children, width = 'max-w-lg' }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    style={{ background: 'rgba(4,7,13,0.85)', backdropFilter: 'blur(12px)' }}
    onClick={e => e.target === e.currentTarget && onClose()}
  >
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={cls('w-full shadow-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8', width)}
      style={{ background: 'rgba(11,15,26,0.95)', border: '1px solid rgba(251,191,36,0.15)' }}>
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
        <button onClick={onClose}
          className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 hover:rotate-90 transition-all bg-white/5">
          <X size={18} />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

export const Field = ({ label, children }) => (
  <div>
    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">{label}</label>
    {children}
  </div>
);

export const Input = ({ className, ...props }) => (
  <input {...props} className={cls(
    'w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all',
    className,
  )} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}
    onFocus={e => { e.target.style.borderColor = 'rgba(251,191,36,0.5)'; e.target.style.boxShadow = '0 0 15px rgba(251,191,36,0.15)'; }}
    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
  />
);

export const Sel = ({ children, className, ...props }) => (
  <select {...props} className={cls(
    'w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all cursor-pointer',
    className,
  )} style={{ background: 'rgba(11,15,26,0.9)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}
    onFocus={e => { e.target.style.borderColor = 'rgba(251,191,36,0.5)'; }}
    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
  >
    {children}
  </select>
);

export const Textarea = ({ className, ...props }) => (
  <textarea {...props} className={cls(
    'w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none resize-none transition-all',
    className,
  )} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}
    onFocus={e => { e.target.style.borderColor = 'rgba(251,191,36,0.5)'; e.target.style.boxShadow = '0 0 15px rgba(251,191,36,0.15)'; }}
    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
  />
);

export const Btn = ({ variant = 'primary', children, className, ...props }) => {
  const base = 'px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed';
  const v = {
    primary:   'text-black font-black',
    secondary: 'text-zinc-300 hover:text-white',
    danger:    'text-red-400 font-bold',
    ghost:     'text-zinc-400 hover:text-white',
  };
  const styles = {
    primary:   { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 20px rgba(251,191,36,0.2)', border: 'none' },
    secondary: { background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' },
    danger:    { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' },
    ghost:     { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' },
  };
  return (
    <button {...props} className={cls(base, v[variant], className)}
      style={styles[variant]}
      onMouseEnter={e => { 
        if (variant === 'primary') {
          e.currentTarget.style.transform = 'scale(1.03)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(251,191,36,0.4)';
        }
      }}
      onMouseLeave={e => { 
        if (variant === 'primary') {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(251,191,36,0.2)';
        }
      }}
    >{children}</button>
  );
};

export const Empty = ({ icon: Icon, msg, action }) => (
  <div className="py-16 text-center rounded-2xl" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
    <Icon size={28} className="text-zinc-700 mx-auto mb-3" />
    <p className="text-zinc-500 text-sm">{msg}</p>
    {action && (
      <button onClick={action.onClick} className="mt-3 text-sm font-semibold" style={{ color: '#f5c518' }}>
        {action.label}
      </button>
    )}
  </div>
);

export const LoadingRows = () => (
  <div className="space-y-2">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }} />
    ))}
  </div>
);
