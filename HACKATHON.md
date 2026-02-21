# Hackathon Strategy & Requirements (HACKATHON.md)

This document outlines the strategic goals and technical requirements for the hackathon participation.

## 1. Problem Statement
- **Choice**: **Statement 1 (AI-powered Game)**
- **Goal**: Build a playable, interactive game that showcases AI capabilities to impress judges.

## 2. Core Experience
- **Definition**: An interactive TRPG where the character reacts to player voice/gestures in real-time.
- **Wow Moment**: Within 30 seconds, the AI should respond to voice input with synchronized character mood/image changes.
- **Constraint**: Avoid "Chat-only" or "Analysis-only" UIs. Must be a "game experience."

## 3. Gemini Feature Utilization
- **Live API**: Real-time voice/video interaction.
- **Multimodal**: Combining text, voice, and visual inputs (e.g., "Camera Declaration").
- **Nano Banana**: Target model series for the hackathon.

## 4. Demo Storyboard (1 Minute Flow)
- **0-3s**: Clear title/identity ("No-Code Girls TRPG").
- **~30s**: First Wow Moment (Voice interaction + Dice roll).
- **~60s**: Complete a mini-scenario (Encounter -> Action -> Result).

## 5. Technical Stack
- **Frontend**: React (SPA) - Must be "touchable" and interactive for judges.
- **Backend/API**: Gemini API (Live API / REST).
- **Infrastructure**: Cloud-based demo environment (GCP).

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
