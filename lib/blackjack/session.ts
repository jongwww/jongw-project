import {
  canDoubleDown as roundCanDoubleDown,
  canSplit as roundCanSplit,
  canTakeInsurance as roundCanTakeInsurance,
  dealerStep as roundDealerStep,
  declineInsurance as roundDeclineInsurance,
  doubleDown as roundDoubleDown,
  hit as roundHit,
  placeBet as roundPlaceBet,
  split as roundSplit,
  stand as roundStand,
  startBetting,
  takeInsurance as roundTakeInsurance,
  type RoundState,
} from "./round";
import type { Card, Outcome } from "./types";

export type SessionPhase =
  | "betting"
  | "insurance-offer"
  | "player-turn"
  | "dealer-turn"
  | "result"
  | "session-over";

export interface HandRecord {
  handNumber: number;
  bet: number;
  outcome: Outcome;
  fundsAfter: number;
}

export interface SessionState {
  startingFunds: number;
  round: RoundState;
  handNumber: number;
  records: HandRecord[];
  phase: SessionPhase;
}

export const MAX_HANDS = 20;

export function startSession(startingFunds: number): SessionState {
  return {
    startingFunds,
    round: startBetting(startingFunds),
    handNumber: 0,
    records: [],
    phase: "betting",
  };
}

export function isSessionOver(session: SessionState): boolean {
  return session.handNumber >= MAX_HANDS || session.round.funds <= 0;
}

function withRound(session: SessionState, round: RoundState): SessionState {
  const justFinished =
    session.round.phase !== "result" && round.phase === "result";

  if (!justFinished) {
    return { ...session, round, phase: round.phase };
  }

  const handNumber = session.handNumber + 1;
  const newRecords: HandRecord[] = round.split
    ? round.split.hands.map((hand) => ({
        handNumber,
        bet: round.bet!,
        outcome: hand.outcome!,
        fundsAfter: round.funds,
      }))
    : [
        {
          handNumber,
          bet: round.bet!,
          outcome: round.hand!.outcome!,
          fundsAfter: round.funds,
        },
      ];

  return {
    ...session,
    round,
    handNumber,
    records: [...session.records, ...newRecords],
    phase: "result",
  };
}

export function placeBet(
  session: SessionState,
  amount: number,
  deck: Card[]
): SessionState {
  if (session.phase !== "betting") return session;
  return withRound(session, roundPlaceBet(session.round, amount, deck));
}

export function hit(session: SessionState): SessionState {
  if (session.phase !== "player-turn") return session;
  return withRound(session, roundHit(session.round));
}

export function stand(session: SessionState): SessionState {
  if (session.phase !== "player-turn") return session;
  return withRound(session, roundStand(session.round));
}

export function dealerStep(session: SessionState): SessionState {
  if (session.phase !== "dealer-turn") return session;
  return withRound(session, roundDealerStep(session.round));
}

export function canTakeInsurance(session: SessionState): boolean {
  return (
    session.phase === "insurance-offer" &&
    roundCanTakeInsurance(session.round)
  );
}

export function takeInsurance(session: SessionState): SessionState {
  if (session.phase !== "insurance-offer") return session;
  return withRound(session, roundTakeInsurance(session.round));
}

export function declineInsurance(session: SessionState): SessionState {
  if (session.phase !== "insurance-offer") return session;
  return withRound(session, roundDeclineInsurance(session.round));
}

export function canDoubleDown(session: SessionState): boolean {
  return session.phase === "player-turn" && roundCanDoubleDown(session.round);
}

export function doubleDown(session: SessionState): SessionState {
  if (session.phase !== "player-turn") return session;
  return withRound(session, roundDoubleDown(session.round));
}

export function canSplit(session: SessionState): boolean {
  return session.phase === "player-turn" && roundCanSplit(session.round);
}

export function split(session: SessionState): SessionState {
  if (session.phase !== "player-turn") return session;
  return withRound(session, roundSplit(session.round));
}

export function advance(session: SessionState): SessionState {
  if (session.phase !== "result") return session;
  if (isSessionOver(session)) {
    return { ...session, phase: "session-over" };
  }
  return {
    ...session,
    round: startBetting(session.round.funds),
    phase: "betting",
  };
}

export function startNewSession(session: SessionState): SessionState {
  return startSession(session.startingFunds);
}
