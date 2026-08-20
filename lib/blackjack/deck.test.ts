import { expect, test } from "vitest";

import { createShuffledDeck } from "./deck";

test("52장의 중복 없는 카드로 구성된다", () => {
  const deck = createShuffledDeck();

  expect(deck).toHaveLength(52);
  const unique = new Set(deck.map((card) => `${card.suit}${card.rank}`));
  expect(unique.size).toBe(52);
});

test("호출마다 새 배열을 반환해 이전 덱에 영향을 주지 않는다", () => {
  const first = createShuffledDeck();
  const second = createShuffledDeck();

  first.pop();

  expect(first).toHaveLength(51);
  expect(second).toHaveLength(52);
});
