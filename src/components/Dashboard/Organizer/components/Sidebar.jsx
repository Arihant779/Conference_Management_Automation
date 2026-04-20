<<<<<<< HEAD
import { BarChart2, LogOut, X } from 'lucide-react';
=======
import React, { useState } from 'react';
import { BarChart2, LogOut, Menu, X } from 'lucide-react';
>>>>>>> 969d7219940bda0292b30fecba967888f9cd9fc6
import { motion } from 'framer-motion';
import { useApp } from '../../../../context/AppContext';
import ThemeToggle from '../../../Common/ThemeToggle';

const Sidebar = ({ nav, section, setSection, isOrganizer, roleLabel, mobileMenuOpen, setMobileMenuOpen }) => {
  const { theme, logout } = useApp();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);

  return (
<<<<<<< HEAD
    <aside className={`w-full md:w-64 shrink-0 absolute md:relative z-40 md:z-0 left-0 right-0 origin-top flex flex-col gap-1 overflow-y-auto no-scrollbar transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'top-0 bottom-0 max-h-none opacity-100 py-6 border-b pointer-events-auto' : 'top-0 bottom-full md:bottom-auto md:top-0 max-h-0 opacity-0 md:max-h-none md:opacity-100 pointer-events-none md:pointer-events-auto'} shadow-2xl md:shadow-none ${isDark ? 'bg-[#0B0F1A] md:bg-[#0B0F1A]/50 border-white/10' : 'bg-white md:bg-white/80 border-slate-200'}`}
=======
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`md:hidden fixed bottom-6 right-6 z-[60] p-4 rounded-full shadow-2xl transition-all ${isDark ? 'bg-amber-500 text-zinc-900' : 'bg-zinc-900 text-white'}`}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

    <aside className={`fixed md:sticky top-0 z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} w-64 shrink-0 flex flex-col gap-1 overflow-y-auto no-scrollbar transition-colors duration-500 ${isDark ? 'bg-[#0B0F1A]/95 md:bg-[#0B0F1A]/50' : 'bg-white/95 md:bg-white/80'}`}
>>>>>>> 969d7219940bda0292b30fecba967888f9cd9fc6
      style={{
        backdropFilter: 'blur(20px)',
        borderRight: isDark ? '1px solid rgba(251,191,36,0.1)' : '1px solid rgba(15,23,42,0.15)',
        padding: mobileMenuOpen ? '24px 16px' : '0 16px', // mobile padding only when open
        paddingTop: '32px', // overridden by md below, but just in case
      }}>

      {/* Hidden close button on mobile since header chevron toggles it */}
      <button 
        className="hidden absolute top-4 right-4 p-2 rounded-xl bg-amber-500/10 text-amber-500"
        onClick={() => setMobileMenuOpen(false)}
      >
        <X size={20} />
      </button>

      {/* Logo / Title */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="px-3 mb-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: isDark ? '0 0 15px rgba(251,191,36,0.3)' : '0 4px 12px rgba(251,191,36,0.2)' }}>
            <BarChart2 size={16} className="text-zinc-900" />
          </div>
          <span className={`text-sm font-black uppercase tracking-widest transition-colors duration-300 ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600' : 'text-zinc-900'}`}>
            {isOrganizer ? 'Organizer' : (roleLabel?.split(' ')[0] || 'Member')}
          </span>
        </div>
      </motion.div>

      {/* Nav items */}
      <div className="flex-1 space-y-1">
        {nav.map(({ id, label, icon: Icon, badge }, i) => {
          const active = section === id;
          return (
<<<<<<< HEAD
            <motion.button key={id} onClick={() => { setSection(id); setMobileMenuOpen(false); }}
=======
            <motion.button key={id} onClick={() => { setSection(id); setIsOpen(false); }}
>>>>>>> 969d7219940bda0292b30fecba967888f9cd9fc6
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
              whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full text-left transition-all relative overflow-hidden group ${active
                  ? (isDark ? 'text-amber-400' : 'text-amber-700')
                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-zinc-600 hover:text-zinc-900')
                }`}
              style={active
                ? {
                  background: isDark ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.1)',
                  border: isDark ? '1px solid rgba(251,191,36,0.15)' : '1px solid rgba(251,191,36,0.2)'
                }
                : { background: 'rgba(255,255,255,0)', border: '1px solid transparent' }}
            >
              {active && <motion.div layoutId="activeNavIndicator" className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full" style={{ background: '#fbbf24', boxShadow: '0 0 10px rgba(251,191,36,0.5)' }} />}
              <Icon size={16} className={`${active ? (isDark ? 'text-amber-400' : 'text-amber-700') : (isDark ? 'text-slate-500 group-hover:text-amber-400' : 'text-zinc-500 group-hover:text-amber-600')} transition-colors`} />
              <span className="flex-1 text-[13px]">{label}</span>
              {badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border transition-colors ${isDark
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                  }`}>
                  {badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className={`mt-auto pt-6 flex flex-col gap-4 border-t transition-colors ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
        <div className="flex items-center justify-between px-2">
          <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Theme</span>
          <ThemeToggle />
        </div>

        <button
          onClick={logout}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full text-left transition-all group ${isDark ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/5' : 'text-zinc-500 hover:text-red-600 hover:bg-red-50/80'
            }`}
        >
          <LogOut size={16} />
          <span className="text-[13px]">Sign Out</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;

