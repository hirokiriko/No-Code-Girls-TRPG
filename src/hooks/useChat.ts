// src/hooks/useChat.ts
import { useState, useRef, type RefObject, type Dispatch, type SetStateAction } from 'react';
import type { Mood, GameState, ChatMessage } from '../types';
import { SYSTEM_PROMPT } from '../constants';
import { getGeminiClient, parseGeminiResponse } from '../services/geminiClient';
import { applyStateUpdate } from './useGameState';

interface UseChatParams {
  gameStateRef: RefObject<GameState>;
  mood: Mood;
  turnCount: number;
  setGameState: Dispatch<SetStateAction<GameState>>;
  setMood: (mood: Mood) => void;
  setTurnCount: Dispatch<SetStateAction<number>>;
  setNeedsRoll: (needs: boolean) => void;
  speak: (text: string) => void;
}

export function useChat(params: UseChatParams) {
  const { gameStateRef, mood, turnCount, setGameState, setMood, setTurnCount, setNeedsRoll, speak } = params;
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const handleSendMessageRef = useRef<(text: string, diceVal?: number | null) => void>(() => {});

  const handleSendMessage = async (text: string, diceVal: number | null = null) => {
    if (!text && diceVal === null) return;

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
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: JSON.stringify(payload),
        config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.7 }
      });

      const { sayText, data: parsedJson } = parseGeminiResponse(response.text || "");

      const isAwakened = mood === 'awakened' || (parsedJson?.mode === 'awakened');
      setChatHistory(prev => [...prev, { id: Date.now().toString() + "-dm", role: 'dm', text: sayText, isAwakened }]);

      if (parsedJson) {
        setGameState(prev => applyStateUpdate(prev, parsedJson.state_update, turnCount));
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

  const handleCameraDeclare = () => {
    const item = prompt("カメラに映したアイテムを宣言してください（例：ペンを剣とする）");
    if (item) {
      handleSendMessage(`[カメラ宣言: ${item}]`);
    }
  };

  return {
    chatHistory,
    handleSendMessage,
    handleSendMessageRef,
    handleCameraDeclare,
  };
}
