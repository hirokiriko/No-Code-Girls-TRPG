// src/services/liveTTSClient.ts
import { GoogleGenAI } from '@google/genai';
import type { Mood } from '../types';
import { getApiKey } from './geminiClient';

const EMOTION_PROMPTS: Record<Mood, string> = {
  battle:   '力強く緊迫感を込めて言って',
  awakened: '神秘的で威厳を込めて、ゆっくりと言って',
  success:  '嬉しそうに元気よく言って',
  thinking: '落ち着いて思索的に言って',
  normal:   '明るく姉御口調で言って',
};

export class LiveTTSClient {
  private session: any = null;
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private _isConnected = false;
  private resolveSpeak: (() => void) | null = null;
  private rejectSpeak: ((e: unknown) => void) | null = null;

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API key not set');

    const ai = new GoogleGenAI({ apiKey });
    this.audioCtx = new AudioContext({ sampleRate: 24000 });

    this.session = await (ai as any).live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
      callbacks: {
        onmessage: (message: any) => this.handleMessage(message),
        onopen: () => {
          this._isConnected = true;
          console.log('[LiveTTS] 接続成功');
        },
        onerror: (e: any) => {
          const detail = e instanceof Event
            ? `type=${e.type}`
            : String(e);
          console.warn('[LiveTTS] WebSocket エラー:', detail);
          if (this.rejectSpeak) {
            this.rejectSpeak(new Error(`WebSocket error: ${detail}`));
            this.resolveSpeak = null;
            this.rejectSpeak = null;
          }
        },
        onclose: () => {
          this._isConnected = false;
          console.log('[LiveTTS] 接続終了');
          if (this.rejectSpeak) {
            this.rejectSpeak(new Error('Connection closed'));
            this.resolveSpeak = null;
            this.rejectSpeak = null;
          }
        },
      },
    });
  }

  async speak(text: string, mood: Mood): Promise<void> {
    if (!this.session || !this._isConnected) {
      throw new Error('Not connected');
    }

    // 前の発話をキャンセルして即座に新しい発話を開始
    this.cancelCurrent();

    const emotion = EMOTION_PROMPTS[mood] ?? EMOTION_PROMPTS.normal;

    return new Promise<void>((resolve, reject) => {
      this.resolveSpeak = resolve;
      this.rejectSpeak = reject;

      try {
        this.session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: `${emotion}：${text}` }] }],
          turnComplete: true,
        });
      } catch (e) {
        this.resolveSpeak = null;
        this.rejectSpeak = null;
        reject(e);
      }
    });
  }

  cancelCurrent(): void {
    for (const source of this.scheduledSources) {
      try { source.stop(); } catch { /* ignore */ }
    }
    this.scheduledSources = [];
    this.nextStartTime = 0;
    if (this.resolveSpeak) {
      this.resolveSpeak();
      this.resolveSpeak = null;
    }
    this.rejectSpeak = null;
  }

  private handleMessage(message: any): void {
    // 音声チャンクを受信するたびにスケジューリング（シームレス再生）
    const parts = message.serverContent?.modelTurn?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          this.scheduleChunk(part.inlineData.data);
        }
      }
    }

    // ターン完了：最後のチャンクの再生が終わるタイミングで Promise を resolve
    if (message.serverContent?.turnComplete) {
      if (!this.audioCtx || this.nextStartTime === 0) {
        this.resolveSpeak?.();
        this.resolveSpeak = null;
        this.rejectSpeak = null;
        return;
      }
      const remainingMs = Math.max(0, (this.nextStartTime - this.audioCtx.currentTime) * 1000);
      setTimeout(() => {
        if (this.resolveSpeak) {
          this.resolveSpeak();
          this.resolveSpeak = null;
          this.rejectSpeak = null;
        }
      }, remainingMs + 50); // 50ms マージン
    }
  }

  private scheduleChunk(base64: string): void {
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

      const buffer = this.audioCtx.createBuffer(1, samples, 24000);
      buffer.copyToChannel(float32, 0);

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioCtx.destination);

      // ギャップなし連続再生のため、前のチャンクの終了時刻から開始
      const startAt = Math.max(this.audioCtx.currentTime, this.nextStartTime);
      source.start(startAt);
      this.nextStartTime = startAt + buffer.duration;
      this.scheduledSources.push(source);

      source.onended = () => {
        const idx = this.scheduledSources.indexOf(source);
        if (idx !== -1) this.scheduledSources.splice(idx, 1);
      };
    } catch (e) {
      console.warn('[LiveTTS] チャンク再生エラー:', e);
    }
  }

  async disconnect(): Promise<void> {
    this.cancelCurrent();
    try { await this.session?.close(); } catch { /* ignore */ }
    try { await this.audioCtx?.close(); } catch { /* ignore */ }
    this.session = null;
    this.audioCtx = null;
    this._isConnected = false;
  }
}

// シングルトン管理
let liveTTSClient: LiveTTSClient | null = null;
let initPromise: Promise<LiveTTSClient> | null = null;

export function getLiveTTSClient(): Promise<LiveTTSClient> {
  if (liveTTSClient?.isConnected) return Promise.resolve(liveTTSClient);

  if (!initPromise) {
    const client = new LiveTTSClient();
    initPromise = client.connect().then(() => {
      liveTTSClient = client;
      initPromise = null;
      return client;
    }).catch((e) => {
      initPromise = null;
      liveTTSClient = null;
      throw e;
    });
  }

  return initPromise;
}

export function resetLiveTTSClient(): void {
  liveTTSClient?.disconnect();
  liveTTSClient = null;
  initPromise = null;
}
