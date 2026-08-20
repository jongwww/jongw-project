import { expect, test } from "vitest";

import { shouldDealerHit } from "./dealer";

test("17 미만이면 히트한다", () => {
  expect(shouldDealerHit({ total: 16, soft: false, blackjack: false })).toBe(
    true
  );
});

test("소프트 17이면 히트한다", () => {
  expect(shouldDealerHit({ total: 17, soft: true, blackjack: false })).toBe(
    true
  );
});

test("하드 17이면 스탠드한다", () => {
  expect(shouldDealerHit({ total: 17, soft: false, blackjack: false })).toBe(
    false
  );
});

test("18 이상이면 스탠드한다", () => {
  expect(shouldDealerHit({ total: 18, soft: false, blackjack: false })).toBe(
    false
  );
});
