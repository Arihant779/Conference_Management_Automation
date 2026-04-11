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
  
  const ref = useRef(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const handleMouseMove = useCallback((e) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - left) / width);
    mouseY.set((e.clientY - top) / height);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [3, -3]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-3, 3]), { stiffness: 200, damping: 20 });

  const glowBackground = useMotionTemplate`
    radial-gradient(
      600px circle at ${useTransform(mouseX, v => v * 100)}% ${useTransform(mouseY, v => v * 100)}%,
      ${glowColor},
      transparent 70%
    )
  `;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000, transformStyle: 'preserve-3d' }}
      className={`group relative ${className}`}
      {...props}
    >
      {/* Border glow on hover */}
      <motion.div
        className={`pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0 ${isDark ? '' : 'mix-blend-multiply'}`}
        style={{ background: glowBackground }}
      />
      {children}
    </motion.div>
  );
};

export default GlowCard;
