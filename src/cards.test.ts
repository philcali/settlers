import { describe, expect, it } from 'vitest';
import { applyCard, cardName } from './cards';
import { reduce } from './game';
import { fullSetup } from './testutil';
import { mulberry32 } from './rng';
import type { Card, GameState, PlayerId } from './types';

const rng = (n: number) => mulberry32(n);

/** Ensure the player holds a card of the given subtype, drawing more if needed (all deterministic). */
function holding(state: GameState, player: PlayerId, subtype: string): { state: GameState; card: Card } {
  let s = state;
  for (let i = 0; i < 12 && !s.players[player].hand.some((c) => c.subtype === subtype); i++) {
    s = reduce(s, { type: 'DRAW_CARDS', player, count: 4, seed: 1000 + i });
  }
  const card = s.players[player].hand.find((c) => c.subtype === subtype)!;
  return { state: s, card };
}

const totalResources = (s: GameState, pid: PlayerId) =>
  Object.values(s.players[pid].resources).reduce((a, b) => a + b, 0);

describe('resource cards', () => {
  it('playing one grants that resource', () => {
    const { state, card } = holding(fullSetup(), 'human', 'wood');
    const s2 = applyCard(state, 'human', card, rng(1));
    expect(s2.players.human.hand).toHaveLength(state.players.human.hand.length - 1);
    expect(s2.players.human.resources.wood).toBe(state.players.human.resources.wood + 1);
    expect(s2.deck.discard).toHaveLength(state.deck.discard.length + 1);
  });
});

describe('title cards', () => {
  it('royal decree: draw one', () => {
    const { state, card } = holding(fullSetup(), 'human', 'royal-decree');
    const s2 = applyCard(state, 'human', card, rng(1));
    expect(s2.players.human.hand).toHaveLength(state.players.human.hand.length); // -1 played, +1 drawn
    expect(s2.deck.cards).toHaveLength(state.deck.cards.length - 1);
  });

  it('plague: opponent discards one random card', () => {
    const { state, card } = holding(fullSetup(), 'human', 'plague');
    const s2 = applyCard(state, 'human', card, rng(1));
    expect(s2.players.ai.hand).toHaveLength(state.players.ai.hand.length - 1);
    expect(s2.deck.discard).toHaveLength(state.deck.discard.length + 2); // played plague + discarded card
  });

  it('crusade: gain 3 random resources', () => {
    const { state, card } = holding(fullSetup(), 'human', 'crusade');
    const s2 = applyCard(state, 'human', card, rng(1));
    expect(totalResources(s2, 'human')).toBe(totalResources(state, 'human') + 3);
    expect(totalResources(s2, 'ai')).toBe(totalResources(state, 'ai'));
  });

  it('spy network: reveals the opponent hand', () => {
    const { state, card } = holding(fullSetup(), 'human', 'spy-network');
    const s2 = applyCard(state, 'human', card, rng(1));
    expect(s2.reveal?.nonce).toBe(1);
    expect(s2.reveal?.by).toBe('human');
    expect(s2.reveal?.cards).toEqual(state.players.ai.hand);
  });

  it('mercenary company: moves the robber onto an opponent tile', () => {
    const { state, card } = holding(fullSetup(), 'human', 'mercenary-company');
    const s2 = applyCard(state, 'human', card, rng(1));
    const banditTiles = s2.board.filter((t) => t.hasBandit);
    expect(banditTiles).toHaveLength(1);
    expect(banditTiles[0]!.building?.owner).toBe('ai');
  });

  it('mercenary company: no-op if the opponent has no buildings', () => {
    const { state, card } = holding(fullSetup(), 'human', 'mercenary-company');
    const noBuildings = {
      ...state,
      board: state.board.map((t) => (t.building?.owner === 'ai' ? { ...t, building: null } : t)),
    };
    const s2 = applyCard(noBuildings, 'human', card, rng(1));
    expect(s2.board).toEqual(noBuildings.board);
  });
});

describe('event cards', () => {
  it('harvest festival: both players draw one', () => {
    const { state, card } = holding(fullSetup(), 'human', 'harvest-festival');
    const s2 = applyCard(state, 'human', card, rng(1));
    expect(s2.players.human.hand).toHaveLength(state.players.human.hand.length); // -1 played, +1 drawn
    expect(s2.players.ai.hand).toHaveLength(state.players.ai.hand.length + 1);
    expect(s2.deck.cards).toHaveLength(state.deck.cards.length - 2);
  });

  it('famine: both players discard one', () => {
    const { state, card } = holding(fullSetup(), 'human', 'famine');
    const s2 = applyCard(state, 'human', card, rng(1));
    expect(s2.players.human.hand).toHaveLength(state.players.human.hand.length - 2); // played + own discard
    expect(s2.players.ai.hand).toHaveLength(state.players.ai.hand.length - 1);
    expect(s2.deck.discard).toHaveLength(state.deck.discard.length + 3); // played card + 2 discards
  });

  it('famine: empty hand discards nothing', () => {
    const { state, card } = holding(fullSetup(), 'human', 'famine');
    const aiBroke = { ...state, players: { ...state.players, ai: { ...state.players.ai, hand: [] } } };
    const s2 = applyCard(aiBroke, 'human', card, rng(1));
    expect(s2.players.ai.hand).toHaveLength(0);
    expect(s2.deck.discard).toHaveLength(state.deck.discard.length + 2); // played card + own discard
  });

  it('relic hunt: gain 3 random resources', () => {
    const { state, card } = holding(fullSetup(), 'human', 'relic-hunt');
    const s2 = applyCard(state, 'human', card, rng(1));
    expect(totalResources(s2, 'human')).toBe(totalResources(state, 'human') + 3);
  });
});

describe('PLAY_CARD guards', () => {
  it('rejects plays off-turn and unknown cards', () => {
    const { state, card } = holding(fullSetup(), 'human', 'wood');
    const wrongTurn = { ...state, currentPlayer: 'ai' as const };
    expect(reduce(wrongTurn, { type: 'PLAY_CARD', player: 'human', cardId: card.id, seed: 1 })).toBe(wrongTurn);
    expect(reduce(state, { type: 'PLAY_CARD', player: 'human', cardId: 'does-not-exist', seed: 1 })).toBe(state);
  });

  it('effects are deterministic for a given seed', () => {
    const { state, card } = holding(fullSetup(), 'human', 'crusade');
    expect(applyCard(state, 'human', card, rng(42))).toEqual(applyCard(state, 'human', card, rng(42)));
  });

  it('card names map to readable labels', () => {
    expect(cardName({ id: 'x', type: 'title', subtype: 'spy-network' })).toBe('Spy Network');
    expect(cardName({ id: 'x', type: 'resource', subtype: 'ore' })).toBe('Ore');
  });
});
