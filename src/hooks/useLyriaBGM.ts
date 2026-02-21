// src/hooks/useLyriaBGM.ts
import { useEffect, useRef, useCallback } from 'react';
import type { Mood } from '../types';
import { LyriaClient } from '../services/lyriaClient';

interface UseLyriaBGMParams {
  mood: Mood;
}

/** Lyria RealTime BGM — ユーザー操作後に接続し、mood 変化に追従してBGMを動的生成 */
export function useLyriaBGM({ mood }: UseLyriaBGMParams) {
  const lyriaRef = useRef<LyriaClient | null>(null);
  const prevMoodRef = useRef<Mood>(mood); // 初期値を mood に合わせ、マウント時の即接続を防止
  const connectingRef = useRef(false);

  const ensureConnected = useCallback(async () => {
    if (lyriaRef.current || connectingRef.current) return;
    connectingRef.current = true;
    try {
      const client = new LyriaClient();
      lyriaRef.current = client;
      await client.connect();
    } catch {
      lyriaRef.current = null;
    } finally {
      connectingRef.current = false;
    }
  }, []);

  // アンマウント時に切断
  useEffect(() => {
    return () => {
      lyriaRef.current?.disconnect();
      lyriaRef.current = null;
    };
  }, []);

  // mood 変化を検知して BGM を切替
  useEffect(() => {
    if (mood === prevMoodRef.current) return;
    prevMoodRef.current = mood;
    lyriaRef.current?.setMoodBGM(mood);
  }, [mood]);

  return { ensureConnected };
}
