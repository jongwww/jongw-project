import { expect, test } from "vitest";

import { evaluateHand } from "./hand";
import type { Card } from "./types";

function cards(...pairs: Array<Card>): Card[] {
  return pairs;
}

test("숫자 카드만 있으면 합계를 그대로 더한다", () => {
  const result = evaluateHand(
    cards({ rank: "9", suit: "♠" }, { rank: "8", suit: "♥" })
  );

  expect(result).toEqual({ total: 17, soft: false, blackjack: false });
});

test("에이스와 10이 두 장이면 블랙잭이다", () => {
  const result = evaluateHand(
    cards({ rank: "A", suit: "♠" }, { rank: "K", suit: "♥" })
  );

  expect(result).toEqual({ total: 21, soft: true, blackjack: true });
});

test("세 장으로 만든 21은 블랙잭이 아니다", () => {
  const result = evaluateHand(
    cards(
      { rank: "7", suit: "♠" },
      { rank: "7", suit: "♥" },
      { rank: "7", suit: "♦" }
    )
  );

  expect(result).toEqual({ total: 21, soft: false, blackjack: false });
});

test("에이스는 21을 넘기면 1로 낮춰서 계산한다", () => {
  const result = evaluateHand(
    cards(
      { rank: "A", suit: "♠" },
      { rank: "9", suit: "♥" },
      { rank: "5", suit: "♦" }
    )
  );

  expect(result).toEqual({ total: 15, soft: false, blackjack: false });
});

test("낮출 에이스가 남아있으면 소프트 핸드로 판단한다", () => {
  const result = evaluateHand(
    cards(
      { rank: "A", suit: "♠" },
      { rank: "A", suit: "♥" },
      { rank: "5", suit: "♦" }
    )
  );

  expect(result).toEqual({ total: 17, soft: true, blackjack: false });
});

test("모든 에이스를 낮춰도 21을 넘으면 버스트 합계를 그대로 반환한다", () => {
  const result = evaluateHand(
    cards(
      { rank: "K", suit: "♠" },
      { rank: "Q", suit: "♥" },
      { rank: "5", suit: "♦" }
    )
  );

  expect(result).toEqual({ total: 25, soft: false, blackjack: false });
});
