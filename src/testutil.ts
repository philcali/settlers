import { createGame, reduce } from './game';
import { coordKey } from './types';
import type { GameState } from './types';

/** Play through the 4 setup placements and return the state in the 'playing' phase. */
export function fullSetup(seed = 7): GameState {
  const s = createGame(seed);
  const empties = s.board.filter((t) => !t.building && t.province !== 'desert').map((t) => coordKey(t.coord));
  let state = s;
  state = reduce(state, { type: 'PLACE_BUILDING', player: 'human', tileKey: empties[0] });
  state = reduce(state, { type: 'PLACE_BUILDING', player: 'ai', tileKey: empties[1] });
  state = reduce(state, { type: 'PLACE_BUILDING', player: 'human', tileKey: empties[2] });
  state = reduce(state, { type: 'PLACE_BUILDING', player: 'ai', tileKey: empties[3] });
  return state;
}
