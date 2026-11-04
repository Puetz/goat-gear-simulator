import type { Effect, Stat, Tag } from '../catalog/schema.ts';
import type { Equipped } from './build.ts';
import type { ItemSource, TagCounts } from './tags.ts';

/** Stats that effects add to: catalog stats plus two display-only chance totals. */
export type EffectStat = Stat | 'extra_attacks' | 'loot_gold';

type ContributionDetail =
  | { readonly kind: 'perTag'; readonly tag: Tag; readonly tagCount: number }
  | { readonly kind: 'perCoins'; readonly coins: number; readonly capped: boolean };

/** One effect's share of a stat total. */
export interface Contribution extends ItemSource {
  readonly text: string;
  readonly value: number;
  readonly detail: ContributionDetail | null;
}

export type NotCalculatedReason =
  | 'missingHealth'
  | 'combatEffect'
  | 'damageModifier'
  | 'beforeBattle';

/** An effect that's shown on an item but left out of the numbers. */
export interface NotCalculated extends ItemSource {
  readonly text: string;
  readonly reason: NotCalculatedReason;
}

export interface EffectTotals {
  readonly totals: Readonly<Partial<Record<EffectStat, number>>>;
  readonly contributions: Readonly<Partial<Record<EffectStat, readonly Contribution[]>>>;
  readonly notCalculated: readonly NotCalculated[];
}

/** RULES.md §3, effect accumulation: sums every effect into stat totals, after the tag phase. */
export function sumEffects(
  equipped: readonly Equipped[],
  tags: TagCounts,
  coins: number,
): EffectTotals {
  const totals: Partial<Record<EffectStat, number>> = {};
  const contributions: Partial<Record<EffectStat, Contribution[]>> = {};
  const notCalculated: NotCalculated[] = [];

  for (const source of equipped) {
    for (const effect of source.item.effects) {
      const amount = effectAmount(effect, tags, coins);
      if (amount) {
        const { stat, value, detail } = amount;
        totals[stat] = (totals[stat] ?? 0) + value;
        contributions[stat] = [
          ...(contributions[stat] ?? []),
          { ...source, text: effect.text, value, detail },
        ];
      }
      const reason = notCalculatedReason(effect);
      if (reason) notCalculated.push({ ...source, text: effect.text, reason });
    }
  }

  return { totals, contributions, notCalculated };
}

interface Amount {
  readonly stat: EffectStat;
  readonly value: number;
  readonly detail: ContributionDetail | null;
}

function effectAmount(effect: Effect, tags: TagCounts, coins: number): Amount | null {
  switch (effect.kind) {
    case 'stat_bonus':
      return { stat: effect.stat, value: effect.value, detail: null };
    case 'stat_per_property': {
      const tagCount = tags[effect.property] ?? 0;
      return {
        stat: effect.stat,
        value: effect.value * tagCount,
        detail: { kind: 'perTag', tag: effect.property, tagCount },
      };
    }
    case 'stat_per_currency': {
      const uncapped = Math.floor(coins / effect.currencyStep) * effect.value;
      return {
        stat: effect.stat,
        value: Math.min(uncapped, effect.maxBonus),
        detail: { kind: 'perCoins', coins, capped: uncapped >= effect.maxBonus },
      };
    }
    case 'extra_attack_on_hit':
      return { stat: 'extra_attacks', value: effect.chancePercent, detail: null };
    case 'loot_on_hit':
      return { stat: 'loot_gold', value: effect.chancePercent, detail: null };
    case 'property_count_multiplier':
    case 'property_grant':
    case 'stat_per_missing_health':
    case 'projectile_chance':
    case 'extra_slow':
    case 'damage_before_battle':
      return null;
  }
}

function notCalculatedReason(effect: Effect): NotCalculatedReason | null {
  switch (effect.kind) {
    case 'stat_per_missing_health':
      return 'missingHealth';
    case 'projectile_chance':
    case 'extra_slow':
      return 'combatEffect';
    case 'damage_before_battle':
      // Lowers the HP a battle starts with, not max HP, which is what the panel shows.
      return 'beforeBattle';
    case 'stat_bonus':
    case 'stat_per_property':
    case 'stat_per_currency':
      // Shown as a stat total, but how it changes damage hasn't been calibrated.
      return effect.stat === 'damage' ||
        effect.stat === 'melee_damage' ||
        effect.stat === 'ranged_damage'
        ? 'damageModifier'
        : null;
    case 'extra_attack_on_hit':
    case 'loot_on_hit':
    case 'property_count_multiplier':
    case 'property_grant':
      return null;
  }
}
