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

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("새 판이 시작되면 플레이어 카드는 모두 보이고 딜러 카드 한 장은 가려진다", () => {
  mockDeck(c("9"), c("8"), c("7"), c("6"));

  render(<BlackjackGame />);

  expect(screen.getByLabelText("가려진 카드")).toBeInTheDocument();
  expect(screen.getByText("플레이어 17")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "히트" })
  ).toBeInTheDocument();
});

test("히트로 21을 넘기면 딜러 턴 없이 바로 버스트 결과가 표시된다", () => {
  mockDeck(c("K"), c("8"), c("7"), c("6"), c("Q"));

  render(<BlackjackGame />);
  fireEvent.click(screen.getByRole("button", { name: "히트" }));

  expect(screen.getByRole("status")).toHaveTextContent("패 (버스트)");
  expect(
    screen.getByRole("button", { name: "새 판 시작" })
  ).toBeInTheDocument();
});

test("처음 받은 두 장이 21이면 선택 없이 즉시 블랙잭 승이 표시된다", () => {
  mockDeck(c("A"), c("K"), c("9"), c("7"));

  render(<BlackjackGame />);

  expect(screen.getByRole("status")).toHaveTextContent("블랙잭 승");
  expect(screen.queryByRole("button", { name: "히트" })).not.toBeInTheDocument();
});

test("스탠드하면 딜러 카드가 공개되고 딜러 턴을 거쳐 결과가 표시된다", async () => {
  mockDeck(c("K"), c("Q"), c("5"), c("9"), c("3"));

  render(<BlackjackGame />);
  fireEvent.click(screen.getByRole("button", { name: "스탠드" }));

  expect(screen.queryByLabelText("가려진 카드")).not.toBeInTheDocument();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });

  expect(screen.getByRole("status")).toHaveTextContent("승");
  expect(screen.getByText("딜러 17")).toBeInTheDocument();
});

test("결과 화면에서 새 판 시작을 누르면 다시 플레이어 턴으로 돌아간다", () => {
  mockDeck(c("A"), c("K"), c("9"), c("7"));
  render(<BlackjackGame />);
  expect(screen.getByRole("status")).toHaveTextContent("블랙잭 승");

  mockDeck(c("2"), c("3"), c("4"), c("5"));
  fireEvent.click(screen.getByRole("button", { name: "새 판 시작" }));

  expect(screen.getByRole("button", { name: "히트" })).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
