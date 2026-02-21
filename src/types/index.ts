// src/types/index.ts

export type SceneType = 'shrine' | 'forest' | 'sea';
export type Mood = 'normal' | 'thinking' | 'battle' | 'success' | 'awakened';

export interface MemoryEntry {
  text: string;
  turn: number;
  icon: string;
}

export interface GameState {
  scene: string;
  sceneType: SceneType;
  hp: number;
  sync: number;
  evolution: number;
  inventory: string[];
  flags: string[];
  memory: MemoryEntry[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'dm';
  text: string;
  isAwakened?: boolean;
}

export interface RollResult {
  value: number;
  success: boolean;
}

export interface MoodConfig {
  label: string;
  kanji: string;
  color: string;
  desc: string;
}

export interface GamePayload {
  player_utterance: string;
  state: GameState;
  roll_result: number | null;
  turn: number;
}

export interface StateUpdate {
  scene?: string;
  sceneType?: SceneType;
  hp?: number;
  sync_delta?: number;
  evolution_delta?: number;
  inventory_add?: string[];
  inventory_remove?: string[];
  flags_set?: string[];
  memory_add?: { text: string; icon?: string };
}

export interface DMResponse {
  state_update: StateUpdate;
  request_roll: boolean;
  roll_type: string | null;
  mode: Mood;
  next_prompt: string;
}

export interface ParsedDMResponse {
  sayText: string;
  data: DMResponse | null;
}
