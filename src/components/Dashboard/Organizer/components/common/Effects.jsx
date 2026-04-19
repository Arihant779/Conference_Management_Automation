import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion, useMotionValue, useMotionTemplate, useSpring, useTransform } from 'framer-motion';
import { useApp } from '../../../../../context/AppContext';

export const SpotlightCard = ({ children, className = '', spotlightColor }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const defaultSpotColor = isDark ? 'rgba(251,191,36,0.03)' : 'rgba(251,191,36,0.06)';
  const color = spotlightColor || defaultSpotColor;

  return (
    <div className={`relative group overflow-hidden ${className}`}>
      {/* Static subtle glow on hover instead of mouse-tracking */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"
        style={{ background: `radial-gradient(circle at center, ${color}, transparent 80%)` }} 
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

export const GlowCard = ({ children, className = '', glowColor, bg }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  
  const defaultGlow = isDark ? 'rgba(251,191,36,1)' : 'rgba(251,191,36,0.3)';
  const defaultBg = isDark ? '#0B0F1A' : '#FFFFFF';
  const defaultBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)';

  return (
    <div className={`relative group ${className}`}>
      <div className="absolute -inset-[1px] rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(135deg, ${glowColor || defaultGlow}, transparent 60%)` }} />
      <div className="relative rounded-[inherit] h-full transition-colors duration-500"
        style={{ 
          background: bg || defaultBg, 
          border: `1px solid ${defaultBorder}` 
        }}>
        {children}
      </div>
    </div>
  );
};

export const TiltCard = ({ children, className = '', style = {} }) => {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
};

export const AnimatedSection = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

export const CinematicBackground = () => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <div className={`fixed inset-0 z-0 overflow-hidden pointer-events-none transition-colors duration-700 ${isDark ? 'bg-[#04070D]' : 'bg-[#F8FAFC]'}`}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay" />
      
      {/* Static Orbs (no motion) */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-[0.1]"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)', filter: 'blur(100px)' }}
      />
      
      <div
        className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] rounded-full opacity-[0.05]"
        style={{ background: isDark ? 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)', filter: 'blur(120px)' }}
      />
      
      <div
        className="absolute bottom-[-20%] left-[20%] w-[45vw] h-[45vw] rounded-full opacity-[0.05]"
        style={{ background: isDark ? 'radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 60%)' : 'radial-gradient(circle, rgba(234,88,12,0.04) 0%, transparent 60%)', filter: 'blur(120px)' }}
      />
    </div>
  );
};
