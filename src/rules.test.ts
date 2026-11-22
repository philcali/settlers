import { describe, expect, it } from 'vitest';
import { moveBandit, robberSteal, robberTargets, buildTargets, canAfford, canBuild, canUpgrade, checkWinner, rollYields, victoryPoints } from './rules';
import { fullSetup } from './testutil';
import { neighbors } from './board';
import { mulberry32 } from './rng';
import type { BuildingType, PlayerId, Province, Tile } from './types';
import { coordKey } from './types';

const mkTile = (
  province: Province,
  token: number,
  owner: PlayerId | null,
  bandit = false,
  buildingType: BuildingType = 'farm',
): Tile => ({
  coord: { q: 0, r: 0 },
  province,
  numberToken: token,
  building: owner ? { type: buildingType, owner } : null,
  hasBandit: bandit,
});

describe('canAfford', () => {
  const state = fullSetup();
  it('starter bundle covers a farm but not a manor', () => {
    expect(canAfford(state.players.human, 'farm')).toBe(true);
    expect(canAfford(state.players.human, 'manor')).toBe(false);
  });
});

describe('canBuild', () => {
  const state = fullSetup();
  const humanFarms = state.board.filter((t) => t.building?.owner === 'human');
  const nearKeys = new Set(humanFarms.flatMap((t) => neighbors(t.coord).map(coordKey)));
  const adjacentEmpty = state.board.find((t) => !t.building && nearKeys.has(coordKey(t.coord)))!;
  const farEmpty = state.board.find((t) => !t.building && !nearKeys.has(coordKey(t.coord)))!;
  const occupied = humanFarms[0]!;

  it('requires an empty tile adjacent to your buildings', () => {
    expect(canBuild(state, 'human', coordKey(adjacentEmpty.coord), 'farm')).toBe(true);
    expect(canBuild(state, 'human', coordKey(farEmpty.coord), 'farm')).toBe(false);
    expect(canBuild(state, 'human', coordKey(occupied.coord), 'farm')).toBe(false);
  });

  it('requires the full cost', () => {
    const broke = {
      ...state,
      players: {
        ...state.players,
        human: { ...state.players.human, resources: { wood: 1, stone: 0, grain: 0, ore: 0, livestock: 0 } },
      },
    };
    expect(canBuild(broke, 'human', coordKey(adjacentEmpty.coord), 'farm')).toBe(false);
  });
});

describe('canUpgrade', () => {
  const state = fullSetup();
  const farm = state.board.find((t) => t.building?.owner === 'human')!;
  const farmKey = coordKey(farm.coord);
  const rich = {
    ...state,
    players: {
      ...state.players,
      human: {
        ...state.players.human,
        resources: { wood: 9, stone: 9, grain: 9, ore: 9, livestock: 9 },
      },
    },
  };

  it('follows the farm → manor → castle path only, for the owner', () => {
    expect(canUpgrade(state, 'human', farmKey, 'manor')).toBe(false); // can't afford
    expect(canUpgrade(state, 'human', farmKey, 'castle')).toBe(false); // wrong path
    expect(canUpgrade(state, 'ai', farmKey, 'manor')).toBe(false); // not owner
    expect(canUpgrade(rich, 'human', farmKey, 'manor')).toBe(true);
    expect(canUpgrade(rich, 'human', farmKey, 'castle')).toBe(false); // still a farm
  });
});

describe('buildTargets', () => {
  const state = fullSetup();
  const humanFarms = state.board.filter((t) => t.building?.owner === 'human');
  const aiFarms = state.board.filter((t) => t.building?.owner === 'ai');
  const nearKeys = new Set(humanFarms.flatMap((t) => neighbors(t.coord).map(coordKey)));
  const farmKeys = state.board
    .filter((t) => !t.building && t.province !== 'desert' && nearKeys.has(coordKey(t.coord)))
    .map((t) => coordKey(t.coord))
    .sort();
  const rich = {
    ...state,
    players: {
      ...state.players,
      human: { ...state.players.human, resources: { wood: 9, stone: 9, grain: 9, ore: 9, livestock: 9 } },
      ai: { ...state.players.ai, resources: { wood: 9, stone: 9, grain: 9, ore: 9, livestock: 9 } },
    },
  };

  it('lists every empty tile adjacent to your buildings (you can afford a farm at setup)', () => {
    expect(buildTargets(state, 'human', 'farm').sort()).toEqual(farmKeys);
  });

  it('respects affordability and the farm → manor → castle path', () => {
    expect(buildTargets(state, 'human', 'manor')).toEqual([]); // can't afford a manor yet
    expect(buildTargets(rich, 'human', 'manor').sort()).toEqual(
      humanFarms.map((t) => coordKey(t.coord)).sort(),
    );
    expect(buildTargets(rich, 'human', 'castle')).toEqual([]); // no manors to upgrade yet
  });

  it('only ever targets buildings you own', () => {
    const humanFarmKeys = new Set(humanFarms.map((t) => coordKey(t.coord)));
    const aiTargets = buildTargets(rich, 'ai', 'manor');
    expect(aiTargets.sort()).toEqual(aiFarms.map((t) => coordKey(t.coord)).sort());
    expect(aiTargets.some((k) => humanFarmKeys.has(k))).toBe(false);
  });

  it('returns nothing outside the playing phase', () => {
    const setup = { ...state, phase: 'setup' as const };
    expect(buildTargets(setup, 'human', 'farm')).toEqual([]);
  });
});

describe('rollYields', () => {
  const board: Tile[] = [
    mkTile('forest', 6, 'human'),
    mkTile('farmland', 6, 'ai'),
    mkTile('mine', 6, 'ai', true), // robber blocks this one
    mkTile('quarry', 6, null), // no building, no production
    mkTile('pasture', 8, 'human'),
  ];

  it('pays the owner of each built, unblocked tile matching the roll', () => {
    expect(rollYields(board, 6)).toEqual({ human: { wood: 1 }, ai: { grain: 1 } });
    expect(rollYields(board, 8)).toEqual({ human: { livestock: 1 }, ai: {} });
    expect(rollYields(board, 7)).toEqual({ human: {}, ai: {} });
  });

  it('pays per tile when a player has several matching tiles', () => {
    const doubled: Tile[] = [mkTile('forest', 9, 'human'), mkTile('farmland', 9, 'human')];
    expect(rollYields(doubled, 9)).toEqual({ human: { wood: 1, grain: 1 }, ai: {} });
  });

  it('building tier scales output: farm 1, manor 2, castle 3', () => {
    const mixed: Tile[] = [
      mkTile('forest', 6, 'human', false, 'farm'),
      mkTile('farmland', 6, 'human', false, 'manor'),
      mkTile('mine', 6, 'human', false, 'castle'),
    ];
    expect(rollYields(mixed, 6)).toEqual({ human: { wood: 1, grain: 2, ore: 3 }, ai: {} });
  });
});

describe('victoryPoints / checkWinner', () => {
  it('farms score 0; 10 points ends the game', () => {
    const state = fullSetup();
    expect(victoryPoints(state.board, 'human')).toBe(0);
    expect(checkWinner(state)).toBe(null);
    const castled = {
      ...state,
      board: state.board.map((t, i) =>
        i < 5 ? { ...t, building: { type: 'castle' as const, owner: 'human' as const } } : t,
      ),
    };
    expect(victoryPoints(castled.board, 'human')).toBe(10);
    expect(checkWinner(castled)).toBe('human');
  });
});

describe('robberSteal', () => {
  const base = fullSetup();

  it('steals one resource when the opponent holds at least 2', () => {
    const { next, stole } = robberSteal(base, 'human', mulberry32(1));
    expect(stole).not.toBeNull();
    expect(next.players.human.resources[stole!]).toBe(base.players.human.resources[stole!] + 1);
    expect(next.players.ai.resources[stole!]).toBe(base.players.ai.resources[stole!] - 1);
    expect(next.board).toBe(base.board); // the bandit does not move here
  });

  it('steals nothing when the opponent holds less than 2 in total', () => {
    const state = {
      ...base,
      players: {
        ...base.players,
        ai: { ...base.players.ai, resources: { wood: 1, stone: 0, grain: 0, ore: 0, livestock: 0 } },
      },
    };
    const { next, stole } = robberSteal(state, 'human', mulberry32(1));
    expect(stole).toBeNull();
    expect(next.players).toBe(state.players);
  });

  it('works in both directions and is deterministic for a seed', () => {
    const toAi = robberSteal(base, 'ai', mulberry32(42));
    expect(toAi.stole).not.toBeNull();
    expect(toAi.next.players.ai.resources[toAi.stole!]).toBe(base.players.ai.resources[toAi.stole!] + 1);
    expect(toAi.next.players.human.resources[toAi.stole!]).toBe(base.players.human.resources[toAi.stole!] - 1);

    const a = robberSteal(base, 'human', mulberry32(99));
    const b = robberSteal(base, 'human', mulberry32(99));
    expect(a).toEqual(b);
  });
});

describe('robberTargets / moveBandit', () => {
  const base = fullSetup();

  it('targets are the opponent\'s tiles', () => {
    const expected = base.board
      .filter((t) => t.building?.owner === 'ai')
      .map((t) => coordKey(t.coord));
    expect(robberTargets(base, 'human')).toEqual(expected);
    expect(robberTargets(base, 'human').length).toBeGreaterThan(0);
  });

  it('falls back to empty non-desert tiles when the opponent has no buildings', () => {
    const state = {
      ...base,
      board: base.board.map((t) => (t.building?.owner === 'ai' ? { ...t, building: null } : t)),
    };
    const keys = robberTargets(state, 'human');
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      const tile = state.board.find((t) => coordKey(t.coord) === k)!;
      expect(tile.building).toBeNull();
      expect(tile.province).not.toBe('desert');
    }
  });

  it('moveBandit moves the flag to the chosen tile', () => {
    const key = robberTargets(base, 'human')[0]!;
    const next = moveBandit(base, key);
    const flags = next.board.filter((t) => t.hasBandit);
    expect(flags).toHaveLength(1);
    expect(coordKey(flags[0]!.coord)).toBe(key);
  });
});
