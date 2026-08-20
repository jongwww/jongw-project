import { createOrderedDeck, shuffle } from "./deck";
import type { Card } from "./types";

export const SHOE_DECKS = 6;
export const SHOE_SIZE = SHOE_DECKS * 52;
export const RESHUFFLE_THRESHOLD = 0.25;

export function createShoe(): Card[] {
  const combined: Card[] = [];
  for (let i = 0; i < SHOE_DECKS; i++) {
    combined.push(...createOrderedDeck());
  }
  return shuffle(combined);
}

export function needsReshuffle(remainingCards: number): boolean {
  return remainingCards / SHOE_SIZE < RESHUFFLE_THRESHOLD;
}
