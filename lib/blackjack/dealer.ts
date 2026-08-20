import type { EvaluatedHand } from "./types";

export function shouldDealerHit(hand: EvaluatedHand): boolean {
  if (hand.total < 17) return true;
  if (hand.total === 17 && hand.soft) return true;
  return false;
}
