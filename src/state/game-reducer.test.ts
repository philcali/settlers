import { describe, it, expect } from 'vitest';
import { gameReducer, createInitialState } from './game-reducer';
import { createDeck } from '../game/deck';
import { emptyBoard, withPhase, withTurnPhase, withCurrentPlayer } from '../__tests__/fixtures';
import { GameState } from '../types/game';

function makeGame(board?: GameState['board'], deck?: GameState['deck']): GameState {
  const state = createInitialState();
  return {
    ...state,
    setupRound: -1,
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

  it('starts with setupRound 0 (human to place 1st castle)', () => {
    expect(createInitialState().setupRound).toBe(0);
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

describe('resource economy', () => {
  it('PLAY_CARD grants 1 of the resource for a resource card', () => {
    const base = makeGame();
    const card = { id: 'c-wood-1', type: 'resource' as const, subtype: 'wood' };
    const state = {
      ...base,
      players: { ...base.players, human: { ...base.players.human, hand: [card] } },
    };
    const result = gameReducer(state, { type: 'PLAY_CARD', player: 'human', cardId: 'c-wood-1' });
    expect(result.players.human.resources.wood).toBe(1);
    expect(result.players.human.hand.length).toBe(0);
    expect(result.deck.discardPile.length).toBe(1);
  });

  it('does not grant resources for a title card', () => {
    const base = makeGame();
    const card = { id: 'c-title-1', type: 'title' as const, subtype: 'royal-decree' };
    const state = {
      ...base,
      players: { ...base.players, human: { ...base.players.human, hand: [card] } },
    };
    const result = gameReducer(state, { type: 'PLAY_CARD', player: 'human', cardId: 'c-title-1' });
    expect(result.players.human.resources.wood).toBe(0);
  });

  it('BUILD deducts the building cost from resources', () => {
    const base = makeGame();
    const state = {
      ...base,
      players: {
        ...base.players,
        human: { ...base.players.human, resources: { wood: 4, stone: 0, grain: 3, ore: 0, livestock: 0 } },
      },
    };
    const result = gameReducer(state, { type: 'BUILD', player: 'human', tileKey: '1,0', building: 'farm' });
    expect(result.players.human.resources.wood).toBe(2);
    expect(result.players.human.resources.grain).toBe(2);
  });

  it('UPGRADE deducts the destination building cost from resources', () => {
    const base = makeGame();
    const withFarm = gameReducer(base, { type: 'BUILD', player: 'human', tileKey: '1,0', building: 'farm' });
    const state = {
      ...withFarm,
      players: {
        ...withFarm.players,
        human: {
          ...withFarm.players.human,
          resources: { wood: 0, stone: 6, grain: 5, ore: 4, livestock: 0 },
        },
      },
    };
    const result = gameReducer(state, { type: 'UPGRADE', player: 'human', tileKey: '1,0', to: 'manor' });
    expect(result.players.human.resources.stone).toBe(3);
    expect(result.players.human.resources.grain).toBe(3);
    expect(result.players.human.resources.ore).toBe(2);
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
    expect(result.setupRound).toBe(-1);
  });

  it('seeds both players a symmetric starter resource bonus', () => {
    const state = makeGame();
    const result = gameReducer(state, { type: 'INITIAL_PLACEMENT_DONE' });
    // Enough for one farm (wood 2 + grain 1) plus a stone buffer.
    for (const id of ['human', 'ai'] as const) {
      expect(result.players[id].resources.wood).toBe(2);
      expect(result.players[id].resources.grain).toBe(1);
      expect(result.players[id].resources.stone).toBe(1);
      expect(result.players[id].resources.ore).toBe(0);
      expect(result.players[id].resources.livestock).toBe(0);
    }
    // Symmetric: both players get the identical bonus.
    expect(result.players.human.resources).toEqual(result.players.ai.resources);
  });
});

// --- Setup flow tests ---

describe('setup flow', () => {
  function makeSetupState(): GameState {
    const state = makeGame();
    return withCurrentPlayer({ ...state, setupRound: 0 }, 'human');
  }

  it('human → ai → human → ai → playing (full setup)', () => {
    let state = makeSetupState();

    // Human places 1st castle
    state = gameReducer(state, { type: 'PLACE_CASTLE', player: 'human', tileKey: '1,0' });
    expect(state.currentPlayer).toBe('ai');
    expect(state.setupRound).toBe(1);
    expect(state.players.human.buildings.get('1,0')).toBe('farm');
    expect(state.board.find(t => t.coord.q === 1 && t.coord.r === 0)?.building?.owner).toBe('human');

    // AI places 1st castle
    state = gameReducer(state, { type: 'PLACE_CASTLE', player: 'ai', tileKey: '0,1' });
    expect(state.currentPlayer).toBe('human');
    expect(state.setupRound).toBe(2);
    expect(state.players.ai.buildings.get('0,1')).toBe('farm');
    expect(state.board.find(t => t.coord.q === 0 && t.coord.r === 1)?.building?.owner).toBe('ai');

    // Human places 2nd castle
    state = gameReducer(state, { type: 'PLACE_CASTLE', player: 'human', tileKey: '-1,1' });
    expect(state.currentPlayer).toBe('ai');
    expect(state.setupRound).toBe(3);
    expect(state.players.human.buildings.get('-1,1')).toBe('farm');

    // AI places 2nd castle
    state = gameReducer(state, { type: 'PLACE_CASTLE', player: 'ai', tileKey: '-1,0' });
    expect(state.setupRound).toBe(4);
    expect(state.players.ai.buildings.get('-1,0')).toBe('farm');

    // After AI's 2nd castle, INITIAL_PLACEMENT_DONE transitions to playing
    state = gameReducer(state, { type: 'INITIAL_PLACEMENT_DONE' });
    expect(state.phase).toBe('playing');
    expect(state.turnPhase).toBe('draw');
    expect(state.currentPlayer).toBe('human');
    expect(state.setupRound).toBe(-1);
  });

  it('PLACE_CASTLE toggles currentPlayer', () => {
    let state = makeSetupState();

    state = gameReducer(state, { type: 'PLACE_CASTLE', player: 'human', tileKey: '1,0' });
    expect(state.currentPlayer).toBe('ai');

    state = gameReducer(state, { type: 'PLACE_CASTLE', player: 'ai', tileKey: '0,1' });
    expect(state.currentPlayer).toBe('human');
  });

  it('PLACE_CASTLE increments setupRound', () => {
    let state = makeSetupState();
    expect(state.setupRound).toBe(0);

    state = gameReducer(state, { type: 'PLACE_CASTLE', player: 'human', tileKey: '1,0' });
    expect(state.setupRound).toBe(1);

    state = gameReducer(state, { type: 'PLACE_CASTLE', player: 'ai', tileKey: '0,1' });
    expect(state.setupRound).toBe(2);
  });

  it('PLACE_CASTLE with invalid tile key returns unchanged state', () => {
    const state = makeSetupState();
    const result = gameReducer(state, { type: 'PLACE_CASTLE', player: 'human', tileKey: '99,99' });
    expect(result).toBe(state);
  });

  it('PLACE_CASTLE on occupied tile sets building', () => {
    const state = makeSetupState();
    const result = gameReducer(state, { type: 'PLACE_CASTLE', player: 'human', tileKey: '1,0' });
    const tile = result.board.find(t => t.coord.q === 1 && t.coord.r === 0);
    expect(tile?.building?.type).toBe('farm');
    expect(tile?.building?.owner).toBe('human');
  });

  it('PLACE_CASTLE on already-occupied tile overwrites the building', () => {
    const state = makeSetupState();
    const withFarm = gameReducer(state, { type: 'PLACE_CASTLE', player: 'human', tileKey: '1,0' });
    const result = gameReducer(withFarm, { type: 'PLACE_CASTLE', player: 'ai', tileKey: '1,0' });
    // tile exists but already has building — overwrites owner
    const tile = result.board.find(t => t.coord.q === 1 && t.coord.r === 0);
    expect(tile?.building?.owner).toBe('ai');
  });
});

// --- Full turn cycle tests ---

describe('full turn cycle', () => {
  function makePlayingState(): GameState {
    const state = makeGame();
    return withCurrentPlayer(withPhase(withTurnPhase(state, 'draw'), 'playing'), 'human');
  }

  it('complete cycle: draw → play → build → roll → draw (next player)', () => {
    let state = makePlayingState();

    // Start: draw phase, human's turn
    expect(state.turnPhase).toBe('draw');
    expect(state.currentPlayer).toBe('human');

    // Advance to play
    state = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'play' });
    expect(state.turnPhase).toBe('play');

    // Advance to build
    state = gameReducer(state, { type: 'ADVANCE_TURN' });
    expect(state.turnPhase).toBe('build');

    // Advance to roll
    state = gameReducer(state, { type: 'ADVANCE_TURN' });
    expect(state.turnPhase).toBe('roll');

    // Advance to draw (new turn) — player switches
    state = gameReducer(state, { type: 'ADVANCE_TURN' });
    expect(state.turnPhase).toBe('draw');
    expect(state.currentPlayer).toBe('ai');
    expect(state.turnCount).toBe(1);
  });

  it('turnCount increments only on roll → draw transition', () => {
    const state = makePlayingState();
    const stateDraw = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'draw' });
    const statePlay = gameReducer(stateDraw, { type: 'ADVANCE_TURN' });
    expect(statePlay.turnCount).toBe(0); // draw→play does not increment

    const stateBuild = gameReducer(statePlay, { type: 'ADVANCE_TURN' });
    expect(stateBuild.turnCount).toBe(0); // play→build does not increment

    const stateRoll = gameReducer(stateBuild, { type: 'ADVANCE_TURN' });
    expect(stateRoll.turnCount).toBe(0); // build→roll does not increment

    const stateNewTurn = gameReducer(stateRoll, { type: 'ADVANCE_TURN' });
    expect(stateNewTurn.turnCount).toBe(1); // roll→draw increments
  });

  it('dice reset on new turn', () => {
    const state = makePlayingState();
    const stateRoll = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'roll' });
    const stateRolled = gameReducer(stateRoll, { type: 'ROLL_DICE' });
    expect(stateRolled.dice.isRolled).toBe(true);
    expect(stateRolled.dice.isAnimating).toBe(true);

    const stateNewTurn = gameReducer(stateRolled, { type: 'ADVANCE_TURN' });
    expect(stateNewTurn.dice.isRolled).toBe(false);
    expect(stateNewTurn.dice.isAnimating).toBe(false);
    expect(stateNewTurn.dice.value).toBeNull();
  });

  it('banditMovedThisTurn resets on new turn', () => {
    const state = makePlayingState();
    const stateRoll = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'roll' });
    const stateRolled = gameReducer(stateRoll, { type: 'ROLL_DICE' });
    const stateNewTurn = gameReducer(stateRolled, { type: 'ADVANCE_TURN' });
    expect(stateNewTurn.banditMovedThisTurn).toBe(false);
  });
});

// --- Turn alternation tests ---

describe('turn alternation', () => {
  function makePlayingState(): GameState {
    const state = makeGame();
    return withCurrentPlayer(withPhase(withTurnPhase(state, 'draw'), 'playing'), 'human');
  }

  it('player switches each new turn', () => {
    let state = makePlayingState();
    expect(state.currentPlayer).toBe('human');

    // Human's turn ends (roll → advance)
    state = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'roll' });
    state = gameReducer(state, { type: 'ADVANCE_TURN' });
    expect(state.currentPlayer).toBe('ai');
    expect(state.turnCount).toBe(1);

    // AI's turn ends (roll → advance)
    state = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'roll' });
    state = gameReducer(state, { type: 'ADVANCE_TURN' });
    expect(state.currentPlayer).toBe('human');
    expect(state.turnCount).toBe(2);

    // Human again
    state = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'roll' });
    state = gameReducer(state, { type: 'ADVANCE_TURN' });
    expect(state.currentPlayer).toBe('ai');
    expect(state.turnCount).toBe(3);
  });

  it('turnPhase resets to draw each turn', () => {
    let state = makePlayingState();
    state = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'roll' });
    state = gameReducer(state, { type: 'ADVANCE_TURN' });
    expect(state.turnPhase).toBe('draw');

    state = gameReducer(state, { type: 'SET_TURN_PHASE', phase: 'roll' });
    state = gameReducer(state, { type: 'ADVANCE_TURN' });
    expect(state.turnPhase).toBe('draw');
  });
});

// --- Edge case tests ---

describe('edge cases', () => {
  it('DRAW_CARDS with empty deck reshuffles discard pile', () => {
    const state = makeGame();
    // Play some cards to put them in the discard pile
    let s = state;
    const cardIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      s = gameReducer(s, { type: 'DRAW_CARDS', player: 'human', count: 1 });
      const card = s.players.human.hand[s.players.human.hand.length - 1];
      cardIds.push(card.id);
    }
    // Play those cards to move them to discard pile
    for (const cardId of cardIds) {
      s = gameReducer(s, { type: 'PLAY_CARD', player: 'human', cardId });
    }
    expect(s.deck.discardPile.length).toBeGreaterThan(0);

    // Draw all remaining cards to empty the deck
    const remaining = s.deck.cards.length;
    for (let i = 0; i < remaining; i++) {
      s = gameReducer(s, { type: 'DRAW_CARDS', player: 'ai', count: 1 });
    }
    expect(s.deck.cards.length).toBe(0);

    // Now draw 1 — should reshuffle from discard pile
    const withDiscard = gameReducer(s, {
      type: 'DRAW_CARDS',
      player: 'human',
      count: 1,
    });
    // Deck was reshuffled: cards moved from discard → deck
    expect(withDiscard.deck.discardPile.length).toBe(0);
    expect(withDiscard.deck.cards.length).toBeGreaterThan(0);
    // Total cards conserved: deck + discard + all hands
    const totalInDeck = withDiscard.deck.cards.length + withDiscard.deck.discardPile.length;
    const totalInHands = withDiscard.players.human.hand.length + withDiscard.players.ai.hand.length;
    expect(totalInDeck + totalInHands).toBe(92);
  });

  it('DRAW_CARDS when deck is empty returns no cards', () => {
    const state = makeGame();
    // Empty the deck completely
    let s = state;
    for (let i = 0; i < 92; i++) {
      s = gameReducer(s, { type: 'DRAW_CARDS', player: 'human', count: 1 });
    }
    // Try to draw from empty deck
    const result = gameReducer(s, { type: 'DRAW_CARDS', player: 'human', count: 5 });
    expect(result.players.human.hand.length).toBe(s.players.human.hand.length);
    expect(result.deck.cards.length).toBe(0);
  });

  it('ADVANCE_TURN from draw without prior SET_TURN_PHASE advances correctly', () => {
    const state = makeGame();
    // Default turnPhase is 'draw'
    const result = gameReducer(state, { type: 'ADVANCE_TURN' });
    expect(result.turnPhase).toBe('play');
  });

  it('SET_DICE_VALUE sets bandit stealing context', () => {
    const state = makeGame();
    const stateWithBandit = gameReducer(state, {
      type: 'MOVE_BANDIT',
      player: 'human',
      target: { q: 1, r: 0 },
    });
    const result = gameReducer(stateWithBandit, {
      type: 'SET_DICE_VALUE',
      value: 7,
      individualDice: [3, 4],
    });
    expect(result.dice.value).toBe(7);
    expect(result.dice.isAnimating).toBe(false);
  });

  it('REVEAL_HAND shows correct hand size for both players', () => {
    const state = makeGame();
    const withHumanHand = gameReducer(state, {
      type: 'DRAW_CARDS',
      player: 'human',
      count: 7,
    });
    const result = gameReducer(withHumanHand, { type: 'REVEAL_HAND', player: 'ai' });
    expect(result.message).toBe("You's hand: 7 cards");
  });
});
