import { useGame } from '../../state/game-context';
import { getVictoryPoints, checkWinner } from '../../game/rules';

/**
 * StatusBar shows the top bar with:
 * - Current player indicator
 * - Turn phase
 * - Turn count
 * - Victory point summary
 */
export default function StatusBar() {
  const { state } = useGame();
  const { phase, turnPhase, currentPlayer, turnCount, players, message } = state;

  const phaseLabels: Record<string, string> = {
    draw: 'Draw',
    play: 'Play Card',
    build: 'Build',
    roll: 'Roll Dice',
  };

  const humanVP = getVictoryPoints('human', state.board);
  const aiVP = getVictoryPoints('ai', state.board);
  const winner = checkWinner(state);

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <span style={styles.title}>Settlers of the Realm</span>
        <span style={styles.turnInfo}>Turn {turnCount}</span>
      </div>

      <div style={styles.center}>
        {phase === 'setup' ? (
          <span style={styles.phaseLabel}>
            {currentPlayer === 'human' ? '🏰 Place your castle' : 'AI placing...'}
          </span>
        ) : winner ? (
          <span style={{ ...styles.phaseLabel, color: winner === 'human' ? '#4caf50' : '#f44336' }}>
            {winner === 'human' ? '🎉 You Win!' : '💀 AI Wins!'}
          </span>
        ) : (
          <span style={styles.phaseLabel}>
            {currentPlayer === 'human' ? '👤 Your Turn' : '🤖 AI Thinking...'}
            {' · '}{phaseLabels[turnPhase] || turnPhase}
          </span>
        )}
      </div>

      <div style={styles.right}>
        <span style={styles.vpBadge}>
          You: {humanVP}/10
        </span>
        <span style={{ ...styles.vpBadge, color: '#d94a4a' }}>
          AI: {aiVP}/10
        </span>
      </div>

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    backgroundColor: '#1a1a2e',
    borderBottom: '2px solid #333',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#d4a543',
  },
  turnInfo: {
    fontSize: '14px',
    color: '#999',
  },
  center: {
    fontSize: '16px',
    color: '#e8d5b5',
  },
  right: {
    display: 'flex',
    gap: '12px',
  },
  vpBadge: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#4a90d9',
    padding: '4px 12px',
    backgroundColor: '#2a2a3e',
    borderRadius: '4px',
  },
  phaseLabel: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#e8d5b5',
  },
  message: {
    position: 'absolute',
    bottom: '-28px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '13px',
    color: '#d4a543',
    fontStyle: 'italic',
  },
};
