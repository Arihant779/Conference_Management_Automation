import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion, useMotionValue, useMotionTemplate, useSpring, useTransform } from 'framer-motion';

export const SpotlightCard = ({ children, className = '', spotlightColor = 'rgba(251,191,36,0.07)' }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouse = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const spotBg = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 80%)`;

  return (
    <div className={`relative group ${className}`} onMouseMove={handleMouse}>
      <motion.div className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-0"
        style={{ background: spotBg }} />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

export const GlowCard = ({ children, className = '', glowColor = 'rgba(251,191,36,0.15)', bg = '#0B0F1A' }) => (
  <div className={`relative group ${className}`}>
    <div className="absolute -inset-[1px] rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{ background: `linear-gradient(135deg, ${glowColor}, transparent 60%)` }} />
    <div className="relative rounded-[inherit] h-full"
      style={{ background: bg, border: '1px solid rgba(255,255,255,0.06)' }}>
      {children}
    </div>
  </div>
);

export const TiltCard = ({ children, className = '', style = {} }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [4, -4]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-4, 4]), { stiffness: 300, damping: 30 });

  const handleMouse = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      className={className} style={{ ...style, perspective: 1000, rotateX, rotateY, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
};

export const AnimatedSection = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

export const CinematicBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" style={{ background: '#04070D' }}>
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay" />
    
    <motion.div
      animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
      transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)', filter: 'blur(100px)' }}
    />
    
    <motion.div
      animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.1, 0.05], x: [0, 50, 0] }}
      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', filter: 'blur(120px)' }}
    />
    
    <motion.div
      animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
      transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
      className="absolute bottom-[-20%] left-[20%] w-[45vw] h-[45vw] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 60%)', filter: 'blur(120px)' }}
    />
  </div>
);
