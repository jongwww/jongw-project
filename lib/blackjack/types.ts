export type Suit = "♠" | "♥" | "♦" | "♣";

export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface EvaluatedHand {
  total: number;
  soft: boolean;
  blackjack: boolean;
}

export type Outcome =
  | "player-blackjack"
  | "push"
  | "player-bust"
  | "player-win"
  | "dealer-win";
