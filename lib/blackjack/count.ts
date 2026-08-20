import type { RoundState } from "./round";
import type { Card } from "./types";

const LOW_RANKS = new Set(["2", "3", "4", "5", "6"]);
const HIGH_RANKS = new Set(["10", "J", "Q", "K", "A"]);

export function hiLoValue(card: Card): -1 | 0 | 1 {
  if (LOW_RANKS.has(card.rank)) return 1;
  if (HIGH_RANKS.has(card.rank)) return -1;
  return 0;
}

export function sumHiLo(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + hiLoValue(card), 0);
}

export function visibleCards(round: RoundState): Card[] {
  if (round.split) {
    const dealer = round.split.dealerHoleRevealed
      ? round.split.dealerCards
      : round.split.dealerCards.slice(0, 1);
    return [
      ...round.split.hands[0].cards,
      ...round.split.hands[1].cards,
      ...dealer,
    ];
  }

  if (round.hand) {
    const dealer = round.hand.dealerHoleRevealed
      ? round.hand.dealerCards
      : round.hand.dealerCards.slice(0, 1);
    return [...round.hand.playerCards, ...dealer];
  }

  return [];
}

export function remainingDeck(round: RoundState, shoe: Card[]): Card[] {
  if (round.split) return round.split.deck;
  if (round.hand) return round.hand.deck;
  return shoe;
}

export function decksRemaining(round: RoundState, shoe: Card[]): number {
  return Math.round((remainingDeck(round, shoe).length / 52) * 10) / 10;
}

export function runningCount(round: RoundState, bankedRunningCount: number): number {
  return bankedRunningCount + sumHiLo(visibleCards(round));
}

export function trueCountFromRunning(
  runningCountValue: number,
  decks: number
): number {
  const safeDecks = Math.max(decks, 0.1);
  return Math.round((runningCountValue / safeDecks) * 10) / 10;
}

export function trueCount(
  round: RoundState,
  shoe: Card[],
  bankedRunningCount: number
): number {
  return trueCountFromRunning(
    runningCount(round, bankedRunningCount),
    decksRemaining(round, shoe)
  );
}
