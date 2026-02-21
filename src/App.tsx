import { useState, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useChat } from './hooks/useChat';
import { useSpeech } from './hooks/useSpeech';
import { useDice } from './hooks/useDice';
import { ScenePanel } from './components/ScenePanel';
import { CharacterPanel } from './components/CharacterPanel';
import { ChatPanel } from './components/ChatPanel';
import { DiceOverlay } from './components/DiceOverlay';
import { DevPanel } from './components/DevPanel';
import { AnimatedOverlay } from './components/AnimatedOverlay';

export default function App() {
  const [showDevPanel, setShowDevPanel] = useState(false);

  const {
    gameState, setGameState, mood, setMood,
    turnCount, setTurnCount, isAwakeningFlash,
    gameStateRef, isAwakened,
  } = useGameState();

  const sendMessageRef = useRef<(text: string, diceVal?: number | null) => void>(() => {});
  const needsRollRef = useRef<(needs: boolean) => void>(() => {});

  const speech = useSpeech({
    onTranscript: (text: string) => sendMessageRef.current(text),
    setMood,
    mood,
  });

  const chat = useChat({
    gameStateRef,
    mood,
    turnCount,
    setGameState,
    setMood,
    setTurnCount,
    setNeedsRoll: (needs: boolean) => needsRollRef.current(needs),
    speak: speech.speak,
  });

  const dice = useDice((diceVal: number) => {
    chat.handleSendMessage("", diceVal);
  });

  sendMessageRef.current = chat.handleSendMessage;
  needsRollRef.current = dice.setNeedsRoll;

  return (
    <div className="w-full h-screen bg-base flex flex-col overflow-hidden font-sans selection:bg-gold/30">
      <div className="flex-1 flex flex-row overflow-hidden border-b border-wisteria/10">
        <ScenePanel sceneType={gameState.sceneType} scene={gameState.scene} />
        <CharacterPanel mood={mood} gameState={gameState} isAwakened={isAwakened} />
      </div>

      <ChatPanel
        chatHistory={chat.chatHistory}
        isAwakened={isAwakened}
        mood={mood}
        needsRoll={dice.needsRoll}
        isRecording={speech.isRecording}
        onSendMessage={chat.handleSendMessage}
        onToggleRecording={speech.toggleRecording}
        onRollDice={dice.handleRollDice}
        onCameraDeclare={chat.handleCameraDeclare}
      />

      <DiceOverlay rollResult={dice.rollResult} />

      <div className="absolute inset-0 opacity-[0.015] pointer-events-none z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4Ij48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSI0Ii8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')] bg-[length:128px_128px]" />

      <AnimatedOverlay
        show={isAwakeningFlash}
        className="absolute inset-0 z-[100] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.9),rgba(201,168,76,0.6),transparent)]"
      />

      <button
        onClick={() => setShowDevPanel(true)}
        className="fixed top-2 right-2 z-[100] p-2 bg-base/40 hover:bg-base/60 rounded-full text-muted hover:text-porcelain transition-colors"
      >
        <Terminal className="w-4 h-4" />
      </button>

      <AnimatedOverlay show={showDevPanel} className="">
        <DevPanel onClose={() => setShowDevPanel(false)} />
      </AnimatedOverlay>
    </div>
  );
}
