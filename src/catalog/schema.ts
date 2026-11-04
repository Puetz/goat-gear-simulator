import { z } from 'zod';

/**
 * The catalog format (schemaVersion 1). This file is the single source of truth: the TypeScript
 * types come from `z.infer` and `items.schema.json` is generated from it (`pnpm schema`).
 */

/** The game's item tags. Called "properties" in the catalog. */
export const TAGS = [
  'blue',
  'blunt',
  'bone',
  'brown',
  'cloth',
  'cold',
  'cringe',
  'cursed',
  'dark',
  'dutch',
  'elegant',
  'enchanted',
  'french',
  'furry',
  'gothic',
  'green',
  'holy',
  'hot',
  'leather',
  'mail',
  'metal',
  'orange',
  'paper',
  'pink',
  'pirate',
  'red',
  'sharp',
  'unholy',
  'violet',
  'white',
  'wooden',
  'yellow',
] as const;

/** Stats measured in whole points. */
const FLAT_STATS = [
  'agility',
  'hp',
  'intelligence',
  'life_steal',
  'poison',
  'reflected_damage',
  'regeneration',
  'sneak_attack',
  'stamina',
  'strength',
] as const;

/** Stats measured in percent, using whole points (15 means 15%). */
const PERCENT_STATS = [
  'block',
  'critical_chance',
  'critical_damage',
  'damage',
  'item_luck',
  'melee_damage',
  'ranged_damage',
  'stun_chance',
] as const;

export const STATS = [...FLAT_STATS, ...PERCENT_STATS] as const;

export const ITEM_SLOTS = [
  'chest',
  'feet',
  'head',
  'legs',
  'shield',
  'shoulders',
  'waist',
  'weapon',
] as const;
export const RARITIES = ['common', 'uncommon', 'rare', 'epic'] as const;
const SCALING_STATS = ['agility', 'intelligence', 'strength'] as const;

export const Tag = z.enum(TAGS).meta({ id: 'tag' });
export const Stat = z.enum(STATS);
const FlatStat = z.enum(FLAT_STATS).meta({ id: 'flatStat' });
const PercentStat = z.enum(PERCENT_STATS).meta({ id: 'percentStat' });
export const ItemSlot = z.enum(ITEM_SLOTS);
export const Rarity = z.enum(RARITIES);
export const ScalingStat = z.enum(SCALING_STATS);

const ID_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

const text = z.string().min(1);
const chancePercent = z.number().min(0).max(100);

/**
 * Effects that add to a stat come in two variants, so the unit always matches the stat:
 * flat stats use `unit: "flat"`, percent stats use `unit: "percent"`.
 */
function statEffect<const K extends string, S extends z.core.$ZodLooseShape>(kind: K, shape: S) {
  const union = z.discriminatedUnion('unit', [
    z.strictObject({
      kind: z.literal(kind),
      stat: FlatStat,
      unit: z.literal('flat'),
      value: z.number(),
      ...shape,
      text,
    }),
    z.strictObject({
      kind: z.literal(kind),
      stat: PercentStat,
      unit: z.literal('percent'),
      value: z.number(),
      ...shape,
      text,
    }),
  ]);
  return union.meta({ id: kind });
}

const StatBonusEffect = statEffect('stat_bonus', {});
const StatPerPropertyEffect = statEffect('stat_per_property', { property: Tag });
const StatPerCurrencyEffect = statEffect('stat_per_currency', {
  currency: z.literal('coin'),
  currencyStep: z.int().min(1),
  maxBonus: z.number().min(0),
});
const StatPerMissingHealthEffect = statEffect('stat_per_missing_health', {
  healthPercentStep: z.number().gt(0).max(100),
});

const PropertyCountMultiplierEffect = z
  .strictObject({
    kind: z.literal('property_count_multiplier'),
    property: Tag,
    multiplier: z.int().min(1),
    text,
  })
  .meta({ id: 'property_count_multiplier' });

const PropertyGrantEffect = z
  .strictObject({
    kind: z.literal('property_grant'),
    sourceProperty: Tag,
    grantedProperty: Tag,
    count: z.int().min(1),
    text,
  })
  .meta({ id: 'property_grant' });

const ExtraAttackOnHitEffect = z
  .strictObject({
    kind: z.literal('extra_attack_on_hit'),
    chancePercent,
    text,
  })
  .meta({ id: 'extra_attack_on_hit' });

const LootOnHitEffect = z
  .strictObject({
    kind: z.literal('loot_on_hit'),
    chancePercent,
    amount: z.int().min(1),
    currency: z.literal('coin'),
    text,
  })
  .meta({ id: 'loot_on_hit' });

const ProjectileChanceEffect = z
  .strictObject({
    kind: z.literal('projectile_chance'),
    chancePercent,
    projectile: z.enum(['fireball', 'remote', 'sawblade']),
    text,
  })
  .meta({ id: 'projectile_chance' });

const DamageBeforeBattleEffect = z
  .strictObject({
    kind: z.literal('damage_before_battle'),
    amount: z.int().min(1),
    text,
  })
  .meta({ id: 'damage_before_battle' });

const ExtraSlowEffect = z
  .strictObject({
    kind: z.literal('extra_slow'),
    text,
  })
  .meta({ id: 'extra_slow' });

export const Effect = z
  .discriminatedUnion('kind', [
    DamageBeforeBattleEffect,
    ExtraAttackOnHitEffect,
    ExtraSlowEffect,
    LootOnHitEffect,
    ProjectileChanceEffect,
    PropertyCountMultiplierEffect,
    PropertyGrantEffect,
    StatBonusEffect,
    StatPerCurrencyEffect,
    StatPerMissingHealthEffect,
    StatPerPropertyEffect,
  ])
  .meta({ id: 'effect' });

export const Weapon = z
  .strictObject({
    type: z.enum(['axe', 'dagger', 'sword', 'wand']).nullable().meta({
      description: 'Printed weapon subtype, or null when none is printed.',
    }),
    damage: z.strictObject({ min: z.number().min(0), max: z.number().min(0) }),
    ranged: z
      .boolean()
      .meta({ description: 'True when the tooltip explicitly labels damage as ranged.' }),
    speed: z.number().gt(0).meta({ description: 'Seconds between attacks.' }),
    displayedDps: z
      .number()
      .min(0)
      .meta({ description: 'DPS as displayed, retaining tooltip rounding.' }),
    scalingStat: ScalingStat,
  })
  .meta({ id: 'weapon' });

/** An item's tags. Each tag appears at most once. */
const ItemTags = z
  .array(Tag)
  .refine((tags) => new Set(tags).size === tags.length, { message: 'Tags must be unique' })
  .meta({ uniqueItems: true });

const itemFields = {
  id: z.string().regex(ID_PATTERN),
  name: text,
  rarity: Rarity,
  properties: ItemTags,
  effects: z.array(Effect),
  flavorText: text.nullable(),
};

/** Weapons carry weapon stats; every other slot has `weapon: null`. */
export const Item = z
  .discriminatedUnion('slot', [
    z.strictObject({ ...itemFields, slot: z.literal('weapon'), weapon: Weapon }),
    z.strictObject({ ...itemFields, slot: ItemSlot.exclude(['weapon']), weapon: z.null() }),
  ])
  .meta({ id: 'item' });

export const Catalog = z
  .strictObject({
    schemaVersion: z.literal(1),
    items: z.array(Item).min(1),
  })
  .meta({
    title: 'GOAT Gear Item Catalog',
    description: 'Item stats and typed effects. Percent values use 15 for 15%.',
  });

export type Tag = z.infer<typeof Tag>;
export type Stat = z.infer<typeof Stat>;
export type ItemSlot = z.infer<typeof ItemSlot>;
export type Rarity = z.infer<typeof Rarity>;
export type ScalingStat = z.infer<typeof ScalingStat>;
export type Effect = z.infer<typeof Effect>;
export type Weapon = z.infer<typeof Weapon>;
export type Item = z.infer<typeof Item>;
export type WeaponItem = Extract<Item, { slot: 'weapon' }>;
export type Catalog = z.infer<typeof Catalog>;
