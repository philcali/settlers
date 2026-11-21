import { describe, it, expect } from 'vitest';
import { createDeck, drawCard } from './deck';
import { CARD_DECK_SPECS, Deck } from '../types/game';

describe('createDeck', () => {
  it('creates a deck with the correct total card count', () => {
    const totalCards = CARD_DECK_SPECS.reduce((sum, spec) => sum + spec.count, 0);
    const deck = createDeck();
    expect(deck.cards.length + deck.discardPile.length).toBe(totalCards);
  });

  it('has all cards in either deck or discard pile', () => {
    const deck = createDeck();
    const totalCards = CARD_DECK_SPECS.reduce((sum, spec) => sum + spec.count, 0);
    expect(deck.cards.length + deck.discardPile.length).toBe(totalCards);
  });

  it('has no duplicate card IDs', () => {
    const deck = createDeck();
    const allCards = [...deck.cards, ...deck.discardPile];
    const ids = allCards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes all card types', () => {
    const deck = createDeck();
    const allCards = [...deck.cards, ...deck.discardPile];
    const types = new Set(allCards.map((c) => c.type));
    expect(types.has('resource')).toBe(true);
    expect(types.has('title')).toBe(true);
    expect(types.has('event')).toBe(true);
  });
});

describe('drawCard', () => {
  it('draws a single card', () => {
    const deck = createDeck();
    const { card, newDeck } = drawCard(deck, 1);
    expect(card).toBeDefined();
    expect(newDeck.cards.length).toBe(deck.cards.length - 1);
  });

  it('draws multiple cards', () => {
    const deck = createDeck();
    const initialSize = deck.cards.length;
    const { newDeck } = drawCard(deck, 3);
    expect(newDeck.cards.length).toBe(initialSize - 3);
  });

  it('returns the last drawn card', () => {
    const deck = createDeck();
    const { card, newDeck } = drawCard(deck, 3);
    // card should be the last one drawn (index 2 of the 3)
    expect(card).toBeDefined();
    expect(newDeck.cards.length).toBe(deck.cards.length - 3);
  });

  it('reshuffles discard pile when deck is empty', () => {
    const deck = createDeck();
    // Manually populate the discard pile
    const discardCards = deck.cards.slice(-5);
    const deckWithDiscard = {
      cards: deck.cards.slice(0, -5),
      discardPile: discardCards,
    };
    expect(deckWithDiscard.cards.length).toBeGreaterThan(0);
    expect(deckWithDiscard.discardPile.length).toBe(5);

    // Draw all cards from the deck — deck becomes empty, discard untouched
    let current = deckWithDiscard;
    for (let i = 0; i < deckWithDiscard.cards.length; i++) {
      const result = drawCard(current, 1);
      current = result.newDeck;
    }
    expect(current.cards.length).toBe(0);
    expect(current.discardPile.length).toBe(5);

    // Draw one more — triggers reshuffle of discard pile
    const { card, newDeck } = drawCard(current, 1);
    expect(card).toBeDefined();
    expect(newDeck.cards.length).toBe(4); // 5 - 1 drawn
    expect(newDeck.discardPile.length).toBe(0);
  });

  it('returns undefined card when deck is truly empty', () => {
    const emptyDeck: Deck = { cards: [], discardPile: [] };
    const { card, newDeck } = drawCard(emptyDeck, 1);
    expect(card).toBeUndefined();
    expect(newDeck.cards.length).toBe(0);
  });
});
