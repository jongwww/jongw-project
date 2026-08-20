"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  decksRemaining,
  runningCount,
  sumHiLo,
  trueCount,
  trueCountFromRunning,
  visibleCards,
} from "@/lib/blackjack/count";
import { evaluateHand } from "@/lib/blackjack/hand";
import { MIN_BET, insuranceAmount, isValidBet } from "@/lib/blackjack/round";
import { createShoe, needsReshuffle } from "@/lib/blackjack/shoe";
import {
  DEALER_COLUMNS,
  HARD_TABLE,
  PAIR_TABLE,
  SOFT_TABLE,
  recommendedAction,
  strategyLocation,
  type StrategyAction,
  type StrategyLocation,
} from "@/lib/blackjack/strategy";
import { cn } from "@/lib/utils";
import {
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
  type SessionState,
} from "@/lib/blackjack/session";
import type { Card, Outcome } from "@/lib/blackjack/types";

const OUTCOME_LABEL: Record<Outcome, string> = {
  "player-blackjack": "블랙잭 승",
  push: "무승부",
  "player-bust": "패 (버스트)",
  "player-win": "승",
  "dealer-win": "패",
};

const DEALER_STEP_DELAY_MS = 700;
const INITIAL_FUNDS = 1000;
const DEFAULT_BET = 100;

function floorToBetUnit(amount: number): number {
  return Math.floor(amount / MIN_BET) * MIN_BET;
}

function CardFace({ card, hidden }: { card: Card; hidden?: boolean }) {
  if (hidden) {
    return (
      <div
        role="img"
        aria-label="가려진 카드"
        className="flex h-24 w-16 items-center justify-center rounded-lg border border-border bg-muted text-xl"
      >
        🂠
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${card.rank}${card.suit}`}
      className="flex h-24 w-16 flex-col items-center justify-center rounded-lg border border-border bg-white text-lg font-semibold text-black"
    >
      <span>{card.rank}</span>
      <span>{card.suit}</span>
    </div>
  );
}

function StrategyTable({
  title,
  table,
  highlight,
}: {
  title: string;
  table: Record<string, Record<string, string>>;
  highlight: StrategyLocation | null;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{title}</p>
      <table className="w-full border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="p-1" />
            {DEALER_COLUMNS.map((col) => (
              <th key={col} className="p-1 font-normal text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.keys(table).map((rowKey) => (
            <tr key={rowKey}>
              <th className="p-1 font-normal text-muted-foreground">{rowKey}</th>
              {DEALER_COLUMNS.map((col) => {
                const isActive =
                  highlight !== null &&
                  String(highlight.row) === rowKey &&
                  highlight.col === col;
                return (
                  <td
                    key={col}
                    className={cn(
                      "border border-border p-1",
                      isActive && "bg-primary font-bold text-primary-foreground"
                    )}
                  >
                    {table[rowKey][col]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BlackjackGame() {
  const [state, setState] = useState<SessionState>(() =>
    startSession(INITIAL_FUNDS)
  );
  const [betInput, setBetInput] = useState(String(DEFAULT_BET));
  const [shoe, setShoe] = useState<Card[]>(() => createShoe());
  const [bankedRunningCount, setBankedRunningCount] = useState(0);
  const [hintOn, setHintOn] = useState(true);

  useEffect(() => {
    if (state.phase !== "dealer-turn") return;

    const timer = setTimeout(() => {
      setState((current) => dealerStep(current));
    }, DEALER_STEP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [state]);

  function confirmBet() {
    const amount = floorToBetUnit(Number(betInput) || 0);
    if (!isValidBet(state.round.funds, amount)) return;

    const reshuffled = needsReshuffle(shoe.length);
    const deck = reshuffled ? createShoe() : shoe;
    if (reshuffled) setBankedRunningCount(0);
    setState((current) => placeBet(current, amount, deck));
  }

  function goToNextStep() {
    const finishedRound = state.round;
    const finishedDeck = finishedRound.split
      ? finishedRound.split.deck
      : finishedRound.hand
        ? finishedRound.hand.deck
        : shoe;
    const bankedAfterThisHand =
      bankedRunningCount + sumHiLo(visibleCards(finishedRound));

    const next = advance(state);
    if (next.phase === "betting") {
      setBetInput(String(Math.min(DEFAULT_BET, next.round.funds)));
    }
    setShoe(finishedDeck);
    setBankedRunningCount(bankedAfterThisHand);
    setState(next);
  }

  function startOverWithNewSession() {
    const next = startNewSession(state);
    setBetInput(String(Math.min(DEFAULT_BET, next.round.funds)));
    setShoe(createShoe());
    setBankedRunningCount(0);
    setState(next);
  }

  const round = state.round;
  const hand = round.hand;
  const splitState = round.split;
  const player = hand ? evaluateHand(hand.playerCards) : null;
  const betAmount = floorToBetUnit(Number(betInput) || 0);
  const sessionOver = isSessionOver(state);

  const dealerCards = splitState ? splitState.dealerCards : hand?.dealerCards;
  const dealerHoleRevealed = splitState
    ? splitState.dealerHoleRevealed
    : hand?.dealerHoleRevealed ?? false;
  const dealer = dealerCards ? evaluateHand(dealerCards) : null;

  const activeCards = splitState
    ? splitState.hands[splitState.activeHandIndex].cards
    : hand?.playerCards;
  const dealerUpCard = dealerCards?.[0];

  const showRecommendation =
    hintOn && state.phase === "player-turn" && !!activeCards && !!dealerUpCard;
  const recommendation: StrategyAction | null = showRecommendation
    ? recommendedAction(activeCards!, dealerUpCard!, {
        canDouble: canDoubleDown(state),
        canSplit: canSplit(state),
      })
    : null;
  const highlightLocation: StrategyLocation | null = showRecommendation
    ? strategyLocation(activeCards!, dealerUpCard!, canSplit(state))
    : null;

  // 세션이 끝나면 round는 마지막 판의 카드를 그대로 들고 있어(초기화되지 않음), 그 카드는
  // goToNextStep에서 이미 bankedRunningCount에 합산되어 있다. 여기서 또 더하면 이중 계산되므로
  // 세션 종료 화면에서는 은행된 값만 사용한다.
  const displayRunningCount =
    state.phase === "session-over"
      ? bankedRunningCount
      : runningCount(round, bankedRunningCount);
  const displayDecksRemaining = decksRemaining(round, shoe);
  const displayTrueCount =
    state.phase === "session-over"
      ? trueCountFromRunning(bankedRunningCount, displayDecksRemaining)
      : trueCount(round, shoe, bankedRunningCount);

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 py-16">
      <div className="flex w-full max-w-md items-center justify-between">
        <h1 className="text-2xl font-semibold">블랙잭</h1>
        <Button
          variant={hintOn ? "default" : "outline"}
          size="sm"
          onClick={() => setHintOn((current) => !current)}
        >
          {hintOn ? "힌트 끄기" : "힌트 켜기"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {state.handNumber}판째 · 보유 자금 {round.funds}
      </p>

      {hintOn && (
        <section
          aria-label="카드 카운팅"
          className="flex w-full max-w-md flex-col items-center gap-1 rounded-lg border border-border p-3 text-sm"
        >
          <p>
            러닝 카운트 {displayRunningCount} · 트루 카운트 {displayTrueCount} ·
            남은 덱 {displayDecksRemaining}
          </p>
          <details className="w-full text-xs text-muted-foreground">
            <summary className="cursor-pointer">카드 카운팅 원리 보기</summary>
            <p className="mt-1">
              러닝 카운트: 보이는 카드마다 2~6은 +1, 7~9는 0, 10·J·Q·K·A는 -1을
              더한 값입니다. 트루 카운트: 러닝 카운트를 슈에 남은 덱 수로 나눈
              값으로, 남은 카드에 높은 카드가 많을수록 커집니다.
            </p>
          </details>
        </section>
      )}

      {state.phase === "betting" && round.funds >= MIN_BET && (
        <div className="flex flex-col items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            배팅액
            <input
              type="number"
              min={MIN_BET}
              max={round.funds}
              step={MIN_BET}
              value={betInput}
              onChange={(event) => setBetInput(event.target.value)}
              onBlur={() =>
                setBetInput(String(floorToBetUnit(Number(betInput) || 0)))
              }
              className="w-24 rounded border border-border px-2 py-1 text-black"
            />
          </label>
          <Button
            onClick={confirmBet}
            disabled={!isValidBet(round.funds, betAmount)}
          >
            배팅
          </Button>
        </div>
      )}

      {state.phase === "betting" && round.funds < MIN_BET && (
        <p role="status" className="text-sm text-muted-foreground">
          보유 자금이 최소 배팅액({MIN_BET})보다 적어 더 이상 배팅할 수
          없습니다.
        </p>
      )}

      {dealerCards && dealer && state.phase !== "session-over" && (
        <section
          aria-label="딜러 카드"
          className="flex flex-col items-center gap-2"
        >
          <p className="text-sm text-muted-foreground">
            딜러 {dealerHoleRevealed ? dealer.total : ""}
          </p>
          <div className="flex gap-2">
            {dealerCards.map((card, index) => (
              <CardFace
                key={index}
                card={card}
                hidden={index === 1 && !dealerHoleRevealed}
              />
            ))}
          </div>
        </section>
      )}

      {hand && player && !splitState && state.phase !== "session-over" && (
        <section
          aria-label="플레이어 카드"
          className="flex flex-col items-center gap-2"
        >
          <p className="text-sm text-muted-foreground">
            플레이어 {player.total} (배팅액 {round.bet})
          </p>
          <div className="flex gap-2">
            {hand.playerCards.map((card, index) => (
              <CardFace key={index} card={card} />
            ))}
          </div>
        </section>
      )}

      {splitState && state.phase !== "session-over" && (
        <div className="flex flex-col items-center gap-4">
          {splitState.hands.map((splitHand, index) => {
            const evaluated = evaluateHand(splitHand.cards);
            const isActive =
              splitState.activeHandIndex === index &&
              splitHand.status === "active";
            return (
              <section
                key={index}
                aria-label={`손 ${index + 1}`}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-transform",
                  isActive
                    ? "scale-105 border-primary bg-primary/5"
                    : "border-transparent"
                )}
              >
                <p className="text-sm text-muted-foreground">
                  손 {index + 1} {evaluated.total} (배팅액 {round.bet})
                  {isActive ? " · 진행 중" : ""}
                  {splitHand.outcome
                    ? ` · ${OUTCOME_LABEL[splitHand.outcome]}`
                    : ""}
                </p>
                <div className="flex gap-2">
                  {splitHand.cards.map((card, cardIndex) => (
                    <CardFace key={cardIndex} card={card} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {round.lastInsuranceResult && (
        <p className="text-sm text-muted-foreground">
          인슈어런스:{" "}
          {round.lastInsuranceResult === "won"
            ? "적중 (2배 지급)"
            : "실패 (배팅액 잃음)"}
        </p>
      )}

      {state.phase === "insurance-offer" && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            딜러가 A를 보여주고 있습니다. 인슈어런스(배팅액의 절반인{" "}
            {insuranceAmount(round.bet ?? 0)})를 드시겠습니까?
          </p>
          <div className="flex gap-3">
            {canTakeInsurance(state) && (
              <Button
                onClick={() => setState((current) => takeInsurance(current))}
              >
                인슈어런스 들기
              </Button>
            )}
            <Button
              variant="outline"
              className={cn(hintOn && "ring-2 ring-primary")}
              onClick={() => setState((current) => declineInsurance(current))}
            >
              인슈어런스 거절
            </Button>
          </div>
          {hintOn && (
            <p className="text-xs text-muted-foreground">
              기본 전략 권장: 인슈어런스 거절
            </p>
          )}
        </div>
      )}

      {state.phase === "player-turn" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-3">
            <Button
              className={cn(recommendation === "hit" && "ring-2 ring-primary")}
              onClick={() => setState((current) => hit(current))}
            >
              히트
            </Button>
            <Button
              variant="outline"
              className={cn(recommendation === "stand" && "ring-2 ring-primary")}
              onClick={() => setState((current) => stand(current))}
            >
              스탠드
            </Button>
            <Button
              variant="outline"
              disabled={!canDoubleDown(state)}
              className={cn(recommendation === "double" && "ring-2 ring-primary")}
              onClick={() => setState((current) => doubleDown(current))}
            >
              더블다운
            </Button>
          </div>
          {canSplit(state) && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className={cn(recommendation === "split" && "ring-2 ring-primary")}
                onClick={() => setState((current) => split(current))}
              >
                스플릿
              </Button>
            </div>
          )}
        </div>
      )}

      {state.phase === "dealer-turn" && (
        <p className="text-sm text-muted-foreground">딜러가 카드를 받는 중...</p>
      )}

      {state.phase === "result" && (hand?.outcome || splitState) && (
        <div className="flex flex-col items-center gap-3">
          {hand?.outcome && (
            <p className="text-xl font-semibold" role="status">
              {OUTCOME_LABEL[hand.outcome]}
            </p>
          )}
          {splitState && (
            <p className="text-xl font-semibold" role="status">
              스플릿 결과: 손 1 {OUTCOME_LABEL[splitState.hands[0].outcome!]} ·
              손 2 {OUTCOME_LABEL[splitState.hands[1].outcome!]}
            </p>
          )}
          <Button onClick={goToNextStep}>
            {sessionOver ? "세션 결과 보기" : "다음 판"}
          </Button>
        </div>
      )}

      {state.phase === "session-over" && (
        <div className="flex w-full flex-col items-center gap-4">
          <p role="status" className="text-xl font-semibold">
            세션 종료
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">총 진행 판 수</dt>
            <dd>{state.records.length}</dd>
            <dt className="text-muted-foreground">시작 자금</dt>
            <dd>{state.startingFunds}</dd>
            <dt className="text-muted-foreground">최종 자금</dt>
            <dd>{round.funds}</dd>
            <dt className="text-muted-foreground">순손익</dt>
            <dd>{round.funds - state.startingFunds}</dd>
          </dl>

          <table aria-label="세션 기록" className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left">판</th>
                <th className="text-left">배팅액</th>
                <th className="text-left">결과</th>
                <th className="text-left">종료 후 자금</th>
              </tr>
            </thead>
            <tbody>
              {state.records.map((record, index) => (
                <tr key={index}>
                  <td>{record.handNumber}</td>
                  <td>{record.bet}</td>
                  <td>{OUTCOME_LABEL[record.outcome]}</td>
                  <td>{record.fundsAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Button onClick={startOverWithNewSession}>새 세션 시작</Button>
        </div>
      )}

      {hintOn && (
        <div className="flex w-full flex-col gap-4">
          <StrategyTable
            title="하드 총합"
            table={HARD_TABLE}
            highlight={highlightLocation?.table === "hard" ? highlightLocation : null}
          />
          <StrategyTable
            title="소프트 총합 (A 포함)"
            table={SOFT_TABLE}
            highlight={highlightLocation?.table === "soft" ? highlightLocation : null}
          />
          <StrategyTable
            title="페어"
            table={PAIR_TABLE}
            highlight={highlightLocation?.table === "pair" ? highlightLocation : null}
          />
        </div>
      )}
    </div>
  );
}
