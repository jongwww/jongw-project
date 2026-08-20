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

  expect(screen.getByText(/보유 자금 1000/)).toBeInTheDocument();

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

test("히트로 버스트하면 배팅액만큼 자금이 줄고, 세션이 끝나지 않았으면 다음 판으로 넘어갈 수 있다", () => {
  mockDeck(c("K"), c("8"), c("7"), c("6"), c("Q"));

  render(<BlackjackGame />);
  placeBet("100");
  fireEvent.click(screen.getByRole("button", { name: "히트" }));

  expect(screen.getByRole("status")).toHaveTextContent("패 (버스트)");
  expect(screen.getByText(/보유 자금 900/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "다음 판" }));

  expect(screen.getByLabelText("배팅액")).toBeInTheDocument();
  expect(screen.getByText(/1판째/)).toBeInTheDocument();
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
  expect(screen.getByText(/보유 자금 1100/)).toBeInTheDocument();
});

test("처음 두 장을 받은 직후에는 더블다운을 선택할 수 있고, 히트한 뒤에는 사라진다", () => {
  mockDeck(c("2"), c("8"), c("7"), c("6"), c("5"));

  render(<BlackjackGame />);
  placeBet("100");

  expect(screen.getByRole("button", { name: "더블다운" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "히트" }));

  expect(
    screen.queryByRole("button", { name: "더블다운" })
  ).not.toBeInTheDocument();
});

test("자금이 배팅액의 2배보다 적으면 더블다운을 선택할 수 없다", () => {
  mockDeck(c("9"), c("8"), c("7"), c("6"));

  render(<BlackjackGame />);
  placeBet("600");

  expect(
    screen.queryByRole("button", { name: "더블다운" })
  ).not.toBeInTheDocument();
});

test("더블다운을 선택하면 배팅액이 2배가 되고 카드를 한 장만 받은 뒤 딜러 턴으로 넘어간다", () => {
  mockDeck(c("2"), c("8"), c("7"), c("6"), c("5"));

  render(<BlackjackGame />);
  placeBet("100");
  fireEvent.click(screen.getByRole("button", { name: "더블다운" }));

  expect(screen.getByText("플레이어 15 (배팅액 200)")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "히트" })).not.toBeInTheDocument();
  expect(
    screen.getByText("딜러가 카드를 받는 중...")
  ).toBeInTheDocument();
});

test("더블다운으로 21을 넘으면 딜러 턴 없이 2배로 오른 배팅액만큼 즉시 잃는다", () => {
  mockDeck(c("K"), c("8"), c("7"), c("6"), c("Q"));

  render(<BlackjackGame />);
  placeBet("100");
  fireEvent.click(screen.getByRole("button", { name: "더블다운" }));

  expect(screen.getByRole("status")).toHaveTextContent("패 (버스트)");
  expect(screen.getByText(/보유 자금 800/)).toBeInTheDocument();
});

test("딜러 오픈 카드가 A이면 인슈어런스를 제안하고, 거절하면 자금 변화 없이 플레이어 턴으로 이어진다", () => {
  mockDeck(c("9"), c("8"), c("A"), c("6"));

  render(<BlackjackGame />);
  placeBet("100");

  expect(
    screen.getByRole("button", { name: "인슈어런스 들기" })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "히트" })
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "인슈어런스 거절" }));

  expect(screen.getByRole("button", { name: "히트" })).toBeInTheDocument();
  expect(screen.getByText(/보유 자금 1000/)).toBeInTheDocument();
});

test("인슈어런스를 들었는데 딜러가 블랙잭이 아니면 배팅액의 절반을 잃고 플레이어 턴으로 이어진다", () => {
  mockDeck(c("9"), c("8"), c("A"), c("6"));

  render(<BlackjackGame />);
  placeBet("100");
  fireEvent.click(screen.getByRole("button", { name: "인슈어런스 들기" }));

  expect(screen.getByText(/보유 자금 950/)).toBeInTheDocument();
  expect(screen.getByText(/실패 \(배팅액 잃음\)/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "히트" })).toBeInTheDocument();
});

test("인슈어런스를 들었는데 딜러가 블랙잭이면 적중 메시지와 함께 결과가 정산된다", () => {
  mockDeck(c("9"), c("8"), c("A"), c("K"));

  render(<BlackjackGame />);
  placeBet("100");
  fireEvent.click(screen.getByRole("button", { name: "인슈어런스 들기" }));

  expect(screen.getByRole("status")).toHaveTextContent("패");
  expect(screen.getByText(/적중 \(2배 지급\)/)).toBeInTheDocument();
  expect(screen.getByText(/보유 자금 1000/)).toBeInTheDocument();
});

test("자금이 배팅액의 1.5배보다 적으면 인슈어런스를 들 수 없다", () => {
  mockDeck(c("9"), c("8"), c("A"), c("6"));

  render(<BlackjackGame />);
  placeBet("700");

  expect(
    screen.queryByRole("button", { name: "인슈어런스 들기" })
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "인슈어런스 거절" })
  ).toBeInTheDocument();
});

test("자금을 모두 잃으면 세션이 끝나고, 세션 결과 화면에 판별 기록과 요약이 보인다", () => {
  mockDeck(c("9"), c("7"), c("K"), c("A"));

  render(<BlackjackGame />);
  placeBet("1000");

  expect(screen.getByRole("status")).toHaveTextContent("패");
  fireEvent.click(screen.getByRole("button", { name: "세션 결과 보기" }));

  expect(screen.getByText("세션 종료")).toBeInTheDocument();
  expect(screen.getByText(/보유 자금 0/)).toBeInTheDocument();

  const table = screen.getByRole("table");
  expect(table).toHaveTextContent("1");
  expect(table).toHaveTextContent("1000");
  expect(table).toHaveTextContent("패");
  expect(table).toHaveTextContent("0");
});

test("세션 결과 화면에서 새 세션을 시작하면 자금과 배팅 화면이 초기화된다", () => {
  mockDeck(c("9"), c("7"), c("K"), c("A"));

  render(<BlackjackGame />);
  placeBet("1000");
  fireEvent.click(screen.getByRole("button", { name: "세션 결과 보기" }));
  fireEvent.click(screen.getByRole("button", { name: "새 세션 시작" }));

  expect(screen.getByText(/보유 자금 1000/)).toBeInTheDocument();
  expect(screen.getByLabelText("배팅액")).toBeInTheDocument();
});
