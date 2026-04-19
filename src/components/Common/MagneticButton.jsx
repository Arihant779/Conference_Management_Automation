import React, { useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';

/**
 * Premium Magnetic Button with hover attraction.
 */
const MagneticButton = ({ children, className, onClick, ...props }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default MagneticButton;
