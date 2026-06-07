import { useGame } from '../../state/game-context';
import { BuildingType, BUILDING_COSTS, coordKey } from '../../types/game';
import { canBuild, canUpgrade } from '../../game/rules';

/**
 * BuildPanel shows available buildings the human player can construct.
 * Lists buildings with costs and a build button for each valid option.
 */
export default function BuildPanel() {
  const { state, dispatch } = useGame();
  const human = state.players.human;
  const isHumanTurn = state.currentPlayer === 'human' && state.phase === 'playing';

  const currentPhase = state.turnPhase;
  const canAct = isHumanTurn && (currentPhase === 'build' || currentPhase === 'play');

  // Find buildable tiles (adjacent to existing human buildings)
  const buildableTiles = findBuildableTiles(state, 'human');

  // Group builds by tile
  const buildsByTile: Record<string, { tileKey: string; tileProvince: string; builds: { type: BuildingType; canAfford: boolean; vp: number }[] }> = {};

  for (const tileKey of buildableTiles) {
    const tile = state.board.find(t => coordKey(t.coord) === tileKey);
    const province = tile?.province || 'unknown';

    const builds: { type: BuildingType; canAfford: boolean; vp: number }[] = [];

    // New farm
    if (!tile?.building) {
      const cost = BUILDING_COSTS.farm;
      const canAfford = Object.entries(cost).every(
        ([res, amt]) => (human.resources[res as keyof typeof human.resources] || 0) >= amt,
      );
      builds.push({ type: 'farm', canAfford, vp: 0 });
    }

    // Upgrade
    if (tile?.building) {
      const upgrades: Record<string, BuildingType> = { farm: 'manor', manor: 'castle' };
      const upgradeTo = upgrades[tile.building.type];
      if (upgradeTo) {
        const cost = BUILDING_COSTS[upgradeTo];
        const canAfford = Object.entries(cost).every(
          ([res, amt]) => (human.resources[res as keyof typeof human.resources] || 0) >= amt,
        );
        builds.push({ type: upgradeTo, canAfford, vp: upgradeTo === 'castle' ? 2 : 1 });
      }
    }

    if (builds.length > 0) {
      buildsByTile[tileKey] = { tileKey, tileProvince: province, builds };
    }
  }

  function handleBuild(tileKey: string, building: BuildingType) {
    if (!canAct) return;
    const tile = state.board.find(t => coordKey(t.coord) === tileKey);

    if (tile?.building) {
      // Upgrade
      dispatch({ type: 'UPGRADE', player: 'human', tileKey, to: building });
    } else {
      // New build
      dispatch({ type: 'BUILD', player: 'human', tileKey, building });
    }

    // Deduct resources
    const cost = BUILDING_COSTS[building];
    const resourceDeduction: Record<string, number> = {};
    for (const [res, amt] of Object.entries(cost)) {
      resourceDeduction[res] = amt;
    }
    dispatch({ type: 'REMOVE_RESOURCES', player: 'human', resources: resourceDeduction });

    dispatch({ type: 'SET_TURN_PHASE', phase: 'roll' });
  }

  if (Object.keys(buildsByTile).length === 0 && !canAct) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Build</div>
      {Object.values(buildsByTile).map(({ tileKey, tileProvince, builds }) => (
        <div key={tileKey} style={styles.tileGroup}>
          <div style={styles.tileLabel}>
            {tileProvince} ({tileKey})
          </div>
          <div style={styles.buildsRow}>
            {builds.map(build => (
              <button
                key={build.type}
                style={{
                  ...styles.buildButton,
                  opacity: build.canAfford ? 1 : 0.4,
                }}
                onClick={() => build.canAfford && handleBuild(tileKey, build.type)}
                disabled={!build.canAfford}
              >
                <div style={styles.buildName}>
                  {build.type === 'farm' ? '🏡 Farm' : build.type === 'manor' ? '🏰 Manor' : '🏯 Castle'}
                  {build.vp > 0 && <span style={styles.vpBadge}>+{build.vp} VP</span>}
                </div>
                <div style={styles.costRow}>
                  {Object.entries(BUILDING_COSTS[build.type]).map(([res, amt]) => {
                    const have = human.resources[res as keyof typeof human.resources] || 0;
                    const color = have >= amt ? '#4caf50' : '#f44336';
                    return (
                      <span key={res} style={{ ...styles.costItem, color }}>
                        {res}: {have}/{amt}
                      </span>
                    );
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function findBuildableTiles(state: any, player: 'human' | 'ai'): string[] {
  const tiles: string[] = [];
  const playerTiles = state.board.filter(t => t.building?.owner === player);

  for (const playerTile of playerTiles) {
    const neighbors = getNeighbors(playerTile.coord);
    for (const n of neighbors) {
      const neighbor = state.board.find(t => t.coord.q === n.q && t.coord.r === n.r);
      if (neighbor && !neighbor.building) {
        const key = `${n.q},${n.r}`;
        if (!tiles.includes(key)) tiles.push(key);
      }
    }
  }

  return tiles;
}

function getNeighbors(coord: { q: number; r: number }): { q: number; r: number }[] {
  const dirs = [
    { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
    { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
  ];
  return dirs.map(d => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    border: '1px solid #333',
  },
  title: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#d4a543',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  tileGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tileLabel: {
    fontSize: '12px',
    color: '#999',
  },
  buildsRow: {
    display: 'flex',
    gap: '8px',
  },
  buildButton: {
    padding: '8px 12px',
    backgroundColor: '#2a2a3e',
    color: '#e8d5b5',
    border: '1px solid #444',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    minWidth: '140px',
  },
  buildName: {
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  vpBadge: {
    marginLeft: '8px',
    fontSize: '11px',
    color: '#4caf50',
  },
  costRow: {
    display: 'flex',
    gap: '8px',
    fontSize: '11px',
  },
  costItem: {
    fontSize: '11px',
  },
};
