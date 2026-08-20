import { evaluateHand } from "./hand";
import type { Card, Rank } from "./types";

export type StrategyAction = "hit" | "stand" | "double" | "split";

type TableAction = "H" | "S" | "D" | "Ds" | "P";

export const DEALER_COLUMNS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "A",
] as const;

export type DealerColumn = (typeof DEALER_COLUMNS)[number];

type ActionRow = Record<DealerColumn, TableAction>;

function row(...actions: TableAction[]): ActionRow {
  const entries = DEALER_COLUMNS.map((col, i) => [col, actions[i]] as const);
  return Object.fromEntries(entries) as ActionRow;
}

// 하드 총합(에이스를 11로 셀 수 없거나 없는 손). 8 이하는 항상 히트, 17 이상은 항상 스탠드로 취급한다.
export const HARD_TABLE: Record<string, ActionRow> = {
  8: row("H", "H", "H", "H", "H", "H", "H", "H", "H", "H"),
  9: row("H", "D", "D", "D", "D", "H", "H", "H", "H", "H"),
  10: row("D", "D", "D", "D", "D", "D", "D", "D", "H", "H"),
  11: row("D", "D", "D", "D", "D", "D", "D", "D", "D", "D"),
  12: row("H", "H", "S", "S", "S", "H", "H", "H", "H", "H"),
  13: row("S", "S", "S", "S", "S", "H", "H", "H", "H", "H"),
  14: row("S", "S", "S", "S", "S", "H", "H", "H", "H", "H"),
  15: row("S", "S", "S", "S", "S", "H", "H", "H", "H", "H"),
  16: row("S", "S", "S", "S", "S", "H", "H", "H", "H", "H"),
  17: row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
};

// 소프트 총합(에이스를 11로 셀 수 있는 손). 13(A,2)부터 20(A,9)까지.
export const SOFT_TABLE: Record<string, ActionRow> = {
  13: row("H", "H", "H", "D", "D", "H", "H", "H", "H", "H"),
  14: row("H", "H", "H", "D", "D", "H", "H", "H", "H", "H"),
  15: row("H", "H", "D", "D", "D", "H", "H", "H", "H", "H"),
  16: row("H", "H", "D", "D", "D", "H", "H", "H", "H", "H"),
  17: row("H", "D", "D", "D", "D", "H", "H", "H", "H", "H"),
  18: row("S", "Ds", "Ds", "Ds", "Ds", "S", "S", "H", "H", "H"),
  19: row("S", "S", "S", "S", "Ds", "S", "S", "S", "S", "S"),
  20: row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
};

// 페어(처음 두 장의 랭크가 같은 손). "10"은 10/J/Q/K를 모두 포함한다.
export const PAIR_TABLE: Record<string, ActionRow> = {
  "2": row("P", "P", "P", "P", "P", "P", "H", "H", "H", "H"),
  "3": row("P", "P", "P", "P", "P", "P", "H", "H", "H", "H"),
  "4": row("H", "H", "H", "P", "P", "H", "H", "H", "H", "H"),
  "5": row("D", "D", "D", "D", "D", "D", "D", "D", "H", "H"),
  "6": row("P", "P", "P", "P", "P", "H", "H", "H", "H", "H"),
  "7": row("P", "P", "P", "P", "P", "P", "H", "H", "H", "H"),
  "8": row("P", "P", "P", "P", "P", "P", "P", "P", "P", "P"),
  "9": row("P", "P", "P", "P", "P", "S", "P", "P", "S", "S"),
  "10": row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
  A: row("P", "P", "P", "P", "P", "P", "P", "P", "P", "P"),
};

const TEN_RANKS: Rank[] = ["10", "J", "Q", "K"];

export function dealerColumn(card: Card): DealerColumn {
  if (card.rank === "A") return "A";
  if (TEN_RANKS.includes(card.rank)) return "10";
  return card.rank as DealerColumn;
}

function pairKey(card: Card): string {
  if (card.rank === "A") return "A";
  if (TEN_RANKS.includes(card.rank)) return "10";
  return card.rank;
}

function isPair(cards: Card[]): boolean {
  return cards.length === 2 && cards[0].rank === cards[1].rank;
}

function resolveTableAction(
  action: TableAction,
  canDouble: boolean
): StrategyAction {
  if (action === "D") return canDouble ? "double" : "hit";
  if (action === "Ds") return canDouble ? "double" : "stand";
  if (action === "P") return "split";
  if (action === "S") return "stand";
  return "hit";
}

export interface StrategyLocation {
  table: "hard" | "soft" | "pair";
  row: number | string;
  col: DealerColumn;
}

export function strategyLocation(
  playerCards: Card[],
  dealerUpCard: Card,
  canSplitNow: boolean
): StrategyLocation {
  const col = dealerColumn(dealerUpCard);

  if (canSplitNow && isPair(playerCards)) {
    return { table: "pair", row: pairKey(playerCards[0]), col };
  }

  const evaluated = evaluateHand(playerCards);
  if (evaluated.soft) {
    return { table: "soft", row: Math.min(Math.max(evaluated.total, 13), 20), col };
  }

  return { table: "hard", row: Math.min(Math.max(evaluated.total, 8), 17), col };
}

export function recommendedAction(
  playerCards: Card[],
  dealerUpCard: Card,
  options: { canDouble: boolean; canSplit: boolean }
): StrategyAction {
  const location = strategyLocation(playerCards, dealerUpCard, options.canSplit);
  const table =
    location.table === "pair"
      ? PAIR_TABLE
      : location.table === "soft"
        ? SOFT_TABLE
        : HARD_TABLE;

  return resolveTableAction(
    table[String(location.row)][location.col],
    options.canDouble
  );
}
