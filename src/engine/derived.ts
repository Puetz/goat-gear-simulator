import type { ScalingStat, Tag, WeaponItem } from '../catalog/schema.ts';
import type { Equipped } from './build.ts';
import { CURSED_HP_PERCENT } from './cursed.ts';
import { effectiveAttribute, roundEven, weaponBonus } from './math.ts';
import { type ItemSource, sortedTags, type TagCounts } from './tags.ts';

const ATTRIBUTES = ['stamina', 'strength', 'agility', 'intelligence'] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export function isAttribute(stat: string): stat is Attribute {
  return (ATTRIBUTES as readonly string[]).includes(stat);
}

interface AttributeValue {
  /** The sum shown in the game's panel. */
  readonly raw: number;
  /** E(raw): what the attribute counts as in derived stats. */
  readonly effective: number;
}

export type Attributes = Readonly<Record<Attribute, AttributeValue>>;

export function attributesFrom(totals: Readonly<Partial<Record<Attribute, number>>>): Attributes {
  const value = (raw: number) => ({ raw, effective: effectiveAttribute(raw) });
  return {
    stamina: value(totals.stamina ?? 0),
    strength: value(totals.strength ?? 0),
    agility: value(totals.agility ?? 0),
    intelligence: value(totals.intelligence ?? 0),
  };
}

/** A tag needs this many final counts to qualify for a chromatic bonus. */
export const CHROMATIC_THRESHOLD = 10;

export type ChromaticTier = 'none' | 'bichromatic' | 'trichromatic';

export interface Chromatic {
  readonly tier: ChromaticTier;
  /** C: 1, 1.25 or 1.35. Applied to HP and to each damage endpoint, not to final DPS. */
  readonly multiplier: number;
  /** Tags at or above the threshold, highest first. */
  readonly qualifying: readonly (readonly [Tag, number])[];
  /** The highest tag still under the threshold, as a hint for the next tier. */
  readonly closest: readonly [Tag, number] | null;
}

/** RULES.md §5. More than three qualifying tags add nothing. */
export function chromaticStatus(tags: TagCounts): Chromatic {
  const sorted = sortedTags(tags);
  const qualifying = sorted.filter(([, count]) => count >= CHROMATIC_THRESHOLD);
  const q = qualifying.length;
  const tier: ChromaticTier = q >= 3 ? 'trichromatic' : q === 2 ? 'bichromatic' : 'none';
  return {
    tier,
    multiplier: 1 + (q >= 2 ? 0.25 : 0) + (q >= 3 ? 0.1 : 0),
    qualifying,
    closest: sorted.find(([, count]) => count < CHROMATIC_THRESHOLD) ?? null,
  };
}

export interface WeaponResult extends ItemSource {
  readonly scalingStat: ScalingStat;
  readonly speed: number;
  /** Damage added to each hit by the scaling attribute. */
  readonly bonus: number;
  readonly hitMin: number;
  readonly hitMax: number;
  /** Not rounded: the panel rounds the sum of both hands. */
  readonly dps: number;
}

/** RULES.md §6: each damage endpoint gets C and is rounded on its own, floored at 0. */
export function weaponResult(
  source: Equipped & { readonly item: WeaponItem },
  attributes: Attributes,
  chromaticMultiplier: number,
): WeaponResult {
  const { damage, speed, scalingStat } = source.item.weapon;
  const bonus = weaponBonus(speed, attributes[scalingStat].effective);
  const hit = (base: number) => Math.max(0, roundEven((base + bonus) * chromaticMultiplier));
  const hitMin = hit(damage.min);
  const hitMax = hit(damage.max);
  return {
    ...source,
    scalingStat,
    speed,
    bonus,
    hitMin,
    hitMax,
    // The catalog's decimal speed, not the binary32 one used for the bonus (RULES.md §6).
    dps: (hitMin + hitMax) / (2 * speed),
  };
}

const BASE_HP = 80;

export interface HpBreakdown {
  readonly base: number;
  /** 10 per effective Stamina. */
  readonly fromStamina: number;
  /** 1 per effective Strength. */
  readonly fromStrength: number;
  /** Flat HP bonuses and penalties from items. */
  readonly flat: number;
  readonly cursedItems: number;
  /** What the flat terms are multiplied by: C plus the cursed items' penalty. */
  readonly multiplier: number;
  readonly total: number;
}

/**
 * RULES.md §6: flat HP terms first, then the multiplier, then round half to even. Each cursed
 * item takes 20 points off the multiplier (RULES.md §3, "Cursed variants").
 */
export function hpBreakdown(
  attributes: Attributes,
  flatHp: number,
  chromaticMultiplier: number,
  cursedItems: number,
): HpBreakdown {
  const fromStamina = 10 * attributes.stamina.effective;
  const fromStrength = attributes.strength.effective;
  // Added in whole percent, so 1.35 and -20% give 1.15 rather than 1.1500000000000001.
  const percent = Math.round(chromaticMultiplier * 100) + cursedItems * CURSED_HP_PERCENT;
  const multiplier = percent / 100;
  return {
    base: BASE_HP,
    fromStamina,
    fromStrength,
    flat: flatHp,
    cursedItems,
    multiplier,
    total: roundEven((BASE_HP + fromStamina + fromStrength + flatHp) * multiplier),
  };
}

export const BASE_CRITICAL_DAMAGE = 100;

/** Regeneration gets 1 per 3 effective Intelligence, rounded down. */
export function regenerationFromIntelligence(attributes: Attributes): number {
  return Math.floor(attributes.intelligence.effective / 3);
}
