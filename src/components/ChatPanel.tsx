import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Mic, Camera, Sparkles, Dices } from 'lucide-react';
import type { Mood, ChatMessage } from '../types';

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  isAwakened: boolean;
  mood: Mood;
  needsRoll: boolean;
  isRecording: boolean;
  onSendMessage: (text: string) => void;
  onToggleRecording: () => void;
  onRollDice: () => void;
  onCameraDeclare: () => void;
}

export function ChatPanel({
  chatHistory, isAwakened, mood, needsRoll, isRecording,
  onSendMessage, onToggleRecording, onRollDice, onCameraDeclare,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className={`flex-1 min-h-0 flex flex-col bg-base/92 backdrop-blur-md border-t transition-colors duration-500 ${
      isAwakened ? 'border-bright-gold/15' : 'border-wisteria/10'
    }`}>
      {/* Log Area */}
      <div className="flex-1 overflow-y-auto p-2 px-4 min-h-0 space-y-1.5">
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
        <form onSubmit={handleSubmit} className="flex gap-1.5">
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
            onClick={onCameraDeclare}
            className="p-2 bg-base/40 hover:bg-base/60 rounded-[2px] text-muted hover:text-porcelain transition-colors border border-wisteria/10"
            title="カメラでアイテム宣言"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleRecording}
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
            onClick={onRollDice}
            disabled={!needsRoll}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-wisteria/5 border border-wisteria/15 hover:brightness-125 rounded-[2px] text-wisteria font-mono text-[10px] tracking-[2px] active:scale-[0.98] transition-all disabled:opacity-30"
          >
            <Dices className="w-3 h-3" />
            判定
          </button>
        </div>
      </div>
    </div>
  );
}
