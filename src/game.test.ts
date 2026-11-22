import { describe, expect, it } from 'vitest';
import { createGame, reduce } from './game';
import { fullSetup } from './testutil';
import { checkWinner, robberTargets, victoryPoints } from './rules';
import { neighbors } from './board';
import type { Province } from './types';
import { coordKey, PROVINCE_RESOURCE } from './types';

describe('createGame', () => {
  const s = createGame(42);
  it('starts in setup with a fresh board, deck, and empty pockets', () => {
    expect(s.phase).toBe('setup');
    expect(s.board).toHaveLength(19);
    const banditTiles = s.board.filter((t) => t.hasBandit);
    expect(banditTiles).toHaveLength(1);
    expect(banditTiles[0]!.province).toBe('desert');
    expect(s.deck.cards).toHaveLength(92);
    expect(s.players.human.resources).toEqual({ wood: 0, stone: 0, grain: 0, ore: 0, livestock: 0 });
    expect(s.placementsLeft).toEqual({ human: 2, ai: 2 });
  });
});

describe('setup flow', () => {
  it('alternates placements, then grants starter resources and starting hands', () => {
    const s = fullSetup();
    expect(s.phase).toBe('playing');
    expect(s.currentPlayer).toBe('human');
    expect(s.board.filter((t) => t.building?.owner === 'human')).toHaveLength(2);
    expect(s.board.filter((t) => t.building?.owner === 'ai')).toHaveLength(2);
    expect(s.players.human.resources).toMatchObject({ wood: 2, stone: 1, grain: 1 });
    expect(s.players.ai.resources).toMatchObject({ wood: 2, stone: 1, grain: 1 });
    expect(s.players.human.hand).toHaveLength(2);
    expect(s.players.ai.hand).toHaveLength(2);
    expect(s.deck.cards).toHaveLength(88);
  });

  it('ignores invalid placements', () => {
    const s = createGame(3);
    const empty = s.board.find((t) => !t.building && t.province !== 'desert')!;
    const desert = s.board.find((t) => t.province === 'desert')!;
    expect(reduce(s, { type: 'PLACE_BUILDING', player: 'ai', tileKey: coordKey(empty.coord) })).toBe(s);
    expect(reduce(s, { type: 'PLACE_BUILDING', player: 'human', tileKey: coordKey(desert.coord) })).toBe(s);
    const placed = reduce(s, { type: 'PLACE_BUILDING', player: 'human', tileKey: coordKey(empty.coord) });
    expect(reduce(placed, { type: 'PLACE_BUILDING', player: 'ai', tileKey: coordKey(empty.coord) })).toBe(placed);
  });
});

describe('resources & building', () => {
  it('building pays the cost and requires a legal target', () => {
    const s = fullSetup();
    const humanFarms = s.board.filter((t) => t.building?.owner === 'human');
    const near = s.board.find(
      (t) => !t.building && humanFarms.some((f) => neighbors(f.coord).some((n) => coordKey(n) === coordKey(t.coord))),
    )!;
    const s2 = reduce(s, { type: 'BUILD', player: 'human', tileKey: coordKey(near.coord), building: 'farm' });
    expect(s2.players.human.resources).toMatchObject({ wood: 0, grain: 0 });
    expect(s2.board.find((t) => coordKey(t.coord) === coordKey(near.coord))!.building?.type).toBe('farm');
    expect(reduce(s2, { type: 'BUILD', player: 'human', tileKey: coordKey(near.coord), building: 'farm' })).toBe(s2);
  });

  it('upgrade path farm → manor → castle, gaining points', () => {
    let s = fullSetup();
    const farm = s.board.find((t) => t.building?.owner === 'human')!;
    const key = coordKey(farm.coord);
    s = reduce(s, { type: 'ADD_RESOURCES', player: 'human', resources: { stone: 3, ore: 2, grain: 2 } });
    s = reduce(s, { type: 'UPGRADE', player: 'human', tileKey: key, to: 'manor' });
    expect(s.board.find((t) => coordKey(t.coord) === key)!.building?.type).toBe('manor');
    expect(victoryPoints(s.board, 'human')).toBe(1);
    s = reduce(s, { type: 'ADD_RESOURCES', player: 'human', resources: { stone: 4, ore: 4, livestock: 3, grain: 3 } });
    s = reduce(s, { type: 'UPGRADE', player: 'human', tileKey: key, to: 'castle' });
    expect(s.board.find((t) => coordKey(t.coord) === key)!.building?.type).toBe('castle');
    expect(victoryPoints(s.board, 'human')).toBe(2);
  });

  it('ends the game at 10 victory points', () => {
    const s = fullSetup();
    const board = s.board.map((t, i) =>
      i < 5 ? { ...t, building: { type: 'castle' as const, owner: 'human' as const } } : t,
    );
    expect(checkWinner({ ...s, board })).toBe('human');
  });
});

describe('DRAW_CARDS', () => {
  it('moves cards from the deck into the hand', () => {
    const s = fullSetup();
    const s2 = reduce(s, { type: 'DRAW_CARDS', player: 'human', count: 4, seed: 1 });
    expect(s2.players.human.hand).toHaveLength(6); // 2 starting + 4 drawn
    expect(s2.deck.cards).toHaveLength(84); // 88 after setup - 4 drawn
  });
});

describe('ROLL_DICE', () => {
  it('sets the dice and pays producing tiles to their owners', () => {
    const s = fullSetup();
    const producing = s.board.filter((t) => t.building && t.numberToken !== null);
    expect(producing.length).toBeGreaterThan(0);
    const target = producing[0]!;
    const v = target.numberToken!;
    const res = PROVINCE_RESOURCE[target.province as Exclude<Province, 'desert'>];

    const s2 = reduce(s, { type: 'ROLL_DICE', value: v, individual: [1, v - 1], seed: 42 });
    expect(s2.dice).toEqual({ value: v, individual: [1, v - 1] });
    expect(s2.turnPhase).toBe('build');
    expect(s2.players[target.building!.owner].resources[res]).toBe(s.players[target.building!.owner].resources[res] + 1);

    // every other producing tile at the same value paid its owner too
    for (const t of s.board) {
      if (t === target || !t.building || t.numberToken !== v) continue;
      const r = PROVINCE_RESOURCE[t.province as Exclude<Province, 'desert'>];
      expect(s2.players[t.building.owner].resources[r]).toBe(s.players[t.building.owner].resources[r] + 1);
    }
  });

  it('only allows one roll per turn, and only while playing', () => {
    const s = fullSetup();
    const rolled = reduce(s, { type: 'ROLL_DICE', value: 7, individual: [3, 4], seed: 42 });
    expect(rolled).not.toBe(s);
    expect(reduce(rolled, { type: 'ROLL_DICE', value: 5, individual: [2, 3], seed: 43 })).toBe(rolled);
    const fresh = createGame(9);
    expect(reduce(fresh, { type: 'ROLL_DICE', value: 7, individual: [3, 4], seed: 42 })).toBe(fresh);
  });

  it('rolling 7 steals from the opponent, but the bandit waits to be placed', () => {
    const total = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + (b as number), 0);
    const s = fullSetup();
    const s2 = reduce(s, { type: 'ROLL_DICE', value: 7, individual: [3, 4], seed: 5 });

    expect(s2.dice).toEqual({ value: 7, individual: [3, 4] });
    expect(s2.turnPhase).toBe('build');
    expect(s2.robberPending).toBe('human');
    expect(s2.message).toMatch(/move the bandit/i);

    // the bandit has not moved yet
    expect(s2.board).toBe(s.board);

    // robber took exactly one resource, and nothing was produced
    expect(total(s2.players.human.resources)).toBe(total(s.players.human.resources) + 1);
    expect(total(s2.players.ai.resources)).toBe(total(s.players.ai.resources) - 1);
  });

  it('rolling 7 with little to steal still asks for a bandit placement', () => {
    const base = fullSetup();
    const s = {
      ...base,
      players: {
        ...base.players,
        ai: { ...base.players.ai, resources: { wood: 1, stone: 0, grain: 0, ore: 0, livestock: 0 } },
      },
    };
    const s2 = reduce(s, { type: 'ROLL_DICE', value: 7, individual: [6, 1], seed: 6 });
    expect(s2.robberPending).toBe('human');
    expect(s2.message).toMatch(/too little to steal/i);
    expect(s2.board).toBe(s.board);
    expect(s2.players.human.resources).toBe(s.players.human.resources);
  });
});

describe('MOVE_BANDIT', () => {
  const rolled7 = () => reduce(fullSetup(), { type: 'ROLL_DICE', value: 7, individual: [3, 4], seed: 5 });

  it('places the bandit on a legal tile and clears the pending flag', () => {
    const s = rolled7();
    const key = robberTargets(s, 'human')[0]!;
    const s2 = reduce(s, { type: 'MOVE_BANDIT', player: 'human', tileKey: key });
    expect(s2.robberPending).toBeNull();
    const bandit = s2.board.filter((t) => t.hasBandit);
    expect(bandit).toHaveLength(1);
    expect(coordKey(bandit[0]!.coord)).toBe(key);
    expect(bandit[0]!.building?.owner).toBe('ai');
    expect(s2.message).toMatch(/bandit/i);
  });

  it('rejects the wrong player, an illegal tile, and a missing pending robber', () => {
    const s = rolled7();
    const ownKey = coordKey(s.board.find((t) => t.building?.owner === 'human')!.coord);
    const aiKey = coordKey(s.board.find((t) => t.building?.owner === 'ai')!.coord);
    expect(reduce(s, { type: 'MOVE_BANDIT', player: 'human', tileKey: ownKey })).toBe(s); // own tile is illegal
    expect(reduce(s, { type: 'MOVE_BANDIT', player: 'ai', tileKey: aiKey })).toBe(s); // not the AI's pending
    const fresh = fullSetup();
    expect(reduce(fresh, { type: 'MOVE_BANDIT', player: 'human', tileKey: aiKey })).toBe(fresh); // nothing pending
  });

  it('the turn can still pass with the bandit unplaced: it is auto-dropped on a legal tile', () => {
    const s = rolled7();
    const s2 = reduce(s, { type: 'ADVANCE_TURN', seed: 9 });
    expect(s2.robberPending).toBeNull();
    const bandit = s2.board.find((t) => t.hasBandit)!;
    expect(robberTargets(s, 'human')).toContain(coordKey(bandit.coord));
    expect(s2.currentPlayer).toBe('ai');
  });
});

describe('ADVANCE_TURN', () => {
  it('swaps players, resets the dice, and counts rounds when back to human', () => {
    let s = fullSetup();
    s = reduce(s, { type: 'ROLL_DICE', value: 7, individual: [3, 4], seed: 42 });
    expect(s.currentPlayer).toBe('human');
    s = reduce(s, { type: 'ADVANCE_TURN', seed: 1 });
    expect(s.currentPlayer).toBe('ai');
    expect(s.dice.value).toBeNull();
    s = reduce(s, { type: 'ADVANCE_TURN', seed: 2 });
    expect(s.currentPlayer).toBe('human');
    expect(s.turnCount).toBe(2);
  });

  it('the new player draws one card when the turn advances', () => {
    const s = fullSetup();
    const s2 = reduce(s, { type: 'ADVANCE_TURN', seed: 11 });
    expect(s2.players.ai.hand).toHaveLength(s.players.ai.hand.length + 1);
    expect(s2.players.human.hand).toHaveLength(s.players.human.hand.length);
    expect(s2.deck.cards).toHaveLength(s.deck.cards.length - 1);
  });
});
