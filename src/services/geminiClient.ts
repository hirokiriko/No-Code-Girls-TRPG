// src/services/geminiClient.ts
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import type { Mood, GamePayload } from '../types';
import { SYSTEM_PROMPT } from '../constants';

const STORAGE_KEY = 'gemini_api_key';

// シングルトンクライアント
let client: GoogleGenAI | null = null;

/** localStorage → 環境変数の順で API キーを取得 */
export function getApiKey(): string | null {
  return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_GEMINI_API_KEY || null;
}

/** API キーを localStorage に保存し、クライアントをリセット */
export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
  client = null;
}

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY が設定されていません');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

// Zod スキーマ（Structured Output 用）
const stateUpdateSchema = z.object({
  scene: z.string().optional(),
  sceneType: z.enum(['shibuya', 'shibuya_stream']).optional(),
  hp: z.number().optional(),
  sync_delta: z.number().optional(),
  evolution_delta: z.number().optional(),
  inventory_add: z.array(z.string()).optional(),
  inventory_remove: z.array(z.string()).optional(),
  flags_set: z.array(z.string()).optional(),
  memory_add: z.object({ text: z.string(), icon: z.string().optional() }).optional(),
});

export const gameResponseSchema = z.object({
  say: z.string(),
  state_update: stateUpdateSchema,
  request_roll: z.boolean(),
  roll_type: z.string().nullable(),
  mode: z.enum(['normal', 'thinking', 'battle', 'success', 'awakened']),
  next_prompt: z.string(),
});

export type GameResponse = z.infer<typeof gameResponseSchema>;

/** mood に応じた Thinking Level */
function moodToThinkingLevel(mood: Mood): ThinkingLevel {
  switch (mood) {
    case 'battle': return ThinkingLevel.MEDIUM;
    case 'awakened': return ThinkingLevel.HIGH;
    default: return ThinkingLevel.LOW;
  }
}

/** DM レスポンスを Structured Output で取得 */
export async function generateDMResponse(payload: GamePayload, mood: Mood): Promise<GameResponse> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: JSON.stringify(payload),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseJsonSchema: z.toJSONSchema(gameResponseSchema),
      thinkingConfig: { thinkingLevel: moodToThinkingLevel(mood) },
    },
  });

  const text = response.text ?? '{}';
  return gameResponseSchema.parse(JSON.parse(text));
}
