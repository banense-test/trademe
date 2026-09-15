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
  const gross = multiplyMoneyByScalar(input.rate, input.hoursWorked);
  const withPremium = multiplyMoneyByScalar(gross, rule.riskPremiumMultiplier);
  if (compareExact(withPremium.amount, rule.minimumWageFloor.amount) < 0) {
    return rule.minimumWageFloor;
  }
  return withPremium;
}

/** Multiply a Money amount by an exact decimal scalar (e.g. hours, premium). */
function multiplyMoneyByScalar(amount: Money, scalar: string): Money {
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

/** Compare two exact decimal strings numerically (BigInt-scaled). */
function compareExact(a: string, b: string): number {
  const [aInt, aFrac = ""] = a.split(".");
  const [bInt, bFrac = ""] = b.split(".");
  const scale = Math.max(aFrac.length, bFrac.length);
  const aScaled = BigInt(aInt + aFrac.padEnd(scale, "0"));
  const bScaled = BigInt(bInt + bFrac.padEnd(scale, "0"));
  if (aScaled < bScaled) return -1;
  if (aScaled > bScaled) return 1;
  return 0;
}
