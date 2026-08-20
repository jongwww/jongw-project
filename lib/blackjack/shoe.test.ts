import { expect, test } from "vitest";

import { SHOE_SIZE, createShoe, needsReshuffle } from "./shoe";

test("슈는 6덱(312장) 분량의 중복 없는 카드로 구성된다", () => {
  const shoe = createShoe();

  expect(shoe).toHaveLength(SHOE_SIZE);
  const counts = new Map<string, number>();
  for (const card of shoe) {
    const key = `${card.suit}${card.rank}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  expect(counts.size).toBe(52);
  for (const count of counts.values()) {
    expect(count).toBe(6);
  }
});

test("남은 카드가 전체의 25% 미만이면 재구성이 필요하다", () => {
  expect(needsReshuffle(SHOE_SIZE)).toBe(false);
  expect(needsReshuffle(SHOE_SIZE * 0.3)).toBe(false);
  expect(needsReshuffle(SHOE_SIZE * 0.25)).toBe(false);
  expect(needsReshuffle(SHOE_SIZE * 0.24)).toBe(true);
  expect(needsReshuffle(0)).toBe(true);
});
