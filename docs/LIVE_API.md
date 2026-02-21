# Gemini Live API 実装ガイド

> 最終更新: 2026-02-21
> 対象: `@google/genai` SDK / Gemini API（Gemini API Key 利用）

---

## 目次

1. [概要](#1-概要)
2. [接続方法（`ai.live.connect`）](#2-接続方法ailiveconnect)
3. [対応モデル一覧](#3-対応モデル一覧)
4. [responseModalities](#4-responsemodalities)
5. [speechConfig・音声設定](#5-speechconfig音声設定)
6. [セッションメソッド](#6-セッションメソッド)
7. [コールバックとメッセージフォーマット](#7-コールバックとメッセージフォーマット)
8. [Lyria Music API](#8-lyria-music-api)
9. [既知のバグ・制限事項](#9-既知のバグ制限事項)
10. [プロジェクトへの適用状況](#10-プロジェクトへの適用状況)

---

## 1. 概要

Gemini Live API は **低レイテンシ・双方向 WebSocket ストリーミング** を提供するリアルタイム API です。テキスト/音声/映像の入出力に対応し、以下の用途で利用できます。

- TTS（テキスト → 音声）の低遅延ストリーミング出力
- STT（音声 → テキスト）のリアルタイム認識
- 双方向リアルタイム会話（音声 ↔ 音声）
- リアルタイム音楽生成（Lyria RealTime）

### SDK インポート

```typescript
import { GoogleGenAI, Modality } from '@google/genai';
```

---

## 2. 接続方法（`ai.live.connect`）

### 最小構成

```typescript
const ai = new GoogleGenAI({ apiKey: 'YOUR_API_KEY' });

const session = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
    },
  },
  callbacks: {
    onopen: () => console.log('接続成功'),
    onmessage: (message) => handleMessage(message),
    onerror: (e) => console.error('エラー:', e),
    onclose: () => console.log('切断'),
  },
});
```

### `LiveConnectConfig` 全フィールド一覧

| フィールド | 型 | 説明 |
|---|---|---|
| `responseModalities` | `Modality[]` | `[Modality.AUDIO]` か `[Modality.TEXT]`（1種のみ） |
| `systemInstruction` | `Content \| string` | システム指示（テキストのみ） |
| `tools` | `ToolListUnion` | 関数定義・Google Search 等 |
| `speechConfig` | `SpeechConfig` | 音声出力設定 |
| `inputAudioTranscription` | `{}` | 入力音声の STT（**Vertex AI のみ動作**） |
| `outputAudioTranscription` | `{}` | 出力音声の STT（テキスト取得時に使用） |
| `realtimeInputConfig` | `RealtimeInputConfig` | VAD（音声活動検出）設定 |
| `enableAffectiveDialog` | `boolean` | 感情認識（native audio モデルのみ） |
| `proactivity` | `ProactivityConfig` | 積極的応答制御 |
| `thinkingConfig` | `ThinkingConfig` | 思考トークン設定 |
| `contextWindowCompression` | `ContextWindowCompressionConfig` | 長時間セッション向けコンテキスト圧縮 |
| `sessionResumption` | `SessionResumptionConfig` | 前セッションの再開ハンドル |

### フル設定例

```typescript
const session = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction: 'あなたは親切なアシスタントです。',
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
    },
    outputAudioTranscription: {},          // 音声のテキスト化（要約ログ等に活用）
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        startOfSpeechSensitivity: 'HIGH',
        endOfSpeechSensitivity: 'HIGH',
        prefixPaddingMs: 100,
        silenceDurationMs: 500,
      },
    },
    enableAffectiveDialog: true,           // 感情認識ダイアログ
    proactivity: { proactiveAudio: true }, // 無関係な発話に無応答
    thinkingConfig: {
      thinkingBudget: 0,                   // 0 = thinking 無効（TTS用途では不要）
    },
    contextWindowCompression: {
      enabled: true,
      triggerTokens: 120000,
    },
  },
  callbacks: { /* ... */ },
});
```

---

## 3. 対応モデル一覧

| モデルID | 状態 | 廃止予定 | 備考 |
|---|---|---|---|
| `gemini-2.5-flash-native-audio-preview-12-2025` | Preview (Gemini API) | 2026-12-13 | **推奨**・30 HD 音声・24 言語・感情認識 |
| `gemini-live-2.5-flash-native-audio` | GA (Vertex AI) | 2026-12-13 | Vertex AI 向け本番モデル |
| `gemini-live-2.5-flash-preview-native-audio-09-2025` | **非推奨** | **2026-03-19** | 要マイグレーション |
| `gemini-2.0-flash-live-preview-04-09` | 利用可 | - | 旧世代・テキスト出力安定 |

### Native Audio モデルの仕様

| 項目 | 値 |
|---|---|
| コンテキストウィンドウ（入力） | 128k トークン |
| コンテキストウィンドウ（出力） | 64k トークン |
| 最大同時セッション | 5,000（Gemini API） |
| セッション時間上限 | 音声のみ: 15 分 / 映像あり: 2 分 |
| 出力音声サンプルレート | 24kHz / 16bit / モノラル（PCM） |

---

## 4. `responseModalities`

```typescript
import { Modality } from '@google/genai';

// AUDIO のみ（native audio モデルで推奨）
responseModalities: [Modality.AUDIO]

// TEXT のみ（native audio モデルでは動作しない → 後述バグ参照）
responseModalities: [Modality.TEXT]
```

> **重要**: 1 セッションで TEXT と AUDIO を同時設定することは不可。
> native audio モデルで `TEXT` を指定すると WebSocket 1007 エラーで切断される。
> 音声出力しつつテキストも必要な場合は `outputAudioTranscription: {}` を使用する。

---

## 5. `speechConfig` 音声設定

### 設定構造

```typescript
speechConfig: {
  voiceConfig: {
    prebuiltVoiceConfig: {
      voiceName: 'Kore'  // 下記リストから選択
    }
  }
}
```

### ハーフカスケードモデル対応音声（8種）

`Puck` / `Charon` / `Kore` / `Fenrir` / `Aoede` / `Leda` / `Orus` / `Zephyr`

### Native Audio モデル対応 HD 音声（30種）

`Achernar` / `Achird` / `Algenib` / `Algieba` / `Alnilam` / `Aoede` / `Autonoe` /
`Callirrhoe` / `Charon` / `Despina` / `Enceladus` / `Erinome` / `Fenrir` / `Gacrux` /
`Iapetus` / `Kore` / `Laomedeia` / `Leda` / `Orus` / `Puck` / `Pulcherrima` /
`Rasalgethi` / `Sadachbia` / `Sadaltager` / `Schedar` / `Sulafat` / `Umbriel` /
`Vindemiatrix` / `Zephyr` / `Zubenelgenubi`

> 本プロジェクトでは `Kore` を使用。HD 音声は日本語を含む 24 言語に対応。

---

## 6. セッションメソッド

### `sendClientContent` — テキスト/構造化コンテンツ送信

ターン管理ありの送信（TTS 用途に適している）。

```typescript
session.sendClientContent({
  turns: [
    { role: 'user', parts: [{ text: '明るく言って：こんにちは！' }] }
  ],
  turnComplete: true,  // true = このターンで完結（応答を促す）
});
```

### `sendRealtimeInput` — リアルタイム入力（音声/テキスト）

音声 STT や双方向会話に使用。

```typescript
// 音声ストリーム送信（16kHz PCM）
session.sendRealtimeInput({
  audio: {
    data: audioBase64,                    // Base64 エンコード済み PCM
    mimeType: 'audio/pcm;rate=16000',
  }
});

// テキストのリアルタイム入力
session.sendRealtimeInput({
  text: 'テキスト入力',
});

// 手動 VAD 制御（automaticActivityDetection.disabled: true 時）
session.sendRealtimeInput({ activityStart: {} });
session.sendRealtimeInput({ activityEnd: {} });
```

### `close` — セッション終了

```typescript
await session.close();
```

---

## 7. コールバックとメッセージフォーマット

### コールバック定義

```typescript
callbacks: {
  onopen: () => void,
  onmessage: (message: LiveServerMessage) => void,
  onerror: (e: ErrorEvent) => void,
  onclose: (e: CloseEvent) => void,
}
```

### `LiveServerMessage` 構造

```typescript
interface LiveServerMessage {
  setupComplete?: {};                         // 接続確立完了シグナル
  serverContent?: {
    modelTurn?: {
      parts: Array<{
        text?: string;                        // テキスト出力
        inlineData?: {
          data: string;                       // Base64 PCM 音声データ
          mimeType: string;                   // 'audio/pcm;rate=24000'
        };
      }>;
    };
    turnComplete?: boolean;                   // ターン完了
    interrupted?: boolean;                    // ユーザー割り込み発生
    inputTranscription?: { text: string };   // 入力音声 STT 結果
    outputTranscription?: { text: string };  // 出力音声 STT 結果
    generationComplete?: boolean;            // 生成完了
  };
  toolCall?: {
    functionCalls: FunctionCall[];           // 関数呼び出し
  };
  sessionResumptionUpdate?: {
    newHandle: string;                       // 再開ハンドル（有効期間 2 時間）
    resumable: boolean;
  };
  goAway?: {
    timeLeft: string;                        // 接続終了までの残り時間
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
```

### 音声チャンク受信・再生のパターン

受信した PCM は **24kHz / 16bit signed little-endian / モノラル**。

```typescript
function scheduleChunk(base64: string, audioCtx: AudioContext, nextStartTime: number): number {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const samples = bytes.length / 2;
  const float32 = new Float32Array(samples);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;  // little-endian 正規化
  }

  const buffer = audioCtx.createBuffer(1, samples, 24000);
  buffer.copyToChannel(float32, 0);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);

  // nextStartTime を積み上げてシームレス連続再生
  const startAt = Math.max(audioCtx.currentTime, nextStartTime);
  source.start(startAt);
  return startAt + buffer.duration;  // 次の nextStartTime を返す
}
```

---

## 8. Lyria Music API

### 概要

Lyria RealTime は WebSocket でリアルタイム音楽を生成する API。
`@google/genai` の `ai.live.music.connect` 経由で使用。

- **必須**: `apiVersion: 'v1alpha'`
- **出力音声**: 48kHz / 16bit signed little-endian / ステレオ

### 接続

```typescript
// Lyria は v1alpha 専用
const ai = new GoogleGenAI({
  apiKey: 'YOUR_KEY',
  httpOptions: { apiVersion: 'v1alpha' }
});

// SDK の WebSocket URL 末尾スラッシュバグ対策（要確認：SDK 修正後に削除）
const apiClient = (ai as any).live?.music?.apiClient;
if (apiClient && typeof apiClient.getWebsocketBaseUrl === 'function') {
  const original = apiClient.getWebsocketBaseUrl.bind(apiClient);
  apiClient.getWebsocketBaseUrl = () => {
    const url: string = original();
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };
}

const session = await (ai as any).live.music.connect({
  model: 'models/lyria-realtime-exp',
  callbacks: {
    onopen: () => { /* 接続後に setWeightedPrompts → play() */ },
    onmessage: (msg) => { /* audioChunks を処理 */ },
    onerror: (e) => console.warn('[Lyria] エラー:', e),
    onclose: () => { /* 切断処理 */ },
  },
});
```

### 音楽制御メソッド

```typescript
// プロンプト設定（重み付き・ネガティブ重み可）
await session.setWeightedPrompts({
  weightedPrompts: [
    { text: 'epic orchestral battle music', weight: 1.0 },
    { text: 'jazz piano', weight: 0.3 },        // 複数プロンプトをブレンド
  ]
});

// 音楽生成パラメータ（全フィールドをまとめて送る必要あり）
await session.setMusicGenerationConfig({
  bpm: 120,           // 60〜200 BPM
  guidance: 4.0,      // プロンプト追従度 0.0〜6.0（デフォルト 4.0）
  density: 0.5,       // 音の密度 0.0〜1.0
  brightness: 0.7,    // 音の明るさ 0.0〜1.0
  temperature: 1.1,   // ランダム性 0.0〜3.0（デフォルト 1.1）
  topK: 40,           // トークン選択数 1〜1000（デフォルト 40）
  seed: 42,           // 生成シード（再現性確保）
  muteBass: false,
  muteDrums: false,
  onlyBassAndDrums: false,
  // scale: 'C_MAJOR' | 'D_MAJOR' | ... | 'B_MAJOR' （12種）
});

// 再生開始
await session.play();

// BPM・スケール変更後は必ず resetContext() を呼ぶ
await session.resetContext();
```

### 受信メッセージフォーマット

```typescript
onmessage: (message) => {
  const chunks = message.serverContent?.audioChunks;
  if (!chunks?.length) return;
  for (const chunk of chunks) {
    if (chunk.data) {
      // Base64 → 16bit PCM 48kHz ステレオ
      playChunk(chunk.data, audioCtx);
    }
  }
}
```

### 受信 PCM 再生（ステレオ 48kHz）

```typescript
async function playChunk(base64: string, audioCtx: AudioContext): Promise<void> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const samples = bytes.length / 2;
  const float32 = new Float32Array(samples);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }

  // ステレオ: 2ch で channels=2 にするか、モノラルに変換
  const buffer = audioCtx.createBuffer(1, samples, 48000);
  buffer.copyToChannel(float32, 0);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
}
```

---

## 9. 既知のバグ・制限事項

### 重大な既知バグ

#### 1. Native Audio モデルでテキスト出力ができない

`gemini-2.5-flash-native-audio-*` で `responseModalities: ['TEXT']` を指定すると、
WebSocket **1007 エラー** "Cannot extract voices from a non-audio request" で切断される。

**ワークアラウンド**: `responseModalities: ['AUDIO']` + `outputAudioTranscription: {}` で音声テキストを取得。

#### 2. 制御文字バグ（未解決・P2 優先度）

`gemini-2.5-flash-native-audio-preview-12-2025` でまれに音声の代わりに
制御文字 (`<ctrl46>`) がトランスクリプトに出力されることがある。
関数呼び出し・多言語・長い会話で発生しやすい。確実なワークアラウンドなし。

#### 3. `turnComplete` 早期発火バグ

長いテキスト入力（20 語以上）や `enableAffectiveDialog: true` 時に
応答が不完全なまま `turnComplete` が発火することがある。確実なワークアラウンドなし。

#### 4. `inputAudioTranscription` が Gemini API Key で動作しない

Vertex AI（Cloud プロジェクト）経由でのみ完全動作する。

**ワークアラウンド**:
```typescript
const ai = new GoogleGenAI({
  vertexai: true,
  project: 'your-project-id',
  location: 'us-east1'
});
```

#### 5. Lyria WebSocket URL 二重スラッシュバグ

`@google/genai` SDK が `/` で終わる URL に更に `/` を追加してしまうバグ。
プロジェクトコード（`lyriaClient.ts`）で `getWebsocketBaseUrl()` のモンキーパッチにより対処済み。
SDK が修正されたら当該ワークアラウンドを削除すること。

---

### 設定上の制限一覧

| 制限事項 | 詳細 |
|---|---|
| `responseModalities` | 1 セッションに 1 種類のみ（TEXT または AUDIO） |
| セッション時間 | 音声のみ: 最大 15 分 / 映像あり: 2 分 |
| 同時セッション数 | 最大 5,000（Gemini API）/ 1,000（Vertex AI） |
| `systemInstruction` | テキストのみ（画像不可） |
| セッション再開ハンドル | 有効期間 2 時間 |
| `setMusicGenerationConfig` | フィールド個別更新不可・毎回全フィールドを送信 |
| Lyria BPM/スケール変更 | 変更後に `resetContext()` 必須 |

### 廃止予定モデル（要マイグレーション）

| 廃止モデル | 廃止日 | 移行先 |
|---|---|---|
| `gemini-live-2.5-flash-preview-native-audio-09-2025` | **2026-03-19** | `gemini-live-2.5-flash-native-audio` |

---

## 10. プロジェクトへの適用状況

### 現在の実装ファイル

| ファイル | 用途 | 状態 |
|---|---|---|
| [src/services/liveTTSClient.ts](../src/services/liveTTSClient.ts) | TTS（テキスト → 音声） | 動作中 |
| [src/services/lyriaClient.ts](../src/services/lyriaClient.ts) | BGM（Lyria RealTime） | 動作中 |
| [src/services/ttsClient.ts](../src/services/ttsClient.ts) | 旧 TTS（REST API） | 非推奨 |

### `liveTTSClient.ts` の現在設定

- モデル: `gemini-2.5-flash-native-audio-preview-12-2025`（最新推奨モデル）
- 音声: `Kore`（HD 音声対応）
- 出力: `AUDIO`（正しい設定）
- AudioContext: 24kHz（正しいサンプルレート）

### `lyriaClient.ts` の現在設定

- モデル: `models/lyria-realtime-exp`
- API バージョン: `v1alpha`（必須設定済み）
- AudioContext: 48kHz（正しいサンプルレート）
- URL バグ対策: モンキーパッチ済み

### 今後の検討事項

1. **廃止前確認**: 2026-03-19 以前に `09-2025` モデルを使用していないか確認
2. **`outputAudioTranscription`**: 発話ログ・デバッグ用に追加を検討
3. **`sessionResumption`**: 長時間プレイ時のセッション再開に活用可能
4. **Lyria URL バグ**: SDK アップデート時にモンキーパッチの削除を忘れずに行う

---

## 参考リンク

- [Live API スタートガイド](https://ai.google.dev/gemini-api/docs/live)
- [Live API 機能ガイド](https://ai.google.dev/gemini-api/docs/live-guide)
- [Live Music API リファレンス](https://ai.google.dev/api/live_music)
- [Lyria RealTime ドキュメント](https://ai.google.dev/gemini-api/docs/music-generation)
- [js-genai SDK ドキュメント](https://googleapis.github.io/js-genai/)
- [js-genai GitHub サンプル](https://github.com/googleapis/js-genai/tree/main/sdk-samples)
