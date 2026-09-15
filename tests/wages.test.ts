import { test } from "node:test";
import assert from "node:assert/strict";
import { Money } from "../src/domain/money.js";
import { computeWage } from "../src/domain/pricing/wages.js";

// --- Black-box: wage computation (FR-007, CON-008, CON-010) ---

test("computeWage multiplies hours by rate exactly", () => {
  const wage = computeWage(
    { hoursWorked: "7.50", rate: Money.of("20.00", "USD") },
    { minimumWageFloor: Money.of("0.00", "USD"), riskPremiumMultiplier: "1" },
  );
  assert.equal(wage.amount, "150.0000");
  assert.equal(wage.currency, "USD");
});

test("computeWage applies the risk premium (CON-010)", () => {
  const wage = computeWage(
    { hoursWorked: "10", rate: Money.of("30.00", "USD") },
    { minimumWageFloor: Money.of("0.00", "USD"), riskPremiumMultiplier: "1.25" },
  );
  assert.equal(wage.amount, "375.0000");
});

test("computeWage applies the minimum wage floor (CON-008)", () => {
  const wage = computeWage(
    { hoursWorked: "1", rate: Money.of("5.00", "USD") },
    { minimumWageFloor: Money.of("15.00", "USD"), riskPremiumMultiplier: "1" },
  );
  assert.equal(wage.amount, "15.00");
});

test("computeWage does not floor when gross exceeds the floor", () => {
  const wage = computeWage(
    { hoursWorked: "1", rate: Money.of("20.00", "USD") },
    { minimumWageFloor: Money.of("15.00", "USD"), riskPremiumMultiplier: "1" },
  );
  assert.equal(wage.amount, "20.00");
});

// --- White-box: floor comparison branch ---

test("computeWage floor branch: exactly at floor", () => {
  const wage = computeWage(
    { hoursWorked: "1", rate: Money.of("15.00", "USD") },
    { minimumWageFloor: Money.of("15.00", "USD"), riskPremiumMultiplier: "1" },
  );
  // gross == floor, so floored result equals floor amount
  assert.equal(wage.amount, "15.00");
});
