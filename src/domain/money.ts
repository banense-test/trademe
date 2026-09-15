export type CurrencyCode = string;

/**
 * ExchangeRate value object — the rate and the moment it was applied.
 * Conversion is explicit and auditable (ADR-004): a cross-currency operation
 * carries the rate and the timestamp so the conversion can be reconstructed
 * and verified later (TC-007). The rate is an exact decimal string, never a
 * bare float.
 */
export class ExchangeRate {
  constructor(
    public readonly from: CurrencyCode,
    public readonly to: CurrencyCode,
    public readonly rate: string,
    public readonly appliedAt: Date,
  ) {
    if (!/^\d+(\.\d+)?$/.test(rate)) {
      throw new Error(`Invalid exchange rate: ${rate}`);
    }
  }
}

/**
 * Money value object — exact decimal amount carried as a string, never a bare float.
 * Arithmetic is permitted only between Money of the same currency; crossing currencies
 * requires an explicit conversion (convert) that records the rate and the moment it was applied.
 *
 * This runtime has no native decimal type, so exactness lives here. The two edges that
 * could degrade exactness — the database driver and JSON serialization — are closed
 * elsewhere (driver type handling, API boundary), but the value object itself must never
 * expose a floating-point representation.
 */
export class Money {
  private constructor(
    public readonly amount: string,
    public readonly currency: CurrencyCode,
  ) {}

  static of(amount: string, currency: CurrencyCode): Money {
    if (!/^\d+(\.\d+)?$/.test(amount)) {
      throw new Error(`Invalid monetary amount: ${amount}`);
    }
    return new Money(amount, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(addExact(this.amount, other.amount), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(subtractExact(this.amount, other.amount), this.currency);
  }

  /**
   * Convert this amount to the rate's target currency. The rate's `from` must
   * match this amount's currency; the result is an exact decimal in `rate.to`.
   * The ExchangeRate (rate + moment) is the audit record of the conversion (ADR-004).
   */
  convert(rate: ExchangeRate): Money {
    if (rate.from !== this.currency) {
      throw new Error(
        `Exchange rate currency mismatch: ${rate.from} vs ${this.currency}`,
      );
    }
    return Money.of(multiplyExact(this.amount, rate.rate), rate.to);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}

// --- Exact decimal arithmetic (BigInt-scaled; no floating point) ---

function toScaled(value: string): { scaled: bigint; scale: number } {
  const [int, frac = ""] = value.split(".");
  const scale = frac.length;
  const scaled = BigInt(int + frac);
  return { scaled, scale };
}

function fromScaled(scaled: bigint, scale: number): string {
  if (scale === 0) return scaled.toString();
  const str = scaled.toString().padStart(scale + 1, "0");
  const intPart = str.slice(0, str.length - scale) || "0";
  let fracPart = str.slice(str.length - scale).replace(/0+$/, "");
  return fracPart.length === 0 ? intPart : `${intPart}.${fracPart}`;
}

function addExact(a: string, b: string): string {
  const { scaled: aScaled, scale: aScale } = toScaled(a);
  const { scaled: bScaled, scale: bScale } = toScaled(b);
  const scale = Math.max(aScale, bScale);
  const aBig = aScaled * 10n ** BigInt(scale - aScale);
  const bBig = bScaled * 10n ** BigInt(scale - bScale);
  return fromScaled(aBig + bBig, scale);
}

function subtractExact(a: string, b: string): string {
  const { scaled: aScaled, scale: aScale } = toScaled(a);
  const { scaled: bScaled, scale: bScale } = toScaled(b);
  const scale = Math.max(aScale, bScale);
  const aBig = aScaled * 10n ** BigInt(scale - aScale);
  const bBig = bScaled * 10n ** BigInt(scale - bScale);
  const diff = aBig - bBig;
  if (diff < 0n) {
    throw new Error(`Subtraction would produce a negative amount: ${a} - ${b}`);
  }
  return fromScaled(diff, scale);
}

function multiplyExact(a: string, b: string): string {
  const { scaled: aScaled, scale: aScale } = toScaled(a);
  const { scaled: bScaled, scale: bScale } = toScaled(b);
  const scale = aScale + bScale;
  return fromScaled(aScaled * bScaled, scale);
}
