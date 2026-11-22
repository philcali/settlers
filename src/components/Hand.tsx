import { useEffect, useRef, useState } from 'react';
import type { Card, GameState } from '../types';
import { CARD_ART } from '../types';
import { cardName } from '../cards';

function FaceUpCard({ card, disabled = false, onClick }: { card: Card; disabled?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <img src={CARD_ART[card.subtype]} alt={cardName(card)} />
      <span className="hand__cardname">{cardName(card)}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="hand__card" title={cardName(card)} disabled={disabled} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <span className="hand__card hand__card--static" title={cardName(card)}>{body}</span>;
}

/**
 * Your hand (face-up, click to play) and the AI's hand (face-down), shown below the board.
 * A Spy Network reveal flips the AI's hand face-up for a few seconds.
 */
export function Hand({ state, onPlayCard }: { state: GameState; onPlayCard: (cardId: string) => void }) {
  const me = state.players.human;
  const ai = state.players.ai;
  const myTurn = state.phase === 'playing' && state.currentPlayer === 'human';

  const [revealing, setRevealing] = useState(false);
  const seenNonce = useRef(0);
  useEffect(() => {
    const reveal = state.reveal;
    if (!reveal || reveal.nonce === seenNonce.current) return;
    seenNonce.current = reveal.nonce;
    setRevealing(true);
    const t = setTimeout(() => setRevealing(false), 6000);
    return () => clearTimeout(t);
  }, [state.reveal]);

  return (
    <section className="hand">
      <div className="hand__row">
        <span className="hand__label">{myTurn ? 'Your hand — click to play' : 'Your hand'}</span>
        <div className="hand__cards">
          {me.hand.length === 0 && <span className="hand__empty">No cards — you draw one at the start of each turn.</span>}
          {me.hand.map((c) => (
            <FaceUpCard key={c.id} card={c} disabled={!myTurn} onClick={() => onPlayCard(c.id)} />
          ))}
        </div>
      </div>
      <div className="hand__row">
        <span className="hand__label">{revealing ? 'AI hand — revealed by Spy Network' : 'AI hand'}</span>
        <div className={`hand__cards${revealing ? ' hand__cards--revealed' : ''}`}>
          {revealing && state.reveal ? (
            state.reveal.cards.length === 0 ? (
              <span className="hand__empty">empty</span>
            ) : (
              state.reveal.cards.map((c) => <FaceUpCard key={c.id} card={c} />)
            )
          ) : (
            <>
              {ai.hand.length === 0 && <span className="hand__empty">No cards yet.</span>}
              {ai.hand.map((c) => (
                <img key={c.id} className="hand__back" src={`${import.meta.env.BASE_URL}assets/cards/back.png`} alt="face-down card" />
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
