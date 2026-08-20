import { expect, test } from "vitest";

import {
  canSplit,
  createSplitState,
  dealerStep,
  hit,
  stand,
} from "./split";
import type { Card } from "./types";

const c = (rank: Card["rank"]): Card => ({ rank, suit: "♠" });

function deckOf(...ranks: Array<Card["rank"]>): Card[] {
  return ranks.map(c);
}

test("같은 랭크일 때만 스플릿할 수 있다", () => {
  expect(canSplit([c("8"), c("8")])).toBe(true);
  expect(canSplit([c("8"), c("9")])).toBe(false);
  expect(canSplit([c("8")])).toBe(false);
});

test("스플릿하면 두 손이 각각 카드 한 장씩 더 받아 2장으로 시작한다", () => {
  const state = createSplitState(
    [c("8"), c("8")],
    [c("7"), c("6")],
    deckOf("5", "3")
  );

  expect(state.hands[0].cards).toEqual([c("8"), c("5")]);
  expect(state.hands[1].cards).toEqual([c("8"), c("3")]);
  expect(state.activeHandIndex).toBe(0);
  expect(state.phase).toBe("player-turn");
  expect(state.dealerHoleRevealed).toBe(false);
});

test("손 1을 진행하고 스탠드하면 손 2로 넘어가고, 손 2를 스탠드하면 딜러 턴으로 넘어간다", () => {
  const started = createSplitState(
    [c("8"), c("8")],
    [c("7"), c("6")],
    deckOf("5", "3", "2", "9", "4")
  );

  const afterHitHand1 = hit(started);
  expect(afterHitHand1.hands[0].cards).toEqual([c("8"), c("5"), c("2")]);
  expect(afterHitHand1.activeHandIndex).toBe(0);

  const afterStandHand1 = stand(afterHitHand1);
  expect(afterStandHand1.activeHandIndex).toBe(1);
  expect(afterStandHand1.phase).toBe("player-turn");

  const afterHitHand2 = hit(afterStandHand1);
  expect(afterHitHand2.hands[1].cards).toEqual([c("8"), c("3"), c("9")]);

  const afterStandHand2 = stand(afterHitHand2);
  expect(afterStandHand2.phase).toBe("dealer-turn");
  expect(afterStandHand2.dealerHoleRevealed).toBe(true);
});

test("딜러 턴이 끝나면 두 손 각각의 결과가 딜러와 비교해 정해진다", () => {
  const started = createSplitState(
    [c("8"), c("8")],
    [c("7"), c("6")],
    deckOf("5", "3", "2", "9", "4")
  );

  const afterStandHand1 = stand(hit(started));
  const afterStandHand2 = stand(hit(afterStandHand1));

  const afterOneDraw = dealerStep(afterStandHand2);
  expect(afterOneDraw.dealerCards).toEqual([c("7"), c("6"), c("4")]);
  expect(afterOneDraw.phase).toBe("dealer-turn");

  const finished = dealerStep(afterOneDraw);
  expect(finished.phase).toBe("result");
  expect(finished.hands[0].outcome).toBe("dealer-win");
  expect(finished.hands[1].outcome).toBe("player-win");
});

test("스플릿한 손에서 21이 나와도 블랙잭이 아니라 일반 승으로 처리된다", () => {
  const started = createSplitState(
    [c("K"), c("K")],
    [c("9"), c("7")],
    deckOf("A", "5", "3")
  );

  const afterStandHand1 = stand(started);
  const afterStandHand2 = stand(afterStandHand1);

  const afterOneDraw = dealerStep(afterStandHand2);
  const finished = dealerStep(afterOneDraw);

  expect(finished.hands[0].cards).toEqual([c("K"), c("A")]);
  expect(finished.hands[0].outcome).toBe("player-win");
  expect(finished.hands[1].outcome).toBe("dealer-win");
});

test("히트로 21을 넘기면 그 손은 즉시 끝나고 다음 손이나 딜러 턴으로 넘어간다", () => {
  const started = createSplitState(
    [c("K"), c("K")],
    [c("7"), c("6")],
    deckOf("8", "3", "Q")
  );

  const busted = hit(started);

  expect(busted.hands[0].status).toBe("done");
  expect(busted.activeHandIndex).toBe(1);
  expect(busted.phase).toBe("player-turn");
});
