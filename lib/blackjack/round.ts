import {
  createGame,
  dealerStep as engineDealerStep,
  hit as engineHit,
  stand as engineStand,
  type GameState as HandState,
} from "./game";
import type { Card, Outcome } from "./types";

export type RoundPhase = "betting" | "player-turn" | "dealer-turn" | "result";

export interface RoundState {
  funds: number;
  bet: number | null;
  hand: HandState | null;
  phase: RoundPhase;
}

export function startBetting(funds: number): RoundState {
  return { funds, bet: null, hand: null, phase: "betting" };
}

export function isValidBet(funds: number, amount: number): boolean {
  return Number.isInteger(amount) && amount > 0 && amount <= funds;
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

export function placeBet(
  state: RoundState,
  amount: number,
  deck: Card[]
): RoundState {
  if (state.phase !== "betting") return state;
  if (!isValidBet(state.funds, amount)) return state;

  return withHand({ ...state, bet: amount }, createGame(deck));
}

export function hit(state: RoundState): RoundState {
  if (state.phase !== "player-turn" || !state.hand) return state;
  return withHand(state, engineHit(state.hand));
}

export function stand(state: RoundState): RoundState {
  if (state.phase !== "player-turn" || !state.hand) return state;
  return withHand(state, engineStand(state.hand));
}

export function dealerStep(state: RoundState): RoundState {
  if (state.phase !== "dealer-turn" || !state.hand) return state;
  return withHand(state, engineDealerStep(state.hand));
}

export function startNextRound(state: RoundState): RoundState {
  return startBetting(state.funds);
}
