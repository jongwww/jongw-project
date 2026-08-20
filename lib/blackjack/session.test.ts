import { expect, test } from "vitest";

import {
  MAX_HANDS,
  advance,
  canDoubleDown,
  canSplit,
  canTakeInsurance,
  dealerStep,
  declineInsurance,
  doubleDown,
  hit,
  isSessionOver,
  placeBet,
  split,
  stand,
  startNewSession,
  startSession,
  takeInsurance,
} from "./session";
import type { Card } from "./types";

const c = (rank: Card["rank"]): Card => ({ rank, suit: "♠" });

function deckOf(...ranks: Array<Card["rank"]>): Card[] {
  return ranks.map(c);
}

test("새 세션을 시작하면 배팅 화면이고 기록은 비어 있다", () => {
  const session = startSession(1000);

  expect(session.phase).toBe("betting");
  expect(session.handNumber).toBe(0);
  expect(session.records).toEqual([]);
  expect(session.round.funds).toBe(1000);
});

test("판이 끝나면 판 번호·배팅액·결과·종료 후 자금이 기록에 추가된다", () => {
  const session = placeBet(startSession(1000), 100, deckOf("A", "K", "9", "7"));

  expect(session.phase).toBe("result");
  expect(session.handNumber).toBe(1);
  expect(session.records).toEqual([
    { handNumber: 1, bet: 100, outcome: "player-blackjack", fundsAfter: 1150 },
  ]);
});

test("20번째 판이 끝나면 자금이 남아있어도 세션이 종료된 것으로 판정된다", () => {
  let session = startSession(1000);

  for (let hand = 1; hand <= MAX_HANDS; hand++) {
    session = placeBet(session, 10, deckOf("A", "K", "9", "7"));
    if (hand < MAX_HANDS) {
      session = advance(session);
    }
  }

  expect(session.handNumber).toBe(MAX_HANDS);
  expect(isSessionOver(session)).toBe(true);
});

test("자금이 0이 되면 20판이 되지 않아도 세션이 종료된 것으로 판정된다", () => {
  const session = placeBet(
    startSession(1000),
    1000,
    deckOf("9", "7", "K", "A")
  );

  expect(session.handNumber).toBe(1);
  expect(session.round.funds).toBe(0);
  expect(isSessionOver(session)).toBe(true);
});

test("세션이 끝나지 않았으면 다음으로 넘어가면 새 배팅 화면이 된다", () => {
  const afterHand = placeBet(
    startSession(1000),
    100,
    deckOf("A", "K", "9", "7")
  );

  const next = advance(afterHand);

  expect(next.phase).toBe("betting");
  expect(next.round.funds).toBe(1150);
  expect(next.round.bet).toBeNull();
  expect(next.round.hand).toBeNull();
});

test("세션이 끝났으면 다음으로 넘어가면 세션 종료 화면이 된다", () => {
  const afterHand = placeBet(
    startSession(1000),
    1000,
    deckOf("9", "7", "K", "A")
  );

  const next = advance(afterHand);

  expect(next.phase).toBe("session-over");
  expect(next.records).toHaveLength(1);
});

test("새 세션을 시작하면 시작 자금으로 되돌아가고 기록이 초기화된다", () => {
  const finished = advance(
    placeBet(startSession(1000), 1000, deckOf("8", "6", "9", "8"))
  );

  const restarted = startNewSession(finished);

  expect(restarted).toEqual(startSession(1000));
});

test("스플릿한 판은 세션 기록에 두 손이 각각 남지만 판 수는 1판만 오른다", () => {
  const started = placeBet(
    startSession(1000),
    100,
    deckOf("8", "8", "7", "6", "5", "3", "2", "9", "4")
  );

  const afterSplit = split(started);
  const afterHand1 = stand(hit(afterSplit));
  const afterHand2 = stand(hit(afterHand1));
  const afterOneDraw = dealerStep(afterHand2);
  const finished = dealerStep(afterOneDraw);

  expect(finished.phase).toBe("result");
  expect(finished.handNumber).toBe(1);
  expect(finished.records).toEqual([
    { handNumber: 1, bet: 100, outcome: "dealer-win", fundsAfter: 1000 },
    { handNumber: 1, bet: 100, outcome: "player-win", fundsAfter: 1000 },
  ]);
});

test("같은 랭크 두 장이 아니면 스플릿을 선택할 수 없다", () => {
  const started = placeBet(startSession(1000), 100, deckOf("8", "9", "9", "7"));

  expect(canSplit(started)).toBe(false);
});

test("히트한 뒤에는 더블다운을 선택할 수 없다", () => {
  const started = placeBet(
    startSession(1000),
    100,
    deckOf("2", "8", "7", "6", "5")
  );

  expect(canDoubleDown(started)).toBe(true);
  const afterHit = hit(started);
  expect(canDoubleDown(afterHit)).toBe(false);
});

test("더블다운한 판은 세션 기록에 2배로 오른 배팅액으로 남는다", () => {
  const started = placeBet(
    startSession(1000),
    100,
    deckOf("K", "8", "7", "6", "Q")
  );

  const next = doubleDown(started);

  expect(next.phase).toBe("result");
  expect(next.round.funds).toBe(800);
  expect(next.records).toEqual([
    { handNumber: 1, bet: 200, outcome: "player-bust", fundsAfter: 800 },
  ]);
});

test("딜러 오픈 카드가 A이면 인슈어런스 제안 단계가 되고, 조건이 맞으면 들 수 있다", () => {
  const offered = placeBet(startSession(1000), 100, deckOf("9", "8", "A", "6"));

  expect(offered.phase).toBe("insurance-offer");
  expect(canTakeInsurance(offered)).toBe(true);
});

test("인슈어런스를 들고 딜러가 블랙잭이면 세션 기록에 본 배팅 결과와 함께 정산된 자금이 남는다", () => {
  const offered = placeBet(startSession(1000), 100, deckOf("9", "8", "A", "K"));

  const next = takeInsurance(offered);

  expect(next.phase).toBe("result");
  expect(next.round.funds).toBe(1000);
  expect(next.records).toEqual([
    { handNumber: 1, bet: 100, outcome: "dealer-win", fundsAfter: 1000 },
  ]);
});

test("인슈어런스를 거절하면 자금 변화 없이 플레이어 턴으로 이어진다", () => {
  const offered = placeBet(startSession(1000), 100, deckOf("9", "8", "A", "6"));

  const next = declineInsurance(offered);

  expect(next.phase).toBe("player-turn");
  expect(next.round.funds).toBe(1000);
});

test("한 판 중에는 히트/스탠드/딜러 턴이 기존 스펙과 동일하게 동작한다", () => {
  const started = placeBet(
    startSession(1000),
    100,
    deckOf("K", "8", "7", "6", "Q")
  );

  const next = hit(started);

  expect(next.phase).toBe("result");
  expect(next.round.hand?.outcome).toBe("player-bust");
  expect(next.records[0].outcome).toBe("player-bust");
});
