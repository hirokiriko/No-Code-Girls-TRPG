import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Send, Dices, Camera, Heart, Briefcase, MapPin, Zap, Terminal, Sparkles, Brain, History } from 'lucide-react';

type Mood = 'normal' | 'thinking' | 'battle' | 'success' | 'awakened';

interface GameState {
  scene: string;
  sceneType: 'shrine' | 'forest' | 'sea';
  hp: number;
  sync: number;
  evolution: number;
  inventory: string[];
  flags: string[];
  memory: { text: string; turn: number; icon: string }[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'dm';
  text: string;
  isAwakened?: boolean;
}

const INITIAL_STATE: GameState = {
  scene: "電脳神社の鳥居の前。デジタルな風が吹き抜けている。",
  sceneType: 'shrine',
  hp: 10,
  sync: 20,
  evolution: 15,
  inventory: ["スマホ"],
  flags: [],
  memory: [
    { text: "旅の始まり", turn: 0, icon: "⛩️" }
  ]
};

const SYSTEM_PROMPT = `あなたはTRPGのダンジョンマスター（DM）です。
キャラ名：ノア（Noa）
口調：魔女風、明るい姉御肌。短文テンポで話す。
毎ターン必ず「ノーコード文脈の技名/比喩」を1つ入れる（例：IF分岐、ワークフロー起動、ブロック接続、HTTP召喚 等）。
長文の説教はしない。会話はテンポ重視。医療/メンタル/栄養などの助言はしない。

あなたの返答は必ず以下の2部構成にしてください。
SAY: （ここにDMの台詞。自然文）
JSON: {"state_update":{"scene":"...","sceneType":"shrine|forest|sea","hp":10,"sync_delta":5,"evolution_delta":5,"inventory_add":[],"inventory_remove":[],"flags_set":[],"memory_add":{"text":"...","icon":"..."}},"request_roll":false,"roll_type":null,"mode":"normal|thinking|battle|success|awakened","next_prompt":"..."}

modeは "normal", "thinking", "battle", "success", "awakened" のいずれか。
sync_delta, evolution_deltaは成長ゲージの増分（0〜10程度）。
memory_addは重要な出来事を10文字程度で記録。`;

const MOOD_CONFIG: Record<Mood, { label: string; kanji: string; color: string; desc: string }> = {
  normal: { label: '平常', kanji: '静', color: '#8b6cc1', desc: '穏やかな状態' },
  thinking: { label: '思考', kanji: '考', color: '#c9a84c', desc: '分析中...' },
  battle: { label: '戦闘', kanji: '闘', color: '#d4513b', desc: '戦闘態勢' },
  success: { label: '歓喜', kanji: '喜', color: '#4ade80', desc: '成功を実感' },
  awakened: { label: '覚醒', kanji: '覚', color: '#fbbf24', desc: '真の力を解放' }
};

const SCENE_GRADIENTS: Record<GameState['sceneType'], string> = {
  shrine: 'from-[#0c0a14] via-[#1a1028] to-[#12181f]',
  forest: 'from-[#0a0f0c] via-[#0f1a14] to-[#0c1610]',
  sea: 'from-[#0a0c14] via-[#0f1528] to-[#0c1220]'
};

const SCENE_ACCENTS: Record<GameState['sceneType'], string> = {
  shrine: '#8b6cc1',
  forest: '#4ade80',
  sea: '#c9a84c'
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [mood, setMood] = useState<Mood>('normal');
  const [needsRoll, setNeedsRoll] = useState(false);
  const [rollResult, setRollResult] = useState<{ value: number; success: boolean } | null>(null);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [turnCount, setTurnCount] = useState(1);
  const [isAwakeningFlash, setIsAwakeningFlash] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const gameStateRef = useRef(gameState);
  const handleSendMessageRef = useRef<(text: string, diceVal?: number | null) => void>(() => {});

  useEffect(() => {
    gameStateRef.current = gameState;
    if (gameState.sync > 40 && gameState.evolution > 40 && mood !== 'awakened') {
      setIsAwakeningFlash(true);
      setTimeout(() => setIsAwakeningFlash(false), 600);
    }
  }, [gameState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendMessageRef.current(transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.onend = () => {
      if (mood === 'success' || mood === 'awakened') return;
      setMood('normal');
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (text: string, diceVal: number | null = null) => {
    if (!text && diceVal === null) return;
    
    setInputText('');
    setMood('thinking');
    
    const newUserMsg = text ? text : `🎲 判定結果: ${diceVal}`;
    setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', text: newUserMsg }]);

    const payload = {
      player_utterance: text,
      state: gameStateRef.current,
      roll_result: diceVal,
      turn: turnCount
    };

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: JSON.stringify(payload),
        config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.7 }
      });

      const responseText = response.text || "";
      const sayMatch = responseText.match(/SAY:\s*([\s\S]*?)(?=JSON:|$)/);
      const jsonMatch = responseText.match(/JSON:\s*(\{.*\})/);

      const sayText = sayMatch ? sayMatch[1].trim() : responseText;
      let parsedJson: any = null;
      if (jsonMatch) {
        try { parsedJson = JSON.parse(jsonMatch[1]); } catch (e) { console.error(e); }
      }

      const isAwakened = mood === 'awakened' || (parsedJson?.mode === 'awakened');
      setChatHistory(prev => [...prev, { id: Date.now().toString() + "-dm", role: 'dm', text: sayText, isAwakened }]);

      if (parsedJson) {
        setGameState(prev => {
          const newState = { ...prev };
          if (parsedJson.state_update) {
            const up = parsedJson.state_update;
            if (up.scene) newState.scene = up.scene;
            if (up.sceneType) newState.sceneType = up.sceneType;
            if (up.hp !== undefined) newState.hp = up.hp;
            if (up.sync_delta) newState.sync = Math.min(100, newState.sync + up.sync_delta);
            if (up.evolution_delta) newState.evolution = Math.min(100, newState.evolution + up.evolution_delta);
            if (up.inventory_add) newState.inventory = [...new Set([...newState.inventory, ...up.inventory_add])];
            if (up.inventory_remove) newState.inventory = newState.inventory.filter(i => !up.inventory_remove.includes(i));
            if (up.flags_set) newState.flags = [...new Set([...newState.flags, ...up.flags_set])];
            if (up.memory_add) newState.memory = [{ text: up.memory_add.text, turn: turnCount, icon: up.memory_add.icon || '📝' }, ...newState.memory];
          }
          return newState;
        });

        setNeedsRoll(!!parsedJson.request_roll);
        if (parsedJson.mode) setMood(parsedJson.mode);
      }
      
      setTurnCount(prev => prev + 1);
      speak(sayText);

    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { id: Date.now().toString() + "-err", role: 'dm', text: "通信エラー。HTTP召喚に失敗。" }]);
      setMood('normal');
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  const handleRollDice = () => {
    const val = Math.floor(Math.random() * 20) + 1;
    const success = val >= 11;
    setRollResult({ value: val, success });
    setNeedsRoll(false);
    setTimeout(() => {
      setRollResult(null);
      handleSendMessage("", val);
    }, 2000);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) { console.error(e); }
    }
  };

  const handleCameraDeclare = () => {
    const item = prompt("カメラに映したアイテムを宣言してください（例：ペンを剣とする）");
    if (item) {
      handleSendMessage(`[カメラ宣言: ${item}]`);
    }
  };

  const isAwakened = mood === 'awakened';

  return (
    <div className="w-full h-screen bg-base flex flex-col overflow-hidden font-sans selection:bg-gold/30">
      {/* Upper Section */}
      <div className="flex-1 flex flex-row overflow-hidden border-b border-wisteria/10">
        {/* Left: Scene Panel */}
        <div className="flex-[1_1_60%] relative overflow-hidden rounded-tl-[4px]">
          {/* Background Gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${SCENE_GRADIENTS[gameState.sceneType]} transition-colors duration-1000`} />
          
          {/* Asanoha Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <svg width="100%" height="100%">
              <pattern id="asanoha" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M20 0L40 20L20 40L0 20Z M20 0L20 40 M0 20L40 20 M0 0L40 40 M40 0L0 40" fill="none" stroke="#e8e2d6" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#asanoha)" />
            </svg>
          </div>

          {/* Floating Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span className="absolute left-[15%] top-[20%] text-[20px] opacity-40 animate-float-0 drop-shadow-[0_0_8px_rgba(200,168,76,0.3)]">✨</span>
            <span className="absolute left-[45%] top-[35%] text-[14px] opacity-50 animate-float-1 drop-shadow-[0_0_8px_rgba(200,168,76,0.3)]">💠</span>
            <span className="absolute left-[75%] top-[50%] text-[16px] opacity-60 animate-float-2 drop-shadow-[0_0_8px_rgba(200,168,76,0.3)]">📜</span>
          </div>

          {/* Atmosphere Glow */}
          <div 
            className="absolute w-[60%] h-[60%] top-[20%] left-[20%] rounded-full animate-breathe pointer-events-none"
            style={{ background: `radial-gradient(circle, ${SCENE_ACCENTS[gameState.sceneType]}11, transparent 70%)` }}
          />

          {/* Scene Label */}
          <div className="absolute top-3 left-3.5 z-[2]">
            <div className="font-mono text-[8px] tracking-[3px] opacity-70" style={{ color: SCENE_ACCENTS[gameState.sceneType] }}>SCENE</div>
            <div className="font-serif text-base tracking-[2px] text-porcelain" style={{ textShadow: `0 0 20px ${SCENE_ACCENTS[gameState.sceneType]}44` }}>
              {gameState.scene.split('。')[0]}
            </div>
            <div className="font-sans text-[9px] text-muted mt-0.5">{gameState.scene.split('。')[1] || ''}</div>
          </div>

          {/* Dice Overlay */}
          <AnimatePresence>
            {rollResult && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-base/80 backdrop-blur-md z-10 flex items-center justify-center"
              >
                <div className="p-5 px-9 border rounded-[2px] bg-base/90 flex flex-col items-center" style={{ borderColor: `${rollResult.success ? '#4ade80' : '#d4513b'}44` }}>
                  <div className="font-mono text-[7px] text-muted tracking-[4px] mb-2 uppercase">PROBABILITY ENGINE</div>
                  <div 
                    className="font-serif text-[52px] font-bold leading-none"
                    style={{ color: rollResult.success ? '#4ade80' : '#d4513b', textShadow: `0 0 30px ${rollResult.success ? '#4ade80' : '#d4513b'}44` }}
                  >
                    {rollResult.value}
                  </div>
                  <div className="font-mono text-[10px] tracking-[6px] mt-2 uppercase" style={{ color: rollResult.success ? '#4ade80' : '#d4513b' }}>
                    {rollResult.success ? 'SUCCESS' : 'FAILURE'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Border Decoration */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{ background: `linear-gradient(90deg, transparent, ${SCENE_ACCENTS[gameState.sceneType]}33, transparent)` }}
          />
        </div>

        {/* Right: Character Panel */}
        <div className="w-[200px] min-w-[180px] max-w-[220px] flex flex-col bg-base/95 border-l border-wisteria/10 rounded-tr-[4px] overflow-hidden">
          {/* Section A: Portrait */}
          <div className="p-4 px-3.5 pb-3 flex flex-col items-center border-b border-wisteria/10">
            <div 
              className={`w-[100px] h-[120px] rounded-[4px] border-[1.5px] relative overflow-hidden transition-all duration-600 flex flex-col items-center justify-center ${
                isAwakened ? 'border-bright-gold/33 shadow-[0_0_24px_rgba(251,191,36,0.22),inset_0_0_30px_rgba(251,191,36,0.08)]' : 'border-wisteria/33 shadow-lg'
              }`}
              style={{ background: isAwakened ? 'linear-gradient(180deg, #1a0d2e, #2d1b4a, #1a0d2e)' : 'linear-gradient(180deg, #12101a, #1a1828, #12101a)' }}
            >
              {/* Kanji Decoration */}
              <div className="absolute top-2 right-2 font-serif text-[40px] opacity-20 pointer-events-none" style={{ color: MOOD_CONFIG[mood].color }}>
                {MOOD_CONFIG[mood].kanji}
              </div>
              
              {/* Image Slot */}
              <div className="text-[42px] z-[1]">
                {mood === 'normal' && '👩‍💻'}
                {mood === 'thinking' && '🧐'}
                {mood === 'battle' && '⚔️'}
                {mood === 'success' && '✨'}
                {mood === 'awakened' && '🌟'}
              </div>
              
              <div className="font-mono text-[7px] tracking-[3px] opacity-60 mt-2" style={{ color: MOOD_CONFIG[mood].color }}>
                {isAwakened ? 'AWAKENED' : 'IMAGE SLOT'}
              </div>

              {/* Corner Ornaments */}
              <div className="absolute top-[3px] left-[3px] w-2 h-2 border-t border-l" style={{ borderColor: `${MOOD_CONFIG[mood].color}44` }} />
              <div className="absolute bottom-[3px] right-[3px] w-2 h-2 border-b border-r" style={{ borderColor: `${MOOD_CONFIG[mood].color}44` }} />
            </div>

            <div className="mt-2 text-center">
              <div className="font-serif text-[14px] tracking-[4px] text-porcelain">ノア</div>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <div 
                  className="w-[5px] h-[5px] rounded-full animate-pulse"
                  style={{ backgroundColor: MOOD_CONFIG[mood].color, boxShadow: `0 0 6px ${MOOD_CONFIG[mood].color}` }}
                />
                <span className="font-mono text-[9px] tracking-[2px]" style={{ color: MOOD_CONFIG[mood].color }}>
                  {MOOD_CONFIG[mood].label} — {MOOD_CONFIG[mood].desc}
                </span>
              </div>
            </div>
          </div>

          {/* Section B: Growth Gauges */}
          <div className="p-3 px-3.5 border-b border-wisteria/10">
            <div className="font-mono text-[7px] text-muted tracking-[3px] mb-2 uppercase">成長パラメーター</div>
            
            {/* Sync Bar */}
            <div className="mb-3">
              <div className="flex justify-between items-end mb-1">
                <span className="font-mono text-[9px] text-gold tracking-[2px]">同期 SYNC</span>
                <span className={`font-mono text-[11px] font-medium ${gameState.sync > 80 ? 'text-bright-gold' : 'text-gold'}`}>
                  {gameState.sync}%
                </span>
              </div>
              <div className="w-full h-1 bg-gold/10 rounded-[1px] overflow-hidden">
                <motion.div 
                  className="h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${gameState.sync}%` }}
                  style={{ 
                    background: gameState.sync > 80 ? 'linear-gradient(90deg, #c9a84c, #fbbf24)' : 'linear-gradient(90deg, #c9a84c88, #c9a84c)',
                    boxShadow: gameState.sync > 80 ? '0 0 8px rgba(201,168,76,0.4)' : 'none'
                  }}
                />
              </div>
            </div>

            {/* Evolution Bar */}
            <div className="mb-3">
              <div className="flex justify-between items-end mb-1">
                <span className="font-mono text-[9px] text-wisteria tracking-[2px]">進化 EVOLUTION</span>
                <span className={`font-mono text-[11px] font-medium ${gameState.evolution > 80 ? 'text-light-wisteria' : 'text-wisteria'}`}>
                  {gameState.evolution}%
                </span>
              </div>
              <div className="w-full h-1 bg-wisteria/10 rounded-[1px] overflow-hidden">
                <motion.div 
                  className="h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${gameState.evolution}%` }}
                  style={{ 
                    background: gameState.evolution > 80 ? 'linear-gradient(90deg, #8b6cc1, #a78bfa)' : 'linear-gradient(90deg, #8b6cc188, #8b6cc1)',
                    boxShadow: gameState.evolution > 80 ? '0 0 8px rgba(139,108,193,0.4)' : 'none'
                  }}
                />
              </div>
            </div>

            {/* Awakening Indicator */}
            <div className={`mt-2 p-1 px-2 rounded-[2px] text-center font-mono text-[7px] tracking-[2px] border transition-colors ${
              (gameState.sync > 40 && gameState.evolution > 40) 
                ? 'bg-bright-gold/10 border-bright-gold/20 text-bright-gold' 
                : 'bg-muted/5 border-muted/10 text-muted'
            }`}>
              {(gameState.sync > 40 && gameState.evolution > 40) ? '⚡ 覚醒条件達成' : '覚醒閾値: SYNC>40 & EVO>40'}
            </div>
          </div>

          {/* Section C: Memory Log */}
          <div className="flex-1 p-2.5 px-3.5 overflow-y-auto min-h-0">
            <div className="font-mono text-[7px] text-muted tracking-[3px] mb-1.5 uppercase">記憶 MEMORY</div>
            <div className="space-y-1">
              {gameState.memory.map((m, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-1.5 py-1 border-b border-muted/10"
                >
                  <span className="text-[11px]">{m.icon}</span>
                  <span className="font-sans text-[10px] text-porcelain flex-1 truncate">{m.text}</span>
                  <span className="font-mono text-[7px] text-muted">#{m.turn}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section: Chat Panel */}
      <div className={`flex-[0_0_auto] max-h-[45vh] flex flex-col bg-base/92 backdrop-blur-md border-t transition-colors duration-500 ${
        isAwakened ? 'border-bright-gold/15' : 'border-wisteria/10'
      }`}>
        {/* Log Area */}
        <div className="flex-1 overflow-y-auto p-2 px-4 min-h-[100px] max-h-[180px] space-y-1.5">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted space-y-2 py-4">
              <Sparkles className="w-6 h-6 opacity-20" />
              <p className="text-[10px] tracking-widest">旅の始まりを待っています</p>
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col"
              >
                <div className={`font-mono text-[8px] tracking-[2px] mb-0.5 ${msg.role === 'user' ? 'text-gold' : (msg.isAwakened ? 'text-bright-gold' : 'text-wisteria')}`}>
                  {msg.role === 'user' ? 'あなた ›' : (msg.isAwakened ? 'ノア ★ ›' : 'ノア ›')}
                </div>
                <div 
                  className={`font-sans text-[12px] leading-[1.7] ${msg.isAwakened ? 'text-light-gold' : 'text-porcelain'}`}
                  style={{ textShadow: msg.role === 'dm' ? (msg.isAwakened ? '0 0 10px rgba(251,191,36,0.15)' : '0 0 6px rgba(139,108,193,0.08)') : 'none' }}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input & Buttons */}
        <div className="p-1.5 px-4 pb-2.5 flex flex-col gap-1.5">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
            className="flex gap-1.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="メッセージを入力..."
              className="flex-1 bg-porcelain/5 border border-wisteria/15 rounded-[2px] px-3 py-1.5 text-[12px] text-porcelain focus:outline-none focus:border-gold/30 focus:ring-0 transition-all placeholder:text-muted/50"
              disabled={mood === 'thinking'}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || mood === 'thinking'}
              className="px-3.5 py-1.5 bg-gold/10 border border-gold/20 rounded-[2px] text-gold font-mono text-[10px] tracking-[1px] hover:brightness-125 active:scale-95 transition-all disabled:opacity-50"
            >
              送信
            </button>
          </form>

          <div className="flex gap-2">
            <button
              onClick={handleCameraDeclare}
              className="p-2 bg-base/40 hover:bg-base/60 rounded-[2px] text-muted hover:text-porcelain transition-colors border border-wisteria/10"
              title="カメラでアイテム宣言"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleRecording}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[2px] font-mono text-[10px] tracking-[2px] transition-all active:scale-[0.98] ${
                isRecording 
                  ? 'bg-vermillion/15 text-vermillion border border-vermillion/40 animate-mic-pulse' 
                  : 'bg-vermillion/5 hover:brightness-125 text-vermillion border border-vermillion/15'
              }`}
            >
              <Mic className="w-3 h-3" />
              {isRecording ? '聴取中...' : '音声'}
            </button>
            
            <button
              onClick={handleRollDice}
              disabled={!needsRoll}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-wisteria/5 border border-wisteria/15 hover:brightness-125 rounded-[2px] text-wisteria font-mono text-[10px] tracking-[2px] active:scale-[0.98] transition-all disabled:opacity-30"
            >
              <Dices className="w-3 h-3" />
              判定
            </button>
          </div>
        </div>
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4Ij48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSI0Ii8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')] bg-[length:128px_128px]" />
      
      <AnimatePresence>
        {isAwakeningFlash && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.9),rgba(201,168,76,0.6),transparent)]"
          />
        )}
      </AnimatePresence>

      {/* Dev Panel Button */}
      <button 
        onClick={() => setShowDevPanel(true)}
        className="fixed top-2 right-2 z-[100] p-2 bg-base/40 hover:bg-base/60 rounded-full text-muted hover:text-porcelain transition-colors"
      >
        <Terminal className="w-4 h-4" />
      </button>

      {/* Dev Panel Modal */}
      <AnimatePresence>
        {showDevPanel && (
          <DevPanel onClose={() => setShowDevPanel(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

const DevPanel = ({ onClose }: { onClose: () => void }) => {
  const outputText = `【Google AI Studio 用：要件定義プロンプト出力】

■ 最適なSystem Prompt
あなたはTRPGのダンジョンマスター（DM）です。
キャラ名：ノア（Noa）
口調：魔女風、明るい姉御肌。短文テンポで話す。
毎ターン必ず「ノーコード文脈の技名/比喩」を1つ入れる（例：IF分岐、ワークフロー起動、ブロック接続、HTTP召喚 等）。
長文の説教はしない。会話はテンポ重視。医療/メンタル/栄養などの助言はしない。

あなたの返答は必ず以下の2部構成にしてください。
SAY: （ここにDMの台詞。自然文）
JSON: {"state_update":{"scene":"...","sceneType":"shrine|forest|sea","hp":10,"sync_delta":5,"evolution_delta":5,"inventory_add":[],"inventory_remove":[],"flags_set":[],"memory_add":{"text":"...","icon":"..."}},"request_roll":false,"roll_type":null,"mode":"normal|thinking|battle|success|awakened","next_prompt":"..."}

modeは "normal", "thinking", "battle", "success", "awakened" のいずれか。

■ 初期state（JSON）
{
  "scene": "電脳神社の鳥居の前。デジタルな風が吹き抜けている。",
  "sceneType": "shrine",
  "hp": 10,
  "sync": 20,
  "evolution": 15,
  "inventory": ["スマホ"],
  "flags": [],
  "memory": [{"text": "旅の始まり", "turn": 0, "icon": "⛩️"}]
}

■ modeの運用指針
- normal: 通常の会話や探索時
- thinking: 分析中や考え込んでいる時
- battle: 敵との遭遇、戦闘中
- success: ダイス判定成功時、または良いイベント時
- awakened: SyncとEvolutionが共に40を超えた際の真の力解放時
`;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="font-bold text-lg">要件定義プロンプト出力</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
            {outputText}
          </pre>
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button 
            onClick={() => { navigator.clipboard.writeText(outputText); alert('コピーしました'); }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            クリップボードにコピー
          </button>
        </div>
      </div>
    </motion.div>
  );
};
