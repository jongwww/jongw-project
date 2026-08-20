import { shouldDealerHit } from "./dealer";
import { evaluateHand } from "./hand";
import { resolveOutcome } from "./outcome";
import type { Card, Outcome } from "./types";

export type SplitHandStatus = "active" | "done";

export interface SplitHand {
  cards: Card[];
  status: SplitHandStatus;
  outcome: Outcome | null;
}

export type SplitPhase = "player-turn" | "dealer-turn" | "result";

export interface SplitState {
  deck: Card[];
  hands: [SplitHand, SplitHand];
  activeHandIndex: 0 | 1;
  dealerCards: Card[];
  dealerHoleRevealed: boolean;
  phase: SplitPhase;
}

export function canSplit(playerCards: Card[]): boolean {
  return (
    playerCards.length === 2 && playerCards[0].rank === playerCards[1].rank
  );
}

export function createSplitState(
  playerCards: [Card, Card],
  dealerCards: Card[],
  deck: Card[]
): SplitState {
  const remaining = [...deck];
  const hand1: SplitHand = {
    cards: [playerCards[0], remaining.shift()!],
    status: "active",
    outcome: null,
  };
  const hand2: SplitHand = {
    cards: [playerCards[1], remaining.shift()!],
    status: "active",
    outcome: null,
  };

  return {
    deck: remaining,
    hands: [hand1, hand2],
    activeHandIndex: 0,
    dealerCards,
    dealerHoleRevealed: false,
    phase: "player-turn",
  };
}

function resolveSplitHandOutcome(
  playerCards: Card[],
  dealerCards: Card[]
): Outcome {
  const outcome = resolveOutcome(playerCards, dealerCards);
  return outcome === "player-blackjack" ? "player-win" : outcome;
}

function withActiveHand(state: SplitState, hand: SplitHand): SplitState {
  const hands = [...state.hands] as [SplitHand, SplitHand];
  hands[state.activeHandIndex] = hand;
  return { ...state, hands };
}

function moveToNextHandOrDealer(state: SplitState): SplitState {
  if (state.activeHandIndex === 0) {
    return { ...state, activeHandIndex: 1 };
  }
  return { ...state, dealerHoleRevealed: true, phase: "dealer-turn" };
}

function finishAgainstDealer(state: SplitState): SplitState {
  const hands = state.hands.map((hand) => ({
    ...hand,
    outcome: resolveSplitHandOutcome(hand.cards, state.dealerCards),
  })) as [SplitHand, SplitHand];

  return { ...state, hands, dealerHoleRevealed: true, phase: "result" };
}

export function hit(state: SplitState): SplitState {
  if (state.phase !== "player-turn") return state;

  const remaining = [...state.deck];
  const card = remaining.shift()!;
  const hand = state.hands[state.activeHandIndex];
  const cards = [...hand.cards, card];

  let next = withActiveHand(
    { ...state, deck: remaining },
    { ...hand, cards }
  );

  if (evaluateHand(cards).total > 21) {
    next = withActiveHand(next, { ...next.hands[next.activeHandIndex], status: "done" });
    next = moveToNextHandOrDealer(next);
  }

  return next;
}

export function stand(state: SplitState): SplitState {
  if (state.phase !== "player-turn") return state;

  const hand = state.hands[state.activeHandIndex];
  const next = withActiveHand(state, { ...hand, status: "done" });
  return moveToNextHandOrDealer(next);
}

export function dealerStep(state: SplitState): SplitState {
  if (state.phase !== "dealer-turn") return state;

  const dealer = evaluateHand(state.dealerCards);
  if (!shouldDealerHit(dealer)) {
    return finishAgainstDealer(state);
  }

  const remaining = [...state.deck];
  const card = remaining.shift()!;
  return { ...state, deck: remaining, dealerCards: [...state.dealerCards, card] };
}
