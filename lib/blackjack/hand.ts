import type { Card, EvaluatedHand, Rank } from "./types";

const RANK_VALUES: Record<Rank, number> = {
  A: 11,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 10,
  Q: 10,
  K: 10,
};

export function evaluateHand(cards: Card[]): EvaluatedHand {
  let total = 0;
  let aceCount = 0;

  for (const card of cards) {
    total += RANK_VALUES[card.rank];
    if (card.rank === "A") aceCount++;
  }

  let softAces = aceCount;
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces--;
  }

  return {
    total,
    soft: softAces > 0,
    blackjack: cards.length === 2 && total === 21,
  };
}
