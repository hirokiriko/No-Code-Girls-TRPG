import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useChat } from './hooks/useChat';
import { useSpeech } from './hooks/useSpeech';
import { useDice } from './hooks/useDice';
import { useLyriaBGM } from './hooks/useLyriaBGM';
import { ScenePanel } from './components/ScenePanel';
import { CharacterPanel } from './components/CharacterPanel';
import { ChatPanel } from './components/ChatPanel';
import { DiceOverlay } from './components/DiceOverlay';
import { DevPanel } from './components/DevPanel';
import { AnimatedOverlay } from './components/AnimatedOverlay';
import { ApiKeyScreen } from './components/ApiKeyScreen';
import { getApiKey, setApiKey } from './services/geminiClient';
import { generateSceneImage } from './services/imagenClient';
import { unlockAudioContext } from './services/ttsClient';
import { getCharacterVideoUrl } from './constants';

export default function App() {
  const [hasApiKey, setHasApiKey] = useState(() => !!getApiKey());

  if (!hasApiKey) {
    return (
      <ApiKeyScreen
        onSubmit={(key) => {
          setApiKey(key);
          unlockAudioContext(); // ユーザークリック内で AudioContext を解放
          setHasApiKey(true);
        }}
      />
    );
  }

  return <Game />;
}

function Game() {
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [movementVideoUrl, setMovementVideoUrl] = useState<string | null>(null);
  const [emoteVideoUrl, setEmoteVideoUrl] = useState<string | null>(null);
  const prevMoodRef = useRef<string>('normal');
  const prevSceneTypeRef = useRef<string>('');

  const {
    gameState, setGameState, mood, setMood,
    turnCount, setTurnCount, isAwakeningFlash,
    gameStateRef, isAwakened,
    awakeningMessage, setAwakeningMessage,
    sceneImageUrl, setSceneImageUrl,
  } = useGameState();

  // Lyria RealTime BGM — ユーザー操作を契機に接続
  const { ensureConnected: ensureLyriaConnected } = useLyriaBGM({ mood });

  const sendMessageRef = useRef<(text: string, diceVal?: number | null) => void>(() => {});
  const needsRollRef = useRef<(needs: boolean) => void>(() => {});

  const speech = useSpeech({
    onTranscript: (text: string) => sendMessageRef.current(text),
    setMood,
    mood,
  });

  // シーン変化時に Imagen 4 で背景画像を生成
  const handleSceneChange = useCallback(async (scene: string, sceneType: string) => {
    const url = await generateSceneImage(scene, sceneType, mood);
    if (url) setSceneImageUrl(url);
  }, [mood, setSceneImageUrl]);

  const chat = useChat({
    gameStateRef,
    mood,
    turnCount,
    setGameState,
    setMood,
    setTurnCount,
    setNeedsRoll: (needs: boolean) => needsRollRef.current(needs),
    speak: speech.speak,
    onSceneChange: handleSceneChange,
  });

  // ユーザー操作時に AudioContext アンロック + Lyria 接続を開始
  const handleSendMessage = useCallback((text: string, diceVal: number | null = null) => {
    unlockAudioContext();
    ensureLyriaConnected();
    chat.handleSendMessage(text, diceVal);
  }, [ensureLyriaConnected, chat.handleSendMessage]);

  const dice = useDice((diceVal: number) => {
    handleSendMessage('', diceVal);
  });

  sendMessageRef.current = handleSendMessage;
  needsRollRef.current = dice.setNeedsRoll;

  // 覚醒メッセージをチャットに注入
  useEffect(() => {
    if (awakeningMessage) {
      chat.setChatHistory(prev => [...prev, { id: `awakening-${Date.now()}`, role: 'dm', text: awakeningMessage, isAwakened: true }]);
      speech.speak(awakeningMessage);
      setAwakeningMessage(null);
    }
  }, [awakeningMessage]);

  // mood 変化時にエモート動画をトリガー
  useEffect(() => {
    if (prevMoodRef.current === mood) return;
    prevMoodRef.current = mood;

    if (mood === 'success' || mood === 'battle') {
      setEmoteVideoUrl(getCharacterVideoUrl('emote', 0));
    } else if (mood === 'awakened') {
      setEmoteVideoUrl(getCharacterVideoUrl('emote', 1));
    }
  }, [mood]);

  // 特定 sceneType への到着時のみ移動動画を全画面再生
  useEffect(() => {
    const prev = prevSceneTypeRef.current;
    const curr = gameState.sceneType;
    prevSceneTypeRef.current = curr;
    if (prev === curr || prev === '') return; // 初期化時はスキップ

    if (curr === 'shibuya_stream') {
      setMovementVideoUrl(getCharacterVideoUrl('movement', 0)); // movement_01.mp4
    } else if (curr === 'asakusa') {
      setMovementVideoUrl(getCharacterVideoUrl('movement', 1)); // movement_02.mp4
    }
  }, [gameState.sceneType]);

  return (
    <div className="w-full h-screen bg-base flex flex-col overflow-hidden font-sans selection:bg-gold/30">
      <div className="h-[200px] md:h-[280px] shrink-0 flex flex-row overflow-hidden border-b border-wisteria/10">
        <ScenePanel
          sceneType={gameState.sceneType}
          scene={gameState.scene}
          generatedImageUrl={sceneImageUrl}
        />
        <CharacterPanel
          mood={mood}
          gameState={gameState}
          isAwakened={isAwakened}
          emoteVideoUrl={emoteVideoUrl}
          onEmoteEnd={() => setEmoteVideoUrl(null)}
        />
      </div>

      <ChatPanel
        chatHistory={chat.chatHistory}
        isAwakened={isAwakened}
        mood={mood}
        needsRoll={dice.needsRoll}
        isRecording={speech.isRecording}
        onSendMessage={handleSendMessage}
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

      {/* 移動アニメーション: 特定シーン到着時のみ全画面再生 */}
      <AnimatedOverlay
        show={movementVideoUrl !== null}
        className="fixed inset-0 z-[150] bg-black/70 flex items-center justify-center pointer-events-none"
      >
        {movementVideoUrl && (
          <video
            key={movementVideoUrl}
            src={movementVideoUrl}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
            onEnded={() => setMovementVideoUrl(null)}
          />
        )}
      </AnimatedOverlay>

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
