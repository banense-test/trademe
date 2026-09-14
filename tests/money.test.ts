import { test } from "node:test";
import assert from "node:assert/strict";
import { Money } from "../src/domain/money.js";

test("Money adds exact decimal amounts without floating point", () => {
  const a = Money.of("0.10", "USD");
  const b = Money.of("0.20", "USD");
  assert.equal(a.add(b).amount, "0.30");
});

test("Money rejects cross-currency arithmetic", () => {
  const a = Money.of("1.00", "USD");
  const b = Money.of("1.00", "EUR");
  assert.throws(() => a.add(b), /Currency mismatch/);
});
