# Google AI APIs Reference (2026年2月時点)

本ドキュメントは Gemini Hackathon 参加に向け、プロジェクトで活用可能な Google AI API の技術リファレンスです。

## SDK

| 項目 | 詳細 |
|------|------|
| パッケージ | `@google/genai` (v1.42.0) |
| 旧パッケージ | `@google/generative-ai` **非推奨・廃止** |
| プロジェクト現在 | `^1.29.0` → `npm install` で v1.42.0 に自動更新 |
| Node.js | v20 以降 |

```typescript
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

---

## 1. Gemini モデル

### モデルラインナップ

| モデル | ID | 入力 (/1M tokens) | 出力 (/1M tokens) | 特徴 |
|--------|-----|-------------------|-------------------|------|
| **Gemini 3.1 Pro** | `gemini-3.1-pro-preview` | $2.00 | $12.00 | 最新フラッグシップ。ARC-AGI-2: 77.1%, GPQA: 94.3% |
| **Gemini 3 Flash** | `gemini-3-flash-preview` | $0.50 | $3.00 | Pro級の性能を低コストで。**現在プロジェクトで使用中** |
| Gemini 3 Pro Image | `gemini-3-pro-image-preview` | $2.00 | $12.00 | テキスト+画像生成（4K、会話型編集） |
| Gemini 2.5 Pro | `gemini-2.5-pro` | $1.25 | $10.00 | 安定版。深い推論 |
| Gemini 2.5 Flash | `gemini-2.5-flash` | 無料枠あり | 無料枠あり | 低レイテンシ、高コスパ |

### Gemini 3.1 Pro の新機能

- **Dynamic Thinking**: `thinkingLevel` パラメータで推論深度を制御（`minimal` / `low` / `medium` / `high`）
- **カスタムツール最適化**: `gemini-3.1-pro-preview-customtools` エンドポイント
- **100万トークン入力コンテキスト**、65,536トークン出力
- **マルチモーダル入力**: テキスト、画像、動画、音声、PDF

### Thinking Level の使い分け（TRPG向け）

```typescript
const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: "...",
  config: {
    thinkingConfig: {
      thinkingLevel: "medium",  // "minimal" | "low" | "medium" | "high"
    }
  },
});
```

| レベル | 用途 | コスト |
|--------|------|--------|
| `minimal` | 簡単な返答、UI テキスト生成 | 最低 |
| `low` | 通常の探索・会話 | 低 |
| `medium` | 戦闘判定、シナリオ分岐 | 中 |
| `high` | 最終ボス戦、複雑なクエスト設計 | 高 |

---

## 2. Structured Output (JSON mode)

**現在の SAY/JSON 正規表現パースを完全に置き換え可能。** スキーマ準拠が保証される。

```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const gameResponseSchema = z.object({
  say: z.string().describe("DMの台詞"),
  state_update: z.object({
    scene: z.string().optional(),
    sceneType: z.enum(["shrine", "forest", "sea"]).optional(),
    hp: z.number().optional(),
    sync_delta: z.number().optional(),
    evolution_delta: z.number().optional(),
    inventory_add: z.array(z.string()).optional(),
    inventory_remove: z.array(z.string()).optional(),
    flags_set: z.array(z.string()).optional(),
    memory_add: z.object({
      text: z.string(),
      icon: z.string(),
    }).optional(),
  }),
  request_roll: z.boolean(),
  roll_type: z.string().nullable(),
  mode: z.enum(["normal", "thinking", "battle", "success", "awakened"]),
  next_prompt: z.string(),
});

const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: JSON.stringify(payload),
  config: {
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.7,
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(gameResponseSchema),
  },
});

const result = gameResponseSchema.parse(JSON.parse(response.text!));
```

**必要パッケージ**: `zod`, `zod-to-json-schema`

---

## 3. Function Calling

DM が判定を要求するとき、JSON フラグではなく関数呼び出しとして処理できる。

```typescript
import { Type, FunctionCallingConfigMode } from '@google/genai';

const rollDiceDeclaration = {
  name: 'roll_dice',
  description: 'TRPGのダイスを振る',
  parameters: {
    type: Type.OBJECT,
    properties: {
      sides: { type: Type.NUMBER, description: 'ダイスの面数' },
      count: { type: Type.NUMBER, description: '振るダイスの数' },
      reason: { type: Type.STRING, description: '判定理由' },
    },
    required: ['sides', 'count', 'reason'],
  },
};

const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: "...",
  config: {
    tools: [{ functionDeclarations: [rollDiceDeclaration] }],
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO }
    }
  }
});

// モデルが関数呼び出しを返す場合
for (const fn of response.functionCalls || []) {
  console.log(`${fn.name}(${JSON.stringify(fn.args)})`);
}
```

| モード | 説明 |
|--------|------|
| `AUTO` | モデルが判断して関数呼び出しかテキスト応答か選択 |
| `ANY` | 必ず関数を呼び出す |
| `NONE` | 関数呼び出しを禁止 |
| `VALIDATED` (Preview) | スキーマ準拠を保証しつつ自動判断 |

---

## 4. Imagen 4 (画像生成)

| モデル | ID | 料金/枚 |
|--------|----|---------|
| Imagen 4 Fast | `imagen-4.0-fast-generate-001` | $0.02 |
| Imagen 4 | `imagen-4.0-generate-001` | $0.04 |
| Imagen 4 Ultra | `imagen-4.0-ultra-generate-001` | $0.06 |

```typescript
const response = await ai.models.generateImages({
  model: 'imagen-4.0-generate-001',
  prompt: '和風の神社の前に立つ少女、桜の花びらが舞う、アニメスタイル',
  config: {
    numberOfImages: 1,
    aspectRatio: '16:9',  // 1:1, 3:4, 4:3, 9:16, 16:9
  }
});
// response.generatedImages[0].image.imageBytes (base64)
```

**TRPG活用**: シーン背景、キャラクターイラスト、アイテム画像の動的生成。

---

## 5. Gemini TTS (音声合成)

| モデル | 料金 (入力/1M tokens) | 料金 (音声出力/1M tokens) |
|--------|----------------------|--------------------------|
| `gemini-2.5-flash-preview-tts` | $0.50 | $10.00 |
| `gemini-2.5-pro-preview-tts` | $1.00 | $20.00 |

30種のプリセット音声。日本語対応。自然言語プロンプトでスタイル・感情を制御可能。

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-preview-tts',
  contents: [{ parts: [{ text: '元気よく言って：冒険の始まりだ！' }] }],
  config: {
    responseModalities: ['AUDIO'],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Kore' }
      }
    }
  }
});
// response.candidates[0].content.parts[0].inlineData (audio/pcm)
```

**TRPG活用**: DM ちょいてつちゃんのセリフ読み上げ。Web Speech API の上位互換。感情表現付き。

---

## 6. Gemini Live API (リアルタイム双方向音声)

WebSocket ベースの双方向ストリーミング。音声入出力でリアルタイム会話。

| 入出力 | テキスト | 音声/映像 |
|--------|---------|-----------|
| 入力 | $0.50/1M tokens | $3.00/1M tokens |
| 出力 | $2.00/1M tokens | $12.00/1M tokens |

```typescript
const session = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: ['AUDIO'],
  },
  callbacks: {
    onmessage: (message) => { /* 音声データ処理 */ },
    onopen: () => console.log('Connected'),
    onerror: (error) => console.error(error),
  }
});
```

**注意**: ブラウザからの直接接続にはエフェメラルトークンが必要（APIキー保護）。
**参考**: [React ベーススターターアプリ](https://github.com/google-gemini/live-api-web-console)

**TRPG活用**: GM/NPC とのリアルタイム音声対話。ハッカソンの Wow Moment に最適。

---

## 7. Lyria RealTime (動的BGM生成)

**ステータス: Experimental**

WebSocket でリアルタイムにBGMを生成・操作。テンポ・明るさ・密度を動的制御。

```typescript
const session = await ai.live.music.connect({
  model: 'models/lyria-realtime-exp',
  callbacks: {
    onmessage: (message) => {
      if (message.serverContent?.audioChunks) {
        // PCM オーディオバッファの再生
      }
    }
  }
});

await session.setWeightedPrompts({
  weightedPrompts: [
    { text: 'ファンタジーRPGの戦闘BGM、緊迫感のあるオーケストラ', weight: 1.0 }
  ]
});

// リアルタイムでパラメータ変更
await session.setMusicGenerationConfig({
  bpm: 140,
  brightness: 0.8,
  density: 0.9,
});
```

**TRPG活用**: シーンに応じた動的BGM生成・切り替え（探索→戦闘→休息）。

---

## 8. Veo 3.1 (動画生成)

| モデル | 720p/1080p | 4K |
|--------|-----------|-----|
| Veo 3.1 Fast | $0.15/秒 | $0.35/秒 |
| Veo 3.1 Standard | $0.40/秒 | $0.60/秒 |

ネイティブ音声生成対応（効果音・環境音を自動同期）。最大60秒。

```typescript
const response = await ai.models.generateVideo({
  model: 'veo-3.1-generate-preview',
  prompt: '暗い森の中を冒険者が松明を持って歩いている',
});
```

**TRPG活用**: シーン転換の演出動画。コストが高いため限定使用を推奨。

---

## 9. Speech-to-Text (Chirp 3)

| モデル | 料金 | 無料枠 |
|--------|------|--------|
| Chirp 3 (V2 API) | $0.016/分 | 月60分 |

リアルタイム認識、話者分離、自動言語検出、ノイズ除去。
npm: `@google-cloud/speech`

**TRPG活用**: プレイヤー音声入力の高精度化（現在の Web Speech API の代替）。

---

## 10. Grounding with Google Search

Google Search で最新情報を取得し、回答に反映。

```typescript
const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: "最新のノーコードツールのトレンドは？",
  config: {
    tools: [{ googleSearch: {} }],
  },
});
// response.candidates[0].groundingMetadata で引用情報取得
```

**料金**: $14 / 1,000 クエリ（Gemini 3 系）
**TRPG活用**: 特定イベントで現実世界の情報を参照するクエスト。全ターンでの使用は非推奨。

---

## 11. Context Caching

繰り返し使う長いプロンプトをキャッシュし、コスト最大90%削減。

```typescript
const cache = await ai.caches.create({
  model: "gemini-3-flash-preview",
  config: {
    contents: [{ role: "user", parts: [{ text: "長いワールド設定..." }] }],
    systemInstruction: "あなたはTRPGのDMです。...",
    ttl: "3600s",
  },
});

const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: "プレイヤーが森に入った",
  config: { cachedContent: cache.name },
});
```

**最小トークン**: Flash 1,024 / Pro 4,096
**TRPG活用**: システムプロンプト+ワールド設定のキャッシュ。サーバーサイド処理が前提。

---

## 12. Firebase AI Logic

API キーをフロントエンドに露出させずに Gemini API を利用する仕組み。

```typescript
import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

const firebaseApp = initializeApp({ /* config */ });
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: "gemini-3-flash-preview" });
```

Firebase App Check でボット対策。無料枠あり（Spark プラン）。

---

## TRPG プロジェクトへの統合優先度

| 優先度 | API | 用途 | コスト感 | 導入難度 |
|--------|-----|------|---------|---------|
| **最高** | Structured Output | SAY/JSON パース廃止→型安全な構造化出力 | なし（追加料金なし） | 低 |
| **最高** | Thinking Level | 場面に応じた推論深度の動的制御 | なし | 低 |
| **高** | Imagen 4 Fast | シーン背景・キャラクター画像の動的生成 | $0.02/枚 | 低 |
| **高** | Gemini TTS | DM セリフの感情付き音声合成 | 中 | 中 |
| **高** | Gemini Live API | リアルタイム音声対話 | 中 | 高 |
| **中** | Function Calling | ダイスロール・シーン切替の自動化 | なし | 中 |
| **中** | Lyria RealTime | 動的BGM生成 | 未定（実験的） | 高 |
| **中** | Grounding | 現実情報参照クエスト | $14/1K queries | 低 |
| **低** | Context Caching | コスト削減（要バックエンド） | 削減効果大 | 高 |
| **低** | Veo 3.1 | シーン演出動画 | $0.15〜0.60/秒 | 中 |
| **低** | Firebase AI Logic | API キー保護 | なし | 中 |

---

## 必要な追加パッケージ

```bash
# Structured Output (最優先)
npm install zod zod-to-json-schema

# SDK アップデート (既存)
npm update @google/genai
```

---

*Sources: [Gemini API Docs](https://ai.google.dev/gemini-api/docs), [Gemini 3.1 Pro Blog](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-pro/), [Imagen API](https://ai.google.dev/gemini-api/docs/imagen), [Live API](https://ai.google.dev/gemini-api/docs/live), [Gemini TTS](https://ai.google.dev/gemini-api/docs/speech-generation), [Lyria RealTime](https://ai.google.dev/gemini-api/docs/music-generation), [Veo](https://ai.google.dev/gemini-api/docs/video), [Pricing](https://ai.google.dev/gemini-api/docs/pricing)*
