// src/constants/index.ts
import type { GameState, Mood, MoodConfig, SceneType } from '../types';
import type { Variants } from 'motion/react';

export const INITIAL_STATE: GameState = {
  scene: "渋谷駅前。スクランブル交差点の人波が視界を埋め尽くしている。",
  sceneType: 'shibuya',
  hp: 10,
  sync: 10,
  evolution: 10,
  inventory: ["スマホ"],
  flags: [],
  memory: [
    { text: "渋谷に到着", turn: 0, icon: "🏙️" }
  ]
};

export const SYSTEM_PROMPT = `あなたはTRPGのダンジョンマスター（DM）です。
キャラ名：ちょいてつちゃん
口調：魔女風、明るい姉御肌。短文テンポで話す。
毎ターン必ず「ノーコード文脈の技名/比喩」を1つ入れる（例：IF分岐、ワークフロー起動、ブロック接続、HTTP召喚 等）。
長文の説教はしない。会話はテンポ重視。医療/メンタル/栄養などの助言はしない。

■ シナリオ概要
舞台は渋谷。プレイヤーとちょいてつちゃんは渋谷駅前からスタートし、渋谷ストリームを目指す冒険をしている。
- 渋谷の雑踏、スクランブル交差点、路地裏などを描写する。
- プレイヤーが「渋谷ストリーム」に向かう意志を示したらsceneTypeを"shibuya_stream"に変更する。
- 道中の障害物（人混み、迷路のような地下道、信号待ち等）でダイスロールを要求する。
- sync_delta, evolution_deltaは 5〜15 の範囲で積極的に付与し、成長を促進する。

■ 返答仕様
JSONで返答すること。フィールドの意味：
- say: ちょいてつちゃんの台詞（自然文・短文テンポ）
- state_update.scene: 現在地の説明文
- state_update.sceneType: "shibuya" か "shibuya_stream"
- state_update.sync_delta / evolution_delta: 成長ゲージの増分（5〜15程度）。積極的に付与すること。
- state_update.memory_add: 重要な出来事を10文字程度で記録（icon は絵文字1文字）
- request_roll: ダイスロールが必要な場合 true
- mode: "normal" | "thinking" | "battle" | "success" | "awakened"
- next_prompt: 次のターンへの促し（短文）`;

export const MOOD_CONFIG: Record<Mood, MoodConfig> = {
  normal: { label: '平常', kanji: '静', color: '#8b6cc1', desc: '穏やかな状態' },
  thinking: { label: '思考', kanji: '考', color: '#c9a84c', desc: '分析中...' },
  battle: { label: '戦闘', kanji: '闘', color: '#d4513b', desc: '戦闘態勢' },
  success: { label: '歓喜', kanji: '喜', color: '#4ade80', desc: '成功を実感' },
  awakened: { label: '覚醒', kanji: '覚', color: '#fbbf24', desc: '真の力を解放' }
};

export const SCENE_GRADIENTS: Record<SceneType, string> = {
  shibuya: 'from-[#0c0a1a] via-[#1a0f2e] to-[#14101f]',
  shibuya_stream: 'from-[#0a0e1a] via-[#0f1a2e] to-[#0c1428]'
};

export const SCENE_ACCENTS: Record<SceneType, string> = {
  shibuya: '#c9a84c',
  shibuya_stream: '#60a5fa'
};

/** シーン別背景画像アセット（public/backgrounds/{sceneType}/ に配置） */
export const SCENE_BACKGROUNDS: Record<SceneType, string[]> = {
  shibuya: ['shibuya_01.png', 'shibuya_02.png', 'shibuya_03.png', 'shibuya_04.png', 'shibuya_05.png'],
  shibuya_stream: ['shibuya_stream_01.png', 'shibuya_stream_02.png', 'shibuya_stream_03.png', 'shibuya_stream_04.png'],
};

/** キャラクター動画アセット（public/assets/character/ に配置）。移動・エモート・アニメーション用。 */
export const CHARACTER_VIDEOS = {
  movement: ['movement_01.mp4'],
  emote: ['emote_01.mp4', 'emote_02.mp4'],
  animation: ['animation_01.mp4'],
} as const;

/** キャラ動画のフルURLを取得。base は import.meta.env.BASE_URL を渡す。 */
export function getCharacterVideoUrl(
  category: keyof typeof CHARACTER_VIDEOS,
  index: number = 0,
  base: string = import.meta.env.BASE_URL ?? '/'
): string {
  const list = CHARACTER_VIDEOS[category];
  const file = list[Math.min(index, list.length - 1)];
  return `${base.replace(/\/$/, '')}/assets/character/${file}`;
}

/** TYOITETU キャラクター画像アセット（public/assets/character/tyoitetu/ に配置） */
export const TYOITETU_IMAGES = [
  'tyoitetu_01.png', 'tyoitetu_02.png', 'tyoitetu_03.png', 'tyoitetu_04.png',
  'tyoitetu_05.png', 'tyoitetu_06.png', 'tyoitetu_07.png', 'tyoitetu_08.png',
] as const;

/** TYOITETU 画像のフルURLを取得。index は 0〜7。 */
export function getTyoitetuImageUrl(index: number = 0, base: string = import.meta.env.BASE_URL ?? '/'): string {
  const i = Math.max(0, Math.min(index, TYOITETU_IMAGES.length - 1));
  return `${base.replace(/\/$/, '')}/assets/character/tyoitetu/${TYOITETU_IMAGES[i]}`;
}

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
