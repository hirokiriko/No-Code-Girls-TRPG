import type { ReactNode } from 'react';
import { SCENE_GRADIENTS, SCENE_ACCENTS } from '../constants';
import type { GameState } from '../types';

interface ScenePanelProps {
  sceneType: GameState['sceneType'];
  scene: string;
  children?: ReactNode;
}

export function ScenePanel({ sceneType, scene, children }: ScenePanelProps) {
  return (
    <div className="flex-[1_1_60%] relative overflow-hidden rounded-tl-[4px]">
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${SCENE_GRADIENTS[sceneType]} transition-colors duration-1000`} />

      {/* Asanoha Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="asanoha" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M20 0L40 20L20 40L0 20Z M20 0L20 40 M0 20L40 20 M0 0L40 40 M40 0L0 40" fill="none" stroke="#e8e2d6" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#asanoha)" />
        </svg>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <span className="absolute left-[15%] top-[20%] text-[20px] opacity-40 animate-float-0 drop-shadow-[0_0_8px_rgba(200,168,76,0.3)]">✨</span>
        <span className="absolute left-[45%] top-[35%] text-[14px] opacity-50 animate-float-1 drop-shadow-[0_0_8px_rgba(200,168,76,0.3)]">💠</span>
        <span className="absolute left-[75%] top-[50%] text-[16px] opacity-60 animate-float-2 drop-shadow-[0_0_8px_rgba(200,168,76,0.3)]">📜</span>
      </div>

      {/* Atmosphere Glow */}
      <div
        className="absolute w-[60%] h-[60%] top-[20%] left-[20%] rounded-full animate-breathe pointer-events-none"
        style={{ background: `radial-gradient(circle, ${SCENE_ACCENTS[sceneType]}11, transparent 70%)` }}
      />

      {/* Scene Label */}
      <div className="absolute top-3 left-3.5 z-[2]">
        <div className="font-mono text-[8px] tracking-[3px] opacity-70" style={{ color: SCENE_ACCENTS[sceneType] }}>SCENE</div>
        <div className="font-serif text-base tracking-[2px] text-porcelain" style={{ textShadow: `0 0 20px ${SCENE_ACCENTS[sceneType]}44` }}>
          {scene.split('。')[0]}
        </div>
        <div className="font-sans text-[9px] text-muted mt-0.5">{scene.split('。')[1] || ''}</div>
      </div>

      {/* Bottom Border Decoration */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${SCENE_ACCENTS[sceneType]}33, transparent)` }}
      />

      {children}
    </div>
  );
}
