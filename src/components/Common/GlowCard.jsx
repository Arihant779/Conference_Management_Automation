import React, { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';
import { useApp } from '../../context/AppContext';

/**
 * Premium Glow Card with 3D tilt and border glow.
 * Automatically adapts to global theme.
 */
const GlowCard = ({ 
  children, 
  theme: propTheme, 
  className = '', 
  glowColor = 'rgba(251,191,36,0.1)', 
  ...props 
}) => {
  const { theme: globalTheme } = useApp();
  const theme = propTheme || globalTheme;
  const isDark = theme === 'dark';
  
  return (
    <div
      className={`group relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Static subtle glow on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"
        style={{ background: `radial-gradient(circle at center, ${glowColor}, transparent 80%)` }} 
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default GlowCard;
