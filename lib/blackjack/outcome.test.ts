import { expect, test } from "vitest";

import { resolveOutcome } from "./outcome";
import type { Card } from "./types";

const c = (rank: Card["rank"]): Card => ({ rank, suit: "♠" });

test("플레이어만 블랙잭이면 블랙잭 승이다", () => {
  expect(resolveOutcome([c("A"), c("K")], [c("9"), c("8")])).toBe(
    "player-blackjack"
  );
});

test("둘 다 블랙잭이면 무승부다", () => {
  expect(resolveOutcome([c("A"), c("K")], [c("A"), c("Q")])).toBe("push");
});

test("딜러만 블랙잭이면 패다", () => {
  expect(resolveOutcome([c("9"), c("8")], [c("A"), c("K")])).toBe(
    "dealer-win"
  );
});

test("플레이어가 21을 넘기면 버스트로 패다", () => {
  expect(resolveOutcome([c("K"), c("Q"), c("5")], [c("9"), c("8")])).toBe(
    "player-bust"
  );
});

test("플레이어는 21 이하인데 딜러가 21을 넘기면 승이다", () => {
  expect(resolveOutcome([c("9"), c("8")], [c("K"), c("Q"), c("5")])).toBe(
    "player-win"
  );
});

test("둘 다 21 이하로 스탠드하면 합계가 높은 쪽이 승리한다", () => {
  expect(resolveOutcome([c("K"), c("9")], [c("K"), c("8")])).toBe(
    "player-win"
  );
  expect(resolveOutcome([c("K"), c("8")], [c("K"), c("9")])).toBe(
    "dealer-win"
  );
});

test("합계가 같으면 무승부다", () => {
  expect(resolveOutcome([c("K"), c("9")], [c("Q"), c("9")])).toBe("push");
});

test("세 장으로 만든 21은 블랙잭보다 낮게 취급되어 딜러 블랙잭에 패한다", () => {
  expect(
    resolveOutcome([c("7"), c("7"), c("7")], [c("A"), c("K")])
  ).toBe("dealer-win");
});
