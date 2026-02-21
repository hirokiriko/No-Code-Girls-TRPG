// src/services/geminiClient.ts
import { GoogleGenAI } from '@google/genai';
import type { DMResponse, ParsedDMResponse } from '../types';

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

/**
 * Gemini レスポンスを SAY/JSON に分離する純粋関数
 */
export function parseGeminiResponse(rawText: string): ParsedDMResponse {
  const sayMatch = rawText.match(/SAY:\s*([\s\S]*?)(?=\nJSON:|$)/);
  const sayText = sayMatch ? sayMatch[1].trim() : rawText.trim();

  const jsonText = extractJsonBlock(rawText);
  let data: DMResponse | null = null;
  if (jsonText) {
    try {
      data = JSON.parse(jsonText) as DMResponse;
    } catch {
      // JSON パース失敗時は SAY のみで続行
    }
  }

  return { sayText, data };
}

/**
 * 括弧深度追跡でJSON ブロックを抽出（正規表現の貪欲マッチ問題を回避）
 */
function extractJsonBlock(text: string): string | null {
  const marker = text.indexOf('JSON:');
  if (marker === -1) return null;

  const after = text.slice(marker + 5);
  const start = after.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < after.length; i++) {
    if (after[i] === '{') depth++;
    else if (after[i] === '}') depth--;
    if (depth === 0) return after.slice(start, i + 1);
  }
  return null;
}
