import { describe, it, expect } from 'vitest';
import { rollDice, getDiceTotal, collectResources, getBanditResources } from './dice';
import { createTile, fullPlayingState } from '../__tests__/fixtures';

describe('rollDice', () => {
  it('returns two dice values between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const dice = rollDice();
      expect(dice[0]).toBeGreaterThanOrEqual(1);
      expect(dice[0]).toBeLessThanOrEqual(6);
      expect(dice[1]).toBeGreaterThanOrEqual(1);
      expect(dice[1]).toBeLessThanOrEqual(6);
    }
  });

  it('returns a valid total (2-12)', () => {
    for (let i = 0; i < 100; i++) {
      const dice = rollDice();
      const total = getDiceTotal(dice);
      expect(total).toBeGreaterThanOrEqual(2);
      expect(total).toBeLessThanOrEqual(12);
    }
  });
});

describe('getDiceTotal', () => {
  it('sums two dice correctly', () => {
    expect(getDiceTotal([1, 1])).toBe(2);
    expect(getDiceTotal([6, 6])).toBe(12);
    expect(getDiceTotal([3, 4])).toBe(7);
    expect(getDiceTotal([1, 6])).toBe(7);
    expect(getDiceTotal([5, 2])).toBe(7);
  });
});

describe('collectResources', () => {
  it('returns no resources when no tiles match the dice total', () => {
    const state = fullPlayingState();
    const resources = collectResources(state.board, 'human', 7);
    expect(Object.keys(resources).length).toBe(0);
  });

  it('returns resources for tiles with matching number token', () => {
    // Create a board with a farm on a tile that has number token 6
    const board = [
      createTile(0, 0, 'desert', null),
      createTile(1, 0, 'forest', 6, { type: 'farm', owner: 'human' }),
      createTile(0, 1, 'farmland', 8, { type: 'farm', owner: 'human' }),
    ];
    // Farm produces 1 + farm bonus 1 = 2 wood (farm bonus applies because player has a farm)
    const resources = collectResources(board, 'human', 6);
    expect(resources['wood']).toBe(2);
  });

  it('returns correct resources for manor (2x)', () => {
    const board = [
      createTile(1, 0, 'forest', 6, { type: 'manor', owner: 'human' }),
    ];
    const resources = collectResources(board, 'human', 6);
    expect(resources['wood']).toBe(2);
  });

  it('returns correct resources for castle (3x)', () => {
    const board = [
      createTile(1, 0, 'forest', 6, { type: 'castle', owner: 'human' }),
    ];
    const resources = collectResources(board, 'human', 6);
    expect(resources['wood']).toBe(3);
  });

  it('only collects from the specified player', () => {
    const board = [
      createTile(1, 0, 'forest', 6, { type: 'farm', owner: 'ai' }),
    ];
    const humanResources = collectResources(board, 'human', 6);
    const aiResources = collectResources(board, 'ai', 6);
    expect(Object.keys(humanResources).length).toBe(0);
    // AI gets 1 base + 1 farm bonus = 2 (farm bonus applies because AI has a farm)
    expect(aiResources['wood']).toBe(2);
  });

  it('does not collect from desert tiles', () => {
    const board = [
      createTile(0, 0, 'desert', 6, { type: 'farm', owner: 'human' }),
    ];
    const resources = collectResources(board, 'human', 6);
    expect(Object.keys(resources).length).toBe(0);
  });

  it('does not collect from tiles with no building', () => {
    const board = [
      createTile(1, 0, 'forest', 6, null),
    ];
    const resources = collectResources(board, 'human', 6);
    expect(Object.keys(resources).length).toBe(0);
  });
});

describe('getBanditResources', () => {
  it('returns 0 when bandit position is null', () => {
    const board = [
      createTile(1, 0, 'forest', 6, { type: 'farm', owner: 'human' }),
    ];
    expect(getBanditResources(board, null, 'human')).toBe(0);
  });

  it('returns 0 when bandit is on tile with no building', () => {
    const board = [
      createTile(1, 0, 'forest', 6, null),
    ];
    expect(getBanditResources(board, { q: 1, r: 0 }, 'human')).toBe(0);
  });

  it('returns 0 when bandit is on opponent tile', () => {
    const board = [
      createTile(1, 0, 'forest', 6, { type: 'farm', owner: 'ai' }),
    ];
    expect(getBanditResources(board, { q: 1, r: 0 }, 'human')).toBe(0);
  });

  it('returns 1 when bandit is on player tile', () => {
    const board = [
      createTile(1, 0, 'forest', 6, { type: 'farm', owner: 'human' }),
    ];
    expect(getBanditResources(board, { q: 1, r: 0 }, 'human')).toBe(1);
  });
});
