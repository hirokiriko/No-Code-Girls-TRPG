# Changelog

All notable changes to the **No-Code Girls TRPG** project will be documented in this file.

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

### Fixed
- Resolved syntax errors in `App.tsx` related to backslash escaping in template literals.
- Fixed build and linting issues.
