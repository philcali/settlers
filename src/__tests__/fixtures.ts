import { GameState, PlayerId, HexTile, ProvinceType, BuildingType } from '../types/game';
import { createInitialState } from '../state/game-reducer';

export function createTile(
  q: number,
  r: number,
  province: ProvinceType,
  numberToken: number | null = null,
  building: HexTile['building'] = null,
  hasBandit: boolean = false,
): HexTile {
  return {
    coord: { q, r },
    province,
    numberToken,
    hasBandit,
    building,
  };
}

export function withBoard(state: GameState, tiles: HexTile[]): GameState {
  return { ...state, board: tiles };
}

export function withPlayerBuildings(
  state: GameState,
  player: PlayerId,
  builds: { tileKey: string; type: BuildingType }[],
): GameState {
  const board = state.board.map((tile) => {
    const key = `${tile.coord.q},${tile.coord.r}`;
    const build = builds.find((b) => b.tileKey === key);
    if (build) {
      return { ...tile, building: { type: build.type, owner: player } };
    }
    return tile;
  });
  return { ...state, board };
}

export function withResources(
  state: GameState,
  player: PlayerId,
  resources: Partial<Record<string, number>>,
): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [player]: {
        ...state.players[player],
        resources: { ...state.players[player].resources, ...resources },
      },
    },
  };
}

export function withPhase(state: GameState, phase: GameState['phase']): GameState {
  return { ...state, phase };
}

export function withTurnPhase(state: GameState, turnPhase: GameState['turnPhase']): GameState {
  return { ...state, turnPhase };
}

export function emptyBoard(): HexTile[] {
  return [
    createTile(0, 0, 'desert', null),
    createTile(1, 0, 'forest', 6),
    createTile(0, 1, 'farmland', 8),
    createTile(-1, 1, 'quarry', 5),
    createTile(-1, 0, 'mine', 4),
    createTile(0, -1, 'pasture', 10),
    createTile(1, -1, 'quarry', 3),
    createTile(2, -1, 'forest', 11),
    createTile(2, 0, 'farmland', 9),
    createTile(1, 1, 'mine', 6),
    createTile(0, 2, 'pasture', 5),
    createTile(-1, 2, 'forest', 4),
    createTile(-2, 1, 'farmland', 3),
    createTile(-2, 0, 'quarry', 10),
    createTile(-3, 0, 'pasture', 9),
    createTile(0, -2, 'mine', 2),
    createTile(1, -2, 'forest', 7),
    createTile(2, -2, 'farmland', 8),
    createTile(3, -2, 'pasture', 11),
  ];
}

export function fullPlayingState(): GameState {
  const base = createInitialState();
  return withPhase(withTurnPhase(withBoard(base, emptyBoard()), 'play'), 'playing');
}
