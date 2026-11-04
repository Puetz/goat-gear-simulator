import { expect, test } from 'vitest';
import { catalog } from '../catalog/items.ts';
import type { Tag, WeaponItem } from '../catalog/schema.ts';
import type { Equipped, SlotId } from './build.ts';
import {
  attributesFrom,
  chromaticStatus,
  hpBreakdown,
  regenerationFromIntelligence,
  weaponResult,
} from './derived.ts';
import { sumEffects } from './effects.ts';
import { effectiveAttribute, roundEven, roundTo1, weaponBonus } from './math.ts';

/** Edge cases stated in RULES.md §4–§6. Expected values are the documented in-game readings. */

function equipped(id: string, slot: SlotId): Equipped {
  const item = catalog.byId.get(id);
  if (!item) throw new Error(`Unknown item ${id}`);
  return { slot, item, cursed: false };
}

function weapon(id: string): Equipped & { item: WeaponItem } {
  const entry = equipped(id, 'mainHand');
  if (entry.item.slot !== 'weapon') throw new Error(`${id} is not a weapon`);
  return { ...entry, item: entry.item };
}

function mightyMalletDps(strength: number, chromaticMultiplier: number): number {
  const result = weaponResult(
    weapon('mighty_mallet'),
    attributesFrom({ strength }),
    chromaticMultiplier,
  );
  return roundTo1(result.dps);
}

function formalJacketStrength(coins: number): number | undefined {
  return sumEffects([equipped('formal_jacket', 'chest')], {}, coins).totals.strength;
}

function vampireMantleHp(stamina: number, wooden: number, chromaticMultiplier: number): number {
  const flatHp = sumEffects([equipped('vampire_mantle', 'shoulders')], { wooden }, 0).totals.hp;
  return hpBreakdown(attributesFrom({ stamina }), flatHp ?? 0, chromaticMultiplier, 0).total;
}

const CHROMATIC_TAGS: readonly Tag[] = ['red', 'blue', 'white', 'paper'];
function chromaticMultiplier(counts: readonly number[]): number {
  const tags = Object.fromEntries(counts.map((count, i) => [CHROMATIC_TAGS[i], count]));
  return chromaticStatus(tags).multiplier;
}

test.each<[string, () => number | undefined, number]>([
  // §4 roundEven: half-ties go to the even neighbour, also below zero
  ['roundEven(0.5)', () => roundEven(0.5), 0],
  ['roundEven(1.5)', () => roundEven(1.5), 2],
  ['roundEven(2.5)', () => roundEven(2.5), 2],
  ['roundEven(-1.5)', () => roundEven(-1.5), -2],
  ['roundEven(-2.5)', () => roundEven(-2.5), -2],
  ['roundEven(-3.5)', () => roundEven(-3.5), -4],
  ['roundEven(-2.6)', () => roundEven(-2.6), -3],
  ['roundEven(2.4)', () => roundEven(2.4), 2],
  // §4 effective attributes: the first breakpoint, and the two tested half-ties
  ['E(100)', () => effectiveAttribute(100), 100],
  ['E(101)', () => effectiveAttribute(101), 101],
  ['E(102)', () => effectiveAttribute(102), 102],
  ['E(103)', () => effectiveAttribute(103), 102],
  ['E(220) (crit 196)', () => effectiveAttribute(220), 196],
  ['E(324) (crit 279)', () => effectiveAttribute(324), 279],
  ['E(432) (crit 366)', () => effectiveAttribute(432), 366],
  ['E(693): 516.5 rounds to 516', () => effectiveAttribute(693), 516],
  ['E(891): 615.5 rounds to 616', () => effectiveAttribute(891), 616],
  // §4 the 10% tier above 2000, from the 2026-11-02 run screenshot
  ['E(2369) (HP 12352)', () => effectiveAttribute(2369), 907],
  ['E(3573) (crit 1027)', () => effectiveAttribute(3573), 1027],
  ['E(-9) is not clamped', () => effectiveAttribute(-9), -9],
  // §6 weapon precision: binary32 speed, truncation toward zero
  ['Mighty Mallet, Str 0', () => mightyMalletDps(0, 1), 53.3],
  ['Mighty Mallet, Str 0, bichromatic', () => mightyMalletDps(0, 1.25), 66.7],
  ['Mighty Mallet, Str 60', () => mightyMalletDps(60, 1), 233.3],
  ['Mighty Mallet, Str 60, bichromatic', () => mightyMalletDps(60, 1.25), 291.5],
  [
    'Forearm Blade bonus at Agility -9 truncates to -7',
    () => weaponBonus(weapon('forearm_blade').item.weapon.speed, effectiveAttribute(-9)),
    -7,
  ],
  // §3 coins: 6 Strength per complete 5 coins, capped at 60
  ['Formal Jacket, 23 coins', () => formalJacketStrength(23), 24],
  ['Formal Jacket, 73 coins', () => formalJacketStrength(73), 60],
  // §6 HP: flat penalties apply before the chromatic bonus
  ['Vampire Mantle: Stamina 45, one WOODEN, bichromatic', () => vampireMantleHp(45, 1, 1.25), 625],
  ['HP half-tie 4937.5 rounds to 4938', () => roundEven(4937.5), 4938],
  ['HP half-tie 5462.5 rounds to 5462', () => roundEven(5462.5), 5462],
  // 2830 × 1.35 is 3820.5000000000005 in floating point: still a half-tie, so it goes to even.
  ['trichromatic half-tie despite float error', () => roundEven(2830 * 1.35), 3820],
  // §6 regeneration: 1 per 3 effective Intelligence
  [
    'Regeneration from Int 6',
    () => regenerationFromIntelligence(attributesFrom({ intelligence: 6 })),
    2,
  ],
  // §5 chromatic tiers: 10 qualifies, 9 doesn't, a fourth tag adds nothing
  ['one tag at 10', () => chromaticMultiplier([10, 9]), 1],
  ['two tags at 10', () => chromaticMultiplier([10, 10, 9]), 1.25],
  ['three tags at 10', () => chromaticMultiplier([10, 10, 10]), 1.35],
  ['four tags at 10', () => chromaticMultiplier([12, 10, 10, 30]), 1.35],
])('%s', (_, actual, expected) => {
  expect(actual()).toBe(expected);
});
