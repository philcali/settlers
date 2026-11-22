import type { GameState } from '../types';
import { victoryPoints } from '../rules';
import { VICTORY_POINTS } from '../types';

interface Props {
  state: GameState;
  onPlayAgain: () => void;
}

export function VictoryOverlay({ state, onPlayAgain }: Props) {
  if (state.phase !== 'ended' || !state.winner) return null;
  const human = victoryPoints(state.board, 'human');
  const ai = victoryPoints(state.board, 'ai');
  const won = state.winner === 'human';
  return (
    <div className="victory" role="dialog" aria-modal="true" aria-label="Game over">
      <div className="victory__card">
        <div className="victory__emoji" aria-hidden="true">
          {won ? '🏆' : '💀'}
        </div>
        <h2 className="victory__title">{won ? 'You win!' : 'The AI takes the realm'}</h2>
        <p className="victory__sub">First to {VICTORY_POINTS} victory points wins.</p>
        <div className="victory__score">
          <span className={`victory__side${won ? ' victory__side--winner' : ''}`}>
            You <b>★{human}</b>
          </span>
          <span className={`victory__side${!won ? ' victory__side--winner' : ''}`}>
            AI <b>★{ai}</b>
          </span>
        </div>
        <button type="button" className="victory__btn" onClick={onPlayAgain}>
          Play again
        </button>
      </div>
    </div>
  );
}
