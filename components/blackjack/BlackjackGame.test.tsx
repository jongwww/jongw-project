import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createShuffledDeck } from "@/lib/blackjack/deck";
import type { Card } from "@/lib/blackjack/types";

import { BlackjackGame } from "./BlackjackGame";

vi.mock("@/lib/blackjack/deck", () => ({
  createShuffledDeck: vi.fn(),
}));

const c = (rank: Card["rank"], suit: Card["suit"] = "♠"): Card => ({
  rank,
  suit,
});

function mockDeck(...cards: Card[]) {
  vi.mocked(createShuffledDeck).mockReturnValue(cards);
}

function placeBet(amount: string) {
  const input = screen.getByLabelText("배팅액");
  fireEvent.change(input, { target: { value: amount } });
  fireEvent.click(screen.getByRole("button", { name: "배팅 확정" }));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("처음에는 보유 자금과 배팅 입력이 보이고, 0으로는 배팅을 확정할 수 없다", () => {
  render(<BlackjackGame />);

  expect(screen.getByText("보유 자금 1000")).toBeInTheDocument();

  const input = screen.getByLabelText("배팅액");
  fireEvent.change(input, { target: { value: "0" } });
  expect(screen.getByRole("button", { name: "배팅 확정" })).toBeDisabled();
});

test("배팅을 확정하면 카드가 배분되고 배팅액이 표시된다", () => {
  mockDeck(c("9"), c("8"), c("7"), c("6"));

  render(<BlackjackGame />);
  placeBet("100");

  expect(screen.getByText("플레이어 17 (배팅액 100)")).toBeInTheDocument();
  expect(screen.getByLabelText("가려진 카드")).toBeInTheDocument();
});

test("히트로 버스트하면 배팅액만큼 자금이 줄어든다", () => {
  mockDeck(c("K"), c("8"), c("7"), c("6"), c("Q"));

  render(<BlackjackGame />);
  placeBet("100");
  fireEvent.click(screen.getByRole("button", { name: "히트" }));

  expect(screen.getByRole("status")).toHaveTextContent("패 (버스트)");
  expect(screen.getByText("보유 자금 900")).toBeInTheDocument();
});

test("스탠드해서 이기면 배팅액만큼 자금이 늘어난다", async () => {
  mockDeck(c("K"), c("Q"), c("5"), c("9"), c("3"));

  render(<BlackjackGame />);
  placeBet("100");
  fireEvent.click(screen.getByRole("button", { name: "스탠드" }));

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });

  expect(screen.getByRole("status")).toHaveTextContent("승");
  expect(screen.getByText("보유 자금 1100")).toBeInTheDocument();
});

test("자금을 모두 잃으면 새 판에서는 배팅 입력 대신 안내가 표시된다", () => {
  mockDeck(c("8"), c("6"), c("9"), c("8"));

  render(<BlackjackGame />);
  placeBet("1000");
  fireEvent.click(screen.getByRole("button", { name: "스탠드" }));

  act(() => {
    vi.advanceTimersByTime(1000);
  });

  expect(screen.getByRole("status")).toHaveTextContent("패");
  expect(screen.getByText("보유 자금 0")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "새 판 시작" }));

  expect(
    screen.getByText("자금이 모두 소진되어 더 이상 배팅할 수 없습니다.")
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("배팅액")).not.toBeInTheDocument();
});
