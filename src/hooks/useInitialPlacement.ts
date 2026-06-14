import { useEffect, useRef } from 'react';
import { useGame } from '../state/game-context';
import { coordKey, HexTile } from '../types/game';

/**
 * Hook that handles AI castle placement during the setup phase.
 * Alternates with human clicks — after 4 total placements, transitions to playing.
 */
export function useInitialPlacement(onHumanPlaced: () => void) {
  const { state, dispatch } = useGame();
  // Track which castle numbers (0-indexed) have been scheduled to prevent double-scheduling
  const scheduledCastlesRef = useRef(new Set<number>());
  // Track the initial AI count to distinguish "board empty" from "AI already acted"
  const initialAiCountRef = useRef<number | null>(null);

  useEffect(() => {
    // Only trigger AI placement during setup
    if (state.phase !== 'setup') return;

    // Record initial state when board first has tiles
    if (initialAiCountRef.current === null) {
      const aiCount = state.board.filter(
        (t: HexTile) => t.building !== null && t.building.owner === 'ai',
      ).length;
      initialAiCountRef.current = aiCount;
      if (aiCount > 0) scheduledCastlesRef.current.add(aiCount);
    }

    const aiCount = state.board.filter(
      (t: HexTile) => t.building !== null && t.building.owner === 'ai',
    ).length;

    // Don't place if AI already has 2 castles
    if (aiCount >= 2) return;

    // Only schedule when it's the AI's turn
    if (state.currentPlayer !== 'ai') return;

    // Skip if we've already scheduled this castle number
    if (scheduledCastlesRef.current.has(aiCount)) return;
    scheduledCastlesRef.current.add(aiCount);

    // Find an unoccupied tile
    const available = state.board.filter((t: HexTile) => t.building === null);
    if (available.length === 0) return;

    const timer = setTimeout(() => {
      // Verify the AI still needs to place
      const currentAiCount = state.board.filter(
        (t: HexTile) => t.building !== null && t.building.owner === 'ai',
      ).length;
      if (currentAiCount === aiCount) {
        const tile = available[Math.floor(Math.random() * available.length)];
        dispatch({ type: 'PLACE_CASTLE', player: 'ai', tileKey: coordKey(tile) });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [state.phase, state.board, dispatch]);

  // Track AI placements — end setup when AI places its 2nd castle
  const aiPlacedRef = useRef(0);

  useEffect(() => {
    if (state.phase !== 'setup') return;

    const humanCount = state.board.filter(
      (t: HexTile) => t.building !== null && t.building.owner === 'human',
    ).length;
    const aiCount = state.board.filter(
      (t: HexTile) => t.building !== null && t.building.owner === 'ai',
    ).length;

    if (aiPlacedRef.current === aiCount) return; // no change
    aiPlacedRef.current = aiCount;

    // AI just placed its 2nd castle — setup is complete
    if (aiCount === 2) {
      onHumanPlaced();
    }
  }, [state.board, state.phase, onHumanPlaced]);
}
