import { useEffect, useRef } from 'react';
import { useGame } from '../state/game-context';
import { coordKey } from '../types/game';
import { getAllTiles } from '../game/board';

/**
 * Hook that handles AI castle placement during the setup phase.
 * Alternates with human clicks — after 4 total placements, transitions to playing.
 */
export function useInitialPlacement(onHumanPlaced: () => void) {
  const { state, dispatch } = useGame();
  const placedRef = useRef(0);

  useEffect(() => {
    // Only trigger AI placement during setup
    if (state.phase !== 'setup' || state.currentPlayer !== 'ai') return;

    // Find an unoccupied tile (one without a building)
    const occupied = new Set(
      state.board.filter(t => t.building !== null).map(t => coordKey(t.coord)),
    );
    const available = getAllTiles().filter(t => !occupied.has(coordKey(t)));

    if (available.length === 0) return;

    const timer = setTimeout(() => {
      const tile = available[Math.floor(Math.random() * available.length)];
      dispatch({ type: 'PLACE_CASTLE', player: 'ai', tileKey: coordKey(tile) });
    }, 600);

    return () => clearTimeout(timer);
  }, [state.currentPlayer, state.phase, state.board, dispatch]);

  // Detect when human just placed their 2nd castle
  useEffect(() => {
    if (state.phase !== 'setup') return;

    const humanCount = state.board.filter(
      t => t.building !== null && t.building.owner === 'human',
    ).length;

    if (humanCount === placedRef.current) return; // no change
    placedRef.current = humanCount;

    if (humanCount === 2) {
      // Human placed their 2nd castle — trigger transition
      onHumanPlaced();
    }
  }, [state.board, state.phase, onHumanPlaced]);
}
