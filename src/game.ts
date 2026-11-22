import type {
  BuildingType,
  GameAction,
  GameState,
  LogEntry,
  PlayerId,
  PlayerState,
  Resource,
} from './types';
import { BUILDING_COSTS, coordKey } from './types';
import { generateBoard } from './board';
import { draw, newDeck } from './deck';
import { mulberry32 } from './rng';
import { applyCard, cardName, describeCard } from './cards';
import { canBuild, canUpgrade, checkWinner, moveBandit, robberSteal, robberTargets, rollYields } from './rules';

const STARTER: Partial<Record<Resource, number>> = { wood: 2, stone: 1, grain: 1 };

export function createGame(seed: number): GameState {
  const rng = mulberry32(seed);
  const board = generateBoard(rng).map((t) => (t.province === 'desert' ? { ...t, hasBandit: true } : t));
  const empty = (): Record<Resource, number> => ({ wood: 0, stone: 0, grain: 0, ore: 0, livestock: 0 });
  return {
    phase: 'setup',
    turnPhase: 'roll',
    currentPlayer: 'human',
    placementsLeft: { human: 2, ai: 2 },
    players: {
      human: { id: 'human', name: 'You', resources: empty(), hand: [] },
      ai: { id: 'ai', name: 'AI', resources: empty(), hand: [] },
    },
    board,
    dice: { value: null, individual: null },
    deck: newDeck(rng),
    turnCount: 1,
    winner: null,
    message: 'Setup: place 2 farms each. Click a tile to place yours.',
    log: [],
    seed,
    reveal: null,
    aiPlayedCard: false,
    robberPending: null,
  };
}

function pushLog(state: GameState, player: PlayerId | null, action: string): LogEntry[] {
  return [...state.log.slice(-49), { turn: state.turnCount, player, action }];
}

function addStarter(p: PlayerState): PlayerState {
  const resources = { ...p.resources };
  for (const [res, n] of Object.entries(STARTER) as [Resource, number][]) resources[res] += n;
  return { ...p, resources };
}

function placeBuilding(
  state: GameState,
  player: PlayerId,
  tileKey: string,
  type: BuildingType,
): GameState {
  const cost = BUILDING_COSTS[type];
  const resources = { ...state.players[player].resources };
  for (const [res, n] of Object.entries(cost) as [Resource, number][]) resources[res] -= n;
  const board = state.board.map((t) =>
    coordKey(t.coord) === tileKey ? { ...t, building: { type, owner: player } } : t,
  );
  const winner = checkWinner({ ...state, board });
  return {
    ...state,
    board,
    players: { ...state.players, [player]: { ...state.players[player], resources } },
    phase: winner ? 'ended' : state.phase,
    winner,
    message: winner
      ? winner === 'human'
        ? 'You win! 🎉'
        : 'The AI wins this time.'
      : `${player === 'human' ? 'You' : 'AI'} built a ${type}.`,
    log: pushLog(state, player, `built ${type} at ${tileKey}`),
  };
}

export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createGame(action.seed);

    case 'PLACE_BUILDING': {
      const { player, tileKey } = action;
      if (state.phase !== 'setup' || state.currentPlayer !== player) return state;
      if (state.placementsLeft[player] <= 0) return state;
      const tile = state.board.find((t) => coordKey(t.coord) === tileKey);
      if (!tile || tile.building || tile.province === 'desert') return state;

      const placementsLeft = { ...state.placementsLeft, [player]: state.placementsLeft[player] - 1 };
      const board = state.board.map((t) =>
        coordKey(t.coord) === tileKey ? { ...t, building: { type: 'farm' as const, owner: player } } : t,
      );
      const log = pushLog(state, player, `placed farm at ${tileKey}`);

      if (placementsLeft.human === 0 && placementsLeft.ai === 0) {
        const rng = mulberry32(state.seed + 0x5eed);
        let deck = state.deck;
        let human = addStarter(state.players.human);
        let ai = addStarter(state.players.ai);
        const dh = draw(deck, 2, rng);
        deck = dh.deck;
        human = { ...human, hand: [...human.hand, ...dh.drawn] };
        const da = draw(deck, 2, rng);
        deck = da.deck;
        ai = { ...ai, hand: [...ai.hand, ...da.drawn] };
        return {
          ...state,
          board,
          placementsLeft,
          phase: 'playing',
          turnPhase: 'roll',
          currentPlayer: 'human',
          players: { human, ai },
          deck,
          message: 'Setup complete — starter resources granted. Roll the dice!',
          log: [...log, { turn: state.turnCount, player: null, action: 'both players drew 2 cards' }],
        };
      }

      const next: PlayerId = player === 'human' ? 'ai' : 'human';
      const message =
        next === 'ai'
          ? 'AI is placing a farm…'
          : placementsLeft.human === 1
            ? 'Place your second farm.'
            : 'Place your first farm.';
      return { ...state, board, placementsLeft, currentPlayer: next, message, log };
    }

    case 'ADD_RESOURCES':
    case 'REMOVE_RESOURCES': {
      const { player, resources } = action;
      const sign = action.type === 'ADD_RESOURCES' ? 1 : -1;
      const next = { ...state.players[player].resources };
      for (const [res, n] of Object.entries(resources) as [Resource, number][]) {
        next[res] = Math.max(0, next[res] + sign * n);
      }
      return {
        ...state,
        players: { ...state.players, [player]: { ...state.players[player], resources: next } },
      };
    }

    case 'DRAW_CARDS': {
      const { player, count, seed } = action;
      const result = draw(state.deck, count, mulberry32(seed));
      if (result.drawn.length === 0) return state;
      return {
        ...state,
        deck: result.deck,
        players: {
          ...state.players,
          [player]: { ...state.players[player], hand: [...state.players[player].hand, ...result.drawn] },
        },
        log: pushLog(state, player, `drew ${result.drawn.length} card${result.drawn.length === 1 ? '' : 's'}`),
      };
    }

    case 'BUILD': {
      if (!canBuild(state, action.player, action.tileKey, action.building)) return state;
      return placeBuilding(state, action.player, action.tileKey, action.building);
    }

    case 'UPGRADE': {
      if (!canUpgrade(state, action.player, action.tileKey, action.to)) return state;
      const next = placeBuilding(state, action.player, action.tileKey, action.to);
      if (next === state || next.winner) return next; // keep the victory message
      return { ...next, message: `${action.player === 'human' ? 'You' : 'AI'} upgraded to a ${action.to}.` };
    }

    case 'MOVE_BANDIT': {
      if (state.phase !== 'playing' || state.robberPending !== action.player) return state;
      if (!robberTargets(state, action.player).includes(action.tileKey)) return state;
      const next = moveBandit(state, action.tileKey);
      const tile = state.board.find((t) => coordKey(t.coord) === action.tileKey);
      const who = action.player === 'human' ? 'You' : 'AI';
      return {
        ...next,
        robberPending: null,
        message: tile?.province ? `${who} moved the bandit onto the ${tile.province}.` : `${who} moved the bandit.`,
        log: pushLog(state, action.player, `moved the bandit to ${action.tileKey}`),
      };
    }

    case 'SET_TURN_PHASE':
      return { ...state, turnPhase: action.phase };

    case 'ADVANCE_TURN': {
      if (state.phase !== 'playing') return state;
      let base = state;
      // The bandit must be placed before the turn can pass; as a last resort drop it on
      // its first legal tile so a turn can never get stuck.
      if (state.robberPending !== null) {
        const keys = robberTargets(state, state.robberPending);
        if (keys.length > 0) base = moveBandit(base, keys[0]!);
      }
      const next: PlayerId = base.currentPlayer === 'human' ? 'ai' : 'human';
      const drawn = draw(base.deck, 1, mulberry32(action.seed));
      return {
        ...base,
        currentPlayer: next,
        turnPhase: 'roll',
        turnCount: next === 'human' ? base.turnCount + 1 : base.turnCount,
        dice: { value: null, individual: null },
        deck: drawn.deck,
        players: {
          ...base.players,
          [next]: { ...base.players[next], hand: [...base.players[next].hand, ...drawn.drawn] },
        },
        robberPending: null,
        aiPlayedCard: false,
        message: next === 'ai' ? 'AI is taking its turn…' : 'Your turn — roll the dice!',
        log: pushLog(base, next, 'drew a card'),
      };
    }

    case 'PLAY_CARD': {
      const { player, cardId, seed } = action;
      if (state.phase !== 'playing' || state.currentPlayer !== player) return state;
      const card = state.players[player].hand.find((c) => c.id === cardId);
      if (!card) return state;
      const rng = mulberry32(seed);
      const next = applyCard(state, player, card, rng);
      const who = player === 'human' ? 'You' : 'AI';
      return {
        ...next,
        aiPlayedCard: player === 'ai' ? true : state.aiPlayedCard,
        message: `${who} played ${cardName(card)} — ${describeCard(card, state, player)}.`,
        log: pushLog(state, player, `played ${cardName(card)}`),
      };
    }

    case 'ROLL_DICE': {
      if (state.phase !== 'playing' || state.dice.individual !== null) return state;
      const { value, individual, seed } = action;

      if (value === 7) {
        const { next, stole } = robberSteal(state, state.currentPlayer, mulberry32(seed));
        const youRoll = state.currentPlayer === 'human';
        const stealMsg = stole
          ? `${youRoll ? 'You' : 'The AI'} stole 1 ${stole} from ${youRoll ? 'the AI' : 'you'}.`
          : 'There was too little to steal.';
        const message = youRoll
          ? `Rolled 7 — ${stealMsg} Tap a glowing tile to move the bandit.`
          : `Rolled 7 — ${stealMsg} The AI is moving the bandit…`;
        return {
          ...next,
          dice: { value, individual },
          turnPhase: 'build',
          robberPending: state.currentPlayer,
          message,
          log: pushLog(state, state.currentPlayer, `rolled 7${stole ? `, stole ${stole}` : ''}`),
        };
      }

      const gains = rollYields(state.board, value);

      const players = { ...state.players };
      const parts: string[] = [];
      for (const pid of ['human', 'ai'] as const) {
        const g = gains[pid];
        const entries = Object.entries(g) as [Resource, number][];
        if (entries.length === 0) continue;
        const resources = { ...players[pid].resources };
        for (const [res, n] of entries) resources[res] += n;
        players[pid] = { ...players[pid], resources };
        parts.push(`${pid === 'human' ? 'You' : 'AI'}: +${entries.map(([res, n]) => `${n} ${res}`).join(', ')}`);
      }

      const blocked = state.board.filter((t) => t.hasBandit && t.numberToken === value && t.building).length;
      const desc =
        parts.length > 0 ? parts.join(' · ') : `nobody produced${blocked ? ` (robber blocks ${blocked})` : ''}`;

      return {
        ...state,
        dice: { value, individual },
        players,
        turnPhase: 'build',
        message: `Rolled ${value} (${individual[0]}+${individual[1]}) — ${desc}.`,
        log: pushLog(state, state.currentPlayer, `rolled ${value} (${individual[0]}+${individual[1]})`),
      };
    }

    case 'SET_MESSAGE':
      return { ...state, message: action.message };
  }
}
