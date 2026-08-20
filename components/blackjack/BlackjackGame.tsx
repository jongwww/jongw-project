"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createShuffledDeck } from "@/lib/blackjack/deck";
import { createGame, dealerStep, hit, stand, type GameState } from "@/lib/blackjack/game";
import { evaluateHand } from "@/lib/blackjack/hand";
import type { Card, Outcome } from "@/lib/blackjack/types";

const OUTCOME_LABEL: Record<Outcome, string> = {
  "player-blackjack": "블랙잭 승",
  push: "무승부",
  "player-bust": "패 (버스트)",
  "player-win": "승",
  "dealer-win": "패",
};

const DEALER_STEP_DELAY_MS = 700;

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

export function BlackjackGame() {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    setState(createGame(createShuffledDeck()));
  }, []);

  useEffect(() => {
    if (!state || state.phase !== "dealer-turn") return;

    const timer = setTimeout(() => {
      setState((current) => (current ? dealerStep(current) : current));
    }, DEALER_STEP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [state]);

  function startNewRound() {
    setState(createGame(createShuffledDeck()));
  }

  if (!state) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-6 py-16">
        <h1 className="text-2xl font-semibold">블랙잭 한 판</h1>
      </div>
    );
  }

  const player = evaluateHand(state.playerCards);
  const dealer = evaluateHand(state.dealerCards);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 py-16">
      <h1 className="text-2xl font-semibold">블랙잭 한 판</h1>

      <section aria-label="딜러 카드" className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">
          딜러 {state.dealerHoleRevealed ? dealer.total : ""}
        </p>
        <div className="flex gap-2">
          {state.dealerCards.map((card, index) => (
            <CardFace
              key={index}
              card={card}
              hidden={index === 1 && !state.dealerHoleRevealed}
            />
          ))}
        </div>
      </section>

      <section aria-label="플레이어 카드" className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">플레이어 {player.total}</p>
        <div className="flex gap-2">
          {state.playerCards.map((card, index) => (
            <CardFace key={index} card={card} />
          ))}
        </div>
      </section>

      {state.phase === "player-turn" && (
        <div className="flex gap-3">
          <Button onClick={() => setState((current) => hit(current))}>
            히트
          </Button>
          <Button
            variant="outline"
            onClick={() => setState((current) => stand(current))}
          >
            스탠드
          </Button>
        </div>
      )}

      {state.phase === "dealer-turn" && (
        <p className="text-sm text-muted-foreground">딜러가 카드를 받는 중...</p>
      )}

      {state.phase === "result" && state.outcome && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-semibold" role="status">
            {OUTCOME_LABEL[state.outcome]}
          </p>
          <Button onClick={startNewRound}>새 판 시작</Button>
        </div>
      )}
    </div>
  );
}
