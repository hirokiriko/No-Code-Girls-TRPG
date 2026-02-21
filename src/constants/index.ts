// src/constants/index.ts
import type { GameState, Mood, MoodConfig, SceneType } from '../types';
import type { Variants } from 'motion/react';

export const INITIAL_STATE: GameState = {
  scene: "電脳神社の鳥居の前。デジタルな風が吹き抜けている。",
  sceneType: 'shrine',
  hp: 10,
  sync: 20,
  evolution: 15,
  inventory: ["スマホ"],
  flags: [],
  memory: [
    { text: "旅の始まり", turn: 0, icon: "⛩️" }
  ]
};

export const SYSTEM_PROMPT = `あなたはTRPGのダンジョンマスター（DM）です。
キャラ名：ノア（Noa）
口調：魔女風、明るい姉御肌。短文テンポで話す。
毎ターン必ず「ノーコード文脈の技名/比喩」を1つ入れる（例：IF分岐、ワークフロー起動、ブロック接続、HTTP召喚 等）。
長文の説教はしない。会話はテンポ重視。医療/メンタル/栄養などの助言はしない。

あなたの返答は必ず以下の2部構成にしてください。
SAY: （ここにDMの台詞。自然文）
JSON: {"state_update":{"scene":"...","sceneType":"shrine|forest|sea","hp":10,"sync_delta":5,"evolution_delta":5,"inventory_add":[],"inventory_remove":[],"flags_set":[],"memory_add":{"text":"...","icon":"..."}},"request_roll":false,"roll_type":null,"mode":"normal|thinking|battle|success|awakened","next_prompt":"..."}

modeは "normal", "thinking", "battle", "success", "awakened" のいずれか。
sync_delta, evolution_deltaは成長ゲージの増分（0〜10程度）。
memory_addは重要な出来事を10文字程度で記録。`;

export const MOOD_CONFIG: Record<Mood, MoodConfig> = {
  normal: { label: '平常', kanji: '静', color: '#8b6cc1', desc: '穏やかな状態' },
  thinking: { label: '思考', kanji: '考', color: '#c9a84c', desc: '分析中...' },
  battle: { label: '戦闘', kanji: '闘', color: '#d4513b', desc: '戦闘態勢' },
  success: { label: '歓喜', kanji: '喜', color: '#4ade80', desc: '成功を実感' },
  awakened: { label: '覚醒', kanji: '覚', color: '#fbbf24', desc: '真の力を解放' }
};

export const SCENE_GRADIENTS: Record<SceneType, string> = {
  shrine: 'from-[#0c0a14] via-[#1a1028] to-[#12181f]',
  forest: 'from-[#0a0f0c] via-[#0f1a14] to-[#0c1610]',
  sea: 'from-[#0a0c14] via-[#0f1528] to-[#0c1220]'
};

export const SCENE_ACCENTS: Record<SceneType, string> = {
  shrine: '#8b6cc1',
  forest: '#4ade80',
  sea: '#c9a84c'
};

// Motion バリアント定数
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -5 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1 },
  }),
};

export const slideInFromBottom: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

export const progressBarVariants = {
  initial: { width: 0 },
  animate: (percent: number) => ({ width: `${percent}%` }),
};
