import type { CatalogIndex } from '../catalog/catalog.ts';
import { type Build, type Equipped, resolveEquipped } from './build.ts';
import {
  type Attributes,
  attributesFrom,
  BASE_CRITICAL_DAMAGE,
  type Chromatic,
  chromaticStatus,
  type HpBreakdown,
  hpBreakdown,
  regenerationFromIntelligence,
  type WeaponResult,
  weaponResult,
} from './derived.ts';
import { type EffectStat, type EffectTotals, sumEffects } from './effects.ts';
import { roundTo1 } from './math.ts';
import { computeTags, type TagSummary } from './tags.ts';

/** The stats in the game's panel, in its order. */
export const PANEL_STATS = [
  'hp',
  'base_dps',
  'stamina',
  'strength',
  'agility',
  'intelligence',
  'critical_chance',
  'critical_damage',
  'regeneration',
  'block',
  'life_steal',
  'poison',
  'reflected_damage',
  'sneak_attack',
  'stun_chance',
  'item_luck',
  'extra_attacks',
  'loot_gold',
  'damage',
  'melee_damage',
  'ranged_damage',
] as const;
export type PanelStat = (typeof PANEL_STATS)[number];
type Panel = Readonly<Record<PanelStat, number>>;

export interface SimulationResult {
  readonly equipped: readonly Equipped[];
  readonly tags: TagSummary;
  readonly effects: EffectTotals;
  readonly attributes: Attributes;
  readonly chromatic: Chromatic;
  readonly weapons: readonly WeaponResult[];
  readonly hp: HpBreakdown;
  readonly panel: Panel;
}

/**
 * Computes everything the app shows for a build, following the order in RULES.md §3:
 * items and sockets → tags → effects → effective attributes, chromatic bonus and cursed HP
 * penalty → panel.
 */
export function simulate(build: Build, catalog: CatalogIndex): SimulationResult {
  const equipped = resolveEquipped(build, catalog);
  const tags = computeTags(equipped, build.sockets);
  const effects = sumEffects(equipped, tags.final, build.coins);
  const total = (stat: EffectStat) => effects.totals[stat] ?? 0;

  const attributes = attributesFrom(effects.totals);
  const chromatic = chromaticStatus(tags.final);
  const weapons = equipped.flatMap((entry) =>
    entry.item.slot === 'weapon'
      ? [weaponResult({ ...entry, item: entry.item }, attributes, chromatic.multiplier)]
      : [],
  );
  const cursedItems = equipped.filter((entry) => entry.cursed).length;
  const hp = hpBreakdown(attributes, total('hp'), chromatic.multiplier, cursedItems);
  const baseDps = weapons.reduce((sum, weapon) => sum + weapon.dps, 0);

  const panel: Panel = {
    hp: hp.total,
    base_dps: roundTo1(baseDps),
    stamina: attributes.stamina.raw,
    strength: attributes.strength.raw,
    agility: attributes.agility.raw,
    intelligence: attributes.intelligence.raw,
    critical_chance: attributes.agility.effective + total('critical_chance'),
    critical_damage: BASE_CRITICAL_DAMAGE + total('critical_damage'),
    regeneration: total('regeneration') + regenerationFromIntelligence(attributes),
    block: total('block'),
    life_steal: total('life_steal'),
    poison: total('poison'),
    reflected_damage: total('reflected_damage'),
    sneak_attack: total('sneak_attack'),
    stun_chance: total('stun_chance'),
    item_luck: total('item_luck'),
    extra_attacks: total('extra_attacks'),
    loot_gold: total('loot_gold'),
    damage: total('damage'),
    melee_damage: total('melee_damage'),
    ranged_damage: total('ranged_damage'),
  };

  return { equipped, tags, effects, attributes, chromatic, weapons, hp, panel };
}
