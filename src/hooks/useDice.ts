// src/hooks/useDice.ts
import { useState } from 'react';
import type { RollResult } from '../types';

/** 純粋関数: 1d20 ロール */
export function rollDice(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/** 純粋関数: 成功判定（11以上で成功） */
export function isRollSuccess(value: number): boolean {
  return value >= 11;
}

export function useDice(onRollComplete: (diceVal: number) => void) {
  const [needsRoll, setNeedsRoll] = useState(false);
  const [rollResult, setRollResult] = useState<RollResult | null>(null);

  const handleRollDice = () => {
    const val = rollDice();
    const success = isRollSuccess(val);
    setRollResult({ value: val, success });
    setNeedsRoll(false);
    setTimeout(() => {
      setRollResult(null);
      onRollComplete(val);
    }, 2000);
  };

  return {
    needsRoll,
    setNeedsRoll,
    rollResult,
    handleRollDice,
  };
}
