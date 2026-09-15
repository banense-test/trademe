import { Money } from "../money.js";

/**
 * WageComputation — computes wages from hours and rates (FR-007), applying the
 * jurisdiction wage floor (CON-008) and risk premium (CON-010). Every amount is a
 * Money value object; no bare float appears on this monetary path (ADR-004).
 *
 * Tax withholding (CON-009) and currency conversion (FR-022) are applied by the
 * PricingService in sequence after this computation (SEQ-002); this module owns
 * the floor + premium step.
 */
export interface WageInput {
  hoursWorked: string; // exact decimal, e.g. "7.50" (ADR-004)
  rate: Money; // agreed rate per hour
}

export interface WageRule {
  minimumWageFloor: Money; // CON-008
  riskPremiumMultiplier: string; // CON-010, e.g. "1.25" for high-risk work
}

export function computeWage(input: WageInput, rule: WageRule): Money {
  const hours = Money.of(input.hoursWorked, input.rate.currency);
  const gross = multiplyMoneyByScalar(input.rate, input.hoursWorked);
  const withPremium = multiplyMoneyByScalar(gross, rule.riskPremiumMultiplier);
  const floored = withPremium.amount < rule.minimumWageFloor.amount
    ? rule.minimumWageFloor
    : withPremium;
  return floored;
}

/** Multiply a Money amount by an exact decimal scalar (e.g. hours, premium). */
function multiplyMoneyByScalar(amount: Money, scalar: string): Money {
  // Reuse the exact multiply via a same-currency conversion trick is not available;
  // implement exact scalar multiply directly using BigInt scaling.
  const [aInt, aFrac = ""] = amount.amount.split(".");
  const [sInt, sFrac = ""] = scalar.split(".");
  const aScale = aFrac.length;
  const sScale = sFrac.length;
  const aScaled = BigInt(aInt + aFrac);
  const sScaled = BigInt(sInt + sFrac);
  const scale = aScale + sScale;
  const product = aScaled * sScaled;
  const str = product.toString().padStart(scale + 1, "0");
  const intPart = str.slice(0, str.length - scale) || "0";
  const fracPart = str.slice(str.length - scale);
  return Money.of(`${intPart}.${fracPart}`, amount.currency);
}
