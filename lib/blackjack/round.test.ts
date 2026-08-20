import { expect, test } from "vitest";

import {
  dealerStep,
  hit,
  isValidBet,
  placeBet,
  stand,
  startBetting,
  startNextRound,
} from "./round";
import type { Card } from "./types";

const c = (rank: Card["rank"]): Card => ({ rank, suit: "♠" });

function deckOf(...ranks: Array<Card["rank"]>): Card[] {
  return ranks.map(c);
}

test("배팅액은 정수이고 0보다 크고 보유 자금 이하일 때만 유효하다", () => {
  expect(isValidBet(1000, 100)).toBe(true);
  expect(isValidBet(1000, 1000)).toBe(true);
  expect(isValidBet(1000, 1001)).toBe(false);
  expect(isValidBet(1000, 0)).toBe(false);
  expect(isValidBet(1000, -10)).toBe(false);
  expect(isValidBet(1000, 10.5)).toBe(false);
});

test("유효하지 않은 배팅은 판을 시작하지 않는다", () => {
  const state = startBetting(1000);

  const afterInvalid = placeBet(state, 0, deckOf("9", "8", "7", "6"));
  expect(afterInvalid).toEqual(state);

  const afterTooBig = placeBet(state, 2000, deckOf("9", "8", "7", "6"));
  expect(afterTooBig).toEqual(state);
});

test("유효한 배팅을 확정하면 그 금액으로 판이 시작되고 자금은 아직 그대로다", () => {
  const state = startBetting(1000);
  const next = placeBet(state, 100, deckOf("9", "8", "7", "6"));

  expect(next.phase).toBe("player-turn");
  expect(next.bet).toBe(100);
  expect(next.funds).toBe(1000);
  expect(next.hand?.playerCards).toEqual([c("9"), c("8")]);
});

test("처음부터 블랙잭이면 배팅이 즉시 정산되어 자금이 1.5배만큼 늘어난다", () => {
  const state = startBetting(1000);
  const next = placeBet(state, 100, deckOf("A", "K", "9", "7"));

  expect(next.phase).toBe("result");
  expect(next.hand?.outcome).toBe("player-blackjack");
  expect(next.funds).toBe(1150);
});

test("히트로 버스트하면 배팅액만큼 자금이 줄어든다", () => {
  const started = placeBet(
    startBetting(1000),
    100,
    deckOf("K", "8", "7", "6", "Q")
  );

  const next = hit(started);

  expect(next.phase).toBe("result");
  expect(next.hand?.outcome).toBe("player-bust");
  expect(next.funds).toBe(900);
});

test("스탠드 후 딜러에게 이기면 배팅액만큼 자금이 늘어난다", () => {
  const started = placeBet(
    startBetting(1000),
    100,
    deckOf("K", "Q", "5", "9", "3")
  );

  const afterStand = stand(started);
  const afterOneDraw = dealerStep(afterStand);
  const finished = dealerStep(afterOneDraw);

  expect(finished.phase).toBe("result");
  expect(finished.hand?.outcome).toBe("player-win");
  expect(finished.funds).toBe(1100);
});

test("스탠드 후 딜러에게 지면 배팅액만큼 자금이 줄어든다", () => {
  const started = placeBet(
    startBetting(1000),
    100,
    deckOf("8", "6", "9", "8")
  );

  const afterStand = stand(started);
  const finished = dealerStep(afterStand);

  expect(finished.phase).toBe("result");
  expect(finished.hand?.outcome).toBe("dealer-win");
  expect(finished.funds).toBe(900);
});

test("무승부면 자금이 그대로 유지된다", () => {
  const started = placeBet(
    startBetting(1000),
    100,
    deckOf("K", "9", "Q", "9")
  );

  const afterStand = stand(started);
  const finished = dealerStep(afterStand);

  expect(finished.phase).toBe("result");
  expect(finished.hand?.outcome).toBe("push");
  expect(finished.funds).toBe(1000);
});

test("새 판을 시작하면 배팅과 카드는 초기화되고 자금은 유지된다", () => {
  const finished = placeBet(startBetting(1000), 100, deckOf("A", "K", "9", "7"));

  const next = startNextRound(finished);

  expect(next).toEqual({
    funds: 1150,
    bet: null,
    hand: null,
    phase: "betting",
  });
});
