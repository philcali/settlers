import { useGame } from '../state/game-context';

/**
 * Shorthand hook for accessing game state.
 * Components that need to dispatch actions should use useGame() directly.
 */
export function useGameState() {
  const { state } = useGame();
  return state;
}
