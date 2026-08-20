import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createShoe } from "@/lib/blackjack/shoe";
import type { Card } from "@/lib/blackjack/types";

import { BlackjackGame } from "./BlackjackGame";

vi.mock("@/lib/blackjack/shoe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/blackjack/shoe")>();
  return { ...actual, createShoe: vi.fn(actual.createShoe) };
});

const c = (rank: Card["rank"], suit: Card["suit"] = "♠"): Card => ({
  rank,
  suit,
});

function mockDeck(...cards: Card[]) {
  vi.mocked(createShoe).mockReturnValue(cards);
}

function placeBet(amount: string) {
  const input = screen.getByLabelText("배팅액");
  fireEvent.change(input, { target: { value: amount } });
  fireEvent.click(screen.getByRole("button", { name: "배팅" }));
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
  expect(screen.getByRole("button", { name: "배팅" })).toBeDisabled();
});

test("배팅액 입력은 100 단위로 늘고 줄도록 되어 있다", () => {
  render(<BlackjackGame />);

  const input = screen.getByLabelText("배팅액");
  expect(input).toHaveAttribute("step", "100");
  expect(input).toHaveAttribute("min", "100");
});

test("배팅액을 100 단위가 아니게 직접 입력하면 백의 자리로 내림해서 배팅된다", () => {
  mockDeck(c("9"), c("8"), c("7"), c("6"));

  render(<BlackjackGame />);
  const input = screen.getByLabelText("배팅액");
  fireEvent.change(input, { target: { value: "250" } });
  fireEvent.click(screen.getByRole("button", { name: "배팅" }));

  expect(screen.getByText("플레이어 17 (배팅액 200)")).toBeInTheDocument();
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

test("처음 두 장을 받은 직후에는 더블다운이 활성화되어 있고, 히트한 뒤에는 비활성화된다", () => {
  mockDeck(c("2"), c("8"), c("7"), c("6"), c("5"));

  render(<BlackjackGame />);
  placeBet("100");

  expect(screen.getByRole("button", { name: "더블다운" })).toBeEnabled();

  fireEvent.click(screen.getByRole("button", { name: "히트" }));

  expect(screen.getByRole("button", { name: "더블다운" })).toBeDisabled();
});

test("자금이 배팅액의 2배보다 적으면 더블다운이 비활성화된다", () => {
  mockDeck(c("9"), c("8"), c("7"), c("6"));

  render(<BlackjackGame />);
  placeBet("600");

  expect(screen.getByRole("button", { name: "더블다운" })).toBeDisabled();
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

test("같은 랭크 두 장이면 스플릿할 수 있고, 스플릿하면 두 손이 나타나고 더블다운은 비활성화된다", () => {
  mockDeck(c("8"), c("8"), c("7"), c("6"), c("5"), c("3"));

  render(<BlackjackGame />);
  placeBet("100");
  fireEvent.click(screen.getByRole("button", { name: "스플릿" }));

  expect(screen.getByLabelText("손 1")).toBeInTheDocument();
  expect(screen.getByLabelText("손 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "더블다운" })).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: "스플릿" })
  ).not.toBeInTheDocument();
});

test("스플릿한 두 손 중 지금 진행 중인 손이 어디인지 표시가 이동한다", () => {
  mockDeck(c("8"), c("8"), c("7"), c("6"), c("5"), c("3"));

  render(<BlackjackGame />);
  placeBet("100");
  fireEvent.click(screen.getByRole("button", { name: "스플릿" }));

  expect(within(screen.getByLabelText("손 1")).getByText(/진행 중/)).toBeInTheDocument();
  expect(within(screen.getByLabelText("손 2")).queryByText(/진행 중/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "스탠드" }));

  expect(within(screen.getByLabelText("손 1")).queryByText(/진행 중/)).not.toBeInTheDocument();
  expect(within(screen.getByLabelText("손 2")).getByText(/진행 중/)).toBeInTheDocument();
});

test("스플릿한 두 손을 각각 진행하면 손마다 결과가 표시되고 자금이 함께 정산된다", async () => {
  mockDeck(
    c("8"),
    c("8"),
    c("7"),
    c("6"),
    c("5"),
    c("3"),
    c("2"),
    c("9"),
    c("4")
  );

  render(<BlackjackGame />);
  placeBet("100");
  fireEvent.click(screen.getByRole("button", { name: "스플릿" }));

  fireEvent.click(screen.getByRole("button", { name: "히트" }));
  fireEvent.click(screen.getByRole("button", { name: "스탠드" }));
  fireEvent.click(screen.getByRole("button", { name: "히트" }));
  fireEvent.click(screen.getByRole("button", { name: "스탠드" }));

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });

  expect(screen.getByRole("status")).toHaveTextContent("손 1 패");
  expect(screen.getByRole("status")).toHaveTextContent("손 2 승");
  expect(screen.getByText(/보유 자금 1000/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "다음 판" }));
  expect(screen.getByText(/1판째/)).toBeInTheDocument();
});

test("자금을 모두 잃으면 세션이 끝나고, 세션 결과 화면에 판별 기록과 요약이 보인다", () => {
  mockDeck(c("9"), c("7"), c("K"), c("A"));

  render(<BlackjackGame />);
  placeBet("1000");

  expect(screen.getByRole("status")).toHaveTextContent("패");
  fireEvent.click(screen.getByRole("button", { name: "세션 결과 보기" }));

  expect(screen.getByText("세션 종료")).toBeInTheDocument();
  expect(screen.getByText(/보유 자금 0/)).toBeInTheDocument();

  const table = screen.getByRole("table", { name: "세션 기록" });
  expect(table).toHaveTextContent("1");
  expect(table).toHaveTextContent("1000");
  expect(table).toHaveTextContent("패");
  expect(table).toHaveTextContent("0");
});

test("세션 종료 화면의 러닝 카운트는 마지막 판을 이중으로 계산하지 않는다", () => {
  mockDeck(c("9"), c("7"), c("K"), c("A"));

  render(<BlackjackGame />);
  placeBet("1000");
  fireEvent.click(screen.getByRole("button", { name: "세션 결과 보기" }));

  // 9(0)+7(0)+K(-1)+A(-1) = -2. 이중 계산되면 -4로 보인다.
  expect(screen.getByText(/러닝 카운트 -2 /)).toBeInTheDocument();
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

function fillerCards(count: number, rank: Card["rank"] = "9"): Card[] {
  return Array.from({ length: count }, () => c(rank));
}

test("힌트는 기본으로 켜져 있어 전략표와 카운트가 보이고, 끄면 사라진다", () => {
  render(<BlackjackGame />);

  expect(screen.getByText(/러닝 카운트 0/)).toBeInTheDocument();
  expect(screen.getByText("하드 총합")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "힌트 끄기" }));

  expect(screen.queryByText(/러닝 카운트/)).not.toBeInTheDocument();
  expect(screen.queryByText("하드 총합")).not.toBeInTheDocument();
});

test("카드가 배분되면 러닝 카운트가 보이는 카드 기준으로 즉시 갱신된다", () => {
  mockDeck(c("2"), c("3"), c("K"), c("6"), ...fillerCards(90));

  render(<BlackjackGame />);
  placeBet("100");

  // 2(+1) + 3(+1) + 딜러 오픈카드 K(-1) = 1. 딜러 홀카드(6)는 아직 미공개라 반영되지 않는다.
  expect(screen.getByText(/러닝 카운트 1 /)).toBeInTheDocument();
});

test("판이 끝나고 다음 판으로 넘어가도 러닝 카운트가 초기화되지 않고 이어진다", () => {
  mockDeck(
    c("K"),
    c("8"),
    c("7"),
    c("6"),
    c("Q"),
    c("9"),
    c("8"),
    c("7"),
    c("6"),
    ...fillerCards(90)
  );

  render(<BlackjackGame />);
  placeBet("100");
  fireEvent.click(screen.getByRole("button", { name: "히트" }));

  expect(screen.getByRole("status")).toHaveTextContent("패 (버스트)");
  // K(-1)+8(0)+Q(-1)+7(0)+6(+1) = -1
  expect(screen.getByText(/러닝 카운트 -1 /)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "다음 판" }));
  expect(screen.getByText(/러닝 카운트 -1 /)).toBeInTheDocument();

  placeBet("100");
  expect(screen.getByText(/러닝 카운트 -1 /)).toBeInTheDocument();
});
