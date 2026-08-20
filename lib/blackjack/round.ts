import {
  createGame,
  dealerStep as engineDealerStep,
  hit as engineHit,
  resolveInsuranceOffer,
  stand as engineStand,
  type GameState as HandState,
} from "./game";
import { evaluateHand } from "./hand";
import {
  canSplit as canSplitCards,
  createSplitState,
  dealerStep as splitDealerStep,
  hit as splitHit,
  stand as splitStand,
  type SplitState,
} from "./split";
import type { Card, Outcome } from "./types";

export type RoundPhase =
  | "betting"
  | "insurance-offer"
  | "player-turn"
  | "dealer-turn"
  | "result";

export type InsuranceResult = "won" | "lost";

export interface RoundState {
  funds: number;
  bet: number | null;
  hand: HandState | null;
  split: SplitState | null;
  phase: RoundPhase;
  lastInsuranceResult: InsuranceResult | null;
}

export function startBetting(funds: number): RoundState {
  return {
    funds,
    bet: null,
    hand: null,
    split: null,
    phase: "betting",
    lastInsuranceResult: null,
  };
}

export const MIN_BET = 100;

export function isValidBet(funds: number, amount: number): boolean {
  return Number.isInteger(amount) && amount > 0 && amount <= funds;
}

export function insuranceAmount(bet: number): number {
  return Math.floor(bet / 2);
}

export function canTakeInsurance(state: RoundState): boolean {
  return (
    state.phase === "insurance-offer" &&
    state.bet !== null &&
    state.funds >= state.bet + insuranceAmount(state.bet)
  );
}

export function canDoubleDown(state: RoundState): boolean {
  return (
    state.phase === "player-turn" &&
    state.hand !== null &&
    state.hand.playerCards.length === 2 &&
    state.bet !== null &&
    state.bet * 2 <= state.funds
  );
}

export function canSplit(state: RoundState): boolean {
  return (
    state.phase === "player-turn" &&
    state.hand !== null &&
    canSplitCards(state.hand.playerCards) &&
    state.bet !== null &&
    state.bet * 2 <= state.funds
  );
}

function payout(bet: number, outcome: Outcome): number {
  switch (outcome) {
    case "player-blackjack":
      return Math.floor(bet * 1.5);
    case "player-win":
      return bet;
    case "push":
      return 0;
    case "player-bust":
    case "dealer-win":
      return -bet;
  }
}

function withHand(state: RoundState, hand: HandState): RoundState {
  if (hand.phase !== "result" || state.bet === null) {
    return { ...state, hand, phase: hand.phase };
  }

  return {
    ...state,
    hand,
    phase: "result",
    funds: state.funds + payout(state.bet, hand.outcome!),
  };
}

function withSplit(state: RoundState, split: SplitState): RoundState {
  if (split.phase !== "result" || state.bet === null) {
    return { ...state, split, phase: split.phase };
  }

  const [hand1, hand2] = split.hands;
  const total =
    payout(state.bet, hand1.outcome!) + payout(state.bet, hand2.outcome!);

  return {
    ...state,
    split,
    phase: "result",
    funds: state.funds + total,
  };
}

export function placeBet(
  state: RoundState,
  amount: number,
  deck: Card[]
): RoundState {
  if (state.phase !== "betting") return state;
  if (!isValidBet(state.funds, amount)) return state;

  return withHand(
    { ...state, bet: amount, lastInsuranceResult: null },
    createGame(deck)
  );
}

export function hit(state: RoundState): RoundState {
  if (state.split) {
    if (state.split.phase !== "player-turn") return state;
    return withSplit(state, splitHit(state.split));
  }
  if (state.phase !== "player-turn" || !state.hand) return state;
  return withHand(state, engineHit(state.hand));
}

export function stand(state: RoundState): RoundState {
  if (state.split) {
    if (state.split.phase !== "player-turn") return state;
    return withSplit(state, splitStand(state.split));
  }
  if (state.phase !== "player-turn" || !state.hand) return state;
  return withHand(state, engineStand(state.hand));
}

export function dealerStep(state: RoundState): RoundState {
  if (state.split) {
    if (state.split.phase !== "dealer-turn") return state;
    return withSplit(state, splitDealerStep(state.split));
  }
  if (state.phase !== "dealer-turn" || !state.hand) return state;
  return withHand(state, engineDealerStep(state.hand));
}

export function split(state: RoundState): RoundState {
  if (!canSplit(state)) return state;

  const hand = state.hand!;
  const splitState = createSplitState(
    [hand.playerCards[0], hand.playerCards[1]],
    hand.dealerCards,
    hand.deck
  );

  return withSplit({ ...state, hand: null }, splitState);
}

export function doubleDown(state: RoundState): RoundState {
  if (!canDoubleDown(state)) return state;

  const doubled = { ...state, bet: state.bet! * 2 };
  const afterHit = engineHit(state.hand!);

  if (afterHit.phase === "result") {
    return withHand(doubled, afterHit);
  }

  return withHand(doubled, engineStand(afterHit));
}

export function takeInsurance(state: RoundState): RoundState {
  if (!canTakeInsurance(state)) return state;

  const amount = insuranceAmount(state.bet!);
  const dealerHasBlackjack = evaluateHand(state.hand!.dealerCards).blackjack;
  const funds = state.funds + (dealerHasBlackjack ? amount * 2 : -amount);
  const lastInsuranceResult: InsuranceResult = dealerHasBlackjack
    ? "won"
    : "lost";

  return withHand(
    { ...state, funds, lastInsuranceResult },
    resolveInsuranceOffer(state.hand!)
  );
}

export function declineInsurance(state: RoundState): RoundState {
  if (state.phase !== "insurance-offer" || !state.hand) return state;
  return withHand(state, resolveInsuranceOffer(state.hand));
}

export function startNextRound(state: RoundState): RoundState {
  return startBetting(state.funds);
}
