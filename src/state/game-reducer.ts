import {
  GameState,
  PlayerId,
  PlayerState,
  GamePhase,
  TurnPhase,
  HexCoord,
  BuildingType,
  Card,
  Deck,
  coordKey,
  ResourceType,
  AIAction,
} from '../types/game';

// --- Action types ---

export type GameAction =
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'SET_TURN_PHASE'; phase: TurnPhase }
  | { type: 'ADVANCE_TURN' }
  | { type: 'PLACE_CASTLE'; player: PlayerId; tileKey: string }
  | { type: 'INITIAL_PLACEMENT_DONE' }
  | { type: 'DRAW_CARDS'; player: PlayerId; count: number }
  | { type: 'PLAY_CARD'; player: PlayerId; cardId: string }
  | { type: 'DISCARD_CARDS'; player: PlayerId; count: number }
  | { type: 'ADD_RESOURCES'; player: PlayerId; resources: Partial<Record<ResourceType, number>> }
  | { type: 'REMOVE_RESOURCES'; player: PlayerId; resources: Partial<Record<ResourceType, number>> }
  | { type: 'BUILD'; player: PlayerId; tileKey: string; building: BuildingType }
  | { type: 'UPGRADE'; player: PlayerId; tileKey: string; to: BuildingType }
  | { type: 'ROLL_DICE' }
  | { type: 'SET_DICE_VALUE'; value: number; individualDice: [number, number] }
  | { type: 'COLLECT_RESOURCES'; player: PlayerId }
  | { type: 'MOVE_BANDIT'; player: PlayerId; target: HexCoord }
  | { type: 'EXECUTE_TRADE'; from: PlayerId; to: PlayerId; offer: Partial<Record<ResourceType, number>>; request: Partial<Record<ResourceType, number>> }
  | { type: 'AI_ACT'; action: AIAction }
  | { type: 'RESET_GAME' }
  | { type: 'SET_MESSAGE'; message: string | null };

// --- Initial state ---

function createPlayer(id: PlayerId, name: string): PlayerState {
  return {
    id,
    name,
    resources: { wood: 0, stone: 0, grain: 0, ore: 0, livestock: 0 },
    hand: [],
    buildings: new Map(),
    victoryPoints: 0,
  };
}

export function createInitialState(): GameState {
  return {
    phase: 'setup',
    turnPhase: 'draw',
    currentPlayer: 'human',
    players: {
      human: createPlayer('human', 'You'),
      ai: createPlayer('ai', 'AI Opponent'),
    },
    board: [],
    dice: { value: null, isRolled: false, isAnimating: false, individualDice: [1, 1] },
    banditPosition: null,
    deck: { cards: [], discardPile: [] },
    turnCount: 0,
    winner: null,
    log: [],
    message: null,
  };
}

// --- Reducer ---

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'SET_TURN_PHASE':
      return { ...state, turnPhase: action.phase };

    case 'SET_MESSAGE':
      return { ...state, message: action.message };

    case 'SET_BOARD':
      return { ...state, board: action.board };

    case 'RESET_GAME': {
      const fresh = createInitialState();
      return { ...fresh, board: state.board, deck: state.deck };
    }

    // --- Setup: castle placement ---

    case 'PLACE_CASTLE': {
      const { player, tileKey } = action;
      const tile = state.board.find(t => coordKey(t.coord) === tileKey);
      if (!tile) return state;

      const playerState = { ...state.players[player] };
      const newBuildings = new Map(playerState.buildings);
      newBuildings.set(tileKey, 'farm'); // Initial placement is a farm

      return {
        ...state,
        players: {
          ...state.players,
          [player]: { ...playerState, buildings: newBuildings },
        },
        board: state.board.map(t =>
          coordKey(t.coord) === tileKey ? { ...t, building: { type: 'farm', owner: player } } : t
        ),
        currentPlayer: player === 'human' ? 'ai' : 'human',
      };
    }

    case 'INITIAL_PLACEMENT_DONE':
      return {
        ...state,
        phase: 'playing',
        turnPhase: 'draw',
        currentPlayer: 'human',
      };

    // --- Card drawing ---

    case 'DRAW_CARDS': {
      const { player, count } = action;
      let newDeck = { ...state.deck };
      const drawnCards: Card[] = [];

      for (let i = 0; i < count; i++) {
        if (newDeck.cards.length === 0) {
          newDeck = { cards: shuffleDeck(newDeck.discardPile), discardPile: [] };
        }
        if (newDeck.cards.length === 0) break;
        const card = newDeck.cards[newDeck.cards.length - 1];
        newDeck = { ...newDeck, cards: newDeck.cards.slice(0, -1) };
        drawnCards.push(card);
      }

      const playerState = { ...state.players[player] };
      const newHand = [...playerState.hand, ...drawnCards];

      return {
        ...state,
        players: {
          ...state.players,
          [player]: { ...playerState, hand: newHand },
        },
        deck: newDeck,
      };
    }

    // --- Card play ---

    case 'PLAY_CARD': {
      const { player, cardId } = action;
      const playerState = { ...state.players[player] };
      const hand = playerState.hand.filter(c => c.id !== cardId);
      const card = playerState.hand.find(c => c.id === cardId);
      if (!card) return state;

      const newDeck = { ...state.deck, discardPile: [...state.deck.discardPile, card] };

      return {
        ...state,
        players: {
          ...state.players,
          [player]: { ...playerState, hand },
        },
        deck: newDeck,
      };
    }

    case 'DISCARD_CARDS': {
      const { player, count } = action;
      const playerState = { ...state.players[player] };
      const hand = playerState.hand;

      if (hand.length <= count) return state;

      const toDiscard = hand.slice(hand.length - count);
      const newDeck = { ...state.deck, discardPile: [...state.deck.discardPile, ...toDiscard] };

      return {
        ...state,
        players: {
          ...state.players,
          [player]: { ...playerState, hand: hand.slice(0, hand.length - count) },
        },
        deck: newDeck,
      };
    }

    // --- Resources ---

    case 'ADD_RESOURCES': {
      const { player, resources } = action;
      const playerState = { ...state.players[player] };
      const newResources = { ...playerState.resources };

      for (const [resource, amount] of Object.entries(resources)) {
        newResources[resource as ResourceType] = (newResources[resource as ResourceType] || 0) + amount;
      }

      return {
        ...state,
        players: {
          ...state.players,
          [player]: { ...playerState, resources: newResources },
        },
      };
    }

    case 'REMOVE_RESOURCES': {
      const { player, resources } = action;
      const playerState = { ...state.players[player] };
      const newResources = { ...playerState.resources };

      for (const [resource, amount] of Object.entries(resources)) {
        newResources[resource as ResourceType] = (newResources[resource as ResourceType] || 0) - amount;
      }

      return {
        ...state,
        players: {
          ...state.players,
          [player]: { ...playerState, resources: newResources },
        },
      };
    }

    // --- Building ---

    case 'BUILD': {
      const { player, tileKey, building } = action;
      const tile = state.board.find(t => coordKey(t.coord) === tileKey);
      if (!tile) return state;

      const playerState = { ...state.players[player] };
      const newBuildings = new Map(playerState.buildings);
      newBuildings.set(tileKey, building);

      const newDeck = { ...state.deck };

      return {
        ...state,
        players: {
          ...state.players,
          [player]: { ...playerState, buildings: newBuildings },
        },
        board: state.board.map(t =>
          coordKey(t.coord) === tileKey ? { ...t, building: { type: building, owner: player } } : t
        ),
        deck: newDeck,
      };
    }

    case 'UPGRADE': {
      const { player, tileKey, to } = action;
      const playerState = { ...state.players[player] };
      const newBuildings = new Map(playerState.buildings);
      newBuildings.set(tileKey, to);

      return {
        ...state,
        players: {
          ...state.players,
          [player]: { ...playerState, buildings: newBuildings },
        },
        board: state.board.map(t =>
          coordKey(t.coord) === tileKey ? { ...t, building: { type: to, owner: player } } : t
        ),
      };
    }

    // --- Dice ---

    case 'ROLL_DICE': {
      const d1 = Math.ceil(Math.random() * 6);
      const d2 = Math.ceil(Math.random() * 6);
      return {
        ...state,
        dice: {
          value: d1 + d2,
          isRolled: true,
          isAnimating: true,
          individualDice: [d1, d2],
        },
      };
    }

    case 'SET_DICE_VALUE': {
      return {
        ...state,
        dice: {
          ...state.dice,
          value: action.value,
          individualDice: action.individualDice,
          isAnimating: false,
        },
      };
    }

    case 'COLLECT_RESOURCES': {
      // Handled by the game loop — resources are collected via ADD_RESOURCES action
      return state;
    }

    // --- Bandit ---

    case 'MOVE_BANDIT': {
      const { player, target } = action;
      const playerState = { ...state.players[player] };

      // Steal from players with buildings on bandit tile
      const targetTile = state.board.find(t => t.coord.q === target.q && t.coord.r === target.r);
      const stolen: Card[] = [];

      const newBoard = state.board.map(t =>
        coordKey(t.coord) === coordKey(target) ? { ...t, hasBandit: true } : t
      );

      return {
        ...state,
        banditPosition: target,
        board: newBoard,
        players: {
          ...state.players,
          [player]: playerState,
        },
      };
    }

    // --- Trade ---

    case 'EXECUTE_TRADE': {
      const { from, to, offer, request } = action;
      const fromState = { ...state.players[from] };
      const toState = { ...state.players[to] };

      // Check from player can afford offer
      for (const [resource, amount] of Object.entries(offer)) {
        if ((fromState.resources[resource as ResourceType] || 0) < amount) return state;
      }

      // Execute trade
      const newFromResources = { ...fromState.resources };
      const newToResources = { ...toState.resources };

      for (const [resource, amount] of Object.entries(offer)) {
        newFromResources[resource as ResourceType] -= amount;
      }
      for (const [resource, amount] of Object.entries(request)) {
        newFromResources[resource as ResourceType] = (newFromResources[resource as ResourceType] || 0) + amount;
        newToResources[resource as ResourceType] = (newToResources[resource as ResourceType] || 0) + amount;
      }

      return {
        ...state,
        players: {
          ...state.players,
          [from]: { ...fromState, resources: newFromResources },
          [to]: { ...toState, resources: newToResources },
        },
      };
    }

    // --- AI ---

    case 'AI_ACT': {
      // Handled by game loop logic
      return state;
    }

    // --- Turn management ---

    case 'ADVANCE_TURN': {
      const nextPhase = getNextPhase(state.turnPhase);

      if (nextPhase === 'draw') {
        // New turn
        return {
          ...state,
          turnCount: state.turnCount + 1,
          currentPlayer: state.currentPlayer === 'human' ? 'ai' : 'human',
          turnPhase: 'draw',
          dice: { value: null, isRolled: false, isAnimating: false, individualDice: [1, 1] },
        };
      }

      return {
        ...state,
        turnPhase: nextPhase,
        dice: { ...state.dice, isRolled: false },
      };
    }

    default:
      return state;
  }
}

function getNextPhase(phase: TurnPhase): TurnPhase {
  switch (phase) {
    case 'draw': return 'play';
    case 'play': return 'build';
    case 'build': return 'roll';
    case 'roll': return 'draw';
  }
}

function shuffleDeck(cards: Card[]): Card[] {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
