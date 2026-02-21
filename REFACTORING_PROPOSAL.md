# No-Code Girls TRPG リファクタリング提案書

## 現状分析

### ファイル構成
| ファイル | 行数 | 内容 |
|---|---|---|
| `src/App.tsx` | 610行 | 全ロジック・全UI・全状態管理 |
| `src/main.tsx` | 10行 | エントリーポイント |
| `src/index.css` | 75行 | グローバルスタイル・アニメーション |

### App.tsx の内部構成（現状）
- **型定義** (L6-24): Mood, GameState, ChatMessage
- **定数** (L26-71): INITIAL_STATE, SYSTEM_PROMPT, MOOD_CONFIG, SCENE_GRADIENTS, SCENE_ACCENTS
- **App コンポーネント** (L73-546): 状態管理 + ハンドラー + JSX (473行)
  - 状態宣言 (L74-83): 10個の useState
  - Ref (L85-87): 3個の useRef
  - Effect (L89-117): 3個の useEffect
  - ハンドラー (L119-228): speak, handleSendMessage, handleRollDice, toggleRecording, handleCameraDeclare
  - JSX (L231-545): ScenePanel, CharacterPanel, ChatPanel, Overlays
- **DevPanel コンポーネント** (L548-610): 開発パネル

### 技術スタック
React 19 + TypeScript + Vite + Tailwind CSS 4 + Motion (Framer Motion) + Gemini API + Web Speech API

---

## 提案セクション

### 1. アーキテクチャ設計 (architect)

#### 設計方針

610行の単一ファイルを分割するにあたり、以下の原則に従う。

- **過剰設計の回避**: 小〜中規模プロジェクトに適したフラットな構成。深いネストや抽象レイヤーは作らない
- **関心の分離**: 型定義・定数・API通信・状態管理・UIを明確に分ける
- **段階的な分割**: 既存コードの論理的な境界（型、定数、ハンドラー群、UIパネル群）に沿って自然に分割する
- **単方向データフロー**: hooks → components の依存方向を維持し、循環依存を防ぐ

#### 推奨ディレクトリ構成

```
src/
├── main.tsx                    # エントリーポイント（変更なし）
├── index.css                   # グローバルスタイル・アニメーション定義（変更なし）
├── App.tsx                     # ルートレイアウト（パネル配置 + hooks 呼び出しのみ）
│
├── types/
│   └── index.ts                # Mood, GameState, ChatMessage 等の型定義
│
├── constants/
│   └── index.ts                # INITIAL_STATE, SYSTEM_PROMPT, MOOD_CONFIG, SCENE_GRADIENTS, SCENE_ACCENTS
│
├── services/
│   └── geminiClient.ts         # Gemini API 通信・レスポンスパース（SAY/JSON分離ロジック）
│
├── hooks/
│   ├── useGameState.ts         # GameState 管理（状態 + 更新ロジック + 覚醒判定）
│   ├── useChat.ts              # チャット履歴管理 + メッセージ送信フロー統合
│   ├── useSpeech.ts            # Web Speech API（音声認識 + 音声合成）
│   └── useDice.ts              # ダイスロール判定
│
└── components/
    ├── ScenePanel.tsx           # シーン表示（背景グラデーション・麻の葉パターン・雰囲気演出）
    ├── CharacterPanel.tsx       # キャラクター情報（ポートレート・成長ゲージ・記憶ログ）
    ├── ChatPanel.tsx            # チャットUI（メッセージ一覧・入力フォーム・アクションボタン）
    ├── DiceOverlay.tsx          # ダイスロール結果オーバーレイ
    └── DevPanel.tsx             # 開発者パネル（要件定義プロンプト出力）
```

#### 各ディレクトリ・ファイルの責務

| パス | 責務 | 元コードの対応箇所 |
|---|---|---|
| `types/index.ts` | 全型定義の一元管理。他の全モジュールから参照される | L6-24: `Mood`, `GameState`, `ChatMessage` |
| `constants/index.ts` | ゲーム設定値・プロンプト・UIテーマ定数 | L26-71: `INITIAL_STATE`, `SYSTEM_PROMPT`, `MOOD_CONFIG`, `SCENE_*` |
| `services/geminiClient.ts` | Gemini API 呼び出しとレスポース解析。SAY/JSON の分離パース処理を含む | L147-163: `GoogleGenAI` 初期化〜レスポンスパース |
| `hooks/useGameState.ts` | `gameState` + `mood` + `turnCount` の状態管理、`state_update` の適用ロジック、覚醒フラッシュ制御 | L74-95, L169-188: useState群 + 状態更新Effect |
| `hooks/useChat.ts` | `chatHistory` 管理、`handleSendMessage` のオーケストレーション（services/hooks を統合） | L75, L97-99, L131-198: チャット履歴 + 送信処理 |
| `hooks/useSpeech.ts` | Web Speech API のラッパー（`speak` + `toggleRecording`） | L101-129, L211-220: SpeechRecognition + SpeechSynthesis |
| `hooks/useDice.ts` | ダイスロール判定 (`handleRollDice`, `needsRoll`, `rollResult`) | L77-78, L200-209 |
| `components/ScenePanel.tsx` | シーン背景・麻の葉パターン・浮遊エレメント・雰囲気グロー | L236-300: 左パネルJSX |
| `components/CharacterPanel.tsx` | ポートレート・ムード表示・成長ゲージ（Sync/Evolution）・記憶ログ | L303-424: 右パネルJSX |
| `components/ChatPanel.tsx` | チャットログ表示・入力フォーム・音声/ダイス/カメラボタン | L428-516: 下部パネルJSX |
| `components/DiceOverlay.tsx` | ダイスロール結果のフルスクリーンオーバーレイ表示 | L273-293: AnimatePresence + ダイス表示 |
| `components/DevPanel.tsx` | 開発用プロンプト出力モーダル（既に独立コンポーネントとして存在） | L548-610 |
| `App.tsx` | hooks 呼び出し + 各コンポーネントへの props 配信 + レイアウト構成のみ | L73-546（大幅に軽量化される） |

#### この構成にする理由

1. **自然な分割境界**: 現在の App.tsx 内に既に明確な論理ブロック（型→定数→hooks→ハンドラー→パネルJSX）が存在しており、その境界をそのままファイル分割に対応させる
2. **hooks による状態カプセル化**: 10個の `useState` と3個の `useEffect` を責務ごとに4つの custom hooks に整理。App.tsx は hooks の返り値を components に渡すだけの薄いレイヤーになる
3. **services 層の独立**: Gemini API 通信をコンポーネントから分離することで、APIキー管理やエラーハンドリングの改善、将来的なAPI差し替えが容易になる
4. **フラットな構成**: `components/` 配下にサブディレクトリを設けない。610行規模のプロジェクトではフラットな構成が見通しやすい
5. **DiceOverlay の分離**: ScenePanel 内に埋め込まれたダイスオーバーレイは独立した関心事であり、別コンポーネントとすることでシーン描画との責務混在を解消する

#### 依存関係図

```
types/index.ts ← 全モジュールから参照（依存の起点）
     ↑
constants/index.ts ← hooks, components から参照
     ↑
services/geminiClient.ts ← hooks/useChat.ts から呼び出し
     ↑
hooks/* ← App.tsx から呼び出し
     ↑
App.tsx → components/* に props 配信
```

#### リファクタリング後の App.tsx イメージ（概要）

```tsx
export default function App() {
  const gameState = useGameState();
  const chat = useChat(gameState);
  const speech = useSpeech(chat);
  const dice = useDice(chat);

  return (
    <div className="w-full h-screen ...">
      <div className="flex-1 flex ...">
        <ScenePanel gameState={gameState} />
        <CharacterPanel gameState={gameState} mood={chat.mood} />
      </div>
      <ChatPanel chat={chat} speech={speech} dice={dice} />
      <DiceOverlay result={dice.rollResult} />
      <DevPanel />
    </div>
  );
}
```

#### 注意事項

- `utils/` ディレクトリは現時点では作成しない。共通ユーティリティが必要になった時点で追加する
- テスト用ディレクトリ（`__tests__/`）の配置はテスト戦略担当に委ねる
- アニメーション定義は `index.css` に残す（CSS アニメーションは Tailwind のカスタム設定として自然）

### 2. コンポーネント分割 (component-designer)

#### 現状の JSX 構造分析

App.tsx の JSX（L231-545, 315行）は以下の論理ブロックで構成されている：

| ブロック | 行範囲 | 行数 | 内容 |
|---|---|---|---|
| ScenePanel | L236-300 | ~65行 | 背景グラデーション・麻の葉パターン・浮遊要素・場面ラベル・下部ボーダー |
| DiceOverlay | L273-293 | ~21行 | ダイスロール結果のフルスクリーンオーバーレイ（AnimatePresence） |
| CharacterPanel | L303-424 | ~122行 | ポートレート(42行)・成長ゲージ(53行)・記憶ログ(17行) |
| ChatPanel | L428-516 | ~89行 | チャットログ(28行)・入力フォーム+ボタン群(52行) |
| Overlays | L518-528 | ~10行 | ノイズテクスチャ・覚醒フラッシュ |
| DevPanel制御 | L531-543 | ~12行 | 開閉ボタン・モーダル表示 |

#### 分割方針

- **ファイルレベルのコンポーネントは5つ**（ScenePanel, DiceOverlay, CharacterPanel, ChatPanel, DevPanel）
- DiceOverlay はアーキテクチャ設計（セクション1）の方針に従い ScenePanel から独立させる
- Overlays（10行）は App.tsx にインラインで残す（分離する利点がない）
- 各コンポーネント内で繰り返しパターンがある場合のみ、**ファイル内ローカルヘルパー**を作成（例: `GaugeBar`）
- 再利用されない小ブロックは無理に分割しない

#### 分割コンポーネント一覧

##### 1. `ScenePanel` — `src/components/ScenePanel.tsx`（推定 ~55行）

| 項目 | 内容 |
|---|---|
| **責務** | ゲームシーンの背景描画と装飾要素の表示 |
| **Props** | `sceneType: GameState['sceneType']`, `scene: string` |
| **含む要素** | 背景グラデーション、麻の葉パターン SVG、浮遊エモジ、大気グロー、場面ラベル（SCENE + シーン文）、下部ボーダー装飾 |
| **依存定数** | `SCENE_GRADIENTS`, `SCENE_ACCENTS` |
| **備考** | DiceOverlay を分離したことでシーン描画の責務に集中 |

##### 2. `DiceOverlay` — `src/components/DiceOverlay.tsx`（推定 ~35行）

| 項目 | 内容 |
|---|---|
| **責務** | ダイスロール結果のフルスクリーンオーバーレイ表示 |
| **Props** | `rollResult: { value: number; success: boolean } \| null` |
| **含む要素** | AnimatePresence ラッパー、バックドロップ（blur）、結果カード（数値 + SUCCESS/FAILURE ラベル） |
| **依存定数** | なし（色は success/failure で直接指定） |
| **備考** | アーキテクチャ設計に従い独立コンポーネント化。`rollResult` が null の場合は何も描画しない |

##### 3. `CharacterPanel` — `src/components/CharacterPanel.tsx`（推定 ~130行）

| 項目 | 内容 |
|---|---|
| **責務** | キャラクター状態の全情報表示：ポートレート・成長ゲージ・記憶ログ |
| **Props** | `mood: Mood`, `gameState: GameState`, `isAwakened: boolean` |
| **含む要素** | (A) ポートレートフレーム（ムード絵文字・漢字装飾・コーナー装飾・名前表示）、(B) 成長ゲージ（Sync / Evolution + 覚醒インジケータ）、(C) 記憶ログリスト |
| **ローカルヘルパー** | `GaugeBar` — Sync と Evolution で同一構造を再利用 |
| **依存定数** | `MOOD_CONFIG` |

`GaugeBar` ローカルヘルパーの Props 設計：

```tsx
// CharacterPanel.tsx 内に定義（export しない）
interface GaugeBarProps {
  label: string;        // 例: "同期 SYNC"
  value: number;        // 0-100
  color: string;        // 例: "#c9a84c"（通常時）
  brightColor: string;  // 例: "#fbbf24"（閾値超過時）
  threshold: number;    // 例: 80（光彩エフェクト発動の閾値）
}
```

##### 4. `ChatPanel` — `src/components/ChatPanel.tsx`（推定 ~100行）

| 項目 | 内容 |
|---|---|
| **責務** | チャットメッセージの表示、ユーザー入力、アクションボタン群 |
| **Props** | 下記参照 |
| **含む要素** | 空状態表示（Sparkles アイコン）、メッセージリスト（motion.div）、テキスト入力フォーム、送信ボタン、カメラ宣言ボタン、音声録音ボタン、ダイス判定ボタン |
| **内部管理** | `chatEndRef`（自動スクロール用 ref をこのコンポーネント内に移動） |

ChatPanel の Props 設計：

```tsx
interface ChatPanelProps {
  // データ
  chatHistory: ChatMessage[];
  inputText: string;
  isRecording: boolean;
  isAwakened: boolean;
  mood: Mood;
  needsRoll: boolean;
  // コールバック
  onSendMessage: (text: string) => void;
  onInputChange: (text: string) => void;
  onToggleRecording: () => void;
  onRollDice: () => void;
  onCameraDeclare: () => void;
}
```

コールバックが5つあるが、いずれも ChatPanel 固有の操作であり適正範囲。将来的に状態管理を Context 化する際（セクション3参照）はコールバック数を削減可能。

##### 5. `DevPanel` — `src/components/DevPanel.tsx`（推定 ~65行）

| 項目 | 内容 |
|---|---|
| **責務** | 開発用プロンプト出力パネル（モーダル） |
| **Props** | `onClose: () => void` |
| **含む要素** | モーダルオーバーレイ（backdrop-blur）、プロンプトテキスト表示（pre）、クリップボードコピーボタン |
| **備考** | 既に別コンポーネントとして定義済み（L548-610）。ファイル分離のみで変更最小 |

#### コンポーネントツリー図

```
App (~80行: 状態管理 + ハンドラー + レイアウト合成)
│
├── 上部セクション (flex-row)
│   ├── ScenePanel (~55行)
│   │   ├── 背景グラデーション (sceneType 連動)
│   │   ├── 麻の葉パターン (SVG)
│   │   ├── 浮遊要素
│   │   ├── 大気グロー
│   │   └── 場面ラベル (SCENE + テキスト)
│   │
│   └── CharacterPanel (~130行)
│       ├── [A] ポートレート (mood 連動)
│       │   ├── ムード絵文字
│       │   ├── 漢字装飾
│       │   └── コーナー装飾
│       ├── [B] 成長ゲージ
│       │   ├── GaugeBar (Sync) ← ローカルヘルパー
│       │   ├── GaugeBar (Evolution) ← ローカルヘルパー
│       │   └── 覚醒インジケータ
│       └── [C] 記憶ログ (motion リスト)
│
├── 下部セクション
│   └── ChatPanel (~100行)
│       ├── チャットログ (motion リスト / 空状態)
│       ├── 入力フォーム (テキスト + 送信ボタン)
│       └── アクションボタン群
│           ├── カメラ宣言 (Camera)
│           ├── 音声録音 (Mic)
│           └── ダイス判定 (Dices)
│
├── DiceOverlay (~35行, 条件表示)
│   └── 結果カード (数値 + SUCCESS/FAILURE)
│
├── Overlays (インライン ~10行, App.tsx 内に残留)
│   ├── ノイズテクスチャ
│   └── 覚醒フラッシュ (AnimatePresence)
│
└── DevPanel (~65行, モーダル)
    └── プロンプト出力 + コピーボタン
```

#### リファクタリング後のファイル構成（コンポーネント部分）

```
src/
├── components/
│   ├── ScenePanel.tsx      (~55行)   ← シーン背景・装飾
│   ├── DiceOverlay.tsx     (~35行)   ← ダイス結果オーバーレイ
│   ├── CharacterPanel.tsx  (~130行)  ← キャラ情報（内部に GaugeBar）
│   ├── ChatPanel.tsx       (~100行)  ← チャットUI
│   └── DevPanel.tsx        (~65行)   ← 開発パネル
├── types/
│   └── index.ts            (~25行)   ← 型定義
├── constants/
│   └── index.ts            (~50行)   ← 定数
├── App.tsx                 (~80行)   ← 状態 + ハンドラー + 合成
└── ...
```

#### 行数比較

| | 変更前 | 変更後 |
|---|---|---|
| App.tsx | 610行（全集中） | ~80行（合成のみ） |
| コンポーネント計 | 0行 | ~385行（5ファイル） |
| 共有モジュール計 | 0行 | ~75行（types + constants） |
| **合計** | **610行** | **~540行**（定数・型の整理で微減） |

#### Props drilling の回避について

- 最大の Props 深度は **1段**（App → 各コンポーネント）
- 子コンポーネントが更に孫コンポーネントに Props を渡すケースはない
- ChatPanel のコールバック Props が5つあるが、これは適正範囲。将来的に増加する場合は状態管理リファクタ（セクション3）と連携して Context 化を検討
- `GaugeBar` は CharacterPanel 内のローカルヘルパーであり、Props drilling には該当しない

#### アーキテクチャ設計（セクション1）との整合

- ディレクトリ構成・ファイル名はセクション1の推奨構成に完全準拠
- DiceOverlay の独立分離方針に合意（ScenePanel の責務を純粋なシーン描画に限定）
- hooks 層（セクション1で定義）がコールバックを提供し、App.tsx 経由で各コンポーネントに配信するフローを前提

### 3. 状態管理設計 (state-engineer)

#### 3.1 現状の問題点

App コンポーネントに 10 個の `useState` + 3 個の `useRef` が集中しており、以下の問題がある：

| 問題 | 詳細 |
|---|---|
| **状態の密結合** | `handleSendMessage` が `gameState`, `chatHistory`, `mood`, `needsRoll`, `turnCount` を同時に更新。1つのハンドラが6つの setState を呼ぶ |
| **暗黙の状態遷移** | ダイス判定の流れ（`needsRoll` → `rollResult` → `null` → `handleSendMessage`）が `setTimeout` で制御されており、遷移ルールが不明瞭 |
| **ref による同期回避** | `gameStateRef` は `handleSendMessage` 内でクロージャの古い `gameState` を回避するためのワークアラウンド。useReducer なら不要 |
| **派生状態の手動管理** | `isAwakeningFlash` は `sync > 40 && evolution > 40` から派生するが、useEffect + setTimeout で手動管理 |

#### 3.2 技術選定：useReducer + カスタムフック

**選定: `useReducer` + カスタムフック（Context 不要）**

| 候補 | 判定 | 理由 |
|---|---|---|
| **useReducer + カスタムフック** | ✅ 採用 | 状態遷移が明示的、テスト可能、ref ワークアラウンド不要。610行規模に最適 |
| Context API | ❌ 不採用 | コンポーネント階層が浅い（2〜3層）。prop drilling は限定的で、Context のボイラープレートに見合わない |
| Redux / Zustand 等 | ❌ 不採用 | 外部依存の追加コストに対して、この規模ではオーバーエンジニアリング |

**useReducer を選ぶ核心的理由:**
- `handleSendMessage` 内の 6 つの `setState` 呼び出しを、1 つの `dispatch({ type: 'AI_RESPONSE_RECEIVED', payload })` に集約できる
- `gameStateRef` ワークアラウンドが不要になる（reducer は常に最新の state を受け取る）
- 状態遷移ルールが reducer 関数に集約され、ユニットテスト可能になる

#### 3.3 状態のグループ分け

```
┌─────────────────────────────────────────────────┐
│  useGameReducer (useReducer)                    │
│  ─ ゲームのコア状態。1つの reducer で管理 ─     │
│                                                 │
│  gameState: GameState   ← シーン・HP・成長等    │
│  chatHistory: ChatMessage[]                     │
│  mood: Mood                                     │
│  turnCount: number                              │
│  needsRoll: boolean                             │
│  rollResult: { value, success } | null          │
├─────────────────────────────────────────────────┤
│  useSpeech (カスタムフック)                      │
│  ─ Web Speech API の入出力を隔離 ─              │
│                                                 │
│  isRecording: boolean                           │
│  recognitionRef: useRef                         │
│  speak: (text) => void                          │
│  toggleRecording: () => void                    │
├─────────────────────────────────────────────────┤
│  コンポーネントローカル state (useState)         │
│  ─ 各コンポーネント内で完結する UI 状態 ─       │
│                                                 │
│  inputText → ChatInput コンポーネント内          │
│  showDevPanel → App 内（トグル1つなので十分）    │
│  isAwakeningFlash → AwakeningOverlay 内          │
├─────────────────────────────────────────────────┤
│  DOM Ref                                        │
│  chatEndRef → ChatLog コンポーネント内           │
└─────────────────────────────────────────────────┘
```

#### 3.4 カスタムフック設計

##### `useGameReducer`

ゲームの全コア状態を管理する中心フック。

```typescript
// src/hooks/useGameReducer.ts

// ── State ──
interface GameReducerState {
  gameState: GameState;
  chatHistory: ChatMessage[];
  mood: Mood;
  turnCount: number;
  needsRoll: boolean;
  rollResult: { value: number; success: boolean } | null;
}

// ── Actions ──
type GameAction =
  | { type: 'SEND_MESSAGE'; payload: { text: string } }
  | { type: 'AI_RESPONSE_RECEIVED'; payload: {
      sayText: string;
      parsedJson: AIResponseJson | null;
      isAwakened: boolean;
    }}
  | { type: 'AI_REQUEST_FAILED' }
  | { type: 'ROLL_DICE'; payload: { value: number; success: boolean } }
  | { type: 'ROLL_ANIMATION_DONE' };

// ── Reducer ──
function gameReducer(state: GameReducerState, action: GameAction): GameReducerState {
  switch (action.type) {
    case 'SEND_MESSAGE':
      return {
        ...state,
        mood: 'thinking',
        chatHistory: [...state.chatHistory, createUserMessage(action.payload.text)],
      };
    case 'AI_RESPONSE_RECEIVED': {
      const { sayText, parsedJson, isAwakened } = action.payload;
      return {
        ...state,
        chatHistory: [...state.chatHistory, createDMMessage(sayText, isAwakened)],
        gameState: parsedJson?.state_update
          ? applyStateUpdate(state.gameState, parsedJson.state_update, state.turnCount)
          : state.gameState,
        mood: parsedJson?.mode ?? state.mood,
        needsRoll: !!parsedJson?.request_roll,
        turnCount: state.turnCount + 1,
      };
    }
    case 'AI_REQUEST_FAILED':
      return {
        ...state,
        chatHistory: [...state.chatHistory, createDMMessage('通信エラー。HTTP召喚に失敗。', false)],
        mood: 'normal',
      };
    case 'ROLL_DICE':
      return {
        ...state,
        rollResult: action.payload,
        needsRoll: false,
      };
    case 'ROLL_ANIMATION_DONE':
      return { ...state, rollResult: null };
    default:
      return state;
  }
}

// ── Hook ──
function useGameReducer() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_REDUCER_STATE);
  return { ...state, dispatch };
}
```

**ポイント:**
- `applyStateUpdate()` は現在の `setGameState` コールバック内のロジック（L169-184）を純粋関数として抽出
- `createUserMessage()` / `createDMMessage()` は ID 生成を含むファクトリ関数
- reducer は純粋関数なので、**副作用なしでユニットテスト可能**

##### `useSpeech`

Web Speech API（音声入力 + 音声合成）を隔離するフック。

```typescript
// src/hooks/useSpeech.ts

interface UseSpeechReturn {
  isRecording: boolean;
  toggleRecording: () => void;
  speak: (text: string, currentMood: Mood) => void;
}

function useSpeech(onTranscript: (text: string) => void): UseSpeechReturn {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // SpeechRecognition 初期化（現在の L101-117 を移動）
  }, []);

  const toggleRecording = useCallback(() => { /* ... */ }, [isRecording]);

  const speak = useCallback((text: string, currentMood: Mood) => {
    // 現在の speak 関数（L119-129）を移動
    // mood 依存を引数で受け取ることで、クロージャ問題を回避
  }, []);

  return { isRecording, toggleRecording, speak };
}
```

**ポイント:**
- `onTranscript` コールバックで、音声入力結果を親（App）に通知
- `speak` は `mood` を引数で受け取り、フック内に mood state を持たない（関心の分離）
- ブラウザ API 非対応時のフォールバックもこのフック内で完結

#### 3.5 データフロー（リファクタリング後）

```
ユーザー操作
    │
    ├─ テキスト入力 → ChatInput (inputText はローカル state)
    │                    │
    │                    └─ onSubmit → dispatch('SEND_MESSAGE')
    │                                      │
    ├─ 音声入力 → useSpeech               │
    │               │                      │
    │               └─ onTranscript ───────┘
    │                                      │
    ├─ ダイス → dispatch('ROLL_DICE') ─────┘
    │                                      │
    │                              ┌───────┴────────┐
    │                              │  gameReducer   │
    │                              │  (純粋関数)     │
    │                              └───────┬────────┘
    │                                      │
    │                              新しい state
    │                                      │
    │                    ┌─────────┬────────┼─────────┐
    │                    │         │        │         │
    │               ScenePanel  CharPanel ChatLog  Overlays
    │               (mood,      (mood,    (chat    (rollResult,
    │                sceneType)  gauges)  History)  awakening)
    │
    └─ AI API 呼び出し（useEffect or イベントハンドラ内）
         │
         └─ 応答 → dispatch('AI_RESPONSE_RECEIVED')
              └─ エラー → dispatch('AI_REQUEST_FAILED')
```

#### 3.6 architect のフック設計との整合

architect 提案（セクション1）では `useGameState`, `useChat`, `useSpeech`, `useDice` の 4 フックが示されている。本提案との対応：

| architect 提案 | 本提案での扱い |
|---|---|
| `useGameState` | `useGameReducer` に統合。gameState + mood + turnCount を reducer で一元管理 |
| `useChat` | `useGameReducer` に統合。chatHistory は gameState と密結合のため分離しない |
| `useSpeech` | そのまま採用。Web Speech API の隔離フックとして独立 |
| `useDice` | `useGameReducer` に統合。needsRoll / rollResult は gameState の遷移の一部 |

**統合の理由:** `handleSendMessage` が gameState・chatHistory・mood・needsRoll・turnCount を同時に更新するため、これらを別フックに分割すると、フック間の相互依存が生まれ、かえって複雑になる。1つの reducer に集約することで、状態遷移の一貫性を保証する。

#### 3.7 移行手順（段階的）

| Step | 内容 | 影響範囲 |
|---|---|---|
| 1 | `applyStateUpdate` 純粋関数を抽出 | `App.tsx` のみ。動作変更なし |
| 2 | `gameReducer` + `useGameReducer` を作成し、6つの useState を置換 | `App.tsx` → `hooks/useGameReducer.ts` |
| 3 | `useSpeech` を抽出 | `App.tsx` → `hooks/useSpeech.ts` |
| 4 | `inputText` を ChatInput コンポーネントにローカル化 | コンポーネント分割と同時に実施 |

**Step 1→2 は状態管理単独で実施可能。Step 4 はコンポーネント分割（セクション2）と連携。**

#### 3.8 Before / After 比較

```typescript
// ── Before: App() 内の状態宣言 ──
const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
const [mood, setMood] = useState<Mood>('normal');
const [needsRoll, setNeedsRoll] = useState(false);
const [rollResult, setRollResult] = useState<...>(null);
const [inputText, setInputText] = useState('');
const [isRecording, setIsRecording] = useState(false);
const [showDevPanel, setShowDevPanel] = useState(false);
const [turnCount, setTurnCount] = useState(1);
const [isAwakeningFlash, setIsAwakeningFlash] = useState(false);
const gameStateRef = useRef(gameState); // ← ワークアラウンド

// ── After: App() 内の状態宣言 ──
const { gameState, chatHistory, mood, turnCount, needsRoll, rollResult, dispatch } = useGameReducer();
const { isRecording, toggleRecording, speak } = useSpeech(handleTranscript);
const [showDevPanel, setShowDevPanel] = useState(false);
// inputText → ChatInput 内にローカル化
// isAwakeningFlash → AwakeningOverlay 内にローカル化
// gameStateRef → 不要（reducer が最新 state を保証）
```

**結果: App 内の状態宣言が 10 useState + 3 useRef → 1 useGameReducer + 1 useSpeech + 1 useState に集約**

#### 3.9 セクション9（パフォーマンス最適化）との連携

セクション9-7 で指摘された SpeechRecognition のクロージャ問題は、本提案の `useSpeech` + `useGameReducer` で自然に解消される:
- `dispatch` は安定した参照（React が保証）なので、useEffect の依存配列に追加しても再実行されない
- `onTranscript` コールバック内で `dispatch({ type: 'SEND_MESSAGE', payload: { text } })` を呼ぶだけで済む
- `handleSendMessageRef` のような追加の ref ワークアラウンドは不要


### 4. AI/API 連携層 (api-specialist)

#### 4.1 現状の問題点

| # | 問題 | 該当箇所 | 影響 |
|---|------|---------|------|
| 1 | `GoogleGenAI` を毎リクエストで `new` | L148 | 不必要なオブジェクト生成 |
| 2 | SAY/JSON パースが正規表現ハードコード | L156-163 | `.*` 貪欲マッチで複雑 JSON に破綻リスク |
| 3 | `state_update` 適用が UI コンポーネント内 | L168-188 | 密結合、単体テスト不可 |
| 4 | SYSTEM_PROMPT がグローバル定数 | L39-51 | バージョニング不可 |
| 5 | エラーハンドリングが最小限 | L193-197 | リトライなし、一時障害に弱い |
| 6 | レスポンス型が `any` | L160-162 | 型安全性なし |

#### 4.2 ファイル構成

```
src/services/ai/
├── index.ts              # 公開API（バレルエクスポート）
├── geminiClient.ts       # Gemini クライアント管理（シングルトン + DI）
├── dmService.ts          # DM応答の取得（リトライ付き）
├── responseParser.ts     # SAY/JSON レスポンスパーサー
├── stateUpdater.ts       # state_update の適用（純粋関数）
└── prompts/
    ├── systemPrompt.ts   # SYSTEM_PROMPT 定義
    └── promptBuilder.ts  # ペイロード組み立て
```

> architect 提案の `services/geminiClient.ts` 単体では通信・パース・状態更新が再び密結合するため `services/ai/` として責務分離。

#### 4.3 Gemini クライアント初期化戦略（シングルトン + DI）

```typescript
// services/ai/geminiClient.ts
import { GoogleGenAI } from '@google/genai';

/** テスト用モック注入インターフェース */
export interface AIClient {
  generateContent(params: {
    model: string; contents: string;
    config: { systemInstruction: string; temperature: number };
  }): Promise<{ text: string | undefined }>;
}

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const DEFAULT_TEMPERATURE = 0.7;
let clientInstance: GoogleGenAI | null = null;

export function getGeminiClient(apiKey?: string): GoogleGenAI {
  if (!clientInstance) {
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY が設定されていません');
    clientInstance = new GoogleGenAI({ apiKey: key });
  }
  return clientInstance;
}
export function resetGeminiClient(): void { clientInstance = null; }
export { DEFAULT_MODEL, DEFAULT_TEMPERATURE };
```

#### 4.4 レスポンスパーサー（括弧深度追跡で正規表現の貪欲マッチ問題を解消）

```typescript
// services/ai/responseParser.ts
export interface DMResponseJson {
  state_update?: {
    scene?: string; sceneType?: 'shrine' | 'forest' | 'sea';
    hp?: number; sync_delta?: number; evolution_delta?: number;
    inventory_add?: string[]; inventory_remove?: string[];
    flags_set?: string[]; memory_add?: { text: string; icon: string };
  };
  request_roll: boolean; roll_type: string | null;
  mode: Mood; next_prompt: string;
}
export interface ParsedDMResponse { sayText: string; json: DMResponseJson | null; rawText: string; }

export function parseDMResponse(rawText: string): ParsedDMResponse {
  const sayMatch = rawText.match(/SAY:\s*([\s\S]*?)(?=\nJSON:|$)/);
  const sayText = sayMatch ? sayMatch[1].trim() : rawText.trim();
  const jsonText = extractJsonBlock(rawText);
  let json: DMResponseJson | null = null;
  if (jsonText) { try { json = JSON.parse(jsonText); } catch { /* SAY のみで続行 */ } }
  return { sayText, json, rawText };
}

function extractJsonBlock(text: string): string | null {
  const marker = text.indexOf('JSON:');
  if (marker === -1) return null;
  const after = text.slice(marker + 5), start = after.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < after.length; i++) {
    if (after[i] === '{') depth++; else if (after[i] === '}') depth--;
    if (depth === 0) return after.slice(start, i + 1);
  }
  return null;
}
```

#### 4.5 DM サービス（リトライ付き通信）

```typescript
// services/ai/dmService.ts
export async function queryDM(
  payload: { playerUtterance: string; state: GameState; rollResult: number | null; turn: number },
  config: { client?: AIClient; model?: string; temperature?: number; maxRetries?: number } = {}
): Promise<ParsedDMResponse> {
  const { client, model = DEFAULT_MODEL, temperature = DEFAULT_TEMPERATURE, maxRetries = 2 } = config;
  const aiClient = client ?? getGeminiClient();
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await aiClient.generateContent({
        model, contents: JSON.stringify(payload),
        config: { systemInstruction: getSystemPrompt(), temperature },
      });
      return parseDMResponse(res.text ?? '');
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw new DMServiceError(`DM応答取得失敗（${maxRetries + 1}回試行）`, lastError);
}
```

#### 4.6 状態更新（純粋関数、App.tsx L169-184 を抽出）

```typescript
// services/ai/stateUpdater.ts
export function applyStateUpdate(current: GameState, update: DMResponseJson['state_update'], turn: number): GameState {
  if (!update) return current;
  return { ...current,
    scene: update.scene ?? current.scene, sceneType: update.sceneType ?? current.sceneType,
    hp: update.hp ?? current.hp,
    sync: Math.min(100, Math.max(0, current.sync + (update.sync_delta ?? 0))),
    evolution: Math.min(100, Math.max(0, current.evolution + (update.evolution_delta ?? 0))),
    inventory: applyInventoryChanges(current.inventory, update.inventory_add, update.inventory_remove),
    flags: mergeUnique(current.flags, update.flags_set),
    memory: update.memory_add ? [{ text: update.memory_add.text, turn, icon: update.memory_add.icon || '📝' }, ...current.memory] : current.memory,
  };
}
```

#### 4.7 SYSTEM_PROMPT 管理

`services/ai/prompts/systemPrompt.ts` に移動。`getSystemPrompt()` 関数経由でアクセスし、将来の A/B テストやバージョニングに対応可能にする。

#### 4.8 エラーハンドリング戦略

| レイヤー | 戦略 | 実装場所 |
|---------|------|---------|
| ネットワーク | 指数バックオフリトライ（最大2回） | `dmService.ts` |
| パース | JSON 失敗→SAY のみ返却、ゲーム続行 | `responseParser.ts` |
| 状態更新 | update が null→現状態維持 | `stateUpdater.ts` |
| UI 層 | `DMServiceError` キャッチ→通知 | `hooks/useChat.ts` |

#### 4.9 リファクタリング後の handleSendMessage（131-198行→約30行）

```typescript
const handleSendMessage = async (text: string, diceVal: number | null = null) => {
  if (!text && diceVal === null) return;
  setInputText(''); setMood('thinking');
  addUserMessage(text || `🎲 判定結果: ${diceVal}`);
  try {
    const res = await queryDM({ playerUtterance: text, state: gameStateRef.current, rollResult: diceVal, turn: turnCount });
    addDMMessage(res.sayText, mood === 'awakened' || res.json?.mode === 'awakened');
    if (res.json) {
      setGameState(prev => applyStateUpdate(prev, res.json!.state_update, turnCount));
      setNeedsRoll(!!res.json.request_roll);
      if (res.json.mode) setMood(res.json.mode);
    }
    setTurnCount(prev => prev + 1); speak(res.sayText);
  } catch { addDMMessage('通信エラー。HTTP召喚に失敗。'); setMood('normal'); }
};
```

#### 4.10 テスタビリティ

| テスト対象 | モック不要 | テスト方法 |
|-----------|-----------|-----------|
| `responseParser` | ✅ | 純粋関数テスト |
| `stateUpdater` | ✅ | GameState 変換検証 |
| `dmService` | ❌ | `AIClient` モック注入 |

```typescript
describe('parseDMResponse', () => {
  it('SAY/JSON 分離', () => {
    const r = parseDMResponse('SAY: こんにちは！\nJSON: {"mode":"normal","request_roll":false}');
    expect(r.sayText).toBe('こんにちは！'); expect(r.json?.mode).toBe('normal');
  });
  it('ネスト JSON', () => {
    const r = parseDMResponse('SAY: t\nJSON: {"state_update":{"memory_add":{"text":"冒険","icon":"⚔️"}},"mode":"battle"}');
    expect(r.json?.state_update?.memory_add?.text).toBe('冒険');
  });
  it('パース失敗→SAY のみ', () => {
    const r = parseDMResponse('SAY: hi\nJSON: {bad}');
    expect(r.sayText).toBe('hi'); expect(r.json).toBeNull();
  });
});
```

### 5. UI/UX デザインシステム (ui-designer)

#### 現状の問題点

1. **カラー値の二重管理**: `index.css` の `@theme` で CSS 変数を定義しつつ、`App.tsx` 内で同じ色を直接ハードコード（例: `#8b6cc1`, `#4ade80`, `#c9a84c` など）
2. **テーマ定数が App.tsx に散在**: `MOOD_CONFIG`, `SCENE_GRADIENTS`, `SCENE_ACCENTS` がコンポーネントファイルに埋め込まれている
3. **インラインスタイルの多用**: Tailwind クラスと `style={{ }}` が混在し、一貫性がない
4. **セマンティックな色名の欠如**: シーン背景色（`#1a1028` 等）やポートレート背景色（`#1a0d2e` 等）が名前なしで散在

#### 5.1 デザイントークンの管理方法

**方針**: Tailwind CSS 4 の `@theme` をデザイントークンの唯一の定義元（Single Source of Truth）とする。既存の `@theme` 定義は Tailwind 4 のベストプラクティスに沿っており維持する。

**ファイル構成**:

```
src/
├── index.css              # @theme でトークン定義 + グローバルスタイル（既存を拡張）
├── theme/
│   ├── mood.ts            # MOOD_CONFIG（ムード別の表示設定）
│   ├── scene.ts           # SCENE_GRADIENTS, SCENE_ACCENTS
│   └── index.ts           # まとめて re-export
```

| トークン種別 | 管理場所 | 理由 |
|---|---|---|
| カラーパレット | `index.css` (`@theme`) | Tailwind 4 が自動でユーティリティクラス生成 |
| フォント | `index.css` (`--font-*`) | 同上 |
| シーン背景色 | `index.css` (`@theme`) に**新規追加** | ハードコード hex を CSS 変数に昇格 |
| ムード設定 | `src/theme/mood.ts` | JS ロジックで使用するが、色は CSS 変数を参照 |
| シーン設定 | `src/theme/scene.ts` | 同上 |

**index.css の `@theme` 拡張案**（既存に追加する変数のみ記載）:

```css
@theme {
  /* === 既存のカラー定義は維持 === */

  /* === シーン背景（グラデーション用）【新規追加】 === */
  --color-scene-shrine-from: #0c0a14;
  --color-scene-shrine-via: #1a1028;
  --color-scene-shrine-to: #12181f;
  --color-scene-forest-from: #0a0f0c;
  --color-scene-forest-via: #0f1a14;
  --color-scene-forest-to: #0c1610;
  --color-scene-sea-from: #0a0c14;
  --color-scene-sea-via: #0f1528;
  --color-scene-sea-to: #0c1220;

  /* === ポートレート背景【新規追加】 === */
  --color-portrait-normal-from: #12101a;
  --color-portrait-normal-via: #1a1828;
  --color-portrait-awakened-from: #1a0d2e;
  --color-portrait-awakened-via: #2d1b4a;
}
```

**ポイント**:
- App.tsx にハードコードされていたグラデーション色を CSS 変数に昇格
- Tailwind ユーティリティクラス（`bg-scene-shrine-from` 等）として自動使用可能に
- 既存のカラー・フォント定義は変更不要

#### 5.2 テーマ設定ファイルの構成

**`src/theme/mood.ts`**:

```ts
import type { Mood } from '../types';

export const MOOD_CONFIG: Record<Mood, {
  label: string;
  kanji: string;
  colorClass: string;   // Tailwind クラス名
  colorVar: string;     // CSS 変数参照（インラインスタイル用）
  desc: string;
}> = {
  normal:   { label: '平常', kanji: '静', colorClass: 'text-wisteria',    colorVar: 'var(--color-wisteria)',    desc: '穏やかな状態' },
  thinking: { label: '思考', kanji: '考', colorClass: 'text-gold',        colorVar: 'var(--color-gold)',        desc: '分析中...' },
  battle:   { label: '戦闘', kanji: '闘', colorClass: 'text-vermillion',  colorVar: 'var(--color-vermillion)',  desc: '戦闘態勢' },
  success:  { label: '歓喜', kanji: '喜', colorClass: 'text-success',     colorVar: 'var(--color-success)',     desc: '成功を実感' },
  awakened: { label: '覚醒', kanji: '覚', colorClass: 'text-bright-gold', colorVar: 'var(--color-bright-gold)', desc: '真の力を解放' },
};
```

現状の `color: '#8b6cc1'` のようなハードコード hex 値を `colorClass`（Tailwind クラス）と `colorVar`（CSS 変数参照）に置き換える。

**`src/theme/scene.ts`**:

```ts
import type { SceneType } from '../types';

export const SCENE_GRADIENTS: Record<SceneType, string> = {
  shrine: 'from-scene-shrine-from via-scene-shrine-via to-scene-shrine-to',
  forest: 'from-scene-forest-from via-scene-forest-via to-scene-forest-to',
  sea:    'from-scene-sea-from via-scene-sea-via to-scene-sea-to',
};

export const SCENE_ACCENTS: Record<SceneType, string> = {
  shrine: 'var(--color-wisteria)',
  forest: 'var(--color-success)',
  sea:    'var(--color-gold)',
};
```

**補足**: セクション1では `constants/index.ts` への集約案があるが、テーマ設定は UI の視覚的定義であり `INITIAL_STATE` / `SYSTEM_PROMPT` とは関心が異なるため `src/theme/` を推奨。ただしプロジェクト規模を考慮すると `constants/` 統合も許容。チーム合意に委ねる。

#### 5.3 再利用可能な UI 基礎コンポーネント

過剰な抽象化を避けつつ、繰り返されるパターンのみ抽出する。

```
src/components/ui/
├── GaugeBar.tsx          # 成長ゲージ（Sync / Evolution 共通）
├── SectionLabel.tsx      # モノスペース小文字ラベル（"SCENE", "MEMORY" 等）
├── CornerOrnaments.tsx   # 角の装飾線（ポートレート枠等）
└── StatusDot.tsx         # アニメーション付きステータスインジケーター
```

**抽出しないもの**: ボタン類（スタイルが個別）、レイアウト（1箇所のみ）、チャットメッセージ（セクション2で対応）

#### 5.4 インラインスタイル削減の方針

| 現状 | 移行先 | 判断基準 |
|---|---|---|
| `style={{ color: MOOD_CONFIG[mood].color }}` | `className={MOOD_CONFIG[mood].colorClass}` | Tailwind クラスに一本化 |
| `style={{ background: 'linear-gradient(...)' }}` with hex | CSS 変数 + Tailwind グラデーション | `@theme` 変数で一元管理 |
| `style={{ textShadow: '...' }}` (1箇所のみ) | そのまま維持 | 1箇所なら抽象化不要 |
| `style={{ boxShadow: '...' }}` (複数箇所) | `shadow-[...]` arbitrary value | Tailwind 記法に統一 |

**判断基準**: 2箇所以上で使われるインラインスタイルのみ Tailwind クラス化。1箇所のみのものは無理に移行しない。

#### 5.5 オプション: 共通スタイルユーティリティ

頻出する装飾パターンを Tailwind 4 の `@utility` で追加:

```css
@utility wafuu-label {
  font-family: theme(--font-mono);
  font-size: 7px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: theme(--color-muted);
}
```

`font-mono text-[7px] tracking-[3px] text-muted uppercase` の繰り返しを1クラスで置換可能。ただし**リファクタリング必須項目には含めない**。

#### 5.6 実装優先順位

1. **Phase 1**: `index.css` の `@theme` にシーン背景色・ポートレート色の CSS 変数を追加（影響範囲が小さい）
2. **Phase 2**: `src/theme/` を作成し `MOOD_CONFIG` / `SCENE_*` を App.tsx から移動
3. **Phase 3**: `GaugeBar`, `SectionLabel` 等の UI 基礎コンポーネントを抽出
4. **Phase 4**: インラインスタイルを段階的に Tailwind クラスへ置き換え

### 6. アニメーション設計 (animation-engineer)

#### 6.1 現状の課題

| 課題 | 詳細 |
|---|---|
| インライン定義の散在 | `initial={{ opacity: 0 }}` 等が App.tsx 内の6箇所に直接記述されている |
| パターンの重複 | fade in/out が3箇所（ダイス・覚醒フラッシュ・DevPanel）で同一コードが重複 |
| CSS/Motion の使い分け基準なし | `breathe` は CSS、ゲージバーは Motion だが、判断基準が不明確 |
| パフォーマンス考慮不足 | フローティング要素の CSS アニメーションが常時稼働（GPU レイヤー未明示） |

#### 6.2 CSS アニメーション vs Motion（Framer Motion）の使い分け基準

| 基準 | CSS アニメーション | Motion（Framer Motion） |
|---|---|---|
| **用途** | 環境・装飾（常時ループ） | UI インタラクション・状態遷移 |
| **ライフサイクル** | マウント時から常時稼働 | 状態変化でトリガー |
| **例** | breathe, float, micPulse | フェードイン、スライドイン、ゲージ |
| **パフォーマンス** | `will-change` で GPU 委任可能 | React レンダリングに依存 |
| **マウント/アンマウント** | 制御困難 | `AnimatePresence` で自然に制御 |

**原則: 「常時ループは CSS、状態駆動は Motion」**

#### 6.3 アニメーション定数・バリアントの管理

architect 提案のディレクトリ構成に `animations/` を追加:

```
src/
  animations/
    variants.ts      # Motion バリアント定数
    css-classes.ts    # CSS アニメーションクラスのマッピング
    index.ts          # 再エクスポート
```

**`variants.ts` — Motion バリアント定義:**

```typescript
import type { Variants } from 'motion/react';

// === オーバーレイ系（ダイス・覚醒フラッシュ・DevPanel） ===
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// === リストアイテム系（メモリログ） ===
export const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -5 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1 },
  }),
};

// === リストアイテム系（チャットメッセージ） ===
export const slideInFromBottom: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

// === ゲージバー系（Sync・Evolution） ===
export const progressBarVariants = {
  initial: { width: 0 },
  animate: (percent: number) => ({ width: `${percent}%` }),
};
```

**使用例（リファクタリング後）:**

```tsx
// Before: インライン定義（3箇所で重複）
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>

// After: バリアント参照（再利用）
<motion.div
  variants={overlayVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
>
```

```tsx
// Before: stagger delay の手動計算
<motion.div
  initial={{ opacity: 0, y: 4 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: i * 0.05 }}
>

// After: custom prop でインデックス渡し
<motion.div
  variants={slideInFromBottom}
  initial="hidden"
  animate="visible"
  custom={i}
>
```

**`css-classes.ts` — CSS アニメーションクラスの定数マッピング:**

```typescript
export const ambientAnimations = {
  breathe: 'animate-breathe',
  float: ['animate-float-0', 'animate-float-1', 'animate-float-2'] as const,
  micPulse: 'animate-mic-pulse',
  flashOut: 'animate-flash-out',
} as const;
```

#### 6.4 CSS アニメーションのパフォーマンス最適化

現行の `index.css` に `will-change` を追加して GPU コンポジットレイヤーを明示的に確保する:

```css
/* GPU レイヤー昇格 */
.animate-breathe {
  animation: breathe 6s ease-in-out infinite alternate;
  will-change: opacity, transform;
}

.animate-float-0,
.animate-float-1,
.animate-float-2 {
  will-change: transform;
}
```

**注意:** `will-change` は必要な要素にのみ適用。過剰な GPU レイヤー生成はモバイルでメモリ圧迫を招くため、フローティング要素（3個）と breathe（1個）の計4要素に限定する。

#### 6.5 再利用可能なアニメーションユーティリティ

コンポーネント側でバリアントを意識せず使える `AnimatedOverlay` ラッパー:

```typescript
// src/animations/AnimatedOverlay.tsx
import { motion, AnimatePresence } from 'motion/react';
import { overlayVariants } from './variants';

type Props = {
  show: boolean;
  className?: string;
  children: React.ReactNode;
};

export function AnimatedOverlay({ show, className, children }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

これにより、ダイスオーバーレイ・覚醒フラッシュ・DevPanel の3箇所で共通パターンを再利用できる。

#### 6.6 Wafuu-Tech 世界観のアニメーション指針

| アニメーション | 世界観における役割 | 演出方針 |
|---|---|---|
| `breathe` | 電脳空間の「気」の流れ | ゆったり、6s周期。急がない |
| `float-*` | デジタル粒子の浮遊 | 各要素で微妙に速度・角度を変え自然さを出す |
| `overlayVariants` | 結界の展開/解除 | シンプルなフェード。派手にしすぎない |
| `slideInFromLeft` | 記憶の顕現 | 左からスライド。和巻物を開くイメージ |
| `slideInFromBottom` | 言霊の浮上 | 下から浮き上がる。短いディレイで連鎖 |
| `progressBar` | 力の蓄積 | 初期0→現在値。成長の実感を視覚化 |
| 覚醒フラッシュ | 真の力の解放 | 金色のラジアルグラデーション。0.6s で余韻を残す |

#### 6.7 適用計画

| ステップ | 内容 | 影響範囲 |
|---|---|---|
| 1 | `src/animations/variants.ts` を作成しバリアント定数を集約 | 新規ファイル |
| 2 | `src/animations/AnimatedOverlay.tsx` を作成 | 新規ファイル |
| 3 | App.tsx 内のダイスオーバーレイ・覚醒フラッシュ・DevPanel を `AnimatedOverlay` に置換 | App.tsx 3箇所 |
| 4 | App.tsx 内のメモリログ・チャットメッセージをバリアント参照に置換 | App.tsx 2箇所 |
| 5 | ゲージバーをバリアント参照に置換 | App.tsx 2箇所 |
| 6 | index.css に `will-change` を追加 | index.css |

**注意:** `AnimatedList` 等の更なる抽象化はコンポーネント分割後に必要性を評価する。現時点では過剰抽象化を避ける。

### 7. 型システム設計 (type-engineer)

#### 7.1 型定義ファイルの構成

```
src/types/
├── index.ts          # 全型の re-export（バレルファイル）
├── game.ts           # ゲームロジック関連の型
├── chat.ts           # チャット・メッセージ関連の型
├── api.ts            # Gemini API リクエスト/レスポンスの型
└── speech.ts         # Web Speech API の型補完
```

**方針:** ドメインごとに分割し `index.ts` で re-export する。architect 提案の `types/index.ts` 単一ファイル案を拡張した構成。規模が小さいうちは単一ファイルでもよい。

#### 7.2 各ファイルの型定義

**`types/game.ts` — ゲームドメイン型**

```ts
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
```

**`types/chat.ts` — チャット型**

```ts
export interface ChatMessage {
  id: string;
  role: 'user' | 'dm';
  text: string;
  isAwakened?: boolean;
}
```

**`types/api.ts` — Gemini API レスポンス型**

```ts
import type { SceneType, Mood, GameState } from './game';

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
```

**`types/speech.ts` — Web Speech API 型補完**

```ts
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}
export {};
```

#### 7.3 既存 `any` 型の解消方針

現状 App.tsx には5箇所の `any` が存在する。すべて具体型に置換する。

| 箇所 | 現状 | 対応方針 |
|---|---|---|
| `recognitionRef` (L86) | `useRef<any>` | `useRef<SpeechRecognition \| null>` に変更 |
| `window as any` (L102) | SpeechRecognition 取得 | `types/speech.ts` の `declare global` で Window を拡張し `as any` を除去 |
| `event: any` (L108) | onresult コールバック | `SpeechRecognitionEvent` 型を使用（lib.dom.d.ts に定義済み） |
| `parsedJson: any` (L160) | API レスポンスのパース結果 | `DMResponse \| null` 型を使用。パース関数を分離して型を付ける |
| `response.text` (L155) | Gemini SDK 戻り値 | SDK の型をそのまま活用。追加定義不要 |

#### 7.4 型ガード・パースユーティリティ

API レスポンスのパースは `any` の温床になるため、専用関数に切り出す：

```ts
import type { ParsedDMResponse, DMResponse } from '../types/api';

export function parseDMResponse(raw: string): ParsedDMResponse {
  const sayMatch = raw.match(/SAY:\s*([\s\S]*?)(?=JSON:|$)/);
  const jsonMatch = raw.match(/JSON:\s*(\{.*\})/);
  const sayText = sayMatch ? sayMatch[1].trim() : raw;
  let data: DMResponse | null = null;
  if (jsonMatch) {
    try { data = JSON.parse(jsonMatch[1]) as DMResponse; } catch { /* パース失敗 */ }
  }
  return { sayText, data };
}
```

`JSON.parse` の戻り値を `as DMResponse` でアサーションする。ランタイムバリデーション（Zod 等）は将来課題とし、まずは型アサーションで `any` を排除する。

#### 7.5 定数オブジェクトの型付け改善

```ts
// 変更前
const MOOD_CONFIG: Record<Mood, { label: string; kanji: string; color: string; desc: string }> = { ... };
// 変更後
import type { Mood, MoodConfig } from '../types/game';
const MOOD_CONFIG: Record<Mood, MoodConfig> = { ... };
```

#### 7.6 優先度と実施順序

| 優先度 | 作業 | 理由 |
|---|---|---|
| **高** | `types/game.ts` の作成と既存型の移動 | 他の全モジュールが依存する基盤型 |
| **高** | `types/api.ts` の作成と `parsedJson: any` の解消 | ゲームロジックの中核。バグの温床 |
| **中** | `types/speech.ts` の作成と `window as any` の解消 | ブラウザ互換性に関わる |
| **中** | インライン型（`RollResult` 等）の名前付き型への統一 | コードの可読性向上 |
| **低** | Zod 等によるランタイムバリデーション | LLM 出力の信頼性向上（将来課題） |

#### 7.7 設計方針まとめ

- **実用性優先:** 型パズルや過度なジェネリクスを避ける
- **`any` ゼロを目指す:** 5箇所の `any` を全て具体型に置換
- **インライン型の排除:** `{ value: number; success: boolean }` → `RollResult` に統一
- **`as` アサーションの最小化:** 型ガード関数でアサーションを1箇所に集約
- **`strict: true` の維持:** tsconfig.json の strict モードを前提（セクション10と連携）

### 8. テスト戦略 (test-strategist)

#### 8.1 テストフレームワーク選定

**Vitest** を採用する。

| 観点 | Vitest を選ぶ理由 |
|---|---|
| ビルドツール統合 | Vite ベースのプロジェクトなので設定ゼロで動作 |
| 速度 | HMR ベースの watch モードで高速フィードバック |
| API 互換性 | Jest 互換 API（`describe`, `it`, `expect`）で学習コスト低 |
| TypeScript | 追加設定なしで TS をそのまま実行可能 |
| UI テスト | `@testing-library/react` との組み合わせが公式サポート |

**追加パッケージ（devDependencies）:**
```
vitest
@testing-library/react
@testing-library/jest-dom
jsdom
```

**vitest.config.ts（最小構成）:**
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

**package.json に追加するスクリプト:**
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

#### 8.2 テスト対象の優先順位

現在の App.tsx（610行）には、リファクタリング後にテストすべき純粋ロジックが複数埋め込まれている。以下の優先度で段階的にテストを追加する。

| 優先度 | テスト対象 | 理由 | テスト種別 |
|---|---|---|---|
| **P0（必須）** | Gemini APIレスポンスのパース | `SAY:` / `JSON:` の正規表現パースはバグの温床。不正レスポンスへの耐性が重要 | 単体テスト |
| **P0（必須）** | 状態更新ロジック (`state_update` の適用) | `sync_delta`, `evolution_delta`, `inventory_add/remove`, `flags_set`, `memory_add` の計算が正しいか | 単体テスト |
| **P1（重要）** | ダイス判定ロジック | 1d20 の範囲（1-20）、成功閾値（≥11）の検証 | 単体テスト |
| **P1（重要）** | 覚醒条件判定 | `sync > 40 && evolution > 40` の境界値テスト | 単体テスト |
| **P2（推奨）** | 型定義・定数の整合性 | `MOOD_CONFIG`, `SCENE_GRADIENTS` 等がすべてのキーを網羅しているか | 型テスト + 単体テスト |
| **P3（将来）** | UIコンポーネントの描画 | 各パネルが正しくレンダリングされるか | コンポーネントテスト |
| **P3（将来）** | インタラクション | フォーム送信、ボタンクリック等の動作確認 | インテグレーションテスト |

#### 8.3 具体的なテストケース例

**P0: レスポンスパース（リファクタリング後に `parseGeminiResponse()` として抽出想定）**
```ts
describe('parseGeminiResponse', () => {
  it('SAY と JSON を正しく分離する', () => {
    const raw = 'SAY: こんにちは！\nJSON: {"mode":"normal"}';
    const result = parseGeminiResponse(raw);
    expect(result.say).toBe('こんにちは！');
    expect(result.json.mode).toBe('normal');
  });

  it('JSON が不正でも SAY を返す', () => {
    const raw = 'SAY: テスト\nJSON: {invalid}';
    const result = parseGeminiResponse(raw);
    expect(result.say).toBe('テスト');
    expect(result.json).toBeNull();
  });

  it('SAY/JSON ヘッダーがない場合は全文を SAY とする', () => {
    const raw = 'ただのテキスト';
    const result = parseGeminiResponse(raw);
    expect(result.say).toBe('ただのテキスト');
  });
});
```

**P0: 状態更新ロジック（リファクタリング後に `applyStateUpdate()` として抽出想定）**
```ts
describe('applyStateUpdate', () => {
  it('sync_delta を加算し 100 を超えない', () => {
    const prev = { ...INITIAL_STATE, sync: 95 };
    const result = applyStateUpdate(prev, { sync_delta: 10 });
    expect(result.sync).toBe(100);
  });

  it('inventory_add で重複を排除する', () => {
    const prev = { ...INITIAL_STATE, inventory: ['スマホ'] };
    const result = applyStateUpdate(prev, { inventory_add: ['スマホ', '剣'] });
    expect(result.inventory).toEqual(['スマホ', '剣']);
  });

  it('inventory_remove で指定アイテムを除去する', () => {
    const prev = { ...INITIAL_STATE, inventory: ['スマホ', '剣'] };
    const result = applyStateUpdate(prev, { inventory_remove: ['剣'] });
    expect(result.inventory).toEqual(['スマホ']);
  });
});
```

**P1: ダイス判定**
```ts
describe('rollDice', () => {
  it('1-20 の範囲で値を返す', () => {
    for (let i = 0; i < 100; i++) {
      const val = rollDice();
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(20);
    }
  });

  it('11以上で成功と判定する', () => {
    expect(isRollSuccess(11)).toBe(true);
    expect(isRollSuccess(10)).toBe(false);
  });
});
```

**P1: 覚醒条件**
```ts
describe('isAwakeningReady', () => {
  it('sync > 40 かつ evolution > 40 で true', () => {
    expect(isAwakeningReady(41, 41)).toBe(true);
  });

  it('境界値: sync=40 では false', () => {
    expect(isAwakeningReady(40, 41)).toBe(false);
  });

  it('境界値: evolution=40 では false', () => {
    expect(isAwakeningReady(41, 40)).toBe(false);
  });
});
```

#### 8.4 テストファイルの配置戦略

**コロケーション方式**を採用する。テスト対象のファイルと同じディレクトリに `.test.ts` / `.test.tsx` を配置する。

```
src/
├── test/
│   └── setup.ts              # グローバルセットアップ（jest-dom 等）
├── lib/
│   ├── gemini-parser.ts       # パースロジック
│   ├── gemini-parser.test.ts  # ← コロケーション
│   ├── game-logic.ts          # 状態更新・ダイス・覚醒判定
│   └── game-logic.test.ts     # ← コロケーション
├── hooks/
│   ├── useGameState.ts
│   └── useGameState.test.ts   # ← 必要に応じて
└── components/
    ├── ChatPanel.tsx
    └── ChatPanel.test.tsx     # ← P3 で追加
```

**コロケーションの利点:**
- テスト対象との距離が近く、見つけやすい
- ファイル移動時にテストも一緒に移動できる
- Vitest のデフォルト glob（`**/*.test.{ts,tsx}`）でそのまま検出される

#### 8.5 テストカバレッジ目標

プロジェクト規模（ハッカソン起源・個人〜少人数開発）を考慮し、現実的な目標を設定する。

| フェーズ | カバレッジ目標 | 対象 |
|---|---|---|
| **Phase 1（リファクタリング直後）** | ビジネスロジック 80% | `lib/` 配下の純粋関数 |
| **Phase 2（安定化）** | ビジネスロジック 90% + hooks 60% | `lib/` + `hooks/` |
| **Phase 3（将来）** | 全体 60% | コンポーネント含む全体 |

**カバレッジ対象外（除外設定）:**
- `src/components/` 内の純粋な表示コンポーネント（Phase 3 まで）
- `src/index.css`, `src/main.tsx`（テスト不要）
- DevPanel コンポーネント（開発ツールのため）

#### 8.6 テスト実行の CI 統合

```yaml
# GitHub Actions（将来の追加を想定）
- name: Run tests
  run: npm run test
- name: Coverage check
  run: npm run test:coverage -- --reporter=json
```

#### 8.7 リファクタリングとの関係

テスト戦略はリファクタリングと密接に連携する：

1. **リファクタリング前**: 現状の App.tsx から純粋ロジックを特定（本提案で完了）
2. **リファクタリング中**: ロジックを `lib/` に抽出する際、同時にテストを書く（TDD 的アプローチ）
3. **リファクタリング後**: テストが通ることで既存の動作が壊れていないことを保証

特に P0 のパースロジックと状態更新ロジックは、抽出と同時にテストを書くことで**安全なリファクタリングの基盤**となる。

### 9. パフォーマンス最適化 (perf-engineer)

#### 基本方針

> 計測なき最適化は悪。現時点で画像アセットなし・バンドルサイズ小のため、**過剰最適化を避け、実測可能なボトルネックに絞る**。

現状の最大のパフォーマンス問題は「**全ロジック・全UIが App 1コンポーネント内にある**」ことによる不要な再レンダリングであり、コンポーネント分割（セクション1・2）と連動した最適化が最も効果的である。

---

#### 9-1. 再レンダリング最適化（最優先）

**現状の問題:**
App コンポーネントに 10個の `useState` が集中しており（L74-83）、いずれか1つの state 変更で App 全体（ScenePanel・CharacterPanel・ChatPanel・Overlays 含む）が再レンダリングされる。

**対策: コンポーネント分割 + React.memo**

```
推奨 React.memo 適用箇所:
├── ScenePanel        ← gameState.sceneType, gameState.scene のみ依存 → memo 効果大
├── CharacterPanel    ← gameState, mood のみ依存 → memo 効果大
│   ├── GrowthGauges  ← gameState.sync, gameState.evolution のみ → memo 効果大
│   └── MemoryLog     ← gameState.memory のみ → memo 効果大
├── ChatPanel         ← chatHistory, mood, inputText 依存
│   └── ChatMessage   ← 個別メッセージ props のみ → memo 効果大
└── DevPanel          ← 既に分離済み。props が関数のみなので memo 可
```

- `ScenePanel` は `inputText` や `chatHistory` の変更時に再レンダリング不要
- `CharacterPanel` は `inputText` の変更時に再レンダリング不要
- **個別の `ChatMessage` コンポーネントを memo 化**することで、新メッセージ追加時に既存メッセージの再レンダリングを防ぐ

**効果見積もり:** 入力中のキーストロークごとの再レンダリング範囲が App 全体 → ChatPanel の input 部分のみに縮小。体感的にも改善が見込める。

---

#### 9-2. API クライアントのシングルトン化（優先度高）

**現状の問題（L148）:**
```typescript
// メッセージ送信のたびに新しいインスタンスを生成
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
```

**対策:**
```typescript
// src/services/geminiClient.ts にシングルトンとして切り出し
let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  }
  return client;
}
```

- インスタンス生成コスト自体は小さいが、SDK 内部の初期化処理を毎回実行する必要がない
- API Key の参照を `import.meta.env` に統一し、Vite の環境変数規約に準拠させる副次効果もある（セクション4 API連携層と連動）

---

#### 9-3. チャットアニメーションの最適化（優先度中）

**現状の問題（L440-444）:**
```tsx
chatHistory.map((msg, i) => (
  <motion.div
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.05 }}  // 全メッセージに遅延アニメーション
  >
```

チャット履歴が長くなると、全メッセージに対して `delay: i * 0.05` のアニメーション計算が走る。`initial` が毎回設定されるため、React の再レンダリング時にも全メッセージのアニメーションが再トリガーされるリスクがある。

**対策:**
```tsx
// 新規メッセージのみアニメーション適用
const isNew = i >= chatHistory.length - 1; // 最後に追加されたメッセージのみ

<motion.div
  initial={isNew ? { opacity: 0, y: 4 } : false}
  animate={{ opacity: 1, y: 0 }}
>
```

- `initial={false}` で既存メッセージのアニメーション再実行を防止
- メモリログ（L410-414）にも同様の対策を適用
- セクション6（アニメーション設計）と連携して最終仕様を決定

---

#### 9-4. useCallback の適用（優先度中）

**現状の問題:**
`handleSendMessage`, `handleRollDice`, `toggleRecording`, `handleCameraDeclare`, `speak` が毎レンダリングで再生成される。これらが子コンポーネントに props として渡される場合、`React.memo` の効果を打ち消す。

**対策:**
```typescript
// コンポーネント分割後、子に渡すハンドラーのみ useCallback 化
const handleSendMessage = useCallback(async (text: string, diceVal: number | null = null) => {
  // ... gameStateRef.current を使うことで gameState を依存配列から除外済み
}, [turnCount, mood]);

const handleRollDice = useCallback(() => { ... }, []);
const toggleRecording = useCallback(() => { ... }, [isRecording]);
const handleCameraDeclare = useCallback(() => { ... }, []);
```

- **注意:** App 内でのみ使う関数を `useCallback` 化しても効果はない。コンポーネント分割と組み合わせて初めて意味がある
- `gameStateRef` パターン（L87, L143）は既に導入済みで、依存配列の最適化に利用可能

---

#### 9-5. useMemo の適用（優先度低）

以下は計算コストが低いため **現時点では不要** だが、データ量増加時に検討:

| 対象 | 現状 | 判断 |
|------|------|------|
| `SCENE_GRADIENTS[gameState.sceneType]` | 単純なオブジェクト参照 | 不要 |
| `gameState.scene.split('。')` (L267-269) | 短い文字列の split | 不要 |
| `chatHistory.map(...)` | メッセージ数が100+になった場合 | 要検討 |
| `gameState.memory.map(...)` | メモリエントリ数が50+になった場合 | 要検討 |

---

#### 9-6. 遅延読み込み（React.lazy）の判断

**結論: 現時点では不要。**

| 判断材料 | 状況 |
|----------|------|
| バンドルサイズ | 小（画像アセットなし、絵文字ベース） |
| コンポーネント数 | 実質2つ（App + DevPanel） |
| 外部ライブラリ | motion, lucide-react, @google/genai — いずれも必須 |
| DevPanel | 表示頻度は低いが、コード量は小さい（60行） |

唯一 `DevPanel` が lazy 化の候補だが、60行程度のためコード分割のオーバーヘッドの方が大きい。将来的にリッチな開発ツール（デバッグ機能、ステート編集等）を追加する場合のみ検討。

---

#### 9-7. SpeechRecognition useEffect のクロージャ問題（バグ修正）

**現状の問題（L101-117）:**
```typescript
useEffect(() => {
  // ...
  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    setInputText(transcript);
    handleSendMessage(transcript);  // ← 初期レンダリング時のクロージャが固定
  };
}, []);  // 空の依存配列
```

`handleSendMessage` は毎レンダリングで再生成されるが、useEffect の空依存配列により初期化時の関数が永続的に参照される。結果として、`turnCount` や `mood` が常に初期値で実行される。

**対策:**
```typescript
const handleSendMessageRef = useRef(handleSendMessage);
useEffect(() => { handleSendMessageRef.current = handleSendMessage; });

// SpeechRecognition の useEffect 内で
recognition.onresult = (event: any) => {
  const transcript = event.results[0][0].transcript;
  setInputText(transcript);
  handleSendMessageRef.current(transcript);  // 最新の関数を参照
};
```

---

#### 優先度まとめ

| 優先度 | 施策 | 効果 | コスト | 関連セクション |
|--------|------|------|--------|----------------|
| **最優先** | コンポーネント分割 + React.memo (9-1) | 大 | 中 | セクション1, 2 |
| **高** | API クライアント シングルトン化 (9-2) | 中 | 小 | セクション4 |
| **中** | チャットアニメーション最適化 (9-3) | 中 | 小 | セクション6 |
| **中** | useCallback 適用 (9-4) | 中 | 小 | 9-1完了後 |
| **低** | useMemo 適用 (9-5) | 小 | 小 | — |
| **不要** | React.lazy 遅延読み込み (9-6) | — | — | — |
| **バグ修正** | SpeechRecognition クロージャ修正 (9-7) | 正確性 | 小 | セクション3 |

> **注:** 9-1（コンポーネント分割 + React.memo）は他チームの提案（セクション1: アーキテクチャ、セクション2: コンポーネント分割、セクション3: 状態管理）と密接に関連する。分割後に React.memo と useCallback を組み合わせることで最大の効果が得られる。単独で先行実施しても効果は限定的。

### 10. ドキュメント・DX (dx-specialist)

#### 現状の課題

| 項目 | 現状 | 問題点 |
|---|---|---|
| パスエイリアス | `@` → プロジェクトルート (`.`) | リファクタリング後は `src/` を指すべき |
| リンター | `tsc --noEmit` のみ | 未使用変数・import順・一貫性のチェック不在 |
| フォーマッター | なし | コード整形がエディタ個人設定に依存 |
| 命名規則 | 未定義 | ファイル増加後に混乱する恐れ |
| package.json | name が `react-example` | プロジェクトを識別できない |
| tsconfig.json | `strict` が未設定 | 暗黙の any や null チェック漏れの温床 |
| vite 重複 | `dependencies` と `devDependencies` の両方に `vite` | ビルドツールは devDependencies のみで十分 |

#### 10-1. ファイル・ディレクトリ命名規則

リファクタリング後のファイル数増加に備え、以下の規則を統一する。

| 対象 | 規則 | 例 |
|---|---|---|
| React コンポーネント | PascalCase | `ScenePanel.tsx`, `ChatPanel.tsx` |
| カスタム hooks | camelCase（`use` プレフィックス） | `useGameState.ts`, `useChat.ts` |
| サービス・ユーティリティ | camelCase | `geminiClient.ts` |
| 型定義ファイル | camelCase または `index.ts` | `types/index.ts` |
| 定数ファイル | camelCase または `index.ts` | `constants/index.ts` |
| ディレクトリ | camelCase（単数形不可、複数形推奨） | `components/`, `hooks/`, `types/` |
| テストファイル | 対象ファイル名 + `.test.ts(x)` | `useChat.test.ts`, `ScenePanel.test.tsx` |
| CSS / 設定ファイル | kebab-case | `index.css`, `vite.config.ts` |

**理由**: architect が提案したディレクトリ構成（セクション1）と自然に整合する。React エコシステムの事実上の標準に従うため学習コスト不要。

#### 10-2. パスエイリアス設定の修正

現在 `@` がプロジェクトルートを指しており、リファクタリング後は `src/` を指すように修正する。

**vite.config.ts の変更:**
```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
},
```

**tsconfig.json の変更:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

**使用例（リファクタリング後）:**
```ts
import { GameState } from '@/types';
import { useChat } from '@/hooks/useChat';
import { ScenePanel } from '@/components/ScenePanel';
```

**理由**: `@` → `src/` はVite + React プロジェクトの標準的なマッピング。ルートを指す現設定のままだと `@/src/hooks/useChat` のように冗長な import になる。`include: ["src"]` を追加し、設定ファイルや node_modules の型チェックを明示的に除外する。

#### 10-3. ESLint / Prettier の導入判断

**結論: 最小限のESLint設定のみ導入する。Prettierは導入しない。**

| ツール | 判断 | 理由 |
|---|---|---|
| ESLint | **導入する**（最小構成） | 未使用import・変数の検出は `tsc` だけでは不十分。React hooks のルール違反（deps 漏れ等）は実行時バグに直結する |
| Prettier | **導入しない** | エディタ設定（`.editorconfig`）で十分対応可能。設定ファイル増加やフォーマット差分ノイズを避ける |

**推奨 ESLint 設定（Flat Config 形式）:**

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['dist/'] }
);
```

**package.json への追加:**
```json
{
  "scripts": {
    "lint": "tsc --noEmit && eslint src/",
    "lint:fix": "eslint src/ --fix"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "typescript-eslint": "^8.0.0",
    "eslint-plugin-react-hooks": "^5.0.0"
  }
}
```

**理由**: ESLint Flat Config は v9 以降の標準で、`.eslintrc` のような追加設定ファイル不要。プラグインは `react-hooks` のみに絞り、設定の肥大化を防ぐ。Prettier を入れない代わりに `.editorconfig` で最低限のフォーマット統一を行う。

**`.editorconfig`（新規追加）:**
```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

#### 10-4. package.json の修正

```json
{
  "name": "no-code-girls-trpg",
  "private": true
}
```

また `vite` を `dependencies` から削除し、`devDependencies` のみに残す。ビルドツールは本番バンドルに不要。

#### 10-5. tsconfig.json の強化

```json
{
  "compilerOptions": {
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "include": ["src"]
  }
}
```

- `strict: true`: 暗黙の `any`、null チェック漏れ等を静的に検出。リファクタリング中に型エラーを早期発見できる
- `forceConsistentCasingInFileNames`: macOS でのファイル名大小文字問題を防止（CI/CD の Linux 環境とのズレ回避）
- `include`: 型チェック対象を `src/` に限定

**注意**: `strict: true` の導入で既存コードに型エラーが発生する可能性がある。型システム設計（セクション7）と連携して対応する。

#### 10-6. 既存ドキュメントの更新計画

リファクタリング後、以下のドキュメントを更新する必要がある。

| ドキュメント | 更新内容 | 優先度 |
|---|---|---|
| `AGENTS.md` | ディレクトリ構成・ファイル責務の反映。「`src/App.tsx`: Main entry point containing...」を新構成に書き換え | **高** |
| `CLAUDE.md` | AGENTS.md への参照が既にあるため、AGENTS.md の更新に連動して自動的に最新化される | 低 |
| `CHANGELOG.md` | リファクタリング実施内容の記録（破壊的変更として記載） | **高** |
| `README.md` | セットアップ手順に `npm run lint` を追加、ディレクトリ構成セクションの更新 | 中 |
| `HUMANS.md` / `HUMANS-ja.md` | リファクタリング貢献者の追記（必要に応じて） | 低 |
| `HACKATHON.md` | 内容は歴史的記録のため更新不要 | — |

**AGENTS.md の更新方針**: ドキュメントメンテナンスルール（AGENTS.md 末尾）に従い、リファクタリング完了後に「現在の状態」のみを反映する。旧構成の記述は CHANGELOG.md に移動する。

#### まとめ: 実施優先度

| 優先度 | 施策 | 効果 |
|---|---|---|
| 🔴 リファクタリングと同時 | パスエイリアス修正（`@` → `src/`） | import パスの一貫性確保 |
| 🔴 リファクタリングと同時 | tsconfig.json 強化（`strict`, `include`） | 型安全性の向上・型エラー早期検出 |
| 🟡 リファクタリング直後 | ESLint 導入（最小構成） | hooks ルール違反・未使用コード検出 |
| 🟡 リファクタリング直後 | AGENTS.md / CHANGELOG.md 更新 | ドキュメントと実装の乖離防止 |
| 🟢 任意のタイミング | package.json 修正（name, vite 重複解消） | プロジェクト識別性・依存関係の正確性 |
| 🟢 任意のタイミング | .editorconfig 追加 | フォーマット最低限の統一 |

---

## レビューセクション

### レビュー記録

#### test-strategist のレビュー
- **条件付き承認**
- **コメント**:
  - **セクション1（アーキテクチャ）について**: テスト戦略で `lib/` ディレクトリ（`gemini-parser.ts`, `game-logic.ts`）を想定したが、architect の構成では `services/geminiClient.ts` にパースロジックが含まれ、ゲームロジック（状態更新・ダイス・覚醒判定）の純粋関数の配置先が未定義。**提案: `services/` に `gameLogic.ts` を追加するか、hooks 内の純粋関数を export して直接テスト可能にする**。テスト対象の純粋関数が hooks の中に閉じ込められるとテストが困難になる。
  - **セクション3（状態管理）について**: `useGameState` 内に `applyStateUpdate` ロジックが埋め込まれる設計だが、テスト戦略では `applyStateUpdate()` を純粋関数として直接テストすることを想定している。**hooks 内部で使う場合でも、純粋関数として export してほしい**（例: `useGameState.ts` 内で `export function applyStateUpdate(...)` を定義し、hook からも外部テストからも参照可能にする）。
  - **セクション4（API連携層）と セクション7（型システム）の重複**: セクション4 は `parseGeminiResponse()` → `GeminiResponse { sayText, parsed }` を定義、セクション7 は `parseDMResponse()` → `ParsedDMResponse { sayText, data }` を定義している。**同一機能の関数が2つ定義されており、名前と戻り値の型を統一すべき**。テストケースは1つの関数を対象に書くべきで、重複は混乱を招く。
  - **セクション6（アニメーション）について**: `animations/` ディレクトリの追加はセクション1のディレクトリ構成に含まれていない。architect と合意の上で構成を更新すべき。テスト観点では `AnimatedOverlay` 等はP3（将来）対象のため優先度に影響なし。
  - **セクション9（パフォーマンス）について**: 9-7 の SpeechRecognition クロージャ問題は実質バグであり、リファクタリングとは独立して早期修正すべき。テスト観点でも `useRef` パターンの正しさを検証するテストを追加すべきケース。
  - **セクション10（DX）について**: ESLint の `eslint-plugin-react-hooks` 導入に強く賛成。hooks の依存配列漏れはテストでは検出しにくいバグの温床であり、静的解析で防ぐのが最善。`strict: true` もテスト時の型安全性向上に寄与する。
- **承認条件**: セクション4 と セクション7 のパース関数の統一、および純粋関数（`applyStateUpdate`, `rollDice`, `isAwakeningReady`）のテスト可能な形での export が確約されること。

#### dx-specialist のレビュー
- **条件付き承認**
- **コメント**:
  - **セクション1（アーキテクチャ）について**: ディレクトリ構成は明確で命名規則（セクション10）とも整合している。ただし、セクション6が提案する `animations/` ディレクトリとセクション8が提案する `lib/` ディレクトリがこの構成に含まれていない。**最終構成を合意する際に、これらの追加ディレクトリを反映する必要がある**。
  - **セクション6（アニメーション）について**: `src/animations/AnimatedOverlay.tsx` は React コンポーネントであり、`animations/` ディレクトリに配置すると「コンポーネントは `components/` に置く」という命名規則と矛盾する。`AnimatedOverlay` を `components/` に移すか、`animations/` をバリアント定数のみに限定する（`variants.ts` + `index.ts`）ことを推奨する。
  - **セクション8（テスト戦略）について**: テストファイル配置のコロケーション方式に賛成。ただし `src/lib/` ディレクトリ（`gemini-parser.ts`, `game-logic.ts`）はセクション1の `services/geminiClient.ts` およびセクション4の API 設計と名称が衝突する。`lib/` と `services/` のどちらかに統一すべき。提案: `services/` に統一し、パースロジックは `services/geminiClient.ts` 内に含める（セクション4の設計通り）。ゲームロジック（状態更新・ダイス・覚醒判定）は `hooks/` 内の各 hook から export するか、必要なら `services/gameLogic.ts` として切り出す。
  - **セクション4（API連携）について**: `import.meta.env.VITE_GEMINI_API_KEY` への移行に賛成。現在の `process.env.GEMINI_API_KEY`（vite.config.ts の `define` で注入）から Vite 標準の環境変数規約に移行することで、`.env` ファイルの `VITE_` プレフィックス規約とも整合する。ただし `.env` ファイルの変数名変更が必要になるため、README.md のセットアップ手順更新（セクション10-6）と同時に実施すべき。
  - **セクション4・7 の重複（test-strategist に同意）**: `parseGeminiResponse`（セクション4）と `parseDMResponse`（セクション7）が同一機能を別名で定義している。関数名・戻り値型を1つに統一すべき。DX 観点では、開発者が同じ機能を2つの名前で認識する混乱を防ぐために重要。
  - **セクション7（型システム）について**: `strict: true` 前提の設計に合意。`types/` を複数ファイルに分割する案は妥当だが、現時点のコード規模（型定義19行）を考えると、まず `types/index.ts` 単一ファイルで開始し、型が増えた時点でファイル分割する段階的アプローチを推奨する。
  - **セクション9（パフォーマンス）について**: 9-7 の SpeechRecognition クロージャ問題はパフォーマンスではなくバグ修正であり、リファクタリングの最優先事項として扱うべき。本提案の ESLint `react-hooks/exhaustive-deps` ルールが導入されれば、この種の問題は静的に検出可能になる。
- **承認条件**: セクション1のディレクトリ構成にセクション6・8の追加ディレクトリを統合した最終構成の合意、およびセクション4・7のパース関数の統一。

#### type-engineer のレビュー
- **条件付き承認**: 型名の統一と `lib/` ディレクトリの整合を解決すれば承認
- **コメント**:
  - **セクション1（アーキテクチャ）**: 設計方針・依存関係図ともに良好。`types/` を依存の起点とする構成はセクション7と整合。ただし `animations/`（セクション6）が推奨構成に未反映。最終合意時にツリーを更新すべき
  - **セクション2（コンポーネント分割）**: Props 設計が明確で良い。`DiceOverlay` の Props `{ value: number; success: boolean } | null` はインライン型。セクション7の `RollResult | null` を使うべき
  - **セクション3（状態管理）**: hooks 設計は合理的。型名不一致あり：`DiceResult` → `RollResult`、`GeminiStateUpdate` → `StateUpdate` に統一必要。test-strategist の指摘に同意し、`applyStateUpdate` は純粋関数として export すべき（テスタビリティ + 型安全性）
  - **セクション4（API連携層）**: `parseGeminiResponse` の独立関数化を支持。型名 `GeminiPayload` / `GeminiResponse` / `GeminiParsedJson` がセクション7の `GamePayload` / `ParsedDMResponse` / `DMResponse` と不一致。ドメイン語彙ベースの命名への統一を推奨
  - **セクション5（UI/UX）**: 型に関わる論点は少ない。`@utility wafuu-label` はオプションとして適切
  - **セクション6（アニメーション）**: `Variants` 型の import が正しく `AnimatedOverlay` の Props 型も簡潔。dx-specialist の指摘に同意し、`AnimatedOverlay` は `components/` に置くか `animations/` をバリアント定数のみに限定すべき
  - **セクション8（テスト戦略）**: テストケース例の品質は高い。`lib/` → `services/` への統一に賛成（dx-specialist と同意見）。テスト例中の関数名・型名もセクション7の命名に合わせるべき
  - **セクション9（パフォーマンス）**: 9-7 のクロージャ問題は的確かつ重要。バグ修正コード例内の `event: any` はセクション7の `types/speech.ts` 導入後に `SpeechRecognitionEvent` 型へ置換すべき
  - **セクション10（DX）**: `strict: true` 提案はセクション7と完全に連携しており強く支持。dx-specialist の「`types/index.ts` 単一ファイルで開始し段階的に分割」案も現実的で受け入れ可能
  - **横断的指摘 — 型名統一表**: 着手前に以下で合意すべき

| 概念 | セクション3 | セクション4 | セクション7（推奨） |
|---|---|---|---|
| API ペイロード | — | `GeminiPayload` | `GamePayload` |
| パース済みレスポンス | — | `GeminiResponse` | `ParsedDMResponse` |
| JSON 部分の型 | `GeminiStateUpdate` | `GeminiParsedJson` | `DMResponse` |
| 状態更新デルタ | `GeminiStateUpdate` | — | `StateUpdate` |
| ダイス結果 | `DiceResult` | — | `RollResult` |

- **承認条件**: (1) 上記型名統一表の合意 (2) セクション1構成への `animations/` 反映 (3) インライン型の名前付き型への統一

#### architect のレビュー
- **条件付き承認**
- **総評**: 各セクションの提案は全体として質が高い。全レビュアーが共通して指摘した3つの構成不整合（`animations/` / `lib/` ディレクトリ、型名重複）を解消し、最終構成を提案する。
- **コメント**:
  - セクション2（コンポーネント分割）: アーキテクチャ設計と完全に整合。type-engineer 指摘の DiceOverlay Props のインライン型は `RollResult | null` に統一すべき。**承認**。
  - セクション3（状態管理）: hooks による分散管理は正しい。test-strategist 指摘の「純粋関数の export」に同意。`applyStateUpdate` 等は hooks ファイル内で `export function` として定義する。**承認**。
  - セクション4（API連携層）: シングルトン化、`import.meta.env` 統一、純粋関数化はすべて良い。型名はセクション7の命名に統一する（type-engineer の統一表に基づく）。**承認**。
  - セクション5（UIデザインシステム）: **承認**。
  - セクション6（アニメーション設計）: **`animations/` ディレクトリは作成しない**（全レビュアー合意）。dx-specialist 指摘の通り `AnimatedOverlay` は `components/` に配置。Motion バリアント定数は `constants/index.ts` に含める。`css-classes.ts` は不要。**条件付き承認**。
  - セクション7（型システム）: 初回は `types/index.ts` + `types/speech.ts` の2ファイルで開始（dx-specialist と同意見）。type-engineer の型名統一表を採用し、セクション横断で命名を揃える。**条件付き承認**。
  - セクション8（テスト戦略）: **`lib/` ディレクトリは作成しない**（全レビュアー合意）。パースロジックは `services/geminiClient.ts`、ゲームロジックの純粋関数は hooks の named export で対応。テストは各ファイルにコロケーション配置。**条件付き承認**。
  - セクション9（パフォーマンス）: 9-7 の **SpeechRecognition クロージャバグは全レビュアーが即修正に合意**。リファクタリング着手前に先行修正すべき。**承認**。
  - セクション10（DX）: **承認**。
- **全レビュー指摘を反映した最終ディレクトリ構成の提案**:
  ```
  src/
  ├── main.tsx
  ├── index.css
  ├── App.tsx                   # hooks 呼び出し + レイアウト構成のみ
  ├── types/
  │   ├── index.ts              # 全型定義（統一命名: GameState, Mood, ChatMessage, GamePayload, ParsedDMResponse, DMResponse, StateUpdate, RollResult 等）
  │   └── speech.ts             # Window 拡張（declare global）
  ├── constants/
  │   └── index.ts              # ゲーム定数 + Motion バリアント定数
  ├── services/
  │   └── geminiClient.ts       # Gemini API 通信 + parseGeminiResponse（純粋関数）
  ├── hooks/
  │   ├── useGameState.ts       # GameState 管理 + export { applyStateUpdate, isAwakeningReady }
  │   ├── useChat.ts            # チャット履歴 + メッセージ送信
  │   ├── useSpeech.ts          # 音声認識 + 音声合成
  │   └── useDice.ts            # ダイスロール + export { rollDice, isRollSuccess }
  ├── components/
  │   ├── ScenePanel.tsx
  │   ├── CharacterPanel.tsx    # 内部に GaugeBar ローカルヘルパー
  │   ├── ChatPanel.tsx
  │   ├── DiceOverlay.tsx
  │   ├── AnimatedOverlay.tsx   # 共通オーバーレイラッパー
  │   └── DevPanel.tsx
  └── test/
      └── setup.ts              # Vitest グローバルセットアップ
  ```
- **型名統一（type-engineer 提案を採用・確定）**:
  - API ペイロード → `GamePayload`
  - パース済みレスポンス → `ParsedDMResponse`
  - JSON 部分の型 → `DMResponse`
  - 状態更新デルタ → `StateUpdate`
  - ダイス結果 → `RollResult`
- **承認条件**: 上記最終構成と型名統一への各メンバーの合意。

#### perf-engineer のレビュー
- **条件付き承認**
- **コメント**:
  - **セクション1（アーキテクチャ）について**: 承認。フラットな構成と hooks → components の単方向データフローは、再レンダリング最適化（9-1）の前提条件として理想的。architect の最終構成案で `animations/` と `lib/` の問題が解決されている。
  - **セクション2（コンポーネント分割）について**: 承認。Props 設計が明確で memo 化対象の特定が容易。
  - **セクション3（状態管理）について**: 概ね承認だが1点懸念あり。**`useSpeech` に `inputText` を含める設計は再レンダリング効率に影響する。** テキスト入力はキーストロークごとの高頻度 state 変更であり、`useSpeech` の返り値変更が依存先すべてを再レンダリングさせる。**`inputText` / `setInputText` は ChatPanel のローカル state に降格**し、入力中の再レンダリング範囲を ChatPanel 内に限定することを推奨。
  - **セクション4（API連携層）について**: 承認。モジュールスコープのシングルトンは私のセクション9-2のゲッター関数パターンよりシンプル。**セクション9-2をセクション4の方式に統一する。**
  - **セクション5（UI/UX）について**: 承認。パフォーマンスへの影響なし。
  - **セクション6（アニメーション設計）について**: 概ね承認。`will-change` のGPUレイヤー昇格（4要素限定）は適切。architect の最終構成案で `AnimatedOverlay` → `components/`、バリアント定数 → `constants/index.ts` への統合に同意。`slideInFromBottom` バリアントとセクション9-3の擦り合わせについて: バリアント定義はそのまま活用し、**コンポーネント側で `initial={isNew ? "hidden" : false}` として既存メッセージのアニメーション再実行を防止**する方式を推奨。
  - **セクション7（型システム）について**: 承認。type-engineer の型名統一表を支持。`types/index.ts` + `types/speech.ts` の2ファイル構成に同意。
  - **セクション8（テスト戦略）について**: 承認。`lib/` 廃止・純粋関数の named export によるテスタビリティ確保に同意。
  - **セクション9（自己セクション）について**: 他レビュアーの指摘を反映し以下を修正: (1) 9-2のゲッター関数パターンをセクション4のモジュールスコープ方式に統一 (2) 9-7のバグ修正コード例内の `event: any` を `SpeechRecognitionEvent` に置換
  - **セクション10（DX）について**: 承認。ESLint `react-hooks` プラグインはセクション9-4・9-7の予防に直結。
  - **architect の最終構成案について**: パフォーマンス観点から承認。`applyStateUpdate`・`rollDice`・`isRollSuccess` の named export はメモ化の依存配列管理にも有用。
- **横断的な指摘（未解決）**:
  - **`inputText` の配置**: セクション3で `useSpeech` 内としているが、パフォーマンス観点では ChatPanel ローカル state が望ましい。architect の最終構成案でもこの点は未解決。**最終合意で明確化すべき。**
- **承認条件**: `inputText` の配置をパフォーマンス影響を考慮して再検討すること。

#### component-designer のレビュー
- **判定**: 条件付き承認
- **総評**: 全セクションで基本方針が一貫しており、高品質な提案書。architect の最終構成提案で主要な不整合が解消されている。コンポーネント層の観点から残りの論点をコメントする。
- **コメント**:
  - **セクション1（アーキテクチャ）**: App.tsx イメージで `ScenePanel gameState={gameState}` と全 GameState を渡しているが、セクション2では `sceneType` と `scene` のみを Props 定義。GameState 全体を渡すと memo 効果が薄れる（セクション9-1と不整合）。**architect の最終構成採用時に Props を個別に渡す方針に統一すべき**
  - **セクション2（自セクション）への指摘対応**: type-engineer 指摘の DiceOverlay Props インライン型を `RollResult | null` に統一する。承認済み
  - **セクション3（状態管理）**: `useChat` が `chatEndRef` を返す設計だが、セクション2では ChatPanel 内部管理を方針としている。**chatEndRef と自動スクロール useEffect は ChatPanel 内に閉じ込めるべき**（hooks 層から DOM ref を漏洩させない原則）
  - **セクション3 追加（perf-engineer に同意）**: **`inputText` は ChatPanel のローカル state に降格すべき**。キーストロークごとの state 変更が useSpeech 経由で伝播すると不要な再レンダリングが発生する。音声認識結果のテキスト反映は `onSpeechResult` コールバック経由で ChatPanel に渡せば済む
  - **セクション4・7 型名統一**: architect 最終提案の型名（`GamePayload`, `ParsedDMResponse`, `DMResponse`, `StateUpdate`, `RollResult`）に全面合意
  - **セクション6（アニメーション）**: architect の裁定（`animations/` 不要、バリアント定数は `constants/`、`AnimatedOverlay` は `components/`）に合意。perf-engineer 提案の `initial={isNew ? "hidden" : false}` パターンも支持
  - **セクション8（テスト）**: `lib/` → `services/` 統一、純粋関数の named export に合意。全レビュアー一致
  - **セクション9（パフォーマンス）**: 9-1 で `GrowthGauges`・`MemoryLog` が独立サブコンポーネントとして扱われているが、セクション2ではこれらは CharacterPanel 内インライン。**memo 化は CharacterPanel 内のローカルコンポーネントとして行う**。`ChatMessage` のメモ化は良い提案で、ChatPanel 内ローカルヘルパーとして追加検討
  - **セクション9-7（SpeechRecognition クロージャ）**: 全員合意の重要バグ。リファクタリング着手前の先行修正に賛成
  - **architect の最終ディレクトリ構成**: 全レビュー指摘を統合した構成として合意
- **承認条件**: (1) セクション1 App.tsx イメージの Props 渡し方統一（個別 Props）、(2) `chatEndRef` を ChatPanel 内部管理に確定、(3) `inputText` を ChatPanel ローカル state に降格

#### animation-engineer のレビュー
- **承認**
- **コメント**:
  - **セクション1（アーキテクチャ）**: architect の最終ディレクトリ構成提案に全面合意。Motion バリアント定数は `constants/index.ts` に統合、`AnimatedOverlay` は `components/` に配置する。独立した `animations/` ディレクトリは不要。
  - **セクション2（コンポーネント分割）**: DiceOverlay 独立分離は `AnimatedOverlay` と好相性。GaugeBar ローカルヘルパーも `progressBarVariants` と自然に連携。component-designer 指摘の `ChatMessage` メモ化ローカルヘルパー追加もアニメーション再トリガー防止の観点から支持。
  - **セクション3（状態管理）**: `isAwakeningFlash` が `useGameState` 内にある設計は適切（状態駆動アニメーション）。perf-engineer・component-designer の `inputText` ChatPanel ローカル化提案に賛同。入力ごとの不要な再レンダリングでアニメーションが再トリガーされるリスクを回避できる。`chatEndRef` の ChatPanel 内部管理にも賛同（DOM ref を hooks 層から漏洩させない）。
  - **セクション4・7（API連携・型システム）**: type-engineer の型名統一表に賛同。`mode`（Mood型）はアニメーション切り替えトリガーであり型の一貫性は重要。
  - **セクション9（パフォーマンス）**: 9-3 について perf-engineer と合意済み。`slideInFromBottom` バリアント + `initial={isNew ? "hidden" : false}` で既存メッセージの再アニメーション防止。9-7 クロージャバグは先行修正に合意。
  - **セクション10（DX）**: ESLint `react-hooks` プラグインに強く賛同。
  - **自セクション（セクション6）修正事項**: architect の最終構成を受け以下を確定: (1) `src/animations/` → 廃止、バリアント定数は `constants/index.ts` に統合 (2) `AnimatedOverlay.tsx` → `components/` に配置 (3) `css-classes.ts` → 廃止
- **承認条件**: なし（architect の最終構成提案および全レビュアーの指摘事項に全面合意）

---

## 最終合意

### レビュー指摘事項の解決

全レビュアーの指摘を統合し、以下の通り解決する。

#### 解決 1: `animations/` ディレクトリの廃止

| 指摘者 | 内容 | 解決 |
|---|---|---|
| test-strategist | セクション1の構成に `animations/` が未反映 | **`animations/` は作成しない** |
| dx-specialist | `AnimatedOverlay` はコンポーネントなので `components/` に配置すべき | `components/AnimatedOverlay.tsx` に配置 |
| type-engineer | architect の構成に `animations/` 反映すべき | Motion バリアント定数は `constants/index.ts` に統合 |
| architect | 全レビュアー合意として `animations/` 不採用を確定 | **確定** |
| animation-engineer | 自セクション修正として `animations/` 廃止を受諾 | **確定** |

#### 解決 2: `lib/` vs `services/` の統一

| 指摘者 | 内容 | 解決 |
|---|---|---|
| test-strategist | `lib/` のパースロジック配置先が不明 | `services/geminiClient.ts` に含める |
| dx-specialist | `lib/` と `services/` の名称衝突 | **`services/` に統一、`lib/` は作成しない** |
| type-engineer | dx-specialist と同意見 | **確定** |
| architect | `lib/` 廃止を全体合意として確定 | **確定** |

#### 解決 3: 型名の統一（type-engineer 提案を全員採用）

| 概念 | セクション3 | セクション4 | **統一名（セクション7準拠）** |
|---|---|---|---|
| API ペイロード | — | `GeminiPayload` | **`GamePayload`** |
| パース済みレスポンス | — | `GeminiResponse` | **`ParsedDMResponse`** |
| JSON 部分の型 | `GeminiStateUpdate` | `GeminiParsedJson` | **`DMResponse`** |
| 状態更新デルタ | `GeminiStateUpdate` | — | **`StateUpdate`** |
| ダイス結果 | `DiceResult` | — | **`RollResult`** |

パース関数名も統一: `parseGeminiResponse`（セクション4の名前を採用、型はセクション7に準拠）

#### 解決 4: 純粋関数の export（テスタビリティ確保）

test-strategist の指摘に全員が同意。hooks 内の純粋関数は named export する:

```ts
// hooks/useGameState.ts
export function applyStateUpdate(current: GameState, update: StateUpdate): GameState { ... }
export function isAwakeningReady(awakening: number): boolean { ... }

// hooks/useDice.ts
export function rollDice(): number { ... }
export function isRollSuccess(value: number, threshold: number): boolean { ... }
```

#### 解決 5: `inputText` の配置（perf-engineer 指摘）

perf-engineer の指摘を採用し、component-designer・animation-engineer も賛同: **`inputText` / `setInputText` は `ChatPanel` のローカル state とする。**

理由: テキスト入力はキーストロークごとの高頻度更新であり、`useSpeech` hook に含めると不要な再レンダリングが発生する。音声認識結果のテキスト反映は `onSpeechResult` コールバック経由で ChatPanel に渡す。

#### 解決 6: `chatEndRef` の配置（component-designer 指摘）

component-designer の指摘を採用: **`chatEndRef` と自動スクロール useEffect は `ChatPanel` 内に閉じ込める。** hooks 層から DOM ref を漏洩させない原則に従う。

#### 解決 7: Props の渡し方（component-designer 指摘）

component-designer の指摘を採用: **App.tsx から各コンポーネントへは個別 Props で渡す。** GameState 全体を渡すと memo 効果が薄れるため、必要なプロパティのみを渡す。

#### 解決 8: SpeechRecognition クロージャバグ（9-7）の優先修正

**全レビュアーが即時修正に合意。リファクタリング着手前に先行修正する。**

修正方針: `useRef` で最新の `handleSendMessage` を保持し、`onresult` コールバック内で `.current` を参照する。ESLint `react-hooks/exhaustive-deps` ルール導入後は静的に検出可能。

#### 解決 9: 型ファイルの段階的分割

dx-specialist の提案を採用: **初回は `types/index.ts` + `types/speech.ts` の2ファイルで開始。** 型定義が増加した時点で `game.ts` / `chat.ts` / `api.ts` に分割する。

---

### 承認ディレクトリ構成

```
src/
├── main.tsx                    # エントリポイント（変更なし）
├── index.css                   # グローバルスタイル + CSS変数（変更なし）
├── App.tsx                     # hooks 呼び出し + レイアウト構成のみ（〜80行）
├── types/
│   ├── index.ts                # GameState, Mood, ChatMessage, GamePayload,
│   │                           # ParsedDMResponse, DMResponse, StateUpdate, RollResult
│   └── speech.ts               # Window 拡張（declare global { interface Window { ... } }）
├── constants/
│   └── index.ts                # INITIAL_STATE, SYSTEM_PROMPT, MOOD_CONFIG,
│                               # SCENE_GRADIENTS, SCENE_ACCENTS, MOTION_VARIANTS
├── services/
│   └── geminiClient.ts         # Gemini API シングルトン + parseGeminiResponse（純粋関数）
├── hooks/
│   ├── useGameState.ts         # GameState 管理 + export { applyStateUpdate, isAwakeningReady }
│   ├── useChat.ts              # チャット履歴 + メッセージ送信（geminiClient 使用）
│   ├── useSpeech.ts            # 音声認識 + 音声合成（inputText はここに含めない）
│   └── useDice.ts              # ダイスロール + export { rollDice, isRollSuccess }
├── components/
│   ├── ScenePanel.tsx          # シーン背景・雰囲気表示（〜55行）
│   ├── CharacterPanel.tsx      # キャラクターステータス + GaugeBar（〜130行）
│   ├── ChatPanel.tsx           # チャットUI + inputText/chatEndRef ローカル管理（〜100行）
│   ├── DiceOverlay.tsx         # ダイスロール演出（〜35行）
│   ├── AnimatedOverlay.tsx     # Motion 共通オーバーレイラッパー（〜30行）
│   └── DevPanel.tsx            # 開発者パネル（〜65行）
└── test/
    └── setup.ts                # Vitest グローバルセットアップ
```

**依存関係**: `types/` ← `constants/` ← `services/` ← `hooks/` ← `components/` ← `App.tsx`（単方向）

---

### 技術決定サマリー

| 項目 | 決定 | 根拠 |
|---|---|---|
| 状態管理 | カスタム hooks（外部ライブラリ不使用） | 現在の規模では十分。useState + useRef で完結 |
| API通信 | モジュールスコープ シングルトン | セクション4方式。ゲッター関数より簡潔 |
| 型ファイル | `types/index.ts` + `types/speech.ts` の2ファイル | 段階的分割方針（dx-specialist 提案） |
| アニメーション定数 | `constants/index.ts` に統合 | 専用ディレクトリ不要（全員合意） |
| テストフレームワーク | Vitest（コロケーション配置） | Vite との統合、Jest 互換 API |
| リンター | ESLint Flat Config（react-hooks プラグインのみ） | 最小構成。Prettier 不採用 |
| パスエイリアス | `@` → `src/`（tsconfig + vite.config 統一） | import の一貫性確保 |
| TypeScript | `strict: true` | 暗黙の any 排除、null 安全性 |
| 環境変数 | `import.meta.env.VITE_GEMINI_API_KEY` | Vite 標準規約に統一 |
| `inputText` 配置 | ChatPanel ローカル state | 高頻度更新の再レンダリング範囲限定（perf-engineer 提案） |
| `chatEndRef` 配置 | ChatPanel 内部管理 | DOM ref を hooks 層から漏洩させない（component-designer 提案） |
| Props 渡し方 | 個別 Props（GameState 全体を渡さない） | memo 効果の最大化（component-designer 提案） |

---

### 実装フェーズ

| フェーズ | 内容 | 前提 |
|---|---|---|
| **Phase 0** | SpeechRecognition クロージャバグ修正（9-7） | なし（即時実施） |
| **Phase 1** | `types/` + `constants/` 抽出 | Phase 0 完了 |
| **Phase 2** | `services/geminiClient.ts` 抽出 + 環境変数移行 | Phase 1 完了 |
| **Phase 3** | `hooks/` 抽出（useGameState, useChat, useSpeech, useDice） | Phase 2 完了 |
| **Phase 4** | `components/` 分割（ScenePanel → DevPanel） | Phase 3 完了 |
| **Phase 5** | `App.tsx` をオーケストレーション層に縮小 | Phase 4 完了 |
| **Phase 6** | DX 整備（ESLint, tsconfig 強化, .editorconfig, テスト基盤, ドキュメント更新） | Phase 5 完了 |

**各フェーズ完了条件**: `npm run dev` でアプリが正常動作すること（回帰なし）。

---

### 承認者

| メンバー | 役割 | 承認状態 | 条件 |
|---|---|---|---|
| architect | アーキテクチャ設計 | **条件付き承認 → 解決済み** | 最終構成・型名統一への合意 ✅ |
| component-designer | コンポーネント分割 | **条件付き承認 → 解決済み** | Props 個別渡し ✅、chatEndRef 内部化 ✅、inputText ローカル化 ✅ |
| state-engineer | 状態管理設計 | **承認** | — |
| api-specialist | API連携層設計 | **承認** | — |
| ui-designer | UI/UXデザインシステム | **承認** | — |
| animation-engineer | アニメーション設計 | **承認（無条件）** | 自セクション修正を受諾済み ✅ |
| type-engineer | 型システム設計 | **条件付き承認 → 解決済み** | 型名統一表採用 ✅、`lib/` 廃止 ✅、インライン型統一 ✅ |
| test-strategist | テスト戦略 | **条件付き承認 → 解決済み** | パース関数統一 ✅、純粋関数 export ✅ |
| perf-engineer | パフォーマンス最適化 | **条件付き承認 → 解決済み** | `inputText` ChatPanel ローカル化 ✅ |
| dx-specialist | 開発体験・ツールチェーン | **条件付き承認 → 解決済み** | 最終構成統合 ✅、パース関数統一 ✅ |
| team-lead | 全体統括 | **承認** | — |

**全 11 名の承認を確認。本提案を最終合意とする。**

---

*本ドキュメントは 10 名の専門エージェント + チームリードによるレビューを経て合意されたリファクタリング提案です。*
