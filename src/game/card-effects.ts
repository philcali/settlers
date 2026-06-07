import {
  GameState,
  PlayerId,
  Card,
  HexCoord,
  coordKey,
  ResourceType,
} from '../types/game';

// --- Effect types ---

export type CardEffect =
  | { type: 'DRAW_CARDS'; count: number; target: PlayerId }
  | { type: 'GAIN_RESOURCES'; count: number; target: PlayerId }
  | { type: 'DISCARD_RANDOM'; count: number; target: PlayerId }
  | { type: 'REVEAL_OPPONENT_HAND'; player: PlayerId }
  | { type: 'MOVE_BANDIT'; target: HexCoord };

// --- Effect definitions per card subtype ---

export function getCardEffects(card: Card, player: PlayerId): CardEffect[] {
  const opponent: PlayerId = player === 'human' ? 'ai' : 'human';

  switch (card.subtype) {
    case 'royal-decree':
      return [{ type: 'DRAW_CARDS', count: 1, target: player }];

    case 'plague':
      return [{ type: 'DISCARD_RANDOM', count: 1, target: opponent }];

    case 'crusade':
      return [{ type: 'GAIN_RESOURCES', count: 3, target: player }];

    case 'spy-network':
      return [{ type: 'REVEAL_OPPONENT_HAND', player }];

    case 'mercenary-company':
      return [{ type: 'MOVE_BANDIT', target: { q: 0, r: 0 } }];

    case 'harvest-festival':
      return [
        { type: 'DRAW_CARDS', count: 1, target: 'human' },
        { type: 'DRAW_CARDS', count: 1, target: 'ai' },
      ];

    case 'famine':
      return [
        { type: 'DISCARD_RANDOM', count: 1, target: 'human' },
        { type: 'DISCARD_RANDOM', count: 1, target: 'ai' },
      ];

    case 'relic-hunt':
      return [{ type: 'GAIN_RESOURCES', count: 3, target: player }];

    default:
      return [];
  }
}

// --- Helper: find a tile with the player's building ---

export function getBanditTarget(
  board: GameState['board'],
  player: PlayerId,
): HexCoord | null {
  const owned = board.filter(
    (t) => t.building?.owner === player,
  );
  if (owned.length === 0) return null;
  const pick = owned[Math.floor(Math.random() * owned.length)];
  return pick.coord;
}

// --- Helper: apply effects to state ---

export function applyEffects(
  state: GameState,
  player: PlayerId,
  effects: CardEffect[],
): GameState {
  let current = state;

  for (const effect of effects) {
    switch (effect.type) {
      case 'DRAW_CARDS': {
        const targetHand = current.players[effect.target].hand;
        const newDeck = {
          ...current.deck,
          cards: [...current.deck.cards],
        };

        for (let i = 0; i < effect.count; i++) {
          if (newDeck.cards.length === 0) {
            newDeck.cards = shuffleDeck(newDeck.discardPile);
            newDeck.discardPile = [];
          }
          if (newDeck.cards.length === 0) break;
          const card = newDeck.cards[newDeck.cards.length - 1];
          newDeck.cards = newDeck.cards.slice(0, -1);
          targetHand.push(card);
        }

        current = {
          ...current,
          players: {
            ...current.players,
            [effect.target]: {
              ...current.players[effect.target],
              hand: targetHand,
            },
          },
          deck: newDeck,
          log: [
            ...current.log,
            {
              turn: current.turnCount,
              player: effect.target,
              action: `drew ${effect.count} card${effect.count > 1 ? 's' : ''}`,
            },
          ],
        };
        break;
      }

      case 'GAIN_RESOURCES': {
        const resources: Partial<Record<ResourceType, number>> = {};
        const types: ResourceType[] = ['wood', 'stone', 'grain', 'ore', 'livestock'];
        for (let i = 0; i < effect.count; i++) {
          const res = types[Math.floor(Math.random() * types.length)];
          resources[res] = (resources[res] || 0) + 1;
        }

        current = {
          ...current,
          players: {
            ...current.players,
            [effect.target]: {
              ...current.players[effect.target],
              resources: {
                ...current.players[effect.target].resources,
                ...resources,
              },
            },
          },
          log: [
            ...current.log,
            {
              turn: current.turnCount,
              player: effect.target,
              action: `gained ${effect.count} random resource${effect.count > 1 ? 's' : ''}`,
            },
          ],
        };
        break;
      }

      case 'DISCARD_RANDOM': {
        const targetHand = current.players[effect.target].hand;
        if (targetHand.length > 0) {
          const toDiscard = targetHand[targetHand.length - 1];
          current = {
            ...current,
            players: {
              ...current.players,
              [effect.target]: {
                ...current.players[effect.target],
                hand: targetHand.slice(0, -1),
              },
            },
            deck: {
              ...current.deck,
              discardPile: [...current.deck.discardPile, toDiscard],
            },
            log: [
              ...current.log,
              {
                turn: current.turnCount,
                player: effect.target,
                action: 'discarded a card',
              },
            ],
          };
        }
        break;
      }

      case 'REVEAL_OPPONENT_HAND': {
        const opponentId = effect.player === 'human' ? 'ai' : 'human';
        const handSize = current.players[opponentId].hand.length;
        current = {
          ...current,
          message: `AI's hand: ${handSize} card${handSize !== 1 ? 's' : ''}`,
          log: [
            ...current.log,
            {
              turn: current.turnCount,
              player: effect.player,
              action: 'peered at opponent\'s hand',
            },
          ],
        };
        break;
      }

      case 'MOVE_BANDIT': {
        current = {
          ...current,
          banditPosition: effect.target,
          board: current.board.map((t) =>
            coordKey(t.coord) === coordKey(effect.target)
              ? { ...t, hasBandit: true }
              : { ...t, hasBandit: false },
          ),
          log: [
            ...current.log,
            {
              turn: current.turnCount,
              player,
              action: 'moved the bandit',
            },
          ],
        };
        break;
      }
    }
  }

  return current;
}

// --- Generate random resources ---

export function generateRandomResources(count: number): Partial<Record<ResourceType, number>> {
  const resources: Partial<Record<ResourceType, number>> = {};
  const types: ResourceType[] = ['wood', 'stone', 'grain', 'ore', 'livestock'];
  for (let i = 0; i < count; i++) {
    const res = types[Math.floor(Math.random() * types.length)];
    resources[res] = (resources[res] || 0) + 1;
  }
  return resources;
}

// --- Internal shuffle helper ---

function shuffleDeck(cards: Card[]): Card[] {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
