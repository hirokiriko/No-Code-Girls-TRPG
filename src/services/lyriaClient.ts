// src/services/lyriaClient.ts
import { GoogleGenAI } from '@google/genai';
import type { Mood } from '../types';
import { getApiKey } from './geminiClient';

const BGM_PROMPTS: Record<Mood, string> = {
  normal:   '渋谷を探索する魔法少女、ジャズとシンセが融合したBGM、中テンポ、夜の都市',
  thinking: '静かで思索的なアンビエント音楽、神秘的、落ち着いた',
  battle:   'ファンタジー戦闘BGM、緊迫感のあるオーケストラ、BPM 140、アクション',
  success:  'ファンファーレ、達成感、明るいポップ、祝福の音楽',
  awakened: '覚醒、神秘的、壮大なシンフォニー、エピック、金色の光のイメージ',
};

const BGM_CONFIGS: Record<Mood, { bpm: number; brightness: number; density: number }> = {
  normal:   { bpm: 100, brightness: 0.5, density: 0.5 },
  thinking: { bpm: 70,  brightness: 0.3, density: 0.3 },
  battle:   { bpm: 140, brightness: 0.8, density: 0.9 },
  success:  { bpm: 120, brightness: 0.9, density: 0.7 },
  awakened: { bpm: 90,  brightness: 1.0, density: 0.8 },
};

export class LyriaClient {
  private session: any = null;
  private audioCtx: AudioContext | null = null;
  private currentMood: Mood = 'normal';
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error('API key not set');

      // Lyria RealTime は v1alpha のみ対応のため専用クライアントを使用
      const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } });
      this.audioCtx = new AudioContext({ sampleRate: 48000 });

      // @google/genai の WebSocket URL 二重スラッシュバグ回避
      // TODO: @google/genai のバグ修正後に削除
      const apiClient = (ai as any).live?.music?.apiClient;
      if (apiClient && typeof apiClient.getWebsocketBaseUrl === 'function') {
        const original = apiClient.getWebsocketBaseUrl.bind(apiClient);
        apiClient.getWebsocketBaseUrl = () => {
          const url: string = original();
          return url.endsWith('/') ? url.slice(0, -1) : url;
        };
      }

      this.session = await (ai as any).live.music.connect({
        model: 'models/lyria-realtime-exp',
        callbacks: {
          onmessage: (message: any) => this.handleMessage(message),
          onopen: () => {
            this.isConnected = true;
            this.setMoodBGM(this.currentMood);
          },
          onerror: (e: any) => {
            const detail = e instanceof Event
              ? `type=${e.type}, url=${(e.target as WebSocket)?.url ?? 'unknown'}`
              : String(e);
            console.warn('[Lyria] WebSocket エラー:', detail);
          },
          onclose: () => {
            this.isConnected = false;
          },
        },
      });
    } catch (e) {
      console.warn('[Lyria] 接続失敗（BGMなしで続行）:', e);
    }
  }

  private handleMessage(message: any): void {
    const chunks = message.serverContent?.audioChunks;
    if (!chunks?.length || !this.audioCtx) return;

    for (const chunk of chunks) {
      if (!chunk.data) continue;
      this.playChunk(chunk.data);
    }
  }

  private async playChunk(base64: string): Promise<void> {
    if (!this.audioCtx) return;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const samples = bytes.length / 2;
      const float32 = new Float32Array(samples);
      const view = new DataView(bytes.buffer);
      for (let i = 0; i < samples; i++) {
        float32[i] = view.getInt16(i * 2, true) / 32768;
      }

      const buffer = this.audioCtx.createBuffer(1, samples, 48000);
      buffer.copyToChannel(float32, 0);
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioCtx.destination);
      source.start();
    } catch (e) {
      console.warn('[Lyria] チャンク再生エラー:', e);
    }
  }

  async setMoodBGM(mood: Mood): Promise<void> {
    this.currentMood = mood;
    if (!this.session || !this.isConnected) return;
    try {
      await this.session.setWeightedPrompts({
        weightedPrompts: [{ text: BGM_PROMPTS[mood], weight: 1.0 }],
      });
      await this.session.setMusicGenerationConfig(BGM_CONFIGS[mood]);
    } catch (e) {
      console.warn('[Lyria] BGM切替エラー:', e);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.session?.close();
    } catch { /* ignore */ }
    try {
      await this.audioCtx?.close();
    } catch { /* ignore */ }
    this.session = null;
    this.audioCtx = null;
    this.isConnected = false;
  }
}
