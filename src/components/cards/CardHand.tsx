import { useGame } from '../../state/game-context';
import Card from './Card';
import { useAI } from '../../hooks/useAI';

/**
 * CardHand renders the human player's hand of cards at the bottom of the screen.
 */
export default function CardHand() {
  const { state, dispatch } = useGame();
  useAI(); // Hook into AI turn logic

  const { hand } = state.players.human;
  const isHumanTurn = state.currentPlayer === 'human' && state.phase === 'playing';

  function handlePlayCard(cardId: string) {
    if (!isHumanTurn) return;
    dispatch({ type: 'PLAY_CARD', player: 'human', cardId });
    dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
  }

  function handlePass() {
    if (!isHumanTurn) return;
    dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
  }

  return (
    <div style={styles.container}>
      <div style={styles.label}>Your Hand ({hand.length}/7)</div>
      <div style={styles.cards}>
        {hand.map(card => (
          <Card
            key={card.id}
            card={card}
            onClick={isHumanTurn ? () => handlePlayCard(card.id) : undefined}
            disabled={!isHumanTurn}
          />
        ))}
      </div>
      {isHumanTurn && state.turnPhase === 'play' && (
        <button style={styles.passButton} onClick={handlePass}>
          Pass
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#d4a543',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  cards: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    maxWidth: '100%',
    paddingBottom: '8px',
  },
  passButton: {
    padding: '8px 24px',
    backgroundColor: '#555',
    color: '#fff',
    border: '1px solid #777',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};
