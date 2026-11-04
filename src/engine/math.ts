/**
 * Number rules from RULES.md §4 and §6. Kept separate so the edge cases have one home and one
 * test table.
 */

/** Ties closer than this count as exact half-ties (absorbs float error such as `x * 1.35`). */
const TIE_TOLERANCE = 1e-9;

/** Nearest integer; exact half-ties go to the even neighbour, also for negative values. */
export function roundEven(value: number): number {
  const lower = Math.floor(value);
  if (Math.abs(value - lower - 0.5) > TIE_TOLERANCE) return Math.round(value);
  return lower % 2 === 0 ? lower : lower + 1;
}

/**
 * Diminishing returns on attributes: full value up to 100, then 80%, 50%, 20% and 10% per point.
 * The first tier has no lower bound, so negative attributes count fully.
 */
export const ATTRIBUTE_TIERS = [
  { from: Number.NEGATIVE_INFINITY, to: 100, rate: 1 },
  { from: 100, to: 500, rate: 0.8 },
  { from: 500, to: 1000, rate: 0.5 },
  { from: 1000, to: 2000, rate: 0.2 },
  { from: 2000, to: Number.POSITIVE_INFINITY, rate: 0.1 },
] as const;

/** E(x): how much an attribute counts for derived stats. Attributes are never clamped to 0. */
export function effectiveAttribute(value: number): number {
  let total = Math.min(value, ATTRIBUTE_TIERS[0].to);
  for (const { from, to, rate } of ATTRIBUTE_TIERS.slice(1)) {
    total += rate * Math.max(0, Math.min(value - from, to - from));
  }
  return roundEven(total);
}

/**
 * Damage a weapon adds to each hit from its scaling attribute. The speed goes through binary32
 * (`Math.fround`) and the result truncates toward zero; both are needed to match the game.
 */
export function weaponBonus(speed: number, effectiveScaling: number): number {
  return Math.trunc(Math.fround(speed) * (15 + 3 * effectiveScaling));
}

/** Rounds to one decimal, the precision the game shows for Base DPS. */
export function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}
