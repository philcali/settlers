import { useGame } from '../../state/game-context';
import { useTurnController } from '../../hooks/useTurnController';

/**
 * DiceRoller renders the dice display and roll button.
 * Shows individual dice faces and the total.
 */
export default function DiceRoller() {
  const { state, dispatch } = useGame();
  const controller = useTurnController();
  const { dice } = state;
  const isHumanTurn = controller.isHumanTurn;
  const canRoll = isHumanTurn && state.turnPhase === 'roll' && !dice.isRolled;

  function handleRoll() {
    if (!canRoll) return;

    // Capture dice state at roll time to avoid stale closure in setTimeout
    const capturedDice = state.dice;
    controller.rollDice();

    // Animate then collect resources
    setTimeout(() => {
      dispatch({
        type: 'SET_DICE_VALUE',
        value: capturedDice.value ?? 7,
        individualDice: capturedDice.individualDice,
      });
      dispatch({ type: 'COLLECT_RESOURCES', player: 'human' });

      // Give resources to human player
      if (capturedDice.value !== null) {
        const resources = collectResourcesForPlayer(state, 'human', capturedDice.value);
        dispatch({ type: 'ADD_RESOURCES', player: 'human', resources });
      }

      dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
    }, 800);
  }

  const d1 = dice.individualDice[0] || 1;
  const d2 = dice.individualDice[1] || 1;
  const total = dice.value !== null ? dice.value : d1 + d2;

  const dieStyle1: React.CSSProperties = dice.isAnimating
    ? { ...styles.die, animation: 'diceRoll 0.3s ease-in-out infinite' }
    : styles.die;

  const dieStyle2: React.CSSProperties = dice.isAnimating
    ? { ...styles.die, animation: 'diceRoll 0.3s ease-in-out infinite 0.15s' }
    : styles.die;

  return (
    <div style={styles.container}>
      <div style={styles.diceContainer}>
        <img
          src={`/assets/dice/d${d1}.png`}
          alt={String(d1)}
          style={dieStyle1}
        />
        <img
          src={`/assets/dice/d${d2}.png`}
          alt={String(d2)}
          style={dieStyle2}
        />
      </div>
      <div style={{
        ...styles.total,
        transform: dice.isAnimating ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 0.2s ease',
      }}>
        Total: {total}
      </div>
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

// Simplified resource collection for the dice roller
function collectResourcesForPlayer(
  state: { board: { province: string; numberToken: number | null; building?: { type: string; owner: string } }[] },
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
    width: '80px',
    height: '80px',
    borderRadius: '10px',
    objectFit: 'contain',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
    border: '2px solid #8b6914',
    backgroundColor: '#f5e6c8',
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
