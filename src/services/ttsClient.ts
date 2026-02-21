// src/services/ttsClient.ts
import { Modality } from '@google/genai';
import type { Mood } from '../types';
import { getGeminiClient } from './geminiClient';

const EMOTION_PROMPTS: Record<Mood, string> = {
  battle:   '力強く緊迫感を込めて言って',
  awakened: '神秘的で威厳を込めて、ゆっくりと言って',
  success:  '嬉しそうに元気よく言って',
  thinking: '落ち着いて思索的に言って',
  normal:   '明るく姉御口調で言って',
};

// シングルトン AudioContext（autoplay policy 対策）
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContext({ sampleRate: 24000 });
  }
  return sharedAudioCtx;
}

/** ユーザージェスチャー内で呼び出し、AudioContext を running 状態にする */
export async function unlockAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
}

/** base64 PCM (16bit, 24kHz, mono) → Float32Array に変換して AudioContext で再生 */
async function playPcmBase64(base64: string): Promise<void> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const samples = bytes.length / 2;
  const float32 = new Float32Array(samples);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  const buffer = ctx.createBuffer(1, samples, 24000);
  buffer.copyToChannel(float32, 0);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();

  return new Promise(resolve => { source.onended = () => resolve(); });
}

/** Gemini TTS でテキストを読み上げる。失敗時は Web Speech API にフォールバック */
export async function speakWithGeminiTTS(text: string, mood: Mood): Promise<void> {
  try {
    const ai = getGeminiClient();
    const emotion = EMOTION_PROMPTS[mood] ?? EMOTION_PROMPTS.normal;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: `${emotion}：${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (inlineData?.data) {
      await playPcmBase64(inlineData.data);
      return;
    }
  } catch (e) {
    console.warn('[TTS] Gemini TTS 失敗、Web Speech にフォールバック:', e);
  }

  // Web Speech API フォールバック
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  }
}
