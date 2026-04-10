import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const ConferenceHero = () => {
  const letters = "ONFERENCE".split("");

  // Randomized configurations Distributed into 4 Corner Quadrants (Uniform Density)
  const bouncyShapes = useMemo(() => {
    return [...Array(12)].map((_, i) => {
      // Divide 12 shapes into 4 quadrants (3 shapes each)
      const quadrant = i % 4; // 0: TL, 1: TR, 2: BL, 3: BR
      
      const ranges = [
        { left: [0, 35], top: [0, 35] },    // Top Left
        { left: [65, 100], top: [0, 35] },  // Top Right
        { left: [0, 35], top: [65, 100] },  // Bottom Left
        { left: [65, 100], top: [65, 100] } // Bottom Right
      ];

      const range = ranges[quadrant];
      
      return {
        id: i,
        type: ['circle', 'rectangle', 'triangle'][i % 3],
        size: 30 + Math.random() * 60,
        left: [
          `${range.left[0] + Math.random() * (range.left[1] - range.left[0])}%`, 
          `${range.left[0] + Math.random() * (range.left[1] - range.left[0])}%`
        ],
        top: [
          `${range.top[0] + Math.random() * (range.top[1] - range.top[0])}%`, 
          `${range.top[0] + Math.random() * (range.top[1] - range.top[0])}%`
        ],
        rotate: [Math.random() * 360, Math.random() * 720],
        duration: 5 + Math.random() * 7, // Tripled from 15-35s to ~5-12s
        delay: Math.random() * -40 
      };
    });
  }, []);

  const letterVariants = {
    initial: { opacity: 0, width: 0, scale: 0.8, y: 20 },
    animate: { 
      opacity: 1, 
      width: "auto", 
      scale: 1, 
      y: 0,
      transition: { type: "spring", damping: 25, stiffness: 90 }
    },
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#04070D] select-none">
      
      {/* ── BACKGROUND LAYER (Bouncing Dynamics) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        
        {/* Moving Technical Grid */}
        <motion.div 
          animate={{ opacity: [0.03, 0.06, 0.03], backgroundPosition: ["0px 0px", "100px 100px"] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '100px 100px',
            maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
          }}
        />

        {/* Pulsing Dynamic Orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-amber-500/[0.04] blur-[160px] rounded-full animate-pulse" />
        <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.05, 0.03] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[130px] rounded-full" 
        />

        {/* Bouncing Geometric Shapes (DVD-Style) - Shiny Sky Blue Restoration */}
        {bouncyShapes.map((shape) => (
          <motion.div
            key={shape.id}
            initial={{ opacity: 0, left: shape.left[0], top: shape.top[0] }}
            animate={{ 
                opacity: 0.25,
                left: shape.left,
                top: shape.top,
                rotate: shape.rotate
            }}
            transition={{
                left: { duration: shape.duration, repeat: Infinity, repeatType: "reverse", ease: "linear" },
                top: { duration: shape.duration * 1.3, repeat: Infinity, repeatType: "reverse", ease: "linear" },
                rotate: { duration: shape.duration, repeat: Infinity, ease: "linear" },
                opacity: { duration: 2 }
            }}
            className="absolute"
            style={{ width: shape.size, height: shape.size }}
          >
            {shape.type === 'circle' && (
              <div className="w-full h-full border-2 border-amber-400/50 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)] bg-amber-400/5 backdrop-blur-[1px]" />
            )}
            {shape.type === 'rectangle' && (
              <div className="w-full h-full border-2 border-amber-400/50 rounded-2xl shadow-[0_0_15px_rgba(245,158,11,0.3)] bg-amber-400/5 backdrop-blur-[1px]" />
            )}
            {shape.type === 'triangle' && (
              <div className="w-full h-full relative drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                <svg viewBox="0 0 100 100" className="w-full h-full text-amber-400/60 fill-amber-400/5 stroke-current stroke-[2]">
                    <path d="M50 15 L85 85 L15 85 Z" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            
            {/* Inner Glow Core */}
            <div className="absolute inset-0 bg-amber-400/10 blur-xl rounded-full" />
          </motion.div>
        ))}

        {/* Atmospheric Dust Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`dust-final-${i}`}
            animate={{ opacity: [0, 0.2, 0], y: [-20, -150] }}
            transition={{ delay: Math.random() * 8, duration: 8 + Math.random() * 8, repeat: Infinity }}
            className="absolute"
            style={{ left: `${10 + Math.random() * 80}%`, top: `${50 + Math.random() * 50}%` }}
          >
              <div className="w-1 h-1 bg-amber-400/20 rounded-full" />
          </motion.div>
        ))}
      </div>

      {/* ── CENTRAL HERO ELEMENT ── */}
      <div className="relative flex items-center justify-center z-10 scale-110 tracking-wider">
        
        {/* The Golden 'C' (2.5s Sequence with 1s Post-Fall Bounce) */}
        <motion.div
           initial={{ y: "-60vh", x: 0, rotate: 0, opacity: 0 }}
           animate={{ 
             // Phase 1: FAST Peek -> Phase 3: Lightning Fall (1.5s) -> Phase 4: Bounce (1s)
             y: ["-48vh", "-48vh", "-48vh", 0, -40, 0], 
             x: [0, 0, 0, 0, 0, 0],
             rotate: [0, 15, -15, 0, 5, 0],
             opacity: [0, 1, 1, 1, 1, 1],
             scale: [1, 1, 1.1, 0.8, 1.05, 1], // Squash on impact, stretch on bounce
           }}
           transition={{ 
             times: [0, 0.2, 0.4, 0.6, 0.8, 1],
             duration: 3,
             ease: [0.22, 1, 0.36, 1]
           }}
           className="relative"
        >
            {/* Golden Sunset Gradient 'C' */}
            <span className="text-6xl md:text-[4vw] lg:text-[5.5vw] font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-amber-200 via-amber-400 to-amber-900 drop-shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                C
            </span>

            {/* Continuous Breathing motion */}
            <motion.div
               animate={{ y: [0, -8, 0], rotate: [0, 0.5, 0] }}
               transition={{ delay: 3.5, duration: 5, repeat: Infinity, ease: "easeInOut" }}
               className="absolute inset-0 pointer-events-none"
            />
        </motion.div>

        {/* The Expansion (ONFERENCE) - Impact Trigger (1.5s) */}
        <motion.div 
            className="flex items-center relative"
            initial="initial"
            animate="animate"
            variants={{
                animate: { transition: { staggerChildren: 0.08, delayChildren: 1.8 } }
            }}
        >
            {letters.map((char, i) => (
                <motion.span
                    key={`char-${i}`}
                    variants={letterVariants}
                    className="relative text-6xl md:text-[4vw] lg:text-[5.5vw] font-black leading-none text-white/95 inline-block overflow-hidden whitespace-nowrap"
                >
                    {/* Continuous Bobbing Animation per letter */}
                    <motion.span
                        animate={{ y: [0, -6, 0] }}
                        transition={{ delay: 3.5 + (i * 0.1), duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-block"
                    >
                        {char}
                    </motion.span>
                </motion.span>
            ))}

            <motion.div
                animate={{ left: ['-100%', '200%'] }}
                transition={{ delay: 4, duration: 3, ease: "easeInOut", repeat: Infinity, repeatDelay: 8 }}
                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] pointer-events-none"
            />
        </motion.div>
      </div>

    </div>
  );
};

export default ConferenceHero;
