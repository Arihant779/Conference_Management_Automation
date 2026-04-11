import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * Premium Sliding Theme Toggle with Sun and Moon icons.
 * Uses global theme state.
 */
const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center h-9 w-16 rounded-full p-1 transition-all duration-500 shadow-inner group overflow-hidden ${
        isDark ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-200 shadow-sm'
      } ${className}`}
      aria-label="Toggle Theme"
    >
      {/* Animated background highlights */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${isDark ? 'opacity-20' : 'opacity-0'}`} 
           style={{ background: 'radial-gradient(circle at center, #fbbf24, transparent 70%)' }} />
      
      {/* Sliding indicator */}
      <motion.div
        animate={{ x: isDark ? 28 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`z-10 h-7 w-7 rounded-full flex items-center justify-center shadow-md ${
          isDark ? 'bg-zinc-800 text-amber-400' : 'bg-white text-zinc-600'
        }`}
      >
        {isDark ? <Moon size={14} fill="currentColor" /> : <Sun size={14} />}
      </motion.div>

      {/* Background Icons */}
      <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none">
        <Sun size={12} className={`transition-all duration-300 ${isDark ? 'text-zinc-700' : 'opacity-0'}`} />
        <Moon size={12} className={`transition-all duration-300 ${isDark ? 'opacity-0' : 'text-zinc-300'}`} />
      </div>
    </button>
  );
};

export default ThemeToggle;
