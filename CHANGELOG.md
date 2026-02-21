# Changelog

All notable changes to the **No-Code Girls TRPG** project will be documented in this file.

## [Unreleased] - 2026-02-21

### Refactored
- **Wave 1**: Fixed SpeechRecognition closure bug (useRef pattern for latest handleSendMessage)
- **Wave 2**: Extracted types (`src/types/`), constants (`src/constants/`), and API client (`src/services/geminiClient.ts`) from App.tsx
- **Wave 3**: Extracted 4 custom hooks (`useGameState`, `useChat`, `useSpeech`, `useDice`) from App.tsx
- **Wave 4**: Split UI into 6 components (`ScenePanel`, `CharacterPanel`, `ChatPanel`, `DiceOverlay`, `AnimatedOverlay`, `DevPanel`)
- **Wave 5**: Final cleanup — App.tsx reduced to ~80 line orchestration layer, added ESLint/tsconfig strict mode/.editorconfig

### Improved
- Singleton Gemini API client (was re-instantiated every request)
- Bracket-depth JSON parser replacing greedy regex
- Pure functions exported for testability: `applyStateUpdate`, `isAwakeningReady`, `rollDice`, `isRollSuccess`, `parseGeminiResponse`
- GaugeBar local helper component eliminates Sync/Evolution code duplication

## [1.1.0] - 2026-02-20

### Added
- Major UI/Layout overhaul based on the "Wafuu-Tech" design system.
- Implemented a 3-split layout (Scene Panel, Character Panel, Chat Panel).
- Added "Sync" and "Evolution" growth gauges with awakening mechanics.
- Implemented "Memory Log" to track key story events.
- Added scene-specific gradients and Asanoha pattern overlays.
- Integrated new fonts: `Zen Antique Soft`, `IBM Plex Mono`, and `Zen Kaku Gothic New`.
- Added "Awakening Flash" visual effect when Sync and Evolution exceed thresholds.
- Updated Gemini system prompt to support new state parameters (`sync_delta`, `evolution_delta`, `memory_add`).

## [1.0.0] - 2026-02-20

### Added
- Initial implementation of the No-Code Girls TRPG demo.
- Integrated Gemini API (`gemini-3-flash-preview`) for DM logic with a custom system prompt.
- Implemented a two-part response protocol (SAY/JSON) for seamless game state synchronization.
- Added voice interaction using Web Speech API (Recognition) and Speech Synthesis API (TTS).
- Created a reactive UI with mood-based character image switching and background transitions.
- Implemented game mechanics: HP tracking, Inventory management, Scene descriptions, and D20 dice rolling.
- Added "Camera Declaration" feature to simulate physical items being brought into the game.
- Included a "Dev Panel" for exporting AI Studio requirement prompts.
- Established documentation suite: `README.md`, `AGENTS.md`, `HUMANS.md`, `HUMANS-ja.md`, `CLAUDE.md`, and `CHANGELOG.md`.
- Added `HACKATHON.md` to document strategy, core experience, and timeline for the upcoming hackathon.

### Fixed
- Resolved syntax errors in `App.tsx` related to backslash escaping in template literals.
- Fixed build and linting issues.
