// src/services/imagenClient.ts
import { getGeminiClient } from './geminiClient';

const MOOD_STYLE: Record<string, string> = {
  battle: '緊迫感のある戦闘シーン、暗い赤のエフェクト',
  awakened: '金色の光のオーラ、神秘的な覚醒演出',
  success: '輝く光のエフェクト、達成感',
  thinking: '静かで思索的な雰囲気',
  normal: 'アニメスタイル、幻想的',
};

/** シーンの説明から Imagen 4 で背景画像を生成し、data URL を返す */
export async function generateSceneImage(
  scene: string,
  sceneType: string,
  mood: string = 'normal'
): Promise<string | null> {
  try {
    const ai = getGeminiClient();
    const styleHint = MOOD_STYLE[mood] ?? MOOD_STYLE.normal;
    const locationHint = sceneType === 'shibuya_stream'
      ? '渋谷ストリーム、未来的なガラス張りの高層ビル、青いホログラム光、テクノロジーと魔法が融合した世界'
      : '渋谷スクランブル交差点、夜景、ネオン、都市の雑踏';

    const prompt = `${scene}。${locationHint}。ノーコード魔法少女RPG、${styleHint}、超高品質、16:9`;

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-fast-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) return null;
    return `data:image/png;base64,${imageBytes}`;
  } catch (e) {
    console.warn('[Imagen] 画像生成に失敗しました:', e);
    return null;
  }
}
