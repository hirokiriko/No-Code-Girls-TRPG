import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { Mood, GameState } from '../types';
import { MOOD_CONFIG, getTyoitetuImageUrl } from '../constants';

const MOOD_IMAGES: Record<Mood, { src: string; fallback: string }> = {
  normal: { src: getTyoitetuImageUrl(3), fallback: '👩‍💻' },
  thinking: { src: getTyoitetuImageUrl(1), fallback: '🧐' },
  battle: { src: getTyoitetuImageUrl(2), fallback: '⚔️' },
  success: { src: getTyoitetuImageUrl(0), fallback: '✨' },
  awakened: { src: getTyoitetuImageUrl(6), fallback: '🌟' },
};

interface GaugeBarProps {
  label: string;
  value: number;
  color: string;
  brightColor: string;
  threshold: number;
}

function GaugeBar({ label, value, color, brightColor, threshold }: GaugeBarProps) {
  const isHigh = value > threshold;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-end mb-1">
        <span className="font-mono text-[9px] tracking-[2px]" style={{ color }}>{label}</span>
        <span className={`font-mono text-[11px] font-medium`} style={{ color: isHigh ? brightColor : color }}>
          {value}%
        </span>
      </div>
      <div className="w-full h-1 rounded-[1px] overflow-hidden" style={{ backgroundColor: `${color}1a` }}>
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          style={{
            background: isHigh ? `linear-gradient(90deg, ${color}, ${brightColor})` : `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: isHigh ? `0 0 8px ${color}66` : 'none',
          }}
        />
      </div>
    </div>
  );
}

interface CharacterPanelProps {
  mood: Mood;
  gameState: GameState;
  isAwakened: boolean;
}

export function CharacterPanel({ mood, gameState, isAwakened }: CharacterPanelProps) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => setImgError(false), [mood]);
  return (
    <div className="flex-1 min-w-[180px] flex flex-col bg-base/95 border-l border-wisteria/10 rounded-tr-[4px] overflow-hidden">
      {/* Section A: Portrait */}
      <div className="p-4 px-3.5 pb-3 flex flex-col items-center border-b border-wisteria/10">
        <div
          className={`w-[100px] h-[120px] rounded-[4px] border-[1.5px] relative overflow-hidden transition-all duration-600 flex flex-col items-center justify-center ${
            isAwakened ? 'border-bright-gold/33 shadow-[0_0_24px_rgba(251,191,36,0.22),inset_0_0_30px_rgba(251,191,36,0.08)]' : 'border-wisteria/33 shadow-lg'
          }`}
          style={{ background: isAwakened ? 'linear-gradient(180deg, #1a0d2e, #2d1b4a, #1a0d2e)' : 'linear-gradient(180deg, #12101a, #1a1828, #12101a)' }}
        >
          <div className="absolute top-2 right-2 font-serif text-[40px] opacity-20 pointer-events-none" style={{ color: MOOD_CONFIG[mood].color }}>
            {MOOD_CONFIG[mood].kanji}
          </div>
          <div className="z-[1]">
            {imgError ? (
              <span className="text-[42px]">{MOOD_IMAGES[mood].fallback}</span>
            ) : (
              <img
                src={MOOD_IMAGES[mood].src}
                alt={MOOD_CONFIG[mood].label}
                className="w-[80px] h-[100px] object-cover"
                onError={() => setImgError(true)}
              />
            )}
          </div>
          <div className="font-mono text-[7px] tracking-[3px] opacity-60 mt-2" style={{ color: MOOD_CONFIG[mood].color }}>
            {isAwakened ? 'AWAKENED' : 'IMAGE SLOT'}
          </div>
          <div className="absolute top-[3px] left-[3px] w-2 h-2 border-t border-l" style={{ borderColor: `${MOOD_CONFIG[mood].color}44` }} />
          <div className="absolute bottom-[3px] right-[3px] w-2 h-2 border-b border-r" style={{ borderColor: `${MOOD_CONFIG[mood].color}44` }} />
        </div>
        <div className="mt-2 text-center">
          <div className="font-serif text-[14px] tracking-[4px] text-porcelain">ちょいてつちゃん</div>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <div
              className="w-[5px] h-[5px] rounded-full animate-pulse"
              style={{ backgroundColor: MOOD_CONFIG[mood].color, boxShadow: `0 0 6px ${MOOD_CONFIG[mood].color}` }}
            />
            <span className="font-mono text-[9px] tracking-[2px]" style={{ color: MOOD_CONFIG[mood].color }}>
              {MOOD_CONFIG[mood].label} — {MOOD_CONFIG[mood].desc}
            </span>
          </div>
        </div>
      </div>

      {/* Section B: Growth Gauges */}
      <div className="p-3 px-3.5 border-b border-wisteria/10">
        <div className="font-mono text-[7px] text-muted tracking-[3px] mb-2 uppercase">成長パラメーター</div>
        <GaugeBar label="同期 SYNC" value={gameState.sync} color="#c9a84c" brightColor="#fbbf24" threshold={80} />
        <GaugeBar label="進化 EVOLUTION" value={gameState.evolution} color="#8b6cc1" brightColor="#a78bfa" threshold={80} />
        <div className={`mt-2 p-1 px-2 rounded-[2px] text-center font-mono text-[7px] tracking-[2px] border transition-colors ${
          (gameState.sync > 40 && gameState.evolution > 40)
            ? 'bg-bright-gold/10 border-bright-gold/20 text-bright-gold'
            : 'bg-muted/5 border-muted/10 text-muted'
        }`}>
          {(gameState.sync > 40 && gameState.evolution > 40) ? '⚡ 覚醒条件達成' : '覚醒閾値: SYNC>40 & EVO>40'}
        </div>
      </div>

      {/* Section C: Memory Log */}
      <div className="flex-1 p-2.5 px-3.5 overflow-y-auto min-h-0">
        <div className="font-mono text-[7px] text-muted tracking-[3px] mb-1.5 uppercase">記憶 MEMORY</div>
        <div className="space-y-1">
          {gameState.memory.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-1.5 py-1 border-b border-muted/10"
            >
              <span className="text-[11px]">{m.icon}</span>
              <span className="font-sans text-[10px] text-porcelain flex-1 truncate">{m.text}</span>
              <span className="font-mono text-[7px] text-muted">#{m.turn}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
