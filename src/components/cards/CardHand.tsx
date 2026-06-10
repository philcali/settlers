import { useRef, useState } from 'react';
import { useGame } from '../../state/game-context';
import Card from './Card';
import { useAI } from '../../hooks/useAI';
import type { Card as CardType } from '../../types/game';

interface AnimatingCard {
  id: string;
  x: number;
  y: number;
}

/**
 * CardHand renders the human player's hand of cards at the bottom of the screen.
 * Includes a slide-out animation when a card is played.
 */
export default function CardHand() {
  const { state, dispatch } = useGame();
  useAI();

  const [animatingCard, setAnimatingCard] = useState<AnimatingCard | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { hand } = state.players.human;
  const isHumanTurn = state.currentPlayer === 'human' && state.phase === 'playing';

  function handlePlayCard(cardId: string, element: HTMLDivElement | null) {
    if (!isHumanTurn) return;

    // Capture the card's position relative to the container before any state change
    if (element && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const cardRect = element.getBoundingClientRect();
      setAnimatingCard({
        id: cardId,
        // Position relative to the container's padding edge
        x: cardRect.left - containerRect.left,
        y: cardRect.top - containerRect.top,
      });
    }

    // Animate then dispatch — timing matches the transition duration
    setTimeout(() => {
      dispatch({ type: 'PLAY_CARD', player: 'human', cardId });
      dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
      setAnimatingCard(null);
    }, 300);
  }

  function handlePass() {
    if (!isHumanTurn) return;
    dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
  }

  // Keep the animating card in the DOM so the container layout doesn't shift
  // while the overlay is still positioned at the captured coordinates
  const animatingId = animatingCard?.id ?? null;

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.label}>Your Hand ({hand.length}/7)</div>
      <div style={styles.cards}>
        {hand.map((card: CardType) => {
          const isAnimating = card.id === animatingId;
          return (
            <div
              key={card.id}
              ref={el => { cardRefs.current[card.id] = el; }}
              style={{ flex: 'none', visibility: isAnimating ? 'hidden' : 'visible' }}
            >
              <Card
                card={card}
                onClick={isHumanTurn && !isAnimating ? () => handlePlayCard(card.id, cardRefs.current[card.id]) : undefined}
                disabled={!isHumanTurn || isAnimating}
              />
            </div>
          );
        })}
      </div>
      {isHumanTurn && state.turnPhase === 'play' && (
        <button style={styles.passButton} onClick={handlePass}>
          Pass
        </button>
      )}
      {/* Card play animation overlay */}
      {animatingCard && (
        <div
          style={{
            position: 'absolute',
            left: animatingCard.x,
            top: animatingCard.y,
            transition: 'transform 0.3s ease, opacity 0.3s ease',
            transform: 'translateX(200px) scale(0.7)',
            opacity: 0,
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          <Card card={animatingCard.id ? hand.find((c: CardType) => c.id === animatingCard.id)! : hand[0]} />
        </div>
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
    position: 'relative',
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
