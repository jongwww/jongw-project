import { evaluateHand } from "./hand";
import type { Card, Outcome } from "./types";

export function resolveOutcome(playerCards: Card[], dealerCards: Card[]): Outcome {
  const player = evaluateHand(playerCards);
  const dealer = evaluateHand(dealerCards);
  const playerBlackjack = playerCards.length === 2 && player.blackjack;
  const dealerBlackjack = dealerCards.length === 2 && dealer.blackjack;

  if (playerBlackjack && dealerBlackjack) return "push";
  if (playerBlackjack) return "player-blackjack";
  if (dealerBlackjack) return "dealer-win";
  if (player.total > 21) return "player-bust";
  if (dealer.total > 21) return "player-win";
  if (player.total > dealer.total) return "player-win";
  if (player.total < dealer.total) return "dealer-win";
  return "push";
}
