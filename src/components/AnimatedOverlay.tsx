import { motion, AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';

interface AnimatedOverlayProps {
  show: boolean;
  className?: string;
  children?: ReactNode;
}

export function AnimatedOverlay({ show, className, children }: AnimatedOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
