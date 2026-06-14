import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { gameReducer, createInitialState } from './game-reducer';
import { GameState, GameAction } from '../types/game';
import { checkWinner } from '../game/rules';
import { useTurnController } from '../hooks/useTurnController';

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());

  // Check for a winner after every state change
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const winner = checkWinner(state);
    if (winner) {
      dispatch({ type: 'SET_PHASE', phase: 'ended', winner });
      dispatch({ type: 'SET_MESSAGE', message: `${winner === 'human' ? 'You' : 'AI'} reached 10 VP!` });
    }
  }, [state, state.phase]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export { useTurnController };
