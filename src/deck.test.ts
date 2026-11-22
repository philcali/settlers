import { describe, expect, it } from 'vitest';
import { buildDeck, draw, newDeck, shuffleCards } from './deck';
import { mulberry32 } from './rng';

describe('buildDeck', () => {
  it('builds 92 unique cards with the expected composition', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(92);
    expect(new Set(deck.map((c) => c.id)).size).toBe(92);
    const counts = new Map<string, number>();
    for (const c of deck) counts.set(c.subtype, (counts.get(c.subtype) ?? 0) + 1);
    for (const res of ['wood', 'stone', 'grain', 'ore', 'livestock']) expect(counts.get(res)).toBe(12);
    for (const t of ['royal-decree', 'plague', 'crusade', 'spy-network', 'mercenary-company']) {
      expect(counts.get(t)).toBe(4);
    }
    for (const e of ['harvest-festival', 'famine', 'relic-hunt']) expect(counts.get(e)).toBe(4);
  });
});

describe('shuffleCards', () => {
  it('is deterministic for a given seed and preserves the multiset', () => {
    const cards = buildDeck();
    const a = shuffleCards(cards, mulberry32(5));
    const b = shuffleCards(cards, mulberry32(5));
    expect(a).toEqual(b);
    const sortKey = (cs: typeof cards) => cs.map((c) => c.id).sort().join('|');
    expect(sortKey(a)).toBe(sortKey(cards));
    expect(newDeck(mulberry32(1)).discard).toHaveLength(0);
  });
});

describe('draw', () => {
  it('draws from the deck and reshuffles the discard when it runs out', () => {
    const deck = newDeck(mulberry32(9));
    const first = draw(deck, 3, mulberry32(9));
    expect(first.drawn).toHaveLength(3);
    expect(first.deck.cards).toHaveLength(89);

    let cur = first.deck;
    const drained: typeof first.drawn = [];
    while (cur.cards.length > 0) {
      const r = draw(cur, cur.cards.length, mulberry32(1));
      drained.push(...r.drawn);
      cur = r.deck;
    }
    expect(cur.cards).toHaveLength(0);

    // Simulate all drawn cards (3 held + drained) being played/ditched.
    cur = { ...cur, discard: [...first.drawn, ...drained] };
    const again = draw(cur, 5, mulberry32(2));
    expect(again.drawn).toHaveLength(5);
    expect(again.deck.cards).toHaveLength(87);
    expect(again.drawn.length + again.deck.cards.length + again.deck.discard.length).toBe(92);
  });
});
