import { TAGS, type Tag } from '../catalog/schema.ts';
import { type Equipped, SOCKET_TAGS, type Sockets } from './build.ts';
import { CURSED_TAG_FACTOR, CURSED_TAGS_PER_ITEM } from './cursed.ts';

export type TagCounts = Readonly<Partial<Record<Tag, number>>>;

/** The equipped item a number comes from. */
export type ItemSource = Equipped;

/** One raw count for a tag, before multipliers. */
type TagSource =
  | ({ readonly kind: 'item' | 'curse'; readonly count: number } & ItemSource)
  | { readonly kind: 'sockets'; readonly count: number };

export interface MultiplierRule {
  readonly kind: 'multiplier';
  readonly tag: Tag;
  readonly multiplier: number;
  readonly source: ItemSource;
}

export interface GrantRule {
  readonly kind: 'grant';
  readonly from: Tag;
  readonly to: Tag;
  readonly count: number;
  /** How many `to` tags this grant adds to the final counts. */
  readonly added: number;
  readonly source: ItemSource;
}

export type TagRule = MultiplierRule | GrantRule;

export interface TagSummary {
  /** Counts from items, curses and sockets, before multipliers. */
  readonly raw: TagCounts;
  /** Product of all multipliers per tag; tags without one are absent (meaning ×1). */
  readonly multipliers: TagCounts;
  /** `raw × multiplier`, the counts grants read from. */
  readonly base: TagCounts;
  /** Final counts: base plus grants. These drive effects and chromatic bonuses. */
  readonly final: TagCounts;
  readonly sources: Readonly<Partial<Record<Tag, readonly TagSource[]>>>;
  readonly rules: readonly TagRule[];
}

/**
 * RULES.md §3, tag phase: raw counts → global multipliers (stacking multiplicatively, including
 * their own item) → one pass of grants. A grant reads the multiplied source count and is
 * multiplied again by the destination tag's multiplier.
 */
export function computeTags(equipped: readonly Equipped[], sockets: Sockets): TagSummary {
  const raw: Partial<Record<Tag, number>> = {};
  const sources: Partial<Record<Tag, TagSource[]>> = {};
  const addRaw = (tag: Tag, source: TagSource) => {
    raw[tag] = (raw[tag] ?? 0) + source.count;
    sources[tag] = [...(sources[tag] ?? []), source];
  };

  for (const source of equipped) {
    const count = source.cursed ? CURSED_TAG_FACTOR : 1;
    for (const tag of source.item.properties) addRaw(tag, { ...source, kind: 'item', count });
    if (source.cursed) addRaw('cursed', { ...source, kind: 'curse', count: CURSED_TAGS_PER_ITEM });
  }
  for (const tag of SOCKET_TAGS) {
    const count = sockets[tag] ?? 0;
    if (count > 0) addRaw(tag, { kind: 'sockets', count });
  }

  const multipliers: Partial<Record<Tag, number>> = {};
  const rules: TagRule[] = [];
  for (const source of equipped) {
    for (const effect of source.item.effects) {
      if (effect.kind !== 'property_count_multiplier') continue;
      multipliers[effect.property] = (multipliers[effect.property] ?? 1) * effect.multiplier;
      rules.push({
        kind: 'multiplier',
        tag: effect.property,
        multiplier: effect.multiplier,
        source,
      });
    }
  }

  const base: Partial<Record<Tag, number>> = {};
  for (const tag of TAGS) {
    if (raw[tag] !== undefined) base[tag] = raw[tag] * (multipliers[tag] ?? 1);
  }

  const final = { ...base };
  for (const source of equipped) {
    for (const effect of source.item.effects) {
      if (effect.kind !== 'property_grant') continue;
      const { sourceProperty: from, grantedProperty: to, count } = effect;
      const added = (base[from] ?? 0) * count * (multipliers[to] ?? 1);
      final[to] = (final[to] ?? 0) + added;
      rules.push({ kind: 'grant', from, to, count, added, source });
    }
  }

  return { raw, multipliers, base, final, sources, rules };
}

/** Tags with a positive count, highest first, then alphabetical. */
export function sortedTags(counts: TagCounts): [Tag, number][] {
  return TAGS.flatMap((tag): [Tag, number][] => {
    const count = counts[tag] ?? 0;
    return count > 0 ? [[tag, count]] : [];
  }).sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
}
