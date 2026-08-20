import { expect, test } from "vitest";

import {
  decksRemaining,
  hiLoValue,
  runningCount,
  sumHiLo,
  trueCount,
  visibleCards,
} from "./count";
import { hit, placeBet, split, stand, startBetting } from "./round";
import type { Card } from "./types";

const c = (rank: Card["rank"]): Card => ({ rank, suit: "♠" });

function deckOf(...ranks: Array<Card["rank"]>): Card[] {
  return ranks.map(c);
}

test("하이-로우 카드 값: 2~6은 +1, 7~9는 0, 10/J/Q/K/A는 -1이다", () => {
  expect(hiLoValue(c("2"))).toBe(1);
  expect(hiLoValue(c("6"))).toBe(1);
  expect(hiLoValue(c("7"))).toBe(0);
  expect(hiLoValue(c("9"))).toBe(0);
  expect(hiLoValue(c("10"))).toBe(-1);
  expect(hiLoValue(c("K"))).toBe(-1);
  expect(hiLoValue(c("A"))).toBe(-1);
});

test("sumHiLo는 카드 목록의 하이-로우 값을 모두 더한다", () => {
  expect(sumHiLo(deckOf("2", "9", "K"))).toBe(0);
  expect(sumHiLo(deckOf("2", "3", "4"))).toBe(3);
});

test("딜러 가려진 카드는 공개되기 전까지 보이는 카드 목록에 포함되지 않는다", () => {
  const round = placeBet(startBetting(1000), 100, deckOf("9", "8", "7", "6", "5"));

  expect(visibleCards(round)).toEqual(deckOf("9", "8", "7"));

  const afterStand = stand(round);
  expect(visibleCards(afterStand)).toEqual(deckOf("9", "8", "7", "6"));
});

test("스플릿 중에는 두 손의 카드와 공개된 딜러 카드만 보인다", () => {
  const round = placeBet(
    startBetting(1000),
    100,
    deckOf("8", "8", "7", "6", "5", "3")
  );
  const afterSplit = split(round);

  expect(visibleCards(afterSplit)).toEqual(deckOf("8", "5", "8", "3", "7"));
});

test("러닝 카운트는 은행된 값에 현재 보이는 카드의 하이-로우 합을 더한 값이다", () => {
  const round = placeBet(startBetting(1000), 100, deckOf("2", "3", "K", "6"));

  // 딜러 홀카드(6)는 아직 미공개라 2(+1) + 3(+1) + K(-1) = 1만 반영된다.
  expect(runningCount(round, 0)).toBe(1);
  expect(runningCount(round, 5)).toBe(6);
});

test("남은 덱 수는 남은 카드 수를 52로 나눈 값을 소수 첫째 자리로 반올림한다", () => {
  const round = placeBet(startBetting(1000), 100, deckOf("2", "3", "4", "5"));
  const shoe: Card[] = [];

  // 4장을 배분한 뒤 라운드 내부 덱은 비어 있다.
  expect(decksRemaining(round, shoe)).toBe(0);

  const withShoeFallback = startBetting(1000);
  expect(decksRemaining(withShoeFallback, new Array(156).fill(c("2")))).toBe(3);
});

test("트루 카운트는 러닝 카운트를 남은 덱 수로 나눈 값이다", () => {
  const round = startBetting(1000);
  const shoe = new Array(52).fill(c("2"));

  const value = trueCount(round, shoe, 6);
  expect(value).toBe(6);
});

test("히트로 카드가 보이면 러닝 카운트가 즉시 갱신된다", () => {
  const round = placeBet(startBetting(1000), 100, deckOf("9", "8", "7", "6", "2"));
  const before = runningCount(round, 0);

  const afterHit = hit(round);
  expect(runningCount(afterHit, 0)).toBe(before + hiLoValue(c("2")));
});
