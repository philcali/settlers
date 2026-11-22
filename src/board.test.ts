import { describe, expect, it } from 'vitest';
import { allCoords, generateBoard, neighbors } from './board';
import { coordKey } from './types';
import { mulberry32 } from './rng';

describe('allCoords', () => {
  it('returns the 19-tile hex flower, all within radius 2', () => {
    const coords = allCoords();
    expect(coords).toHaveLength(19);
    expect(new Set(coords.map(coordKey)).size).toBe(19);
    expect(coords.some((c) => c.q === 0 && c.r === 0)).toBe(true);
    for (const c of coords) {
      expect(Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r))).toBeLessThanOrEqual(2);
    }
  });
});

describe('neighbors', () => {
  it('returns 6 unique neighbors, symmetric across the board', () => {
    for (const c of allCoords()) {
      const ns = neighbors(c);
      expect(ns).toHaveLength(6);
      expect(new Set(ns.map(coordKey)).size).toBe(6);
      for (const n of ns) {
        expect(Math.max(Math.abs(n.q), Math.abs(n.r), Math.abs(n.q + n.r))).toBeLessThanOrEqual(3);
        expect(neighbors(n).some((m) => coordKey(m) === coordKey(c))).toBe(true);
      }
    }
  });
});

describe('generateBoard', () => {
  it('places desert in the center and uses the full province pool', () => {
    const board = generateBoard(mulberry32(42));
    expect(board).toHaveLength(19);
    expect(board.find((t) => t.coord.q === 0 && t.coord.r === 0)?.province).toBe('desert');
    const counts = new Map<string, number>();
    for (const t of board) counts.set(t.province, (counts.get(t.province) ?? 0) + 1);
    expect(counts.get('forest')).toBe(4);
    expect(counts.get('farmland')).toBe(4);
    expect(counts.get('pasture')).toBe(4);
    expect(counts.get('quarry')).toBe(3);
    expect(counts.get('mine')).toBe(3);
    expect(counts.get('desert')).toBe(1);
  });

  it('gives every non-desert tile a number token, with no adjacent 6/8', () => {
    const board = generateBoard(mulberry32(7));
    const nonDesert = board.filter((t) => t.province !== 'desert');
    expect(nonDesert).toHaveLength(18);
    for (const t of nonDesert) expect(t.numberToken).not.toBeNull();

    const byKey = new Map(board.map((t) => [coordKey(t.coord), t]));
    for (const t of nonDesert) {
      if (t.numberToken !== 6 && t.numberToken !== 8) continue;
      for (const n of neighbors(t.coord)) {
        const neighbor = byKey.get(coordKey(n));
        if (!neighbor) continue; // off-board neighbor
        expect(neighbor.numberToken === 6 || neighbor.numberToken === 8).toBe(false);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    expect(generateBoard(mulberry32(123))).toEqual(generateBoard(mulberry32(123)));
  });
});
