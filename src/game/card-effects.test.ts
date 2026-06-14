import { describe, it, expect } from 'vitest';
import { getCardEffects, getBanditTarget } from './card-effects';
import { createTile, fullPlayingState } from '../__tests__/fixtures';

describe('getCardEffects', () => {
  const human = 'human';
  const ai = 'ai';

  it('royal-decree returns DRAW_CARDS for the player', () => {
    const effects = getCardEffects({ id: 'test-1', type: 'title', subtype: 'royal-decree' }, human);
    expect(effects).toEqual([{ type: 'DRAW_CARDS', count: 1, target: human }]);
  });

  it('plague returns DISCARD_RANDOM for the opponent', () => {
    const effects = getCardEffects({ id: 'test-2', type: 'title', subtype: 'plague' }, human);
    expect(effects).toEqual([{ type: 'DISCARD_RANDOM', count: 1, target: ai }]);
  });

  it('crusade returns GAIN_RESOURCES for the player', () => {
    const effects = getCardEffects({ id: 'test-3', type: 'title', subtype: 'crusade' }, human);
    expect(effects).toEqual([{ type: 'GAIN_RESOURCES', count: 3, target: human }]);
  });

  it('spy-network returns REVEAL_OPPONENT_HAND for the player', () => {
    const effects = getCardEffects({ id: 'test-4', type: 'title', subtype: 'spy-network' }, human);
    expect(effects).toEqual([{ type: 'REVEAL_OPPONENT_HAND', player: human }]);
  });

  it('mercenary-company returns MOVE_BANDIT when no board provided', () => {
    const effects = getCardEffects({ id: 'test-5', type: 'title', subtype: 'mercenary-company' }, human);
    expect(effects).toEqual([{ type: 'MOVE_BANDIT', target: { q: 0, r: 0 } }]);
  });

  it('harvest-festival returns DRAW_CARDS for both players', () => {
    const effects = getCardEffects({ id: 'test-6', type: 'event', subtype: 'harvest-festival' }, human);
    expect(effects).toEqual([
      { type: 'DRAW_CARDS', count: 1, target: 'human' },
      { type: 'DRAW_CARDS', count: 1, target: 'ai' },
    ]);
  });

  it('famine returns DISCARD_RANDOM for both players', () => {
    const effects = getCardEffects({ id: 'test-7', type: 'event', subtype: 'famine' }, human);
    expect(effects).toEqual([
      { type: 'DISCARD_RANDOM', count: 1, target: 'human' },
      { type: 'DISCARD_RANDOM', count: 1, target: 'ai' },
    ]);
  });

  it('relic-hunt returns GAIN_RESOURCES for the player', () => {
    const effects = getCardEffects({ id: 'test-8', type: 'event', subtype: 'relic-hunt' }, human);
    expect(effects).toEqual([{ type: 'GAIN_RESOURCES', count: 3, target: human }]);
  });

  it('unknown subtype returns empty effects', () => {
    const effects = getCardEffects({ id: 'test-9', type: 'resource', subtype: 'wood' }, human);
    expect(effects).toEqual([]);
  });
});

describe('getBanditTarget', () => {
  it('returns null when player has no buildings', () => {
    const state = fullPlayingState();
    expect(getBanditTarget(state.board, 'human')).toBeNull();
  });

  it('returns a tile coord when player has buildings', () => {
    const board = [
      createTile(1, 0, 'forest', 6, { type: 'farm', owner: 'human' }),
      createTile(0, 1, 'farmland', 8, null),
    ];
    const target = getBanditTarget(board, 'human');
    expect(target).toBeDefined();
    expect(target?.q).toBe(1);
    expect(target?.r).toBe(0);
  });
});
