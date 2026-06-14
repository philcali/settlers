import { useEffect, useRef } from 'react';
import { useGame } from '../state/game-context';
import { GameState, PlayerId, AIAction } from '../types/game';
import { evaluateAIActions } from '../game/ai';
import { getCardEffects, getBanditTarget, generateRandomResources } from '../game/card-effects';
import { TurnController, useTurnController } from './useTurnController';

/**
 * Hook that orchestrates the AI turn.
 * When it's the AI's turn, it evaluates actions, picks the best one, and executes it
 * after a visual "thinking" delay.
 */
export function useAI(controller?: TurnController) {
  const { state, dispatch } = useGame();
  const ownController = useTurnController();
  const ctrl = controller ?? ownController;
  const thinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (thinkTimeoutRef.current) clearTimeout(thinkTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    // Only trigger AI when it's their turn and the game is in progress
    if (ctrl.currentPlayer !== 'ai' || ctrl.phase !== 'playing') return;

    // Capture state snapshot at scheduling time to avoid stale closure
    const snapshot = {
      turnPhase: state.turnPhase,
      board: state.board,
      players: state.players,
    };

    const thinkTime = 600 + Math.random() * 400; // 600-1000ms

    thinkTimeoutRef.current = setTimeout(() => {
      // Evaluate all possible actions using the snapshot
      const evaluations = evaluateAIActions(snapshot, 'ai');

      if (evaluations.length === 0) {
        // No valid actions — pass
        dispatch({ type: 'SET_MESSAGE', message: 'AI passes' });
        dispatch({ type: 'SET_TURN_PHASE', phase: 'draw' });
        return;
      }

      // Pick the highest-scoring action
      const best = evaluations.sort((a, b) => b.score - a.score)[0];

      // Execute the action
      executeAIAction(snapshot, best.action, dispatch, ctrl);
    }, thinkTime);
  }, [ctrl.currentPlayer, ctrl.phase, dispatch]);
}

function executeAIAction(
  snapshot: GameState,
  action: AIAction,
  dispatch: React.Dispatch<any>,
  _controller: TurnController,
) {
  switch (action.type) {
    case 'play-card': {
      dispatch({ type: 'PLAY_CARD', player: 'ai', cardId: action.cardId });

      // Dispatch card effects for title/event cards
      const card = snapshot.players['ai'].hand.find(c => c.id === action.cardId);
      if (card) {
        const effects = getCardEffects(card, 'ai', snapshot.board);
        for (const effect of effects) {
          switch (effect.type) {
            case 'DRAW_CARDS':
              dispatch({ type: 'DRAW_CARDS', player: effect.target, count: effect.count });
              break;
            case 'GAIN_RESOURCES':
              dispatch({ type: 'ADD_RESOURCES', player: effect.target, resources: generateRandomResources(effect.count) });
              break;
            case 'DISCARD_RANDOM':
              dispatch({ type: 'DISCARD_CARDS', player: effect.target, count: effect.count });
              break;
            case 'REVEAL_OPPONENT_HAND':
              dispatch({ type: 'REVEAL_HAND', player: effect.player });
              break;
            case 'MOVE_BANDIT': {
              const opponentId: PlayerId = 'ai' === 'human' ? 'ai' : 'human';
              const target = getBanditTarget(snapshot.board, opponentId);
              if (target) {
                dispatch({ type: 'MOVE_BANDIT', player: 'ai', target });
              }
              break;
            }
          }
        }
      }

      dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
      break;
    }
    case 'build': {
      dispatch({ type: 'BUILD', player: 'ai', tileKey: action.tileKey, building: action.building });
      dispatch({ type: 'SET_TURN_PHASE', phase: 'roll' });
      break;
    }
    case 'upgrade': {
      dispatch({ type: 'UPGRADE', player: 'ai', tileKey: action.tileKey, to: action.to });
      dispatch({ type: 'SET_TURN_PHASE', phase: 'roll' });
      break;
    }
    case 'pass': {
      dispatch({ type: 'SET_TURN_PHASE', phase: 'draw' });
      break;
    }
    case 'draw-cards': {
      dispatch({ type: 'DRAW_CARDS', player: 'ai', count: action.count });
      dispatch({ type: 'SET_TURN_PHASE', phase: 'play' });
      break;
    }
    case 'gain-resources': {
      dispatch({
        type: 'ADD_RESOURCES',
        player: 'ai',
        resources: { [action.resource]: action.count },
      });
      dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
      break;
    }
    case 'reveal-hand': {
      dispatch({ type: 'SET_MESSAGE', message: `AI's hand: ${snapshot.players.ai.hand.length} cards` });
      dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
      break;
    }
    case 'move-bandit': {
      dispatch({ type: 'MOVE_BANDIT', player: 'ai', target: action.target });
      dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
      break;
    }
    case 'trade': {
      // One-way trade: AI offers to trade with the human
      dispatch({ type: 'SET_MESSAGE', message: 'AI offers a trade' });
      dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
      break;
    }
  }
}
