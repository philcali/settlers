import type { BuildingType, GameState, PlayerId, PlayerState, Province, Resource, Tile } from './types';
import { BUILDING_COSTS, BUILDING_POINTS, PROVINCE_RESOURCE, RESOURCES, VICTORY_POINTS, coordKey } from './types';
import { neighbors } from './board';

/** How many of the tile's resource a building of each tier produces per matching roll. */
export const PRODUCTION: Record<BuildingType, number> = { farm: 1, manor: 2, castle: 3 };

/** Resources produced by a roll: each built, unblocked tile matching the value pays its owner. */
export function rollYields(board: Tile[], value: number): Record<PlayerId, Partial<Record<Resource, number>>> {
  const gains: Record<PlayerId, Partial<Record<Resource, number>>> = { human: {}, ai: {} };
  for (const t of board) {
    if (t.numberToken !== value || !t.building || t.hasBandit || t.province === 'desert') continue;
    const res = PROVINCE_RESOURCE[t.province as Exclude<Province, 'desert'>];
    const owner = gains[t.building.owner];
    owner[res] = (owner[res] ?? 0) + PRODUCTION[t.building.type];
  }
  return gains;
}

/**
 * Roll-7 robber, step 1: steal 1 random resource the opponent holds (only if they hold
 * at least 2 in total, so the bandit never strips a player to zero).
 * The bandit itself does not move here — the roller places it via MOVE_BANDIT.
 */
export function robberSteal(state: GameState, roller: PlayerId, rng: () => number): { next: GameState; stole: Resource | null } {
  const opp: PlayerId = roller === 'human' ? 'ai' : 'human';
  const oppResources = state.players[opp].resources;
  const oppTotal = RESOURCES.reduce((n, r) => n + oppResources[r], 0);

  if (oppTotal < 2) return { next: { ...state }, stole: null };

  const held = RESOURCES.filter((r) => oppResources[r] > 0);
  const stole = held[Math.floor(rng() * held.length)]!;
  const players = {
    ...state.players,
    [opp]: { ...state.players[opp], resources: { ...oppResources, [stole]: oppResources[stole] - 1 } },
    [roller]: {
      ...state.players[roller],
      resources: { ...state.players[roller].resources, [stole]: state.players[roller].resources[stole] + 1 },
    },
  };
  return { next: { ...state, players }, stole };
}

/** Tile keys a 7-roller may move the bandit to: the opponent's tiles, or empty non-desert tiles if they have no buildings. */
export function robberTargets(state: GameState, player: PlayerId): string[] {
  const opp: PlayerId = player === 'human' ? 'ai' : 'human';
  const oppTiles = state.board.filter((t) => t.building?.owner === opp);
  const pool = oppTiles.length > 0 ? oppTiles : state.board.filter((t) => !t.building && t.province !== 'desert');
  return pool.map((t) => coordKey(t.coord));
}

/** Move the bandit onto a tile (validate the key against robberTargets first). */
export function moveBandit(state: GameState, tileKey: string): GameState {
  const board = state.board.map((t) => (coordKey(t.coord) === tileKey ? { ...t, hasBandit: true } : { ...t, hasBandit: false }));
  return { ...state, board };
}

export function canAfford(player: PlayerState, building: BuildingType): boolean {
  const cost = BUILDING_COSTS[building];
  return (Object.entries(cost) as [Resource, number][]).every(([res, n]) => player.resources[res] >= n);
}

export function isAdjacent(a: Tile['coord'], b: Tile['coord']): boolean {
  return neighbors(a).some((n) => n.q === b.q && n.r === b.r);
}

export function victoryPoints(board: Tile[], player: PlayerId): number {
  let sum = 0;
  for (const t of board) {
    if (t.building?.owner === player) sum += BUILDING_POINTS[t.building.type];
  }
  return sum;
}

export function checkWinner(state: GameState): PlayerId | null {
  for (const id of ['human', 'ai'] as const) {
    if (victoryPoints(state.board, id) >= VICTORY_POINTS) return id;
  }
  return null;
}

export function canBuild(state: GameState, player: PlayerId, tileKey: string, building: BuildingType): boolean {
  if (state.phase !== 'playing') return false;
  const tile = state.board.find((t) => coordKey(t.coord) === tileKey);
  if (!tile || tile.building || tile.province === 'desert') return false;
  if (!canAfford(state.players[player], building)) return false;
  // Must expand from your existing settlements
  return state.board.some((t) => t.building?.owner === player && isAdjacent(t.coord, tile.coord));
}

const NEXT_BUILDING: Record<BuildingType, BuildingType | null> = {
  farm: 'manor',
  manor: 'castle',
  castle: null,
};

/** Tile keys where `player` could legally perform the given build/upgrade right now. */
export function buildTargets(state: GameState, player: PlayerId, mode: BuildingType): string[] {
  if (state.phase !== 'playing') return [];
  return state.board
    .filter((t) =>
      mode === 'farm'
        ? canBuild(state, player, coordKey(t.coord), 'farm')
        : canUpgrade(state, player, coordKey(t.coord), mode),
    )
    .map((t) => coordKey(t.coord));
}

export function canUpgrade(state: GameState, player: PlayerId, tileKey: string, to: BuildingType): boolean {
  if (state.phase !== 'playing') return false;
  const tile = state.board.find((t) => coordKey(t.coord) === tileKey);
  if (!tile?.building || tile.building.owner !== player) return false;
  if (NEXT_BUILDING[tile.building.type] !== to) return false;
  return canAfford(state.players[player], to);
}
