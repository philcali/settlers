import type { Card, GameAction, GameState } from './types';
import { coordKey } from './types';
import { PRODUCTION, buildTargets, robberTargets } from './rules';

/** Number of two-dice combinations that hit each token (6/8 best, 2/12 worst). */
export const TOKEN_QUALITY: Record<number, number> = {
  6: 5, 8: 5,
  5: 4, 9: 4,
  4: 3, 10: 3,
  3: 2, 11: 2,
  2: 1, 12: 1,
};

const quality = (state: GameState, key: string): number => {
  const tile = state.board.find((t) => coordKey(t.coord) === key);
  return tile && tile.numberToken !== null ? (TOKEN_QUALITY[tile.numberToken] ?? 0) : 0;
};

/** The most frequent (best) tile among the given keys. */
export function bestTile(state: GameState, keys: string[]): string {
  return [...keys].sort((a, b) => quality(state, b) - quality(state, a))[0]!;
}

/** How much a tile's building produces per hit — what blocking it costs the owner. */
const robberScore = (state: GameState, key: string): number => {
  const tile = state.board.find((t) => coordKey(t.coord) === key);
  if (!tile || tile.numberToken === null || !tile.building) return 0;
  return (TOKEN_QUALITY[tile.numberToken] ?? 0) * PRODUCTION[tile.building.type];
};

/** The opponent tile that hurts them most to block (token frequency × building output). */
export function bestRobberTile(state: GameState, keys: string[]): string {
  return [...keys].sort((a, b) => robberScore(state, b) - robberScore(state, a))[0]!;
}

/**
 * Pick at most one card for the AI to play this turn.
 * Priority: stockpile a resource → self-boost (Crusade/Relic Hunt) →
 * annoy the human (Plague if they hold cards, Mercenary if they have buildings) → Royal Decree.
 * Harvest Festival / Famine / Spy Network are left unplayed (they help the human or are invisible to the AI).
 */
export function pickAiCard(state: GameState): Card | null {
  if (state.aiPlayedCard) return null;
  const hand = state.players.ai.hand;
  const humanHasCards = state.players.human.hand.length > 0;
  const humanHasBuildings = state.board.some((t) => t.building?.owner === 'human');
  const bySubtype = (subtype: string) => hand.find((c) => c.subtype === subtype) ?? null;
  return (
    hand.find((c) => c.type === 'resource') ??
    bySubtype('crusade') ??
    bySubtype('relic-hunt') ??
    (humanHasCards ? bySubtype('plague') : null) ??
    (humanHasBuildings ? bySubtype('mercenary-company') : null) ??
    bySubtype('royal-decree')
  );
}

/**
 * Decide the AI's next action for the current state (one action per decision, so each
 * step is visible and paced by the caller). Returns null when the AI should wait.
 *
 * Placeholders the caller must fill in: the `seed` fields (fresh random seed) and the
 * ROLL_DICE value/individual (the actual dice).
 */
export function aiDecide(state: GameState): GameAction | null {
  if (state.phase !== 'playing' || state.currentPlayer !== 'ai') return null;

  // Rolling a 7 blocks the turn until the bandit is placed.
  if (state.robberPending === 'ai') {
    const keys = robberTargets(state, 'ai');
    if (keys.length > 0) return { type: 'MOVE_BANDIT', player: 'ai', tileKey: bestRobberTile(state, keys) };
    return { type: 'ADVANCE_TURN', seed: 0 }; // no legal tile (should not happen); ADVANCE_TURN handles it
  }

  if (state.dice.individual !== null) return { type: 'ADVANCE_TURN', seed: 0 };

  // Build greedily, highest tier first.
  const castle = buildTargets(state, 'ai', 'castle');
  if (castle.length > 0) return { type: 'UPGRADE', player: 'ai', tileKey: castle[0]!, to: 'castle' };
  const manor = buildTargets(state, 'ai', 'manor');
  if (manor.length > 0) return { type: 'UPGRADE', player: 'ai', tileKey: manor[0]!, to: 'manor' };
  const farm = buildTargets(state, 'ai', 'farm');
  if (farm.length > 0) return { type: 'BUILD', player: 'ai', tileKey: bestTile(state, farm), building: 'farm' };

  const card = pickAiCard(state);
  if (card) return { type: 'PLAY_CARD', player: 'ai', cardId: card.id, seed: 0 };

  return { type: 'ROLL_DICE', value: 7, individual: [3, 4], seed: 0 };
}
