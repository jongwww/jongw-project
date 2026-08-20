import { evaluateHand } from "./hand";
import { shouldDealerHit } from "./dealer";
import { resolveOutcome } from "./outcome";
import type { Card, Outcome } from "./types";

export type Phase = "insurance-offer" | "player-turn" | "dealer-turn" | "result";

export interface GameState {
  deck: Card[];
  playerCards: Card[];
  dealerCards: Card[];
  dealerHoleRevealed: boolean;
  phase: Phase;
  outcome: Outcome | null;
}

function finishWithOutcome(state: GameState): GameState {
  return {
    ...state,
    dealerHoleRevealed: true,
    phase: "result",
    outcome: resolveOutcome(state.playerCards, state.dealerCards),
  };
}

function startPlayerTurnOrFinish(state: GameState): GameState {
  const player = evaluateHand(state.playerCards);
  const dealer = evaluateHand(state.dealerCards);
  if (player.blackjack || dealer.blackjack) {
    return finishWithOutcome(state);
  }

  return { ...state, phase: "player-turn" };
}

export function createGame(deck: Card[]): GameState {
  const remaining = [...deck];
  const playerCards = [remaining.shift()!, remaining.shift()!];
  const dealerCards = [remaining.shift()!, remaining.shift()!];

  const state: GameState = {
    deck: remaining,
    playerCards,
    dealerCards,
    dealerHoleRevealed: false,
    phase: "player-turn",
    outcome: null,
  };

  if (dealerCards[0].rank === "A") {
    return { ...state, phase: "insurance-offer" };
  }

  return startPlayerTurnOrFinish(state);
}

export function resolveInsuranceOffer(state: GameState): GameState {
  if (state.phase !== "insurance-offer") return state;
  return startPlayerTurnOrFinish(state);
}

export function hit(state: GameState): GameState {
  if (state.phase !== "player-turn") return state;

  const remaining = [...state.deck];
  const card = remaining.shift()!;
  const playerCards = [...state.playerCards, card];
  const nextState: GameState = { ...state, deck: remaining, playerCards };

  const player = evaluateHand(playerCards);
  if (player.total > 21) {
    return finishWithOutcome(nextState);
  }

  return nextState;
}

export function stand(state: GameState): GameState {
  if (state.phase !== "player-turn") return state;

  return { ...state, dealerHoleRevealed: true, phase: "dealer-turn" };
}

export function dealerStep(state: GameState): GameState {
  if (state.phase !== "dealer-turn") return state;

  const dealer = evaluateHand(state.dealerCards);
  if (!shouldDealerHit(dealer)) {
    return finishWithOutcome(state);
  }

  const remaining = [...state.deck];
  const card = remaining.shift()!;
  const dealerCards = [...state.dealerCards, card];

  return { ...state, deck: remaining, dealerCards };
}
