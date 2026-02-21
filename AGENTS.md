# Agent Documentation (AGENTS.md)

This document is intended for AI Coding Agents to understand the technical architecture and constraints of the No-Code Girls TRPG application.

## System Architecture
The application is a React-based Single Page Application (SPA) that integrates directly with the Gemini API for Game Master (DM) logic.

### Directory Structure
```
src/
├── main.tsx                    # エントリーポイント
├── index.css                   # グローバルスタイル・アニメーション定義
├── App.tsx                     # ルートレイアウト（hooks 呼び出し + コンポーネント配置のみ）
│
├── types/
│   ├── index.ts                # 全型定義（GameState, Mood, ChatMessage, RollResult 等）
│   └── speech.ts               # Web Speech API の型補完
│
├── constants/
│   └── index.ts                # INITIAL_STATE, SYSTEM_PROMPT, MOOD_CONFIG, SCENE_*, Motion バリアント
│
├── services/
│   └── geminiClient.ts         # Gemini API シングルトンクライアント + レスポンスパーサー
│
├── hooks/
│   ├── useGameState.ts         # GameState・mood・turnCount 管理 + applyStateUpdate 純粋関数
│   ├── useChat.ts              # チャット履歴 + Gemini API メッセージ送信
│   ├── useSpeech.ts            # Web Speech API（音声認識 + 音声合成）
│   └── useDice.ts              # ダイスロール判定 + rollDice/isRollSuccess 純粋関数
│
└── components/
    ├── ScenePanel.tsx           # シーン背景・装飾
    ├── CharacterPanel.tsx       # キャラ情報（ポートレート・成長ゲージ・記憶ログ）
    ├── ChatPanel.tsx            # チャットUI（inputText/chatEndRef をローカル管理）
    ├── DiceOverlay.tsx          # ダイスロール結果オーバーレイ
    ├── AnimatedOverlay.tsx      # Motion 共通オーバーレイラッパー
    └── DevPanel.tsx             # 開発パネル（要件定義プロンプト出力）
```

### Key Components
- **`src/App.tsx`**: Orchestration layer (~80 lines). Calls hooks and distributes props to components.
- **Wafuu-Tech Design System**: A custom aesthetic combining traditional Japanese elements (Asanoha patterns, Zen fonts) with technical UI.
- **Gemini Integration**: Uses `@google/genai` singleton client via `services/geminiClient.ts`.
- **State Management**: Custom hooks (`useGameState`, `useChat`, `useDice`, `useSpeech`) encapsulate all state logic.
- **Voice Interaction**: Isolated in `useSpeech` hook using Web Speech API.

### Data Flow
```
User Input → Hooks (useChat/useSpeech/useDice)
  → Gemini API (services/geminiClient.ts)
  → State Update (useGameState.applyStateUpdate)
  → Components (ScenePanel/CharacterPanel/ChatPanel/DiceOverlay)
```

## Gemini Communication Protocol
The DM (Gemini) must follow a strict two-part response format:
1. `SAY: <Natural Language Dialogue>`
2. `JSON: <Machine-readable state updates and metadata>`

### JSON Schema
```json
{
  "state_update": {
    "scene": "string (optional)",
    "sceneType": "shrine | forest | sea (optional)",
    "hp": "number (optional)",
    "sync_delta": "number (optional)",
    "evolution_delta": "number (optional)",
    "inventory_add": "string[] (optional)",
    "inventory_remove": "string[] (optional)",
    "flags_set": "string[] (optional)",
    "memory_add": { "text": "string", "icon": "string" }
  },
  "request_roll": "boolean",
  "roll_type": "d20 | null",
  "mode": "normal | thinking | battle | success | awakened",
  "next_prompt": "string"
}
```

## Character Animation System

キャラクター動画は `public/assets/character/` に配置し、`constants/index.ts` の `CHARACTER_VIDEOS` で管理する。

| カテゴリ | ファイル | トリガー |
|----------|----------|----------|
| `movement` | `movement_01.mp4` | `sceneType` が `shibuya_stream` に変化した時（全画面オーバーレイ、z-150） |
| `movement` | `movement_02.mp4` | `sceneType` が `asakusa` に変化した時（全画面オーバーレイ、z-150） |
| `emote` | `emote_01.mp4` | mood が `success` または `battle` に変化した時（キャラパネル内） |
| `emote` | `emote_02.mp4` | mood が `awakened` に変化した時（キャラパネル内） |

- **全画面移動動画**: `AnimatedOverlay` + `<video>` で `fixed inset-0 z-[150]` に表示。`onEnded` で自動的に非表示。
- **エモート動画**: `CharacterPanel` のポートレートエリアに `emoteVideoUrl` prop 経由で注入。`onEmoteEnd` コールバックで親の state をクリア。

## UI & Mood System
The UI reacts to the `mode` returned in the JSON or the current interaction state:
- `normal`: Waiting for user input.
- `thinking`: Waiting for Gemini response.
- `battle`: Combat mode.
- `success`: Positive outcome/Critical hit.
- `awakened`: True power released (Sync > 40 & Evo > 40).

## Development Constraints
- **API Keys**: `VITE_GEMINI_API_KEY` via `import.meta.env` (singleton in `geminiClient.ts`).
- **Styling**: Tailwind CSS 4 for all styling.
- **Animations**: `motion/react` (Framer Motion) for state transitions; CSS animations for ambient effects.
- **Icons**: `lucide-react`.

## Documentation Maintenance Rules
- **Latest State Only**: All documentation files must always reflect the **current** state of the application.
- **No Historical Bloat**: Do not keep old logic, deprecated code snippets, or version history in these files.
- **Changelog**: All historical changes must be recorded in `CHANGELOG.md`.
- **Consistency**: Ensure that any code change is immediately reflected in the corresponding documentation sections.
