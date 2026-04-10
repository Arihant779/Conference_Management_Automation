import React from 'react';
import { BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = ({ nav, section, setSection, isOrganizer, roleLabel }) => (
  <aside className="w-64 shrink-0 sticky top-0 flex flex-col gap-1 overflow-y-auto no-scrollbar"
    style={{ height: '100vh', background: 'rgba(11,15,26,0.5)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(251,191,36,0.1)', padding: '32px 16px' }}>

    {/* Logo / Title */}
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="px-3 mb-10">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 15px rgba(251,191,36,0.3)' }}>
          <BarChart2 size={16} style={{ color: '#000' }} />
        </div>
        <span className="text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
          {isOrganizer ? 'Organizer' : roleLabel.split(' ')[0]}
        </span>
      </div>
      <div className="text-[10px] text-zinc-500 pl-11 uppercase tracking-widest font-bold">Dashboard</div>
    </motion.div>

    {/* Nav items */}
    <div className="space-y-1">
      {nav.map(({ id, label, icon: Icon, badge }, i) => {
        const active = section === id;
        return (
          <motion.button key={id} onClick={() => setSection(id)}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
            whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full text-left transition-colors relative overflow-hidden group ${active ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
            style={active
              ? { background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }
              : { background: 'rgba(255,255,255,0)', border: '1px solid transparent' }}
          >
            {active && <motion.div layoutId="activeNavIndicator" className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full" style={{ background: '#fbbf24', boxShadow: '0 0 10px rgba(251,191,36,0.5)' }} />}
            <Icon size={16} className={active ? 'text-amber-400' : 'group-hover:text-amber-300 transition-colors'} />
            <span className="flex-1 text-[13px]">{label}</span>
            {badge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                {badge}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  </aside>
);

export default Sidebar;
