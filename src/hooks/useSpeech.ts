// src/hooks/useSpeech.ts
import { useState, useEffect, useRef } from 'react';
import type { Mood } from '../types';
import { speakWithGeminiTTS } from '../services/ttsClient';

interface UseSpeechParams {
  onTranscript: (text: string) => void;
  setMood: (mood: Mood) => void;
  mood: Mood;
}

export function useSpeech(params: UseSpeechParams) {
  const { onTranscript, setMood, mood } = params;
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const speak = (text: string) => {
    const currentMood = moodRef.current;
    speakWithGeminiTTS(text, currentMood).then(() => {
      if (currentMood !== 'success' && currentMood !== 'awakened') {
        setMood('normal');
      }
    });
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

  return {
    isRecording,
    speak,
    toggleRecording,
  };
}
