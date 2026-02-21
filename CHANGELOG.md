# Changelog

All notable changes to the **No-Code Girls TRPG** project will be documented in this file.

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
