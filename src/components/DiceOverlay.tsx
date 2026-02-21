import { motion, AnimatePresence } from 'motion/react';
import type { RollResult } from '../types';

interface DiceOverlayProps {
  rollResult: RollResult | null;
}

export function DiceOverlay({ rollResult }: DiceOverlayProps) {
  return (
    <AnimatePresence>
      {rollResult && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-base/80 backdrop-blur-md z-10 flex items-center justify-center"
        >
          <div className="p-5 px-9 border rounded-[2px] bg-base/90 flex flex-col items-center" style={{ borderColor: `${rollResult.success ? '#4ade80' : '#d4513b'}44` }}>
            <div className="font-mono text-[7px] text-muted tracking-[4px] mb-2 uppercase">PROBABILITY ENGINE</div>
            <div
              className="font-serif text-[52px] font-bold leading-none"
              style={{ color: rollResult.success ? '#4ade80' : '#d4513b', textShadow: `0 0 30px ${rollResult.success ? '#4ade80' : '#d4513b'}44` }}
            >
              {rollResult.value}
            </div>
            <div className="font-mono text-[10px] tracking-[6px] mt-2 uppercase" style={{ color: rollResult.success ? '#4ade80' : '#d4513b' }}>
              {rollResult.success ? 'SUCCESS' : 'FAILURE'}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
