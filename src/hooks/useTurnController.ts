import { useGame } from '../state/game-context';
import {
  BuildingType,
  BUILDING_COSTS,
  coordKey,
  ResourceType,
  TurnPhase,
} from '../types/game';
import { useMemo } from 'react';

const VALID_NEXT: Record<TurnPhase, TurnPhase> = {
  draw: 'play',
  play: 'build',
  build: 'roll',
  roll: 'draw',
};

export interface TurnController {
  phase: 'setup' | 'playing' | 'ended';
  turnPhase: TurnPhase;
  currentPlayer: 'human' | 'ai';
  turnCount: number;
  isCurrentPlayer: boolean;
  isHumanTurn: boolean;
  canActIn(phase: TurnPhase): boolean;
  canBuildOn(tileKey: string, buildingType: BuildingType): boolean;
  canUpgradeOn(tileKey: string, to: BuildingType): boolean;
  drawCards(): boolean;
  playCard(cardId: string): boolean;
  pass(): boolean;
  build(tileKey: string, buildingType: BuildingType): boolean;
  upgrade(tileKey: string, to: BuildingType): boolean;
  rollDice(): boolean;
  advanceTurn(): boolean;
}

export function useTurnController(): TurnController {
  const { state, dispatch } = useGame();

  const phase = state.phase;
  const turnPhase = state.turnPhase;
  const currentPlayer = state.currentPlayer;
  const turnCount = state.turnCount;
  const isCurrentPlayer = currentPlayer === 'human';
  const isHumanTurn = phase === 'playing' && isCurrentPlayer;

  const canActIn = useMemo(
    () =>
      (target: TurnPhase): boolean => {
        if (phase !== 'playing') return false;
        if (!isCurrentPlayer) return false;
        const expected = VALID_NEXT[turnPhase];
        return target === expected || target === turnPhase;
      },
    [phase, turnPhase, isCurrentPlayer],
  );

  const canBuildOn = useMemo(
    () =>
      (tileKey: string, buildingType: BuildingType): boolean => {
        if (!canActIn('roll')) return false;
        if (turnPhase !== 'build') return false;
        const tile = state.board.find((t) => coordKey(t.coord) === tileKey);
        if (!tile) return false;
        if (tile.building) return false;
        const cost = BUILDING_COSTS[buildingType];
        if (!cost) return false;
        return Object.entries(cost).every(
          ([res, amt]) =>
            (state.players.human.resources[res as ResourceType] || 0) >= amt,
        );
      },
    [canActIn, turnPhase, state.board, state.players.human.resources],
  );

  const canUpgradeOn = useMemo(
    () =>
      (tileKey: string, to: BuildingType): boolean => {
        if (!canActIn('roll')) return false;
        if (turnPhase !== 'build') return false;
        const tile = state.board.find((t) => coordKey(t.coord) === tileKey);
        if (!tile?.building) return false;
        const next: Record<string, BuildingType> = {
          farm: 'manor',
          manor: 'castle',
        };
        if (next[tile.building.type] !== to) return false;
        const cost = BUILDING_COSTS[to];
        if (!cost) return false;
        return Object.entries(cost).every(
          ([res, amt]) =>
            (state.players.human.resources[res as ResourceType] || 0) >= amt,
        );
      },
    [canActIn, turnPhase, state.board, state.players.human.resources],
  );

  function drawCards(): boolean {
    if (!canActIn('play')) return false;
    dispatch({ type: 'DRAW_CARDS', player: 'human', count: 3 });
    dispatch({ type: 'SET_TURN_PHASE', phase: 'play' });
    return true;
  }

  function playCard(cardId: string): boolean {
    if (!canActIn('build')) return false;
    dispatch({ type: 'PLAY_CARD', player: 'human', cardId });
    dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
    return true;
  }

  function pass(): boolean {
    if (turnPhase === 'play') {
      dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
      return true;
    }
    if (turnPhase === 'build') {
      dispatch({ type: 'SET_TURN_PHASE', phase: 'roll' });
      return true;
    }
    return false;
  }

  function build(tileKey: string, buildingType: BuildingType): boolean {
    if (!canActIn('roll') || turnPhase !== 'build') return false;
    const tile = state.board.find((t) => coordKey(t.coord) === tileKey);
    if (!tile) return false;

    if (tile.building) {
      dispatch({ type: 'UPGRADE', player: 'human', tileKey, to: buildingType });
    } else {
      dispatch({ type: 'BUILD', player: 'human', tileKey, building: buildingType });
    }

    const cost = BUILDING_COSTS[buildingType];
    if (cost) {
      const deduction: Partial<Record<ResourceType, number>> = {};
      for (const [res, amt] of Object.entries(cost)) {
        deduction[res as ResourceType] = amt;
      }
      dispatch({ type: 'REMOVE_RESOURCES', player: 'human', resources: deduction });
    }

    dispatch({ type: 'SET_TURN_PHASE', phase: 'roll' });
    return true;
  }

  const upgrade = build;

  function rollDice(): boolean {
    if (!canActIn('draw') || turnPhase !== 'roll') return false;
    if (state.dice.isRolled) return false;
    dispatch({ type: 'ROLL_DICE' });
    return true;
  }

  function advanceTurn(): boolean {
    if (turnPhase !== 'roll') return false;
    dispatch({ type: 'ADVANCE_TURN' });
    return true;
  }

  return {
    phase,
    turnPhase,
    currentPlayer,
    turnCount,
    isCurrentPlayer,
    isHumanTurn,
    canActIn,
    canBuildOn,
    canUpgradeOn,
    drawCards,
    playCard,
    pass,
    build,
    upgrade,
    rollDice,
    advanceTurn,
  };
}
