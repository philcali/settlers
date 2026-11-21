import { HexCoord, HexTile, ProvinceType } from '../types/game';

// --- 19-tile flower pattern (flat-top axial coords) ---
// Constraint: max(|q|, |r|, |q+r|) <= 2

export const FLAT_TOP_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },   // east
  { q: 0, r: 1 },   // south-east
  { q: -1, r: 1 },  // south-west
  { q: -1, r: 0 },  // west
  { q: 0, r: -1 },  // north-west
  { q: 1, r: -1 },  // north-east
];

export function getNeighbors(coord: HexCoord): HexCoord[] {
  return FLAT_TOP_DIRECTIONS.map(d => ({
    q: coord.q + d.q,
    r: coord.r + d.r,
  }));
}

export function isValidTile(coord: HexCoord): boolean {
  const { q, r } = coord;
  return Math.abs(q) <= 2 && Math.abs(r) <= 2 && Math.abs(q + r) <= 2;
}

export function getAllTiles(): HexCoord[] {
  const tiles: HexCoord[] = [];
  // Iterate a bounding box and filter
  for (let q = -3; q <= 3; q++) {
    for (let r = -3; r <= 3; r++) {
      if (isValidTile({ q, r })) {
        tiles.push({ q, r });
      }
    }
  }
  return tiles;
}

// --- Screen coordinate conversion ---

export const HEX_SIZE = 64; // pixels

export function hexToScreen(coord: HexCoord, boardCenter: { x: number; y: number }): { x: number; y: number } {
  const { q, r } = coord;
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * (3 / 2) * r;
  return {
    x: x + boardCenter.x,
    y: y + boardCenter.y,
  };
}

export function screenToHex(x: number, y: number, boardCenter: { x: number; y: number }): HexCoord {
  const fx = x - boardCenter.x;
  const fy = y - boardCenter.y;
  const q = (Math.sqrt(3) / 3 * fx + y / 3) / HEX_SIZE;
  const r = (2 / 3 * fy) / HEX_SIZE;
  return roundHex({ q: Math.round(q), r: Math.round(r) });
}

function roundHex(coord: { q: number; r: number }): HexCoord {
  const s = -coord.q - coord.r;
  const rq = Math.round(coord.q);
  const rr = Math.round(coord.r);
  const rs = Math.round(s);

  const qDiff = Math.abs(rq - coord.q);
  const rDiff = Math.abs(rr - coord.r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    return { q: -rr - rs, r: rr };
  } else if (rDiff > sDiff) {
    return { q: rq, r: -rq - rs };
  } else {
    return { q: -rs - rq, r: rs };
  }
}

// --- Province assignment ---

const PROVINCE_POOL: ProvinceType[] = [
  'forest', 'forest', 'forest', 'forest',
  'quarry', 'quarry', 'quarry',
  'farmland', 'farmland', 'farmland', 'farmland',
  'mine', 'mine', 'mine',
  'pasture', 'pasture', 'pasture', 'pasture',
  'desert',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function assignProvinces(tiles: HexCoord[]): HexTile[] {
  // Desert always goes to center (0,0)
  const shuffled = shuffle(PROVINCE_POOL.filter(p => p !== 'desert'));
  const nonDesertTiles = tiles.filter(t => t.q !== 0 || t.r !== 0);
  const desertTiles = tiles.filter(t => t.q === 0 && t.r === 0);

  const tilesWithProvince: HexTile[] = [];

  // Assign desert
  if (desertTiles.length > 0) {
    tilesWithProvince.push({
      coord: desertTiles[0],
      province: 'desert',
      numberToken: null,
      hasBandit: false,
      building: null,
    });
  }

  // Assign other provinces
  for (let i = 0; i < nonDesertTiles.length; i++) {
    tilesWithProvince.push({
      coord: nonDesertTiles[i],
      province: shuffled[i],
      numberToken: null, // set by assignNumberTokens
      hasBandit: false,
      building: null,
    });
  }

  return tilesWithProvince;
}

// --- Number token assignment ---

// Catan probability distribution: 2(1), 3(2), 4(2), 5(2), 6(2), 8(2), 9(2), 10(2), 11(2), 12(1)
const NUMBER_POOL = [
  6, 6, 8, 8,
  5, 5, 9, 9,
  4, 4, 10, 10,
  3, 3, 11, 11,
  2, 12,
];

export function assignNumberTokens(tiles: HexTile[]): HexTile[] {
  const shuffled = shuffle(NUMBER_POOL);
  const nonDesert = tiles.filter(t => t.province !== 'desert');

  // Check for adjacent high numbers (6, 8) — if found, reshuffle
  let attempts = 0;
  while (attempts < 50) {
    const testTiles = nonDesert.map((t, i) => ({ ...t, numberToken: shuffled[i] }));
    if (!hasAdjacentHighNumbers(testTiles)) break;
    // Reshuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    attempts++;
  }

  return nonDesert.map((t, i) => ({ ...t, numberToken: shuffled[i] }));
}

function hasAdjacentHighNumbers(tiles: HexTile[]): boolean {
  const highTiles = tiles.filter(t => t.numberToken !== null && (t.numberToken === 6 || t.numberToken === 8));
  for (const tile of highTiles) {
    const neighbors = getNeighbors(tile.coord);
    for (const n of neighbors) {
      const neighbor = tiles.find(t => t.coord.q === n.q && t.coord.r === n.r);
      if (neighbor && neighbor.numberToken !== null && (neighbor.numberToken === 6 || neighbor.numberToken === 8)) {
        return true;
      }
    }
  }
  return false;
}
