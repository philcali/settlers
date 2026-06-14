import { describe, it, expect } from 'vitest';
import { gameReducer, createInitialState } from './game-reducer';
import { createDeck } from '../game/deck';
import { createTile, emptyBoard, withPhase, withTurnPhase } from '../__tests__/fixtures';
import { GameState, GameAction } from '../types/game';

function makeGame(board?: GameState['board'], deck?: GameState['deck']): GameState {
  const state = createInitialState();
  return {
    ...state,
    board: board ?? emptyBoard(),
    deck: deck ?? createDeck(),
  };
}

describe('createInitialState', () => {
  it('returns setup phase', () => {
    expect(createInitialState().phase).toBe('setup');
  });

  it('returns draw turn phase', () => {
    expect(createInitialState().turnPhase).toBe('draw');
  });

  it('starts with human as current player', () => {
    expect(createInitialState().currentPlayer).toBe('human');
  });

  it('has empty board', () => {
    expect(createInitialState().board).toHaveLength(0);
  });

  it('has empty deck', () => {
    expect(createInitialState().deck.cards.length).toBe(0);
  });
});

describe('SET_BOARD', () => {
  it('updates the board', () => {
    const state = createInitialState();
    const board = emptyBoard();
    const result = gameReducer(state, { type: 'SET_BOARD', board });
    expect(result.board).toHaveLength(19);
  });
});

describe('SET_DECK', () => {
  it('updates the deck', () => {
    const state = createInitialState();
    const deck = createDeck();
    const result = gameReducer(state, { type: 'SET_DECK', deck });
    expect(result.deck.cards.length + result.deck.discardPile.length).toBe(92);
  });
});

describe('SET_TURN_PHASE', () => {
  it('updates the turn phase', () => {
    const state = createInitialState();
    const result = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'play' });
    expect(result.turnPhase).toBe('play');
  });
});

describe('SET_MESSAGE', () => {
  it('sets the message', () => {
    const state = createInitialState();
    const result = gameReducer(state, { type: 'SET_MESSAGE', message: 'Hello' });
    expect(result.message).toBe('Hello');
  });

  it('clears message when null', () => {
    const state = { ...createInitialState(), message: 'Hello' };
    const result = gameReducer(state, { type: 'SET_MESSAGE', message: null });
    expect(result.message).toBeNull();
  });
});

describe('ADVANCE_TURN', () => {
  it('advances from draw to play', () => {
    const state = makeGame();
    const result = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'draw' });
    const next = gameReducer(result, { type: 'ADVANCE_TURN' });
    expect(next.turnPhase).toBe('play');
  });

  it('advances from play to build', () => {
    const state = makeGame();
    const result = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'play' });
    const next = gameReducer(result, { type: 'ADVANCE_TURN' });
    expect(next.turnPhase).toBe('build');
  });

  it('advances from build to roll', () => {
    const state = makeGame();
    const result = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'build' });
    const next = gameReducer(result, { type: 'ADVANCE_TURN' });
    expect(next.turnPhase).toBe('roll');
  });

  it('advances from roll to draw (new turn)', () => {
    const state = makeGame();
    const stateWithRoll = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'roll' });
    const next = gameReducer(stateWithRoll, { type: 'ADVANCE_TURN' });
    expect(next.turnPhase).toBe('draw');
    expect(next.turnCount).toBe(1);
  });

  it('switches current player on new turn', () => {
    const state = makeGame();
    const stateHumanTurn = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'roll' });
    const next = gameReducer(stateHumanTurn, { type: 'ADVANCE_TURN' });
    expect(next.currentPlayer).toBe('ai');
  });
});

describe('DRAW_CARDS', () => {
  it('adds cards to player hand', () => {
    const state = makeGame();
    const result = gameReducer(state, { type: 'DRAW_CARDS', player: 'human', count: 3 });
    expect(result.players.human.hand.length).toBe(3);
  });

  it('reduces deck by drawn count', () => {
    const state = makeGame();
    const initialDeckSize = state.deck.cards.length;
    const result = gameReducer(state, { type: 'DRAW_CARDS', player: 'human', count: 3 });
    expect(result.deck.cards.length).toBe(initialDeckSize - 3);
  });
});

describe('ADD_RESOURCES', () => {
  it('adds resources to player', () => {
    const state = makeGame();
    const result = gameReducer(state, {
      type: 'ADD_RESOURCES',
      player: 'human',
      resources: { wood: 2, grain: 1 },
    });
    expect(result.players.human.resources.wood).toBe(2);
    expect(result.players.human.resources.grain).toBe(1);
  });
});

describe('REMOVE_RESOURCES', () => {
  it('removes resources from player', () => {
    const state = makeGame();
    const withResources = gameReducer(state, {
      type: 'ADD_RESOURCES',
      player: 'human',
      resources: { wood: 5, stone: 5 },
    });
    const result = gameReducer(withResources, {
      type: 'REMOVE_RESOURCES',
      player: 'human',
      resources: { wood: 2, stone: 1 },
    });
    expect(result.players.human.resources.wood).toBe(3);
    expect(result.players.human.resources.stone).toBe(4);
  });
});

describe('BUILD', () => {
  it('places a building on the board', () => {
    const state = makeGame();
    const result = gameReducer(state, {
      type: 'BUILD',
      player: 'human',
      tileKey: '1,0',
      building: 'farm',
    });
    const tile = result.board.find((t) => t.coord.q === 1 && t.coord.r === 0);
    expect(tile?.building?.type).toBe('farm');
    expect(tile?.building?.owner).toBe('human');
  });
});

describe('UPGRADE', () => {
  it('upgrades a building on the board', () => {
    const state = makeGame();
    const withFarm = gameReducer(state, {
      type: 'BUILD',
      player: 'human',
      tileKey: '1,0',
      building: 'farm',
    });
    const result = gameReducer(withFarm, {
      type: 'UPGRADE',
      player: 'human',
      tileKey: '1,0',
      to: 'manor',
    });
    const tile = result.board.find((t) => t.coord.q === 1 && t.coord.r === 0);
    expect(tile?.building?.type).toBe('manor');
  });
});

describe('SET_DICE_VALUE', () => {
  it('updates dice state', () => {
    const state = makeGame();
    const result = gameReducer(state, {
      type: 'SET_DICE_VALUE',
      value: 7,
      individualDice: [3, 4],
    });
    expect(result.dice.value).toBe(7);
    expect(result.dice.individualDice).toEqual([3, 4]);
    expect(result.dice.isAnimating).toBe(false);
  });
});

describe('MOVE_BANDIT', () => {
  it('moves the bandit to a new position', () => {
    const state = makeGame();
    const result = gameReducer(state, {
      type: 'MOVE_BANDIT',
      player: 'human',
      target: { q: 2, r: 0 },
    });
    expect(result.banditPosition?.q).toBe(2);
    expect(result.banditPosition?.r).toBe(0);
  });
});

describe('RESET_GAME', () => {
  it('resets to initial state but keeps board and deck', () => {
    const state = makeGame();
    const withBoard = gameReducer(state, { type: 'SET_BOARD', board: emptyBoard() });
    const withDeck = gameReducer(withBoard, { type: 'SET_DECK', deck: createDeck() });
    const result = gameReducer(withDeck, { type: 'RESET_GAME' });
    expect(result.phase).toBe('setup');
    expect(result.turnPhase).toBe('draw');
    expect(result.currentPlayer).toBe('human');
    expect(result.board).toHaveLength(19);
    expect(result.deck.cards.length + result.deck.discardPile.length).toBe(92);
  });
});

describe('COLLECT_RESOURCES', () => {
  it('is a no-op (resources collected via ADD_RESOURCES)', () => {
    const state = makeGame();
    const result = gameReducer(state, { type: 'COLLECT_RESOURCES', player: 'human' });
    expect(result).toBe(state);
  });
});

describe('AI_ACT', () => {
  it('is a no-op (handled by game loop)', () => {
    const state = makeGame();
    const result = gameReducer(state, { type: 'AI_ACT', action: { type: 'pass' } });
    expect(result).toBe(state);
  });
});

describe('REVEAL_HAND', () => {
  it('sets message with opponent hand size', () => {
    const state = makeGame();
    const withHand = gameReducer(state, {
      type: 'DRAW_CARDS',
      player: 'ai',
      count: 5,
    });
    const result = gameReducer(withHand, { type: 'REVEAL_HAND', player: 'human' });
    expect(result.message).toBe("AI Opponent's hand: 5 cards");
  });
});

describe('INITIAL_PLACEMENT_DONE', () => {
  it('transitions to playing phase', () => {
    const state = makeGame();
    const result = gameReducer(state, { type: 'INITIAL_PLACEMENT_DONE' });
    expect(result.phase).toBe('playing');
    expect(result.turnPhase).toBe('draw');
    expect(result.currentPlayer).toBe('human');
  });
});
