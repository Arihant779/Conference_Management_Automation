import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../../../../../context/AppContext';

const cls = (...c) => c.filter(Boolean).join(' ');

/* ─── reusable primitives ──────────────────────────────────────────────────── */

export const Modal = ({ title, onClose, children, width = 'max-w-lg' }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ 
        background: isDark ? 'rgba(4,7,13,0.85)' : 'rgba(15,23,42,0.4)', 
        backdropFilter: 'blur(12px)' 
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cls('w-full shadow-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 transition-colors duration-500', width, 
          isDark ? 'bg-[#0B0F1A]/95 border border-white/[0.08]' : 'bg-white border border-zinc-200'
        )}
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className={`text-xl font-bold tracking-tight transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>{title}</h3>
          <button onClick={onClose}
            className={`p-2 rounded-full transition-all hover:rotate-90 ${
              isDark ? 'text-zinc-500 hover:text-white hover:bg-white/10 bg-white/5' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 bg-zinc-50'
            }`}>
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
};

export const Field = ({ label, children }) => (
  <div>
    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">{label}</label>
    {children}
  </div>
);

export const Input = ({ className, ...props }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <input {...props} className={cls(
      'w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-300',
      isDark ? 'text-white placeholder-zinc-600 bg-white/[0.03] border-white/[0.08]' : 'text-zinc-900 placeholder-zinc-400 bg-zinc-50 border-zinc-200 focus:bg-white',
      className,
    )} 
      style={{ 
        borderWidth: '1px',
        borderStyle: 'solid',
        backdropFilter: isDark ? 'blur(10px)' : 'none' 
      }}
      onFocus={e => { 
        e.target.style.borderColor = 'rgba(251,191,36,0.5)'; 
        e.target.style.boxShadow = '0 0 15px rgba(251,191,36,0.15)'; 
      }}
      onBlur={e => { 
        e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(228,228,231,1)'; 
        e.target.style.boxShadow = 'none'; 
      }}
    />
  );
};

export const Sel = ({ children, className, ...props }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <select {...props} className={cls(
      'w-full rounded-xl px-4 py-3 text-sm outline-none transition-all cursor-pointer duration-300',
      isDark ? 'text-white bg-[#0B0F1A]/90 border-white/[0.08]' : 'text-zinc-900 bg-zinc-50 border-zinc-200',
      className,
    )} 
      style={{ 
        borderWidth: '1px',
        borderStyle: 'solid',
        backdropFilter: isDark ? 'blur(10px)' : 'none' 
      }}
      onFocus={e => { e.target.style.borderColor = 'rgba(251,191,36,0.5)'; }}
      onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(228,228,231,1)'; }}
    >
      {children}
    </select>
  );
};

export const Textarea = ({ className, ...props }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <textarea {...props} className={cls(
      'w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all duration-300',
      isDark ? 'text-white placeholder-zinc-600 bg-white/[0.03] border-white/[0.08]' : 'text-zinc-900 placeholder-zinc-400 bg-zinc-50 border-zinc-200 focus:bg-white',
      className,
    )} 
      style={{ 
        borderWidth: '1px',
        borderStyle: 'solid',
        backdropFilter: isDark ? 'blur(10px)' : 'none' 
      }}
      onFocus={e => { 
        e.target.style.borderColor = 'rgba(251,191,36,0.5)'; 
        e.target.style.boxShadow = '0 0 15px rgba(251,191,36,0.15)'; 
      }}
      onBlur={e => { 
        e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(228,228,231,1)'; 
        e.target.style.boxShadow = 'none'; 
      }}
    />
  );
};

export const Btn = ({ variant = 'primary', children, className, ...props }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const base = 'px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed';
  
  const getStyles = () => {
    switch (variant) {
      case 'primary':
        return { 
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', 
          boxShadow: '0 0 20px rgba(251,191,36,0.2)', 
          border: 'none',
          color: '#000000'
        };
      case 'secondary':
        return { 
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)', 
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'}`,
          color: isDark ? '#D4D4D8' : '#3F3F46'
        };
      case 'danger':
        return { 
          background: 'rgba(239,68,68,0.1)', 
          border: '1px solid rgba(239,68,68,0.25)',
          color: '#EF4444'
        };
      case 'ghost':
        return { 
          background: 'transparent', 
          border: 'none',
          color: isDark ? '#71717A' : '#A1A1AA'
        };
      default:
        return {};
    }
  };

  return (
    <button 
      {...props} 
      className={cls(base, className)}
      style={getStyles()}
      onMouseEnter={e => { 
        if (variant === 'primary') {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(251,191,36,0.4)';
        } else if (variant === 'secondary') {
          if (!isDark) e.currentTarget.style.background = 'rgba(15,23,42,0.08)';
          else e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        }
      }}
      onMouseLeave={e => { 
        if (variant === 'primary') {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(251,191,36,0.2)';
        } else if (variant === 'secondary') {
          if (!isDark) e.currentTarget.style.background = 'rgba(15,23,42,0.04)';
          else e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }
      }}
    >
      {children}
    </button>
  );
};

export const Empty = ({ icon: Icon, msg, action }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <div className={`py-16 text-center rounded-2xl border-dashed transition-colors duration-500`} 
      style={{ border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)'}` }}>
      <Icon size={28} className="text-zinc-500 mx-auto mb-3" />
      <p className="text-zinc-500 text-sm">{msg}</p>
      {action && (
        <button onClick={action.onClick} className="mt-3 text-sm font-semibold hover:underline" style={{ color: '#f5c518' }}>
          {action.label}
        </button>
      )}
    </div>
  );
};

export const LoadingRows = () => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={`h-14 rounded-xl animate-pulse transition-colors duration-500`} 
          style={{ 
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.02)', 
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)'}` 
          }} 
        />
      ))}
    </div>
  );
};
