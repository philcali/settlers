import { describe, it, expect } from 'vitest';
import { canBuild, canUpgrade, hasAdjacentBuilding, getVictoryPoints, checkWinner } from './rules';
import { createTile, withBoard, withPlayerBuildings, withResources, withPhase, withTurnPhase, fullPlayingState } from '../__tests__/fixtures';
import { BuildingType, GameState, PlayerId } from '../types/game';

// Helper to create a simple board with one player's buildings
function makeBoardWithBuildings(
  player: PlayerId,
  builds: { q: number; r: number; type: BuildingType }[],
): GameState {
  const state = fullPlayingState();
  const tiles = state.board.map((t) => {
    const build = builds.find((b) => b.q === t.coord.q && b.r === t.coord.r);
    if (build) {
      return { ...t, building: { type: build.type, owner: player } };
    }
    return t;
  });
  return { ...state, board: tiles };
}

describe('canBuild', () => {
  it('returns true in setup phase regardless of adjacency', () => {
    const state = withPhase(fullPlayingState(), 'setup');
    expect(canBuild(state, 'human', 'farm')).toBe(true);
  });

  it('returns false when player has no buildings at all', () => {
    const state = fullPlayingState();
    expect(canBuild(state, 'human', 'farm')).toBe(false);
  });

  it('returns true when player has a building and resources', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'farm' },
    ]);
    // canBuild checks: has any building + has resources. Adjacency is checked by hasAdjacentBuilding.
    const stateWithResources = withResources(state, 'human', { wood: 2, grain: 1 });
    expect(canBuild(stateWithResources, 'human', 'farm')).toBe(true);
  });

  it('returns false when player has a building but no resources', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'farm' },
    ]);
    // No resources = can't build anything
    expect(canBuild(state, 'human', 'farm')).toBe(false);
  });

  it('returns false when player lacks required resources for manor', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'farm' },
    ]);
    const stateWithResources = withResources(state, 'human', { wood: 2, grain: 1 });
    // Manor costs 3 stone + 2 ore + 2 grain — player only has wood/grain
    expect(canBuild(stateWithResources, 'human', 'manor')).toBe(false);
  });

  it('returns true when player has resources and buildings for manor', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'farm' },
    ]);
    const stateWithResources = withResources(state, 'human', {
      stone: 3, ore: 2, grain: 2,
    });
    expect(canBuild(stateWithResources, 'human', 'manor')).toBe(true);
  });
});

describe('canUpgrade', () => {
  it('returns false when tile has no building', () => {
    const state = fullPlayingState();
    expect(canUpgrade(state, 'human', '1,0', 'manor')).toBe(false);
  });

  it('returns false when tile building belongs to another player', () => {
    const state = makeBoardWithBuildings('ai', [
      { q: 1, r: 0, type: 'farm' },
    ]);
    expect(canUpgrade(state, 'human', '1,0', 'manor')).toBe(false);
  });

  it('returns false for invalid upgrade path (farm -> castle)', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'farm' },
    ]);
    const stateWithResources = withResources(state, 'human', {
      wood: 2, grain: 1, stone: 3, ore: 2, grain: 2,
    });
    // castle costs 4 stone + 4 ore + 3 livestock + 3 grain
    const stateWithCastleResources = withResources(state, 'human', {
      stone: 4, ore: 4, livestock: 3, grain: 3,
    });
    // Can't upgrade farm directly to castle
    expect(canUpgrade(stateWithCastleResources, 'human', '1,0', 'castle')).toBe(false);
  });

  it('returns true for valid upgrade path (farm -> manor) with resources', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'farm' },
    ]);
    const stateWithResources = withResources(state, 'human', {
      stone: 3, ore: 2, grain: 2,
    });
    expect(canUpgrade(stateWithResources, 'human', '1,0', 'manor')).toBe(true);
  });

  it('returns true for valid upgrade path (manor -> castle) with resources', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'manor' },
    ]);
    const stateWithResources = withResources(state, 'human', {
      stone: 4, ore: 4, livestock: 3, grain: 3,
    });
    expect(canUpgrade(stateWithResources, 'human', '1,0', 'castle')).toBe(true);
  });

  it('returns false when player has no resources for upgrade', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'manor' },
    ]);
    expect(canUpgrade(state, 'human', '1,0', 'castle')).toBe(false);
  });
});

describe('hasAdjacentBuilding', () => {
  it('returns true in setup phase', () => {
    const state = withPhase(fullPlayingState(), 'setup');
    expect(hasAdjacentBuilding(state, 'human', '1,0')).toBe(true);
  });

  it('returns false when tile has no neighbors with player building', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'farm' },
    ]);
    // Tile (-2, 1) is not adjacent to (1, 0)
    expect(hasAdjacentBuilding(state, 'human', '-2,1')).toBe(false);
  });

  it('returns true when tile is adjacent to player building', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'farm' },
    ]);
    // Tile (2, 0) is adjacent to (1, 0)
    expect(hasAdjacentBuilding(state, 'human', '2,0')).toBe(true);
  });

  it('returns true when any neighbor has player building', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 0, r: -1, type: 'farm' },
    ]);
    // Tile (0, 0) is adjacent to (0, -1)
    expect(hasAdjacentBuilding(state, 'human', '0,0')).toBe(true);
  });
});

describe('getVictoryPoints', () => {
  it('returns 0 when player has no buildings', () => {
    const state = fullPlayingState();
    expect(getVictoryPoints('human', state.board)).toBe(0);
  });

  it('returns correct VP for farms (0 VP each)', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'farm' },
      { q: 0, r: 1, type: 'farm' },
    ]);
    expect(getVictoryPoints('human', state.board)).toBe(0);
  });

  it('returns correct VP for manors (1 VP each)', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'manor' },
    ]);
    expect(getVictoryPoints('human', state.board)).toBe(1);
  });

  it('returns correct VP for castles (2 VP each)', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'castle' },
    ]);
    expect(getVictoryPoints('human', state.board)).toBe(2);
  });

  it('returns correct VP for mixed buildings', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'farm' },
      { q: 0, r: 1, type: 'manor' },
      { q: -1, r: 1, type: 'castle' },
    ]);
    expect(getVictoryPoints('human', state.board)).toBe(3); // 0 + 1 + 2
  });
});

describe('checkWinner', () => {
  it('returns null when no player has 10+ VP', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'manor' },
    ]);
    expect(checkWinner(state)).toBeNull();
  });

  it('returns human when human reaches 10 VP', () => {
    const state = makeBoardWithBuildings('human', [
      { q: 1, r: 0, type: 'castle' },
      { q: 0, r: 1, type: 'castle' },
      { q: -1, r: 1, type: 'castle' },
      { q: -1, r: 0, type: 'castle' },
      { q: 0, r: -1, type: 'castle' },
      { q: 1, r: -1, type: 'castle' },
      { q: 1, r: 0, type: 'manor' },
    ]);
    // 6 castles = 12 VP
    expect(checkWinner(state)).toBe('human');
  });

  it('returns ai when ai reaches 10 VP', () => {
    const state = makeBoardWithBuildings('ai', [
      { q: 1, r: 0, type: 'castle' },
      { q: 0, r: 1, type: 'castle' },
      { q: -1, r: 1, type: 'castle' },
      { q: -1, r: 0, type: 'castle' },
      { q: 0, r: -1, type: 'castle' },
      { q: 1, r: -1, type: 'castle' },
      { q: 1, r: 0, type: 'manor' },
    ]);
    expect(checkWinner(state)).toBe('ai');
  });
});
