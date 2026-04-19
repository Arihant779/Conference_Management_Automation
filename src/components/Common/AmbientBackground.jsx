import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';

/**
 * Premium Ambient Background with dynamic mesh gradients and noise texture.
 * Automatically adapts to the global theme if not overridden by props.
 */
const AmbientBackground = ({ theme: propTheme }) => {
  const { theme: globalTheme } = useApp();
  const theme = propTheme || globalTheme;
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none transition-colors duration-700">
      {/* Base Layer */}
      <div className={`absolute inset-0 transition-colors duration-700 ${isDark ? 'bg-[#04070D]' : 'bg-[#F8FAFC]'}`} />

      {/* Top-left soft glow */}
      <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full opacity-20 transition-all duration-700"
        style={{ background: isDark ? 'radial-gradient(circle, rgba(251,191,36,0.05) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)' }} />

      {/* Bottom-right cool glow */}
      <div className="absolute -bottom-60 -right-40 w-[800px] h-[800px] rounded-full opacity-15 transition-all duration-700"
        style={{ background: isDark ? 'radial-gradient(circle, rgba(148,163,184,0.04) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />

      {/* Center soft wash */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] rounded-full opacity-[0.06] transition-all duration-700"
        style={{ background: isDark ? 'radial-gradient(ellipse, rgba(251,191,36,0.06) 0%, transparent 70%)' : 'radial-gradient(ellipse, rgba(251,191,36,0.12) 0%, transparent 70%)' }} />

      {/* Static soft wash instead of animated floating orb */}
      <div
        className="absolute top-[20%] right-[30%] w-[400px] h-[400px] rounded-full opacity-[0.04] transition-all duration-700"
        style={{ background: isDark ? 'radial-gradient(circle, rgba(148,163,184,0.15) 0%, transparent 60%)' : 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 60%)' }}
      />

      {/* Noise texture for premium grain */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${isDark ? 'opacity-[0.025]' : 'opacity-[0.015]'}`}
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")' }} />

      {/* Very subtle grid */}
      <div className={`absolute inset-0 transition-all duration-700 ${isDark ? 'opacity-[0.02]' : 'opacity-[0.04]'}`}
        style={{
          backgroundImage: isDark 
            ? 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }} />
    </div>
  );
};

export default AmbientBackground;
