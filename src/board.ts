import type { Coord, Province, Tile } from './types';
import { coordKey, keyToCoord } from './types';

export const BOARD_RADIUS = 2;

const DIRECTIONS: Coord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function neighbors(c: Coord): Coord[] {
  return DIRECTIONS.map((d) => ({ q: c.q + d.q, r: c.r + d.r }));
}

/** All 19 coords of the radius-2 hex flower. */
export function allCoords(radius = BOARD_RADIUS): Coord[] {
  const out: Coord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      out.push({ q, r });
    }
  }
  return out;
}

// --- Hex geometry (pointy-top, axial) ---

export const HEX_SIZE = 56; // center to vertex, in px

export function hexToPixel(c: Coord, size = HEX_SIZE): { x: number; y: number } {
  return {
    x: size * Math.sqrt(3) * (c.q + c.r / 2),
    y: size * 1.5 * c.r,
  };
}

/** Points of a pointy-top hex centered at the origin, for <polygon>. */
export function hexPoints(size = HEX_SIZE): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(size * Math.cos(a)).toFixed(2)},${(size * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

// --- Board generation ---

const PROVINCE_POOL: Province[] = [
  'forest', 'forest', 'forest', 'forest',
  'farmland', 'farmland', 'farmland', 'farmland',
  'pasture', 'pasture', 'pasture', 'pasture',
  'quarry', 'quarry', 'quarry',
  'mine', 'mine', 'mine',
];

const NUMBER_POOL = [6, 6, 8, 8, 5, 5, 9, 9, 4, 4, 10, 10, 3, 3, 11, 11, 2, 12];

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasAdjacentHighNumbers(assignments: Map<string, number>): boolean {
  for (const [key, num] of assignments) {
    if (num !== 6 && num !== 8) continue;
    for (const n of neighbors(keyToCoord(key))) {
      const neighbor = assignments.get(coordKey(n));
      if (neighbor === 6 || neighbor === 8) return true;
    }
  }
  return false;
}

/**
 * Generate the 19-tile board: desert in the center, shuffled provinces, and
 * number tokens with no two 6s/8s adjacent. Pass `rng` for determinism in tests.
 */
export function generateBoard(rng: () => number = Math.random): Tile[] {
  const coords = allCoords();
  const center = coords.find((c) => c.q === 0 && c.r === 0)!;
  const rest = coords.filter((c) => !(c.q === 0 && c.r === 0));

  const provinces = shuffle(PROVINCE_POOL, rng);
  const tiles: Tile[] = rest.map((coord, i) => ({
    coord,
    province: provinces[i],
    numberToken: null,
    building: null,
    hasBandit: false,
  }));
  tiles.push({
    coord: center,
    province: 'desert',
    numberToken: null,
    building: null,
    hasBandit: false,
  });

  const nonDesert = tiles.filter((t) => t.province !== 'desert');
  let tokens = shuffle(NUMBER_POOL, rng);
  for (let attempt = 0; attempt < 100; attempt++) {
    const assign = new Map<string, number>();
    nonDesert.forEach((t, i) => assign.set(coordKey(t.coord), tokens[i]));
    if (!hasAdjacentHighNumbers(assign)) break;
    tokens = shuffle(NUMBER_POOL, rng);
  }
  nonDesert.forEach((t, i) => {
    t.numberToken = tokens[i];
  });

  return tiles;
}
