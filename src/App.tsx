import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Send, Dices, Camera, Heart, Briefcase, MapPin, Zap, Terminal } from 'lucide-react';

type Mood = 'LISTENING' | 'THINKING' | 'TALKING' | 'BATTLE' | 'SUCCESS' | 'FAIL';

interface GameState {
  scene: string;
  hp: number;
  inventory: string[];
  flags: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'dm';
  text: string;
}

const INITIAL_STATE: GameState = {
  scene: "渋谷ストリームの不思議な酒場。ノーコードの魔法が漂う。",
  hp: 10,
  inventory: ["スマホ"],
  flags: []
};

const SYSTEM_PROMPT = `あなたはTRPGのダンジョンマスター（DM）です。
キャラ名：Ms.Create（ノーコードガールズ）
口調：魔女風、明るい姉御肌。短文テンポで話す。
毎ターン必ず「ノーコード文脈の技名/比喩」を1つ入れる（例：IF分岐、ワークフロー起動、ブロック接続、HTTP召喚 等）。
長文の説教はしない。会話はテンポ重視。医療/メンタル/栄養などの助言はしない。

あなたの返答は必ず以下の2部構成にしてください。
SAY: （ここにDMの台詞。自然文）
JSON: {"state_update":{"scene":"...","hp":10,"inventory_add":[],"inventory_remove":[],"flags_set":[]},"request_roll":false,"roll_type":null,"mode":"NORMAL","next_prompt":"..."}

modeは "NORMAL", "BATTLE", "SUCCESS", "FAIL", "SURPRISE" のいずれか。`;

const MOOD_IMAGES: Record<Mood, string> = {
  LISTENING: "https://picsum.photos/seed/ncg_listen/400/600?blur=2",
  THINKING: "https://picsum.photos/seed/ncg_think/400/600?blur=2",
  TALKING: "https://picsum.photos/seed/ncg_talk/400/600?blur=2",
  BATTLE: "https://picsum.photos/seed/ncg_battle/400/600?blur=2",
  SUCCESS: "https://picsum.photos/seed/ncg_success/400/600?blur=2",
  FAIL: "https://picsum.photos/seed/ncg_fail/400/600?blur=2"
};

const MOOD_COLORS: Record<Mood, string> = {
  LISTENING: "from-blue-900/50 to-slate-900",
  THINKING: "from-yellow-900/50 to-slate-900",
  TALKING: "from-cyan-900/50 to-slate-900",
  BATTLE: "from-red-900/50 to-slate-900",
  SUCCESS: "from-amber-700/50 to-slate-900",
  FAIL: "from-purple-900/50 to-slate-900"
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [mood, setMood] = useState<Mood>('LISTENING');
  const [needsRoll, setNeedsRoll] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [cameraDeclaration, setCameraDeclaration] = useState<string | null>(null);
  const [showDevPanel, setShowDevPanel] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
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
        handleSendMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const speak = (text: string) => {
    if (!window.speechSynthesis) {
      setTimeout(() => setMood(prev => prev === 'TALKING' ? 'LISTENING' : prev), 3000);
      return;
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.lang.includes('ja') && (v.name.includes('Female') || v.name.includes('Mei') || v.name.includes('Haruka')));
    if (femaleVoice) utterance.voice = femaleVoice;
    
    utterance.onend = () => {
      setMood(prev => {
        if (prev === 'TALKING' || prev === 'SUCCESS' || prev === 'FAIL') {
          return 'LISTENING';
        }
        return prev;
      });
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (text: string, rollResult: number | null = null) => {
    if (!text && rollResult === null) return;
    
    setInputText('');
    setMood('THINKING');
    
    const newUserMsg = text ? text : `🎲 D20を振った: ${rollResult}`;
    setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', text: newUserMsg }]);

    const payload = {
      player_utterance: text,
      state: gameStateRef.current,
      roll_result: rollResult,
      camera_declaration: cameraDeclaration
    };

    setCameraDeclaration(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: JSON.stringify(payload),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
        }
      });

      const responseText = response.text || "";
      const sayMatch = responseText.match(/SAY:\s*([\s\S]*?)(?=JSON:|$)/);
      const jsonMatch = responseText.match(/JSON:\s*(\{.*\})/);

      const sayText = sayMatch ? sayMatch[1].trim() : responseText;
      let parsedJson: any = null;
      if (jsonMatch) {
        try {
          parsedJson = JSON.parse(jsonMatch[1]);
        } catch (e) {
          console.error("Failed to parse JSON", e);
        }
      }

      setChatHistory(prev => [...prev, { id: Date.now().toString() + "-dm", role: 'dm', text: sayText }]);

      if (parsedJson) {
        setGameState(prev => {
          const newState = { ...prev };
          if (parsedJson.state_update) {
            if (parsedJson.state_update.scene) newState.scene = parsedJson.state_update.scene;
            if (parsedJson.state_update.hp !== undefined) newState.hp = parsedJson.state_update.hp;
            if (parsedJson.state_update.inventory_add) {
              newState.inventory = [...new Set([...newState.inventory, ...parsedJson.state_update.inventory_add])];
            }
            if (parsedJson.state_update.inventory_remove) {
              newState.inventory = newState.inventory.filter((i: string) => !parsedJson.state_update.inventory_remove.includes(i));
            }
            if (parsedJson.state_update.flags_set) {
              newState.flags = [...new Set([...newState.flags, ...parsedJson.state_update.flags_set])];
            }
          }
          return newState;
        });

        setNeedsRoll(!!parsedJson.request_roll);

        if (parsedJson.mode === 'BATTLE') setMood('BATTLE');
        else if (parsedJson.mode === 'SUCCESS') setMood('SUCCESS');
        else if (parsedJson.mode === 'FAIL') setMood('FAIL');
        else setMood('TALKING');
      } else {
        setMood('TALKING');
      }
      
      speak(sayText);

    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { id: Date.now().toString() + "-err", role: 'dm', text: "通信エラーが発生したわ。HTTP召喚に失敗したみたいね。" }]);
      setMood('FAIL');
      setTimeout(() => setMood('LISTENING'), 3000);
    }
  };

  const handleRollDice = () => {
    const result = Math.floor(Math.random() * 20) + 1;
    setNeedsRoll(false);
    handleSendMessage("", result);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCameraDeclare = () => {
    const item = prompt("カメラに映したアイテムを宣言してください（例：ペンを剣とする）");
    if (item) {
      setCameraDeclaration(item);
      handleSendMessage(`[カメラ宣言: ${item}]`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden">
      {/* Left Panel: Character & Status */}
      <div className={`w-full md:w-1/3 lg:w-2/5 relative flex flex-col transition-colors duration-1000 bg-gradient-to-b ${MOOD_COLORS[mood]}`}>
        {/* Status Bar */}
        <div className="p-4 bg-black/40 backdrop-blur-md border-b border-white/10 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="font-mono text-xl font-bold">{gameState.hp}</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-500" />
            <span className="font-mono text-sm">{gameState.inventory.length} items</span>
          </div>
        </div>
        
        {/* Character Image Area */}
        <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={mood}
              src={MOOD_IMAGES[mood]}
              alt={`Ms.Create - ${mood}`}
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          
          {/* Mood Indicator Overlay */}
          <motion.div 
            className="relative z-10 flex flex-col items-center"
            animate={{ y: mood === 'TALKING' ? [0, -10, 0] : 0 }}
            transition={{ repeat: mood === 'TALKING' ? Infinity : 0, duration: 2 }}
          >
            <div className="text-6xl mb-4 drop-shadow-2xl">
              {mood === 'LISTENING' && '🎧'}
              {mood === 'THINKING' && '🤔'}
              {mood === 'TALKING' && '🗣️'}
              {mood === 'BATTLE' && '⚔️'}
              {mood === 'SUCCESS' && '✨'}
              {mood === 'FAIL' && '💦'}
            </div>
            <div className="bg-black/60 backdrop-blur-md px-4 py-1 rounded-full border border-white/20 font-mono text-sm tracking-widest">
              {mood}
            </div>
          </motion.div>
        </div>

        {/* Scene & Inventory Info */}
        <div className="p-6 bg-black/60 backdrop-blur-md border-t border-white/10 z-10">
          <div className="mb-4">
            <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Current Scene
            </h3>
            <p className="text-sm leading-relaxed">{gameState.scene}</p>
          </div>
          <div>
            <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> Inventory
            </h3>
            <div className="flex flex-wrap gap-2">
              {gameState.inventory.map((item, i) => (
                <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs border border-white/5">
                  {item}
                </span>
              ))}
              {gameState.inventory.length === 0 && <span className="text-xs text-slate-500">Empty</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Chat & Controls */}
      <div className="w-full md:w-2/3 lg:w-3/5 flex flex-col bg-slate-950 h-screen">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-slate-900/50 flex justify-between items-center">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            No-Code Girls TRPG
          </h1>
          <button 
            onClick={() => setShowDevPanel(true)}
            className="text-xs px-3 py-1 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors flex items-center gap-1"
          >
            <Terminal className="w-3 h-3" />
            Dev Panel
          </button>
        </div>

        {/* Chat Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <Dices className="w-12 h-12 opacity-20" />
              <p>マイクまたはテキストで話しかけてゲームを開始</p>
            </div>
          ) : (
            chatHistory.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">
                  {msg.role === 'user' ? 'Player' : 'Ms.Create'}
                </span>
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-50 rounded-tr-sm' 
                    : 'bg-slate-800/50 border border-slate-700 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-900 border-t border-white/10">
          {needsRoll && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex justify-center"
            >
              <button
                onClick={handleRollDice}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all transform hover:scale-105"
              >
                <Dices className="w-5 h-5" />
                D20を振る！
              </button>
            </motion.div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCameraDeclare}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="カメラでアイテム宣言"
            >
              <Camera className="w-5 h-5" />
            </button>
            
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-xl transition-all ${
                isRecording 
                  ? 'bg-red-500/20 text-red-500 border border-red-500/50 animate-pulse' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
              className="flex-1 flex gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="メッセージを入力..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                disabled={mood === 'THINKING'}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || mood === 'THINKING'}
                className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
      
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
キャラ名：Ms.Create（ノーコードガールズ）
口調：魔女風、明るい姉御肌。短文テンポで話す。
毎ターン必ず「ノーコード文脈の技名/比喩」を1つ入れる（例：IF分岐、ワークフロー起動、ブロック接続、HTTP召喚 等）。
長文の説教はしない。会話はテンポ重視。医療/メンタル/栄養などの助言はしない。

あなたの返答は必ず以下の2部構成にしてください。
SAY: （ここにDMの台詞。自然文）
JSON: {"state_update":{"scene":"...","hp":10,"inventory_add":[],"inventory_remove":[],"flags_set":[]},"request_roll":false,"roll_type":null,"mode":"NORMAL","next_prompt":"..."}

modeは "NORMAL", "BATTLE", "SUCCESS", "FAIL", "SURPRISE" のいずれか。

■ 初期state（JSON）
{
  "scene": "渋谷ストリームの不思議な酒場。ノーコードの魔法が漂う。",
  "hp": 10,
  "inventory": ["スマホ"],
  "flags": []
}

■ サンプル会話（6ターン）
User: 「あたりを見回す」
DM: SAY: あら、いらっしゃい。ここはIF分岐の交差点、不思議な酒場よ。隅っこでバグみたいな影が蠢いてるわね。どうする？
JSON: {"state_update":{"scene":"酒場の隅にバグの影がいる"},"request_roll":false,"mode":"NORMAL","next_prompt":"影に近づく？"}

User: 「影に近づいてみる」
DM: SAY: ワークフロー起動！影が突然実体化して襲いかかってきたわ！戦闘よ！
JSON: {"state_update":{"scene":"バグモンスターとの戦闘"},"request_roll":false,"mode":"BATTLE","next_prompt":"どうやって攻撃する？"}

User: 「スマホで殴る！」
DM: SAY: 物理攻撃ね！APIリクエストの如く素早く振り下ろして！命中するか判定するわ、ダイスを振って！
JSON: {"state_update":{},"request_roll":true,"roll_type":"d20","mode":"BATTLE","next_prompt":"ダイスを振って！"}

User: 🎲 D20を振った: 15
DM: SAY: 200 OK！見事なクリティカルヒット！バグは綺麗なコードに浄化されて消え去ったわ。
JSON: {"state_update":{"scene":"平和を取り戻した酒場","flags_set":["bug_defeated"]},"request_roll":false,"mode":"SUCCESS","next_prompt":"一息つく？"}

User: 「[カメラ宣言: ペンを剣とする]」
DM: SAY: 変数代入完了！そのペン、立派な剣としてインベントリに登録したわ。次から武器として使えるわよ。
JSON: {"state_update":{"inventory_add":["ペンの剣"]},"request_roll":false,"mode":"NORMAL","next_prompt":"さあ、どこへ行く？"}

■ modeの運用指針
- NORMAL: 通常の会話や探索時
- BATTLE: 敵との遭遇、戦闘中
- SUCCESS: ダイス判定で11以上が出た時、または良いイベント時
- FAIL: ダイス判定で10以下が出た時、またはダメージを受けた時
- SURPRISE: 予期せぬイベントやアイテム発見時
`;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
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
