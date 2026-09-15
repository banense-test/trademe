import { test } from "node:test";
import assert from "node:assert/strict";
import { Money, ExchangeRate } from "../src/domain/money.js";

// --- Black-box: add (specification behavior) ---

test("Money adds exact decimal amounts without floating point", () => {
  const a = Money.of("0.10", "USD");
  const b = Money.of("0.20", "USD");
  assert.equal(a.add(b).amount, "0.30");
});

test("Money add carries across the decimal point", () => {
  assert.equal(Money.of("0.90", "USD").add(Money.of("0.20", "USD")).amount, "1.10");
});

test("Money add handles mixed scale", () => {
  assert.equal(Money.of("1.5", "USD").add(Money.of("2", "USD")).amount, "3.5");
});

test("Money add handles integer-only amounts", () => {
  assert.equal(Money.of("1", "USD").add(Money.of("2", "USD")).amount, "3");
});

// --- Black-box: subtract ---

test("Money subtracts exact decimal amounts", () => {
  assert.equal(Money.of("1.00", "USD").subtract(Money.of("0.30", "USD")).amount, "0.70");
});

test("Money subtract handles mixed scale", () => {
  assert.equal(Money.of("2", "USD").subtract(Money.of("0.5", "USD")).amount, "1.5");
});

test("Money subtract handles equal-scale amounts", () => {
  assert.equal(Money.of("0.30", "USD").subtract(Money.of("0.10", "USD")).amount, "0.20");
});

test("Money subtract rejects a negative result", () => {
  assert.throws(
    () => Money.of("0.10", "USD").subtract(Money.of("0.20", "USD")),
    /negative amount/,
  );
});

// --- Black-box: convert + ExchangeRate ---

test("Money converts using an exact exchange rate", () => {
  const rate = new ExchangeRate("USD", "EUR", "1.25", new Date("2026-09-15T00:00:00Z"));
  const converted = Money.of("100", "USD").convert(rate);
  assert.equal(converted.amount, "125.00");
  assert.equal(converted.currency, "EUR");
});

test("Money convert produces fractional results exactly", () => {
  const rate = new ExchangeRate("USD", "EUR", "0.5", new Date("2026-09-15T00:00:00Z"));
  assert.equal(Money.of("0.1", "USD").convert(rate).amount, "0.05");
});

test("ExchangeRate records from/to/rate/appliedAt", () => {
  const appliedAt = new Date("2026-09-15T00:00:00Z");
  const rate = new ExchangeRate("USD", "EUR", "1.25", appliedAt);
  assert.equal(rate.from, "USD");
  assert.equal(rate.to, "EUR");
  assert.equal(rate.rate, "1.25");
  assert.equal(rate.appliedAt, appliedAt);
});

test("Money convert rejects a rate whose from-currency mismatches", () => {
  const rate = new ExchangeRate("EUR", "USD", "1.25", new Date());
  assert.throws(
    () => Money.of("100.00", "USD").convert(rate),
    /currency mismatch/,
  );
});

// --- Black-box: cross-currency arithmetic rejection ---

test("Money rejects cross-currency addition", () => {
  const a = Money.of("1.00", "USD");
  const b = Money.of("1.00", "EUR");
  assert.throws(() => a.add(b), /Currency mismatch/);
});

test("Money rejects cross-currency subtraction", () => {
  const a = Money.of("1.00", "USD");
  const b = Money.of("1.00", "EUR");
  assert.throws(() => a.subtract(b), /Currency mismatch/);
});

// --- White-box: validation branches ---

test("Money.of rejects an invalid amount", () => {
  assert.throws(() => Money.of("abc", "USD"), /Invalid monetary amount/);
  assert.throws(() => Money.of("-1.00", "USD"), /Invalid monetary amount/);
  assert.throws(() => Money.of("1.2.3", "USD"), /Invalid monetary amount/);
});

test("ExchangeRate rejects an invalid rate", () => {
  assert.throws(() => new ExchangeRate("USD", "EUR", "abc", new Date()), /Invalid exchange rate/);
  assert.throws(() => new ExchangeRate("USD", "EUR", "-1.25", new Date()), /Invalid exchange rate/);
});

// --- White-box: exact-arithmetic branch coverage ---

test("addExact integer-only path (scale 0)", () => {
  assert.equal(Money.of("7", "USD").add(Money.of("3", "USD")).amount, "10");
});

test("addExact fractional path with carry", () => {
  assert.equal(Money.of("0.99", "USD").add(Money.of("0.01", "USD")).amount, "1.00");
});

test("subtractExact zero-difference path", () => {
  assert.equal(Money.of("0.20", "USD").subtract(Money.of("0.20", "USD")).amount, "0.00");
});

test("multiplyExact whole-number result path", () => {
  const rate = new ExchangeRate("USD", "EUR", "2", new Date());
  assert.equal(Money.of("50", "USD").convert(rate).amount, "100");
});
