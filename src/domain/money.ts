export type CurrencyCode = string;

/**
 * Money value object — exact decimal amount carried as a string, never a bare float.
 * Arithmetic is permitted only between Money of the same currency; crossing currencies
 * requires an explicit conversion that records the rate and the moment it was applied.
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
    return Money.of(this.addExact(this.amount, other.amount), this.currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }

  private addExact(a: string, b: string): string {
    const [aInt, aFrac = ""] = a.split(".");
    const [bInt, bFrac = ""] = b.split(".");
    const scale = Math.max(aFrac.length, bFrac.length);
    const aScaled = BigInt(aInt + aFrac.padEnd(scale, "0"));
    const bScaled = BigInt(bInt + bFrac.padEnd(scale, "0"));
    const sum = aScaled + bScaled;
    if (scale === 0) return sum.toString();
    const sumStr = sum.toString().padStart(scale + 1, "0");
    const intPart = sumStr.slice(0, sumStr.length - scale) || "0";
    const fracPart = sumStr.slice(sumStr.length - scale);
    return `${intPart}.${fracPart}`;
  }
}
