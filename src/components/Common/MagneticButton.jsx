import React, { useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';

/**
 * Premium Magnetic Button with hover attraction.
 */
const MagneticButton = ({ children, className, onClick, ...props }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const ref = useRef(null);

  const handleMouse = (e) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * 0.15);
    y.set(middleY * 0.15);
  };

  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      style={{ x, y }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default MagneticButton;
