import { Card, CardSpec, CARD_DECK_SPECS, Deck } from '../types/game';

let cardIdCounter = 0;

function createCard(spec: CardSpec): Card {
  return {
    id: `card-${++cardIdCounter}-${Math.random().toString(36).slice(2, 6)}`,
    type: spec.type,
    subtype: spec.subtype,
  };
}

export function createDeck(): Deck {
  const cards: Card[] = [];
  for (const spec of CARD_DECK_SPECS) {
    for (let i = 0; i < spec.count; i++) {
      cards.push(createCard(spec));
    }
  }
  return shuffleDeck({ cards, discardPile: [] });
}

function shuffleDeck(deck: Deck): Deck {
  const shuffled = [...deck.cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { cards: shuffled, discardPile: deck.discardPile };
}

export function drawCard(deck: Deck, count: number): { card: Card; newDeck: Deck } {
  let current = { ...deck, cards: [...deck.cards] };
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (current.cards.length === 0) {
      current = { cards: shuffleCards(current.discardPile), discardPile: [] };
    }
    if (current.cards.length === 0) break;
    const card = current.cards.pop()!;
    drawn.push(card);
    current = { ...current, cards: [...current.cards] };
  }
  return { card: drawn[drawn.length - 1] || drawn[0]!, newDeck: current };
}

function shuffleCards(cards: Card[]): Card[] {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
