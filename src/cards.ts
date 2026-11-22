import type { Card, GameState, PlayerId, Resource } from './types';
import { coordKey, RESOURCES } from './types';
import { draw } from './deck';

export const CARD_NAMES: Record<string, string> = {
  wood: 'Wood',
  stone: 'Stone',
  grain: 'Grain',
  ore: 'Ore',
  livestock: 'Livestock',
  'royal-decree': 'Royal Decree',
  plague: 'Plague',
  crusade: 'Crusade',
  'spy-network': 'Spy Network',
  'mercenary-company': 'Mercenary Company',
  'harvest-festival': 'Harvest Festival',
  famine: 'Famine',
  'relic-hunt': 'Relic Hunt',
};

export const cardName = (card: Card): string => CARD_NAMES[card.subtype] ?? card.subtype;

const opponent = (p: PlayerId): PlayerId => (p === 'human' ? 'ai' : 'human');

function randomResource(rng: () => number): Resource {
  return RESOURCES[Math.floor(rng() * RESOURCES.length)]!;
}

/** Pull one random card from a hand into the discard pile. */
function discardRandom(
  hand: Card[],
  discard: Card[],
  rng: () => number,
): { hand: Card[]; discard: Card[] } {
  if (hand.length === 0) return { hand, discard };
  const card = hand[Math.floor(rng() * hand.length)]!;
  return { hand: hand.filter((c) => c.id !== card.id), discard: [...discard, card] };
}

/**
 * Apply a played card: move it from the hand to the discard, then run its effect.
 * Pure — all randomness comes from `rng`.
 */
export function applyCard(state: GameState, player: PlayerId, card: Card, rng: () => number): GameState {
  let s: GameState = {
    ...state,
    deck: { ...state.deck, discard: [...state.deck.discard, card] },
    players: {
      ...state.players,
      [player]: { ...state.players[player], hand: state.players[player].hand.filter((c) => c.id !== card.id) },
    },
  };

  const o = opponent(player);

  const gainRandom = (pid: PlayerId, amount: number) => {
    const resources = { ...s.players[pid].resources };
    for (let i = 0; i < amount; i++) resources[randomResource(rng)] += 1;
    s = { ...s, players: { ...s.players, [pid]: { ...s.players[pid], resources } } };
  };

  const drawFor = (pid: PlayerId, count: number) => {
    const r = draw(s.deck, count, rng);
    s = {
      ...s,
      deck: r.deck,
      players: { ...s.players, [pid]: { ...s.players[pid], hand: [...s.players[pid].hand, ...r.drawn] } },
    };
  };

  const loseRandom = (pid: PlayerId, count: number) => {
    for (let i = 0; i < count; i++) {
      const d = discardRandom(s.players[pid].hand, s.deck.discard, rng);
      s = {
        ...s,
        deck: { ...s.deck, discard: d.discard },
        players: { ...s.players, [pid]: { ...s.players[pid], hand: d.hand } },
      };
    }
  };

  switch (card.subtype) {
    case 'wood':
    case 'stone':
    case 'grain':
    case 'ore':
    case 'livestock': {
      const res = card.subtype as Resource;
      s = {
        ...s,
        players: {
          ...s.players,
          [player]: {
            ...s.players[player],
            resources: { ...s.players[player].resources, [res]: s.players[player].resources[res] + 1 },
          },
        },
      };
      break;
    }
    case 'royal-decree':
      drawFor(player, 1);
      break;
    case 'crusade':
    case 'relic-hunt':
      gainRandom(player, 3);
      break;
    case 'plague':
      loseRandom(o, 1);
      break;
    case 'spy-network':
      s = { ...s, reveal: { by: player, cards: [...s.players[o].hand], nonce: (s.reveal?.nonce ?? 0) + 1 } };
      break;
    case 'mercenary-company': {
      const targets = s.board.filter((t) => t.building?.owner === o);
      if (targets.length > 0) {
        const target = targets[Math.floor(rng() * targets.length)]!;
        const targetKey = coordKey(target.coord);
        s = {
          ...s,
          board: s.board.map((t) => (coordKey(t.coord) === targetKey ? { ...t, hasBandit: true } : { ...t, hasBandit: false })),
        };
      }
      break;
    }
    case 'harvest-festival':
      drawFor('human', 1);
      drawFor('ai', 1);
      break;
    case 'famine':
      loseRandom('human', 1);
      loseRandom('ai', 1);
      break;
  }

  return s;
}

/** Human-readable effect description for the message line. */
export function describeCard(card: Card, state: GameState, player: PlayerId): string {
  const o = opponent(player);
  switch (card.subtype) {
    case 'wood':
    case 'stone':
    case 'grain':
    case 'ore':
    case 'livestock':
      return `+1 ${card.subtype}`;
    case 'royal-decree':
      return 'you draw a card';
    case 'crusade':
    case 'relic-hunt':
      return 'you gain 3 random resources';
    case 'plague':
      return state.players[o].hand.length > 0 ? 'the opponent discards a card' : 'the opponent has no cards to lose';
    case 'spy-network':
      return "the opponent's hand is revealed";
    case 'mercenary-company':
      return state.board.some((t) => t.building?.owner === o)
        ? 'the robber moves onto an opponent tile'
        : 'no opponent tiles to target';
    case 'harvest-festival':
      return 'both players draw a card';
    case 'famine':
      return 'both players discard a card';
    default:
      return '';
  }
}
