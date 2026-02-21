# No-Code Girls TRPG

An interactive, voice-powered TRPG demo where Gemini acts as a Dungeon Master (DM) in the persona of "Ms.Create," a no-code witch.

## Features
- **Voice-First Experience**: Talk to the DM using your microphone.
- **Dynamic DM**: Gemini generates responses, manages game state, and handles dice rolls.
- **Interactive UI**: Visual feedback for game states (HP, Inventory, Scene) and character moods.
- **Dice System**: Integrated D20 rolling for skill checks and combat.
- **Camera Declaration**: "Declare" physical objects as in-game items (simulated via text prompt).
- **Dev Panel**: Export requirement prompts for use in Google AI Studio.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 4, Motion (Framer Motion).
- **AI**: Google Gemini API (`@google/genai`).
- **Icons**: Lucide React.
- **Voice**: Web Speech API & Speech Synthesis API.

## Getting Started
1. Ensure `GEMINI_API_KEY` is set in your environment.
2. Run the development server.
3. Click the microphone icon to start talking to Ms.Create.

## Documentation
- [AGENTS.md](./AGENTS.md): Technical documentation for AI agents.
- [HACKATHON.md](./HACKATHON.md): Hackathon strategy and requirements.
- [HUMANS.md](./HUMANS.md): User guide and character lore (English).
- [HUMANS-ja.md](./HUMANS-ja.md): ユーザーガイドとキャラクター設定 (日本語).
