# Hackathon Strategy & Requirements (HACKATHON.md)

This document outlines the strategic goals and technical requirements for the hackathon participation.

## 1. Problem Statement
- **Choice**: **Statement 1 (AI-powered Game)**
- **Goal**: Build a playable, interactive game that showcases AI capabilities to impress judges.

## 2. Core Experience
- **Definition**: An interactive TRPG where the character reacts to player voice/gestures in real-time.
- **Wow Moment**: Within 30 seconds, the AI should respond to voice input with synchronized character mood/image changes.
- **Constraint**: Avoid "Chat-only" or "Analysis-only" UIs. Must be a "game experience."

## 3. Google AI API Utilization

詳細な技術リファレンスは [GOOGLE_AI_APIS.md](./GOOGLE_AI_APIS.md) を参照。

### コアモデル
- **Gemini 3.1 Pro** (`gemini-3.1-pro-preview`): 最新フラッグシップ。ARC-AGI-2: 77.1%, GPQA: 94.3%
- **Gemini 3 Flash** (`gemini-3-flash-preview`): Pro級の性能を低コストで。現在使用中

### 活用予定 API（優先度順）
| API | 用途 | インパクト |
|-----|------|-----------|
| **Structured Output** | SAY/JSON パースを型安全な構造化出力に置換 | 信頼性向上 |
| **Imagen 4** | シーン背景・キャラクター画像の動的生成 | ビジュアル強化 |
| **Gemini TTS** | DM セリフの感情付き音声合成 | 没入感向上 |
| **Gemini Live API** | リアルタイム双方向音声対話 | Wow Moment |
| **Lyria RealTime** | 動的BGM生成・シーン連動 | 演出強化 |
| **Function Calling** | ダイスロール・シーン切替の自動化 | UX向上 |
| **Grounding** | 現実情報参照クエスト | ゲーム性拡張 |

## 4. Demo Storyboard (1 Minute Flow)
- **0-3s**: Clear title/identity ("No-Code Girls TRPG").
- **~30s**: First Wow Moment (Voice interaction + Dice roll).
- **~60s**: Complete a mini-scenario (Encounter -> Action -> Result).

## 5. Technical Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Motion (Framer Motion)
- **AI/API**: `@google/genai` v1.42.0 (Gemini 3 Flash / 3.1 Pro, Imagen 4, TTS, Live API, Lyria)
- **Hosting**: GitHub Pages (Vite build → `gh-pages` branch)
- **Voice**: Gemini TTS (出力) + Web Speech API or Chirp 3 (入力)

## 6. Timeline (7-Hour Sprint)
| Time | Task |
|------|------|
| 10:00–10:30 | Architecture Finalization |
| 10:30–14:00 | Core Functionality Implementation (3.5h) |
| 14:00–15:30 | Demo Flow Construction |
| 15:30–16:30 | Integration Testing & Bug Fixing |
| 16:30–17:00 | Demo Video Recording & Submission |

## 7. Risks & Fallbacks
- **Network**: If Live API is unstable, fallback to standard REST-based chat with optimized latency.
- **Environment**: Ensure compatibility with major browsers; have a pre-recorded video ready for the presentation.
