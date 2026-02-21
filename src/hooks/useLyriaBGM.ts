// src/hooks/useLyriaBGM.ts
import { useEffect, useRef } from 'react';
import type { Mood } from '../types';
import { LyriaClient } from '../services/lyriaClient';

interface UseLyriaBGMParams {
  mood: Mood;
}

/** Lyria RealTime BGM — mood 変化に追従してリアルタイムBGMを動的生成 */
export function useLyriaBGM({ mood }: UseLyriaBGMParams): void {
  const lyriaRef = useRef<LyriaClient | null>(null);
  const prevMoodRef = useRef<Mood | null>(null);

  // マウント時に接続、アンマウント時に切断
  useEffect(() => {
    const client = new LyriaClient();
    lyriaRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      lyriaRef.current = null;
    };
  }, []);

  // mood 変化を検知して BGM を切替
  useEffect(() => {
    if (!lyriaRef.current || mood === prevMoodRef.current) return;
    prevMoodRef.current = mood;
    lyriaRef.current.setMoodBGM(mood);
  }, [mood]);
}
