import { useGame } from '../../state/game-context';
import { PlayerState, ResourceType } from '../../types/game';

/**
 * Scoreboard shows both players' resources and VP in a side panel.
 */
export default function Scoreboard() {
  const { state } = useGame();
  const { players, board } = state;

  const humanVP = getVP('human', board);
  const aiVP = getVP('ai', board);

  return (
    <div style={styles.container}>
      <div style={styles.playerPanel}>
        <div style={{ ...styles.playerName, color: '#4a90d9' }}>
          You ({players.human.name})
        </div>
        <div style={styles.vpRow}>
          <span style={styles.vpLabel}>VP:</span>
          <span style={styles.vpValue}>{humanVP}/10</span>
        </div>
        <div style={styles.resources}>
          {Object.entries(players.human.resources).map(([resource, count]) => (
            <ResourceRow key={resource} resource={resource} count={count} />
          ))}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.playerPanel}>
        <div style={{ ...styles.playerName, color: '#d94a4a' }}>
          AI ({players.ai.name})
        </div>
        <div style={styles.vpRow}>
          <span style={styles.vpLabel}>VP:</span>
          <span style={styles.vpValue}>{aiVP}/10</span>
        </div>
        <div style={styles.resources}>
          {Object.entries(players.ai.resources).map(([resource, count]) => (
            <ResourceRow key={resource} resource={resource} count={count} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourceRow({ resource, count }: { resource: string; count: number }) {
  const icon: Record<string, string> = {
    wood: '🌲', stone: '⬡', grain: '🌾', ore: '⚒', livestock: '🐄',
  };
  return (
    <div style={styles.resourceRow}>
      <span>{icon[resource] || '·'}</span>
      <span style={styles.resourceCount}>{count}</span>
    </div>
  );
}

function getVP(player: 'human' | 'ai', board: any): number {
  let vp = 0;
  for (const tile of board) {
    if (tile.building?.owner === player) {
      if (tile.building.type === 'manor') vp += 1;
      if (tile.building.type === 'castle') vp += 2;
    }
  }
  return vp;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '24px',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    border: '1px solid #333',
  },
  playerPanel: {
    flex: 1,
  },
  playerName: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  vpRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  vpLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#d4a543',
  },
  vpValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4caf50',
  },
  resources: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  resourceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#ccc',
  },
  resourceCount: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
  },
  divider: {
    width: '1px',
    backgroundColor: '#333',
  },
};
