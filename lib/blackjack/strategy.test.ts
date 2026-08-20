import { expect, test } from "vitest";

import { recommendedAction, strategyLocation } from "./strategy";
import type { Card } from "./types";

const c = (rank: Card["rank"]): Card => ({ rank, suit: "♠" });

test("하드 16 대 딜러 10은 히트다", () => {
  const action = recommendedAction([c("9"), c("7")], c("10"), {
    canDouble: true,
    canSplit: false,
  });
  expect(action).toBe("hit");
});

test("하드 11 대 딜러 A는 더블다운이 가능하면 더블다운이다", () => {
  const action = recommendedAction([c("6"), c("5")], c("A"), {
    canDouble: true,
    canSplit: false,
  });
  expect(action).toBe("double");
});

test("더블다운을 할 수 없으면 D 칸은 히트로 대체된다", () => {
  const action = recommendedAction([c("6"), c("5")], c("A"), {
    canDouble: false,
    canSplit: false,
  });
  expect(action).toBe("hit");
});

test("소프트 19(A,8) 대 딜러 6은 더블다운이 가능하면 더블다운이다", () => {
  const action = recommendedAction([c("A"), c("8")], c("6"), {
    canDouble: true,
    canSplit: false,
  });
  expect(action).toBe("double");
});

test("소프트 18(A,7) 대 딜러 9는 히트다", () => {
  const action = recommendedAction([c("A"), c("7")], c("9"), {
    canDouble: true,
    canSplit: false,
  });
  expect(action).toBe("hit");
});

test("8,8 페어는 딜러 카드와 상관없이 항상 스플릿이다", () => {
  const action = recommendedAction([c("8"), c("8")], c("A"), {
    canDouble: true,
    canSplit: true,
  });
  expect(action).toBe("split");
});

test("10,10 페어는 항상 스탠드다(스플릿하지 않는다)", () => {
  const action = recommendedAction([c("K"), c("K")], c("6"), {
    canDouble: true,
    canSplit: true,
  });
  expect(action).toBe("stand");
});

test("스플릿할 수 없는 상황에서는 페어여도 하드/소프트 총합 기준으로 판단한다", () => {
  const action = recommendedAction([c("8"), c("8")], c("A"), {
    canDouble: true,
    canSplit: false,
  });
  // 하드 16 대 A는 히트
  expect(action).toBe("hit");
});

test("하드 12 대 딜러 4는 스탠드다", () => {
  const action = recommendedAction([c("9"), c("3")], c("4"), {
    canDouble: true,
    canSplit: false,
  });
  expect(action).toBe("stand");
});

test("strategyLocation은 현재 손이 참조해야 할 표와 칸을 알려준다", () => {
  expect(strategyLocation([c("8"), c("8")], c("A"), true)).toEqual({
    table: "pair",
    row: "8",
    col: "A",
  });
  expect(strategyLocation([c("A"), c("7")], c("9"), false)).toEqual({
    table: "soft",
    row: 18,
    col: "9",
  });
  expect(strategyLocation([c("9"), c("7")], c("10"), false)).toEqual({
    table: "hard",
    row: 16,
    col: "10",
  });
});
