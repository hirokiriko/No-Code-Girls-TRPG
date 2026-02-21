import { useMemo } from 'react';
import { SCENE_GRADIENTS, SCENE_ACCENTS, SCENE_BACKGROUNDS } from '../constants';
import type { GameState } from '../types';

interface ScenePanelProps {
  sceneType: GameState['sceneType'];
  scene: string;
  /** Imagen 4 で動的生成された背景画像 URL */
  generatedImageUrl?: string | null;
}

function pickSceneImage(sceneType: GameState['sceneType'], scene: string): string | null {
  const list = SCENE_BACKGROUNDS[sceneType];
  if (!list?.length) return null;
  let n = 0;
  for (let i = 0; i < scene.length; i++) n = (n * 31 + scene.charCodeAt(i)) >>> 0;
  const filename = list[n % list.length];
  const base = import.meta.env.BASE_URL || '/';
  return `${base}backgrounds/${sceneType}/${encodeURIComponent(filename)}`;
}

export function ScenePanel({ sceneType, scene, generatedImageUrl }: ScenePanelProps) {
  const safeSceneType = SCENE_GRADIENTS[sceneType] ? sceneType : 'shibuya';
  const staticBgUrl = useMemo(() => pickSceneImage(safeSceneType, scene), [safeSceneType, scene]);
  // Imagen 4 生成画像を優先し、なければ静的画像にフォールバック
  const activeBgUrl = generatedImageUrl ?? staticBgUrl;
  return (
    <div className="flex-1 md:w-[360px] lg:w-[480px] md:shrink-0 md:flex-none relative overflow-hidden rounded-tl-[4px]">
      {/* Background Image (when available) */}
      {activeBgUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url(${activeBgUrl})` }}
          role="img"
          aria-hidden
        />
      )}
      {/* Gradient overlay for readability + fallback when no image */}
      <div
        className={`absolute inset-0 transition-colors duration-1000 ${activeBgUrl ? 'bg-gradient-to-br from-black/60 via-black/40 to-black/70' : `bg-gradient-to-br ${SCENE_GRADIENTS[safeSceneType]}`}`}
      />

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
        {safeSceneType === 'shibuya_stream' ? (
          <>
            <span className="absolute left-[15%] top-[20%] text-[20px] opacity-40 animate-float-0 drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]">🌊</span>
            <span className="absolute left-[45%] top-[35%] text-[14px] opacity-50 animate-float-1 drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]">💎</span>
            <span className="absolute left-[75%] top-[50%] text-[16px] opacity-60 animate-float-2 drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]">⚡</span>
          </>
        ) : (
          <>
            <span className="absolute left-[15%] top-[20%] text-[20px] opacity-40 animate-float-0 drop-shadow-[0_0_8px_rgba(200,168,76,0.3)]">🏙️</span>
            <span className="absolute left-[45%] top-[35%] text-[14px] opacity-50 animate-float-1 drop-shadow-[0_0_8px_rgba(200,168,76,0.3)]">🚦</span>
            <span className="absolute left-[75%] top-[50%] text-[16px] opacity-60 animate-float-2 drop-shadow-[0_0_8px_rgba(200,168,76,0.3)]">📱</span>
          </>
        )}
      </div>

      {/* Atmosphere Glow */}
      <div
        className="absolute w-[60%] h-[60%] top-[20%] left-[20%] rounded-full animate-breathe pointer-events-none"
        style={{ background: `radial-gradient(circle, ${SCENE_ACCENTS[safeSceneType]}11, transparent 70%)` }}
      />

      {/* Scene Label */}
      <div className="absolute top-3 left-3.5 z-[2]">
        <div className="font-mono text-[8px] tracking-[3px] opacity-70" style={{ color: SCENE_ACCENTS[safeSceneType] }}>SCENE</div>
        <div className="font-serif text-base tracking-[2px] text-porcelain" style={{ textShadow: `0 0 20px ${SCENE_ACCENTS[safeSceneType]}44` }}>
          {scene.split('。')[0]}
        </div>
        <div className="font-sans text-[9px] text-muted mt-0.5">{scene.split('。')[1] || ''}</div>
      </div>

      {/* Bottom Border Decoration */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${SCENE_ACCENTS[safeSceneType]}33, transparent)` }}
      />

    </div>
  );
}
