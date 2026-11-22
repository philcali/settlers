import type { Card, Deck } from './types';
import { CARD_SPECS } from './types';

/** All 92 cards, with stable unique ids. */
export function buildDeck(): Card[] {
  const cards: Card[] = [];
  for (const spec of CARD_SPECS) {
    for (let i = 0; i < spec.count; i++) {
      cards.push({ id: `${spec.subtype}-${i}`, type: spec.type, subtype: spec.subtype });
    }
  }
  return cards;
}

export function shuffleCards(cards: Card[], rng: () => number): Card[] {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newDeck(rng: () => number): Deck {
  return { cards: shuffleCards(buildDeck(), rng), discard: [] };
}

/** Draw up to `count` cards, reshuffling the discard pile when the deck runs out. */
export function draw(deck: Deck, count: number, rng: () => number): { deck: Deck; drawn: Card[] } {
  let cards = [...deck.cards];
  let discard = [...deck.discard];
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (cards.length === 0 && discard.length > 0) {
      cards = shuffleCards(discard, rng);
      discard = [];
    }
    const card = cards.pop();
    if (card === undefined) break;
    drawn.push(card);
  }
  return { deck: { cards, discard }, drawn };
}
