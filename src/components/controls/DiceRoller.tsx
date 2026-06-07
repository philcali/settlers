import { useGame } from '../../state/game-context';

/**
 * DiceRoller renders the dice display and roll button.
 * Shows individual dice faces and the total.
 */
export default function DiceRoller() {
  const { state, dispatch } = useGame();
  const { dice } = state;
  const isHumanTurn = state.currentPlayer === 'human' && state.phase === 'playing';
  const canRoll = isHumanTurn && state.turnPhase === 'roll' && !dice.isRolled;

  function handleRoll() {
    if (!canRoll) return;
    dispatch({ type: 'ROLL_DICE' });

    // Animate then collect resources
    setTimeout(() => {
      dispatch({
        type: 'SET_DICE_VALUE',
        value: dice.value || 7,
        individualDice: dice.individualDice,
      });
      dispatch({ type: 'COLLECT_RESOURCES', player: 'human' });

      // Give resources to human player
      if (dice.value !== null) {
        const resources = collectResourcesForPlayer(state, 'human', dice.value);
        dispatch({ type: 'ADD_RESOURCES', player: 'human', resources });
      }

      dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
    }, 800);
  }

  const d1 = dice.individualDice[0];
  const d2 = dice.individualDice[1];
  const total = dice.value !== null ? dice.value : d1 + d2;

  return (
    <div style={styles.container}>
      <div style={styles.diceContainer}>
        <div style={{ ...styles.die, backgroundColor: dice.isAnimating ? '#555' : '#f5e6c8' }}>
          <span style={styles.dieFace}>{d1}</span>
          <div style={styles.dots}>{getDiceDots(d1)}</div>
        </div>
        <div style={{ ...styles.die, backgroundColor: dice.isAnimating ? '#555' : '#f5e6c8' }}>
          <span style={styles.dieFace}>{d2}</span>
          <div style={styles.dots}>{getDiceDots(d2)}</div>
        </div>
      </div>
      <div style={styles.total}>Total: {total}</div>
      {canRoll && (
        <button style={styles.rollButton} onClick={handleRoll}>
          {dice.isAnimating ? 'Rolling...' : 'Roll Dice'}
        </button>
      )}
      {dice.isRolled && !dice.isAnimating && isHumanTurn && state.turnPhase === 'roll' && (
        <button style={styles.rollButton} onClick={handleRoll}>
          Roll Again
        </button>
      )}
    </div>
  );
}

function getDiceDots(value: number): React.ReactNode {
  const dotPositions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
  };
  return (
    <svg width="40" height="40" viewBox="0 0 100 100">
      {dotPositions[value]?.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="10" fill="#333" />
      ))}
    </svg>
  );
}

// Simplified resource collection for the dice roller
function collectResourcesForPlayer(
  state: any,
  player: 'human' | 'ai',
  diceTotal: number,
): Record<string, number> {
  const resources: Record<string, number> = {};
  for (const tile of state.board) {
    if (tile.numberToken !== null && tile.numberToken === diceTotal && tile.province !== 'desert') {
      if (tile.building?.owner !== player) continue;
      const provinceToResource: Record<string, string> = {
        forest: 'wood', quarry: 'stone', farmland: 'grain', mine: 'ore', pasture: 'livestock',
      };
      const resource = provinceToResource[tile.province];
      if (!resource) continue;
      let amount = tile.building.type === 'manor' ? 2 : tile.building.type === 'castle' ? 3 : 1;
      resources[resource] = (resources[resource] || 0) + amount;
    }
  }
  return resources;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
  },
  diceContainer: {
    display: 'flex',
    gap: '12px',
  },
  die: {
    width: '60px',
    height: '60px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
    border: '2px solid #8b6914',
  },
  dieFace: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#3a2a0a',
    marginBottom: '2px',
  },
  dots: {
    width: '40px',
    height: '40px',
  },
  total: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#d4a543',
  },
  rollButton: {
    padding: '10px 24px',
    backgroundColor: '#d4a543',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
};
