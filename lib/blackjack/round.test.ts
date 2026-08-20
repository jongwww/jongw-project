import { expect, test } from "vitest";

import {
  canDoubleDown,
  canSplit,
  canTakeInsurance,
  dealerStep,
  declineInsurance,
  doubleDown,
  hit,
  isValidBet,
  placeBet,
  split,
  stand,
  startBetting,
  startNextRound,
  takeInsurance,
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

test("처음 두 장을 받은 직후이고 자금이 충분하면 더블다운을 선택할 수 있다", () => {
  const started = placeBet(startBetting(1000), 100, deckOf("9", "8", "7", "6"));

  expect(canDoubleDown(started)).toBe(true);
});

test("히트를 한 뒤에는 더블다운을 선택할 수 없다", () => {
  const started = placeBet(
    startBetting(1000),
    100,
    deckOf("2", "8", "7", "6", "5")
  );

  const afterHit = hit(started);

  expect(canDoubleDown(afterHit)).toBe(false);
});

test("자금이 배팅액의 2배보다 적으면 더블다운을 선택할 수 없다", () => {
  const started = placeBet(startBetting(150), 100, deckOf("9", "8", "7", "6"));

  expect(canDoubleDown(started)).toBe(false);
});

test("더블다운을 선택하면 배팅액이 2배가 되고 카드를 정확히 한 장만 받는다", () => {
  const started = placeBet(
    startBetting(1000),
    100,
    deckOf("2", "8", "7", "6", "5")
  );

  const next = doubleDown(started);

  expect(next.bet).toBe(200);
  expect(next.hand?.playerCards).toEqual([c("2"), c("8"), c("5")]);
  expect(next.phase).toBe("dealer-turn");
  expect(next.hand?.dealerHoleRevealed).toBe(true);
});

test("더블다운으로 받은 카드로 21을 넘으면 딜러 턴 없이 2배 배팅액만큼 즉시 잃는다", () => {
  const started = placeBet(
    startBetting(1000),
    100,
    deckOf("K", "8", "7", "6", "Q")
  );

  const next = doubleDown(started);

  expect(next.phase).toBe("result");
  expect(next.hand?.outcome).toBe("player-bust");
  expect(next.funds).toBe(800);
});

test("더블다운 후 딜러에게 지면 2배로 오른 배팅액만큼 자금이 줄어든다", () => {
  const started = placeBet(
    startBetting(1000),
    100,
    deckOf("2", "8", "7", "6", "5", "8")
  );

  const afterDouble = doubleDown(started);
  const afterOneDraw = dealerStep(afterDouble);
  const finished = dealerStep(afterOneDraw);

  expect(finished.phase).toBe("result");
  expect(finished.hand?.outcome).toBe("dealer-win");
  expect(finished.funds).toBe(800);
});

test("유효하지 않은 더블다운 시도는 상태를 바꾸지 않는다", () => {
  const state = startBetting(1000);

  expect(doubleDown(state)).toEqual(state);
});

test("딜러 오픈 카드가 A이면 배팅 확정 후 인슈어런스 제안 단계로 넘어간다", () => {
  const next = placeBet(startBetting(1000), 100, deckOf("9", "8", "A", "6"));

  expect(next.phase).toBe("insurance-offer");
  expect(next.funds).toBe(1000);
});

test("인슈어런스는 보유 자금이 배팅액의 1.5배 이상일 때만 들 수 있다", () => {
  const tooLittle = placeBet(startBetting(140), 100, deckOf("9", "8", "A", "6"));
  expect(canTakeInsurance(tooLittle)).toBe(false);

  const enough = placeBet(startBetting(150), 100, deckOf("9", "8", "A", "6"));
  expect(canTakeInsurance(enough)).toBe(true);
});

test("인슈어런스를 들었는데 딜러가 블랙잭이 아니면 배팅액의 절반만큼 잃고 플레이어 턴으로 이어진다", () => {
  const offered = placeBet(startBetting(1000), 100, deckOf("9", "8", "A", "6"));

  const next = takeInsurance(offered);

  expect(next.phase).toBe("player-turn");
  expect(next.funds).toBe(950);
  expect(next.lastInsuranceResult).toBe("lost");
});

test("인슈어런스를 들었는데 딜러가 블랙잭이면 인슈어런스는 2배로 받고 본 배팅은 별도로 정산된다", () => {
  const offered = placeBet(startBetting(1000), 100, deckOf("9", "8", "A", "K"));

  const next = takeInsurance(offered);

  expect(next.phase).toBe("result");
  expect(next.hand?.outcome).toBe("dealer-win");
  expect(next.funds).toBe(1000);
  expect(next.lastInsuranceResult).toBe("won");
});

test("인슈어런스를 들고 플레이어도 블랙잭이면 인슈어런스 이득만 남고 본 배팅은 무승부다", () => {
  const offered = placeBet(startBetting(1000), 100, deckOf("A", "K", "A", "K"));

  const next = takeInsurance(offered);

  expect(next.phase).toBe("result");
  expect(next.hand?.outcome).toBe("push");
  expect(next.funds).toBe(1100);
});

test("인슈어런스를 거절하면 자금 변화 없이 계속 진행된다", () => {
  const declinedNoBlackjack = declineInsurance(
    placeBet(startBetting(1000), 100, deckOf("9", "8", "A", "6"))
  );
  expect(declinedNoBlackjack.phase).toBe("player-turn");
  expect(declinedNoBlackjack.funds).toBe(1000);
  expect(declinedNoBlackjack.lastInsuranceResult).toBeNull();

  const declinedWithBlackjack = declineInsurance(
    placeBet(startBetting(1000), 100, deckOf("9", "8", "A", "K"))
  );
  expect(declinedWithBlackjack.phase).toBe("result");
  expect(declinedWithBlackjack.hand?.outcome).toBe("dealer-win");
  expect(declinedWithBlackjack.funds).toBe(900);
});

test("인슈어런스 제안 단계가 아니면 인슈어런스 시도는 상태를 바꾸지 않는다", () => {
  const state = placeBet(startBetting(1000), 100, deckOf("9", "8", "7", "6"));

  expect(takeInsurance(state)).toEqual(state);
  expect(declineInsurance(state)).toEqual(state);
});

test("같은 랭크 두 장이고 자금이 충분하면 스플릿을 선택할 수 있다", () => {
  const started = placeBet(startBetting(1000), 100, deckOf("8", "8", "9", "7"));

  expect(canSplit(started)).toBe(true);
});

test("다른 랭크면 스플릿을 선택할 수 없다", () => {
  const started = placeBet(startBetting(1000), 100, deckOf("8", "9", "9", "7"));

  expect(canSplit(started)).toBe(false);
});

test("자금이 배팅액의 2배보다 적으면 스플릿을 선택할 수 없다", () => {
  const started = placeBet(startBetting(150), 100, deckOf("8", "8", "9", "7"));

  expect(canSplit(started)).toBe(false);
});

test("스플릿하면 두 손이 생기고 각각 카드 2장으로 시작하며 더블다운은 선택할 수 없다", () => {
  const started = placeBet(
    startBetting(1000),
    100,
    deckOf("8", "8", "9", "7", "5", "3")
  );

  const next = split(started);

  expect(next.hand).toBeNull();
  expect(next.split?.hands[0].cards).toEqual([c("8"), c("5")]);
  expect(next.split?.hands[1].cards).toEqual([c("8"), c("3")]);
  expect(next.phase).toBe("player-turn");
  expect(canDoubleDown(next)).toBe(false);
});

test("스플릿한 두 손을 진행해 정산하면 각 손의 결과에 따라 자금이 조정된다", () => {
  const started = placeBet(
    startBetting(1000),
    100,
    deckOf("8", "8", "7", "6", "5", "3", "2", "9", "4")
  );

  const afterSplit = split(started);
  const afterHand1 = stand(hit(afterSplit));
  const afterHand2 = stand(hit(afterHand1));
  const afterOneDraw = dealerStep(afterHand2);
  const finished = dealerStep(afterOneDraw);

  expect(finished.phase).toBe("result");
  expect(finished.split?.hands[0].outcome).toBe("dealer-win");
  expect(finished.split?.hands[1].outcome).toBe("player-win");
  expect(finished.funds).toBe(1000);
});

test("유효하지 않은 스플릿 시도는 상태를 바꾸지 않는다", () => {
  const state = startBetting(1000);

  expect(split(state)).toEqual(state);
});

test("새 판을 시작하면 배팅과 카드는 초기화되고 자금은 유지된다", () => {
  const finished = placeBet(startBetting(1000), 100, deckOf("A", "K", "9", "7"));

  const next = startNextRound(finished);

  expect(next).toEqual({
    funds: 1150,
    bet: null,
    hand: null,
    split: null,
    phase: "betting",
    lastInsuranceResult: null,
  });
});
