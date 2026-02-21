// src/hooks/useGameState.ts
import { useState, useEffect, useRef } from 'react';
import type { Mood, GameState, StateUpdate } from '../types';
import { INITIAL_STATE } from '../constants';

/** 純粋関数: state_update の適用 */
export function applyStateUpdate(current: GameState, update: StateUpdate, turn: number): GameState {
  const newState = { ...current };
  if (update.scene) newState.scene = update.scene;
  if (update.sceneType) newState.sceneType = update.sceneType;
  if (update.hp !== undefined) newState.hp = update.hp;
  if (update.sync_delta) newState.sync = Math.min(100, newState.sync + update.sync_delta);
  if (update.evolution_delta) newState.evolution = Math.min(100, newState.evolution + update.evolution_delta);
  if (update.inventory_add) newState.inventory = [...new Set([...newState.inventory, ...update.inventory_add])];
  if (update.inventory_remove) newState.inventory = newState.inventory.filter((i: string) => !update.inventory_remove!.includes(i));
  if (update.flags_set) newState.flags = [...new Set([...newState.flags, ...update.flags_set])];
  if (update.memory_add) newState.memory = [{ text: update.memory_add.text, turn, icon: update.memory_add.icon || '📝' }, ...newState.memory];
  return newState;
}

/** 純粋関数: 覚醒条件判定 */
export function isAwakeningReady(sync: number, evolution: number): boolean {
  return sync > 40 && evolution > 40;
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [mood, setMood] = useState<Mood>('normal');
  const [turnCount, setTurnCount] = useState(1);
  const [isAwakeningFlash, setIsAwakeningFlash] = useState(false);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
    if (isAwakeningReady(gameState.sync, gameState.evolution) && mood !== 'awakened') {
      setIsAwakeningFlash(true);
      setTimeout(() => setIsAwakeningFlash(false), 600);
    }
  }, [gameState]);

  const updateGameState = (update: StateUpdate) => {
    setGameState(prev => applyStateUpdate(prev, update, turnCount));
  };

  return {
    gameState,
    setGameState,
    mood,
    setMood,
    turnCount,
    setTurnCount,
    isAwakeningFlash,
    gameStateRef,
    updateGameState,
    isAwakened: mood === 'awakened',
  };
}
