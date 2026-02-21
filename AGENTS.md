# Agent Documentation (AGENTS.md)

This document is intended for AI Coding Agents to understand the technical architecture and constraints of the No-Code Girls TRPG application.

## System Architecture
The application is a React-based Single Page Application (SPA) that integrates directly with the Gemini API for Game Master (DM) logic.

### Key Components
- **`src/App.tsx`**: Main entry point containing the game loop, state management, and UI.
- **Gemini Integration**: Uses `@google/genai` to communicate with `gemini-3-flash-preview`.
- **State Management**: Uses React `useState` for game state (scene, hp, inventory, flags).
- **Voice Interaction**: Uses Web Speech API for recognition and Speech Synthesis API for text-to-speech.

## Gemini Communication Protocol
The DM (Gemini) must follow a strict two-part response format:
1. `SAY: <Natural Language Dialogue>`
2. `JSON: <Machine-readable state updates and metadata>`

### JSON Schema
```json
{
  "state_update": {
    "scene": "string (optional)",
    "hp": "number (optional)",
    "inventory_add": "string[] (optional)",
    "inventory_remove": "string[] (optional)",
    "flags_set": "string[] (optional)"
  },
  "request_roll": "boolean",
  "roll_type": "d20 | null",
  "mode": "NORMAL | BATTLE | SUCCESS | FAIL | SURPRISE",
  "next_prompt": "string"
}
```

## UI & Mood System
The UI reacts to the `mode` returned in the JSON or the current interaction state:
- `LISTENING`: Waiting for user input.
- `THINKING`: Waiting for Gemini response.
- `TALKING`: DM is speaking (TTS active).
- `BATTLE`: Combat mode.
- `SUCCESS`: Positive outcome/Critical hit.
- `FAIL`: Negative outcome/Damage.

## Development Constraints
- **API Keys**: `GEMINI_API_KEY` is injected via `process.env`.
- **Styling**: Tailwind CSS 4 is used for all styling.
- **Animations**: `motion/react` (Framer Motion) handles transitions.
- **Icons**: `lucide-react`.

## Documentation Maintenance Rules
- **Latest State Only**: All documentation files (`AGENTS.md`, `README.md`, `HUMANS.md`, etc.) must always reflect the **current** state of the application.
- **No Historical Bloat**: Do not keep old logic, deprecated code snippets, or version history in these files.
- **Changelog**: All historical changes, versioning, and major updates must be recorded in `CHANGELOG.md`.
- **Consistency**: Ensure that any change in `App.tsx` logic is immediately reflected in the corresponding documentation sections.
