import { expect, test } from "vitest";

import { createGame, dealerStep, hit, resolveInsuranceOffer, stand } from "./game";
import type { Card } from "./types";

const c = (rank: Card["rank"]): Card => ({ rank, suit: "♠" });

function deckOf(...ranks: Array<Card["rank"]>): Card[] {
  return ranks.map(c);
}

test("새 판을 시작하면 플레이어와 딜러에게 카드 2장씩 배분되고 딜러 카드는 가려져 있다", () => {
  const deck = deckOf("9", "8", "7", "6", "5");
  const state = createGame(deck);

  expect(state.playerCards).toEqual([c("9"), c("8")]);
  expect(state.dealerCards).toEqual([c("7"), c("6")]);
  expect(state.dealerHoleRevealed).toBe(false);
  expect(state.phase).toBe("player-turn");
  expect(state.outcome).toBeNull();
});

test("플레이어가 처음부터 블랙잭이면 선택 없이 즉시 결과가 정해진다", () => {
  const deck = deckOf("A", "K", "9", "7");
  const state = createGame(deck);

  expect(state.phase).toBe("result");
  expect(state.outcome).toBe("player-blackjack");
  expect(state.dealerHoleRevealed).toBe(true);
});

test("딜러의 오픈 카드가 A이면 인슈어런스 제안 단계에서 멈춘다", () => {
  const deck = deckOf("9", "8", "A", "6");
  const state = createGame(deck);

  expect(state.phase).toBe("insurance-offer");
  expect(state.dealerHoleRevealed).toBe(false);
  expect(state.outcome).toBeNull();
});

test("인슈어런스 제안 후 계속하면 딜러가 블랙잭이 아닐 때 플레이어 턴으로 넘어간다", () => {
  const state = createGame(deckOf("9", "8", "A", "6"));

  const next = resolveInsuranceOffer(state);

  expect(next.phase).toBe("player-turn");
  expect(next.outcome).toBeNull();
});

test("인슈어런스 제안 후 계속했는데 딜러가 블랙잭이면 즉시 결과가 정해진다", () => {
  const state = createGame(deckOf("9", "8", "A", "K"));

  const next = resolveInsuranceOffer(state);

  expect(next.phase).toBe("result");
  expect(next.outcome).toBe("dealer-win");
  expect(next.dealerHoleRevealed).toBe(true);
});

test("인슈어런스 제안 상황에서 플레이어도 블랙잭이면 무승부로 끝난다", () => {
  const state = createGame(deckOf("A", "K", "A", "K"));

  const next = resolveInsuranceOffer(state);

  expect(next.phase).toBe("result");
  expect(next.outcome).toBe("push");
});

test("히트하면 카드가 한 장 추가된다", () => {
  const deck = deckOf("2", "8", "7", "6", "5");
  const started = createGame(deck);

  const next = hit(started);

  expect(next.playerCards).toEqual([c("2"), c("8"), c("5")]);
  expect(next.phase).toBe("player-turn");
});

test("히트로 21을 넘기면 딜러 턴 없이 즉시 버스트로 끝난다", () => {
  const deck = deckOf("K", "8", "7", "6", "Q");
  const started = createGame(deck);

  const next = hit(started);

  expect(next.phase).toBe("result");
  expect(next.outcome).toBe("player-bust");
  expect(next.dealerHoleRevealed).toBe(true);
});

test("스탠드하면 딜러 카드가 공개되고 딜러 턴으로 넘어간다", () => {
  const deck = deckOf("9", "8", "7", "6");
  const started = createGame(deck);

  const next = stand(started);

  expect(next.phase).toBe("dealer-turn");
  expect(next.dealerHoleRevealed).toBe(true);
});

test("딜러 턴에서는 합계가 17 미만인 동안 카드를 계속 받는다", () => {
  const deck = deckOf("K", "Q", "5", "9", "3");
  const started = createGame(deck);
  const afterStand = stand(started);

  const afterOneDraw = dealerStep(afterStand);
  expect(afterOneDraw.dealerCards).toEqual([c("5"), c("9"), c("3")]);
  expect(afterOneDraw.phase).toBe("dealer-turn");

  const finished = dealerStep(afterOneDraw);
  expect(finished.phase).toBe("result");
  expect(finished.outcome).toBe("player-win");
});

test("딜러가 21을 넘기면 승으로 끝난다", () => {
  const deck = deckOf("9", "9", "K", "6", "Q");
  const started = createGame(deck);
  const afterStand = stand(started);

  const afterOneDraw = dealerStep(afterStand);
  const finished = dealerStep(afterOneDraw);

  expect(finished.phase).toBe("result");
  expect(finished.outcome).toBe("player-win");
});
