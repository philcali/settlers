import { GameState, PlayerId, BuildingType, BUILDING_COSTS, BUILDING_POINTS, coordKey } from '../types/game';

export function canBuild(
  state: GameState,
  player: PlayerId,
  building: BuildingType,
): boolean {
  const playerState = state.players[player];
  const costs = BUILDING_COSTS[building];
  if (!costs) return false;

  // Must have an adjacent building (or be in setup)
  if (state.phase === 'setup') return true;

  const hasAdjacentBuilding = state.board.some(tile => {
    if (!tile.building || tile.building.owner !== player) return false;
    const neighbors = getAdjacentTiles(tile.coord, state.board);
    return neighbors.some(n => n.q === tile.coord.q && n.r === tile.coord.r);
  });

  // Actually: must have a building already (for non-setup)
  const hasAnyBuilding = state.board.some(tile => tile.building?.owner === player);
  if (!hasAnyBuilding) return false;

  // Check resources
  for (const [resource, cost] of Object.entries(costs)) {
    if ((playerState.resources[resource as keyof typeof playerState.resources] || 0) < cost) {
      return false;
    }
  }

  return true;
}

export function canUpgrade(
  state: GameState,
  player: PlayerId,
  tileKey: string,
  to: BuildingType,
): boolean {
  const tile = state.board.find(t => coordKey(t.coord) === tileKey);
  if (!tile || !tile.building || tile.building.owner !== player) return false;

  const validUpgrades: Record<BuildingType, BuildingType[]> = {
    farm: ['manor'],
    manor: ['castle'],
    castle: [],
  };

  if (!validUpgrades[tile.building.type].includes(to)) return false;
  return canBuild(state, player, to);
}

export function hasAdjacentBuilding(
  state: GameState,
  player: PlayerId,
  tileKey: string,
): boolean {
  if (state.phase === 'setup') return true;
  const tile = state.board.find(t => coordKey(t.coord) === tileKey);
  if (!tile) return false;

  const neighbors = getAdjacentTiles(tile.coord, state.board);
  return neighbors.some(n => {
    const neighbor = state.board.find(t => t.coord.q === n.q && t.coord.r === n.r);
    return neighbor?.building?.owner === player;
  });
}

function getAdjacentTiles(coord: { q: number; r: number }, board: GameState['board']): { q: number; r: number }[] {
  const dirs = [
    { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
    { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
  ];
  return dirs.map(d => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

export function getVictoryPoints(player: PlayerId, board: GameState['board']): number {
  let points = 0;
  for (const tile of board) {
    if (tile.building?.owner === player) {
      const pointsMap: Record<BuildingType, number> = { farm: 0, manor: 1, castle: 2 };
      points += pointsMap[tile.building.type] || 0;
    }
  }
  return points;
}

export function checkWinner(state: GameState): PlayerId | null {
  for (const id of ['human', 'ai'] as const) {
    const vp = getVictoryPoints(id, state.board);
    if (vp >= 10) return id;
  }
  return null;
}
