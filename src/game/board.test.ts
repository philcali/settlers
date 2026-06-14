import { describe, it, expect } from 'vitest';
import {
  isValidTile,
  getAllTiles,
  getNeighbors,
  assignProvinces,
  assignNumberTokens,
  HEX_SIZE,
} from './board';
import { ProvinceType } from '../types/game';

describe('isValidTile', () => {
  it('accepts center tile', () => {
    expect(isValidTile({ q: 0, r: 0 })).toBe(true);
  });

  it('accepts adjacent tiles', () => {
    expect(isValidTile({ q: 1, r: 0 })).toBe(true);
    expect(isValidTile({ q: 0, r: 1 })).toBe(true);
    expect(isValidTile({ q: -1, r: 1 })).toBe(true);
    expect(isValidTile({ q: -1, r: 0 })).toBe(true);
    expect(isValidTile({ q: 0, r: -1 })).toBe(true);
    expect(isValidTile({ q: 1, r: -1 })).toBe(true);
  });

  it('accepts edge tiles', () => {
    expect(isValidTile({ q: 2, r: 0 })).toBe(true);
    expect(isValidTile({ q: 0, r: 2 })).toBe(true);
    expect(isValidTile({ q: -2, r: 0 })).toBe(true);
    expect(isValidTile({ q: 0, r: -2 })).toBe(true);
    expect(isValidTile({ q: 2, r: -2 })).toBe(true);
    expect(isValidTile({ q: -2, r: 2 })).toBe(true);
  });

  it('rejects out-of-bounds tiles', () => {
    expect(isValidTile({ q: 3, r: 0 })).toBe(false);
    expect(isValidTile({ q: 0, r: 3 })).toBe(false);
    expect(isValidTile({ q: -3, r: 0 })).toBe(false);
    expect(isValidTile({ q: 0, r: -3 })).toBe(false);
    expect(isValidTile({ q: 2, r: 2 })).toBe(false);
    expect(isValidTile({ q: -2, r: -2 })).toBe(false);
  });
});

describe('getAllTiles', () => {
  it('returns exactly 19 tiles', () => {
    expect(getAllTiles()).toHaveLength(19);
  });

  it('includes the center tile', () => {
    const tiles = getAllTiles();
    expect(tiles.some((t) => t.q === 0 && t.r === 0)).toBe(true);
  });

  it('all tiles are valid', () => {
    const tiles = getAllTiles();
    expect(tiles.every(isValidTile)).toBe(true);
  });

  it('all tiles are unique', () => {
    const tiles = getAllTiles();
    const keys = new Set(tiles.map((t) => `${t.q},${t.r}`));
    expect(keys.size).toBe(19);
  });
});

describe('getNeighbors', () => {
  it('returns 6 neighbors for any tile', () => {
    expect(getNeighbors({ q: 0, r: 0 })).toHaveLength(6);
    expect(getNeighbors({ q: 1, r: 0 })).toHaveLength(6);
  });

  it('returns symmetric adjacency', () => {
    const a = { q: 1, r: 0 };
    const b = { q: 2, r: 0 };
    const neighborsA = getNeighbors(a);
    const neighborsB = getNeighbors(b);
    // a is neighbor of b iff b is neighbor of a
    expect(neighborsA.some((n) => n.q === b.q && n.r === b.r)).toBe(true);
    expect(neighborsB.some((n) => n.q === a.q && n.r === a.r)).toBe(true);
  });
});

describe('assignProvinces', () => {
  it('assigns desert to center tile', () => {
    const tiles = getAllTiles(); // HexCoord[]
    const result = assignProvinces(tiles);
    const desert = result.find((t) => t.province === 'desert');
    expect(desert?.coord.q).toBe(0);
    expect(desert?.coord.r).toBe(0);
  });

  it('assigns exactly one desert', () => {
    const tiles = getAllTiles();
    const result = assignProvinces(tiles);
    const desertCount = result.filter((t) => t.province === 'desert').length;
    expect(desertCount).toBe(1);
  });

  it('assigns correct province counts', () => {
    const tiles = getAllTiles();
    const result = assignProvinces(tiles);
    const counts: Record<string, number> = {};
    for (const t of result) {
      counts[t.province] = (counts[t.province] || 0) + 1;
    }
    expect(counts['forest']).toBe(4);
    expect(counts['quarry']).toBe(3);
    expect(counts['farmland']).toBe(4);
    expect(counts['mine']).toBe(3);
    expect(counts['pasture']).toBe(4);
    expect(counts['desert']).toBe(1);
  });

  it('assigns no number tokens (those come later)', () => {
    const tiles = getAllTiles().map((t) => ({ coord: t } as { coord: { q: number; r: number } }));
    const result = assignProvinces(tiles);
    expect(result.every((t) => t.numberToken === null)).toBe(true);
  });
});

describe('assignNumberTokens', () => {
  it('assigns tokens to non-desert tiles', () => {
    const tiles: { coord: { q: number; r: number }; province: ProvinceType; numberToken: null; hasBandit: boolean; building: null }[] =
      getAllTiles().map((t) => ({
        coord: t,
        province: t.q === 0 && t.r === 0 ? 'desert' : 'forest',
        numberToken: null,
        hasBandit: false,
        building: null,
      }));
    const result = assignNumberTokens(tiles);
    const desert = result.find((t) => t.province === 'desert');
    const nonDesert = result.filter((t) => t.province !== 'desert');
    // assignNumberTokens returns only non-desert tiles
    expect(nonDesert.every((t) => t.numberToken !== null)).toBe(true);
    expect(nonDesert.length).toBe(18);
  });

  it('uses correct token distribution', () => {
    const tiles = getAllTiles().map((t) => ({
      coord: t,
      province: t.q === 0 && t.r === 0 ? 'desert' : 'forest' as ProvinceType,
      numberToken: null,
      hasBandit: false,
      building: null,
    }));
    const result = assignNumberTokens(tiles);
    const values = result
      .filter((t) => t.numberToken !== null)
      .map((t) => t.numberToken!);
    values.sort((a, b) => a - b);
    // Expected distribution: 2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12
    const expected = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
    expect(values).toEqual(expected);
  });

  it('avoids adjacent 6s and 8s', () => {
    // Run multiple times to account for retry logic (up to 50 attempts)
    for (let i = 0; i < 20; i++) {
      const tiles: { coord: { q: number; r: number }; province: ProvinceType; numberToken: null; hasBandit: boolean; building: null }[] =
        getAllTiles().map((t) => ({
          coord: t,
          province: t.q === 0 && t.r === 0 ? 'desert' : 'forest',
          numberToken: null,
          hasBandit: false,
          building: null,
        }));
      const result = assignNumberTokens(tiles);
      const highTiles = result.filter(
        (t) => t.numberToken !== null && (t.numberToken === 6 || t.numberToken === 8),
      );
      for (const tile of highTiles) {
        const neighbors = getNeighbors(tile.coord);
        for (const n of neighbors) {
          const neighbor = result.find((t) => t.coord.q === n.q && t.coord.r === n.r);
          if (neighbor && neighbor.numberToken !== null) {
            expect(neighbor.numberToken).not.toBe(6);
            expect(neighbor.numberToken).not.toBe(8);
          }
        }
      }
    }
  });
});

describe('HEX_SIZE', () => {
  it('is a positive number', () => {
    expect(HEX_SIZE).toBeGreaterThan(0);
  });
});
