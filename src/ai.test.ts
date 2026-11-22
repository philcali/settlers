import { describe, expect, it } from 'vitest';
import { aiDecide, bestRobberTile, bestTile, pickAiCard, TOKEN_QUALITY } from './ai';
import { reduce } from './game';
import { fullSetup } from './testutil';
import { PRODUCTION, buildTargets, robberTargets } from './rules';
import type { Card, GameState } from './types';
import { coordKey } from './types';

const card = (subtype: string, type: Card['type'] = 'title'): Card => ({
  id: `test-${subtype}`,
  type,
  subtype,
});

const zeroed = (s: GameState): GameState => ({
  ...s,
  players: {
    ...s.players,
    ai: { ...s.players.ai, resources: { wood: 0, stone: 0, grain: 0, ore: 0, livestock: 0 } },
  },
});

const rich = (s: GameState): GameState => ({
  ...s,
  players: {
    ...s.players,
    ai: { ...s.players.ai, resources: { wood: 9, stone: 9, grain: 9, ore: 9, livestock: 9 } },
  },
});

const withAiHand = (s: GameState, hand: Card[]): GameState => ({
  ...s,
  players: { ...s.players, ai: { ...s.players.ai, hand } },
});

/** Ensure it is the AI's turn. */
const aiTurn = (s: GameState): GameState =>
  s.currentPlayer === 'ai' ? s : reduce(s, { type: 'ADVANCE_TURN', seed: 1 });

describe('aiDecide', () => {
  it('waits unless it is the AI\'s turn in play', () => {
    expect(aiDecide(fullSetup())).toBeNull(); // human's turn
    const setup = { ...fullSetup(), phase: 'setup' as const, currentPlayer: 'ai' as const };
    expect(aiDecide(setup)).toBeNull();
  });

  it('places the bandit after rolling 7, then ends its turn', () => {
    const s = reduce(aiTurn(fullSetup()), { type: 'ROLL_DICE', value: 7, individual: [3, 4], seed: 42 });
    const a = aiDecide(s);
    expect(a?.type).toBe('MOVE_BANDIT');
    if (a?.type !== 'MOVE_BANDIT') return;
    expect(a.player).toBe('ai');
    expect(robberTargets(s, 'ai')).toContain(a.tileKey);
    const s2 = reduce(s, a);
    expect(s2.robberPending).toBeNull();
    expect(aiDecide(s2)?.type).toBe('ADVANCE_TURN');
  });

  it('places the bandit on the human\'s most valuable tile', () => {
    const s = reduce(aiTurn(fullSetup()), { type: 'ROLL_DICE', value: 7, individual: [3, 4], seed: 42 });
    const a = aiDecide(s);
    if (a?.type !== 'MOVE_BANDIT') throw new Error('expected MOVE_BANDIT');
    const targets = robberTargets(s, 'ai');
    const score = (k: string) => {
      const t = s.board.find((x) => coordKey(x.coord) === k)!;
      return (t.numberToken !== null ? (TOKEN_QUALITY[t.numberToken] ?? 0) : 0) * PRODUCTION[t.building!.type];
    };
    expect(score(a.tileKey)).toBe(Math.max(...targets.map(score)));
  });

  it('builds a farm when it can afford one, on its best tile', () => {
    const s = aiTurn(fullSetup()); // starter bundle covers a farm
    const a = aiDecide(s);
    expect(a?.type).toBe('BUILD');
    if (a?.type !== 'BUILD') return;
    const targets = buildTargets(s, 'ai', 'farm');
    expect(targets).toContain(a.tileKey);
    const qualityOf = (k: string) => {
      const t = s.board.find((x) => coordKey(x.coord) === k)!;
      return t.numberToken !== null ? (TOKEN_QUALITY[t.numberToken] ?? 0) : 0;
    };
    expect(qualityOf(a.tileKey)).toBe(Math.max(...targets.map(qualityOf)));
  });

  it('prefers upgrading a farm to a manor over a new farm', () => {
    const a = aiDecide(rich(aiTurn(fullSetup())));
    expect(a?.type).toBe('UPGRADE');
    if (a?.type === 'UPGRADE') expect(a.to).toBe('manor');
  });

  it('prefers upgrading a manor to a castle over everything else', () => {
    let s = rich(aiTurn(fullSetup()));
    const farmKey = coordKey(s.board.find((t) => t.building?.owner === 'ai')!.coord);
    s = reduce(s, { type: 'UPGRADE', player: 'ai', tileKey: farmKey, to: 'manor' });
    const a = aiDecide(s);
    expect(a?.type).toBe('UPGRADE');
    if (a?.type === 'UPGRADE') expect(a.to).toBe('castle');
  });

  it('rolls when it can neither build nor play a card', () => {
    const s = withAiHand(zeroed(aiTurn(fullSetup())), [card('famine'), card('harvest-festival')]);
    expect(aiDecide(s)?.type).toBe('ROLL_DICE');
  });

  it('plays at most one card per turn', () => {
    const s = { ...withAiHand(zeroed(aiTurn(fullSetup())), [card('wood', 'resource')]), aiPlayedCard: true };
    expect(aiDecide(s)?.type).toBe('ROLL_DICE');
  });
});

describe('pickAiCard', () => {
  const base = zeroed(aiTurn(fullSetup()));

  it('stockpiles a resource card before anything else', () => {
    const s = withAiHand(base, [card('plague'), card('wood', 'resource')]);
    expect(pickAiCard(s)?.subtype).toBe('wood');
  });

  it('self-boosts with crusade / relic hunt when no resource card is in hand', () => {
    const s = withAiHand(base, [card('plague'), card('crusade'), card('relic-hunt')]);
    expect(['crusade', 'relic-hunt']).toContain(pickAiCard(s)?.subtype);
  });

  it('plagues the human only while they hold cards, then falls back to mercenary', () => {
    const s = withAiHand(base, [card('plague'), card('mercenary-company')]);
    expect(pickAiCard(s)?.subtype).toBe('plague'); // human holds 2 cards at setup
    const brokeHuman = { ...s, players: { ...s.players, human: { ...s.players.human, hand: [] } } };
    expect(pickAiCard(brokeHuman)?.subtype).toBe('mercenary-company');
  });

  it('leaves cards alone that help the human or that the AI cannot see', () => {
    const s = withAiHand(base, [card('harvest-festival'), card('famine'), card('spy-network')]);
    expect(pickAiCard(s)).toBeNull();
  });
});

describe('bestRobberTile', () => {
  it('blocks the opponent tile worth the most: token frequency × building output', () => {
    const s: GameState = {
      ...fullSetup(),
      board: [
        { coord: { q: 0, r: 0 }, province: 'forest', numberToken: 6, building: { type: 'farm', owner: 'human' }, hasBandit: false },
        { coord: { q: 1, r: 0 }, province: 'farmland', numberToken: 4, building: { type: 'manor', owner: 'human' }, hasBandit: false },
        { coord: { q: 2, r: 0 }, province: 'mine', numberToken: 2, building: { type: 'castle', owner: 'human' }, hasBandit: false },
      ],
    };
    // farm@6 → 5×1=5, manor@4 → 3×2=6, castle@2 → 1×3=3
    expect(bestRobberTile(s, ['0,0', '1,0', '2,0'])).toBe('1,0');
    expect(bestRobberTile(s, ['0,0', '2,0'])).toBe('0,0');
  });
});

describe('bestTile', () => {
  it('picks the most frequent token: 6/8 beat 5/9, 2/12 is worst', () => {
    const s: GameState = {
      ...fullSetup(),
      board: [
        { coord: { q: 0, r: 0 }, province: 'forest', numberToken: 2, building: null, hasBandit: false },
        { coord: { q: 1, r: 0 }, province: 'farmland', numberToken: 6, building: null, hasBandit: false },
        { coord: { q: 2, r: 0 }, province: 'mine', numberToken: 9, building: null, hasBandit: false },
      ],
    };
    expect(bestTile(s, ['0,0', '1,0', '2,0'])).toBe('1,0');
    expect(bestTile(s, ['0,0', '2,0'])).toBe('2,0');
  });
});
