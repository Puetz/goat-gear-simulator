import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import itemsJson from '../../items.json' with { type: 'json' };
import { CatalogError, parseCatalog } from './catalog.ts';
import { catalogJsonSchema, SCHEMA_PATH } from './json-schema.ts';
import { ITEM_SLOTS } from './schema.ts';

type Mutation = (items: unknown[]) => void;

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === 'object' && value !== null;

/** Sets one field of one item, following a path such as `['weapon', 'damage', 'min']`. */
function set(id: string, path: readonly [...PropertyKey[], PropertyKey], value: unknown): Mutation {
  return (items) => {
    let target: unknown = items.find((item) => isRecord(item) && item.id === id);
    for (const key of path.slice(0, -1)) target = isRecord(target) ? target[key] : undefined;
    const last = path[path.length - 1];
    if (!isRecord(target) || last === undefined) throw new Error(`No ${path.join('.')} on ${id}`);
    target[last] = value;
  };
}

/** The problems reported for a copy of items.json with one mutation applied. */
function problemsAfter(mutate: Mutation): string {
  const copy = structuredClone(itemsJson);
  mutate(copy.items);
  try {
    parseCatalog(copy);
    return '';
  } catch (error) {
    if (error instanceof CatalogError) return error.problems.join('\n');
    throw error;
  }
}

describe('catalog', () => {
  const catalog = parseCatalog(itemsJson);

  test('items.json parses, passes every integrity check and fills every item slot', () => {
    for (const slot of ITEM_SLOTS) expect(catalog.bySlot[slot].length).toBeGreaterThan(0);
    expect(Object.values(catalog.bySlot).flat()).toHaveLength(catalog.items.length);
  });

  test('items.schema.json is generated from the current zod schema', () => {
    expect(readFileSync(SCHEMA_PATH, 'utf8')).toBe(catalogJsonSchema());
  });

  const estoque = catalog.byId.get('estoque');
  if (estoque?.slot !== 'weapon') throw new Error('The tests need the estoque weapon');

  // Each problem must name the item and the field, e.g. "goat_hood (items[100]) › weapon: …".
  test.each<[string, Mutation, RegExp]>([
    [
      'an unknown field',
      set('goat_hood', ['stars'], 3),
      /^goat_hood \(items\[\d+\]\): Unrecognized key: "stars"/m,
    ],
    [
      'an unknown tag',
      set('goat_hood', ['properties', 0], 'shiny'),
      /^goat_hood .* › properties\[0\]:/m,
    ],
    [
      'a repeated tag',
      set('fur_pants', ['properties'], ['white', 'white']),
      /^fur_pants .* › properties: Tags must be unique/m,
    ],
    [
      'a percent unit on a flat stat',
      set('fur_pants', ['effects', 0, 'unit'], 'percent'),
      /^fur_pants .* › effects\[0\]\.stat:/m,
    ],
    [
      'a flat unit on ranged damage',
      set('poison_kunai', ['effects', 1, 'unit'], 'flat'),
      /^poison_kunai .* › effects\[1\]\.stat:/m,
    ],
    [
      'weapon stats on armour',
      set('goat_hood', ['weapon'], estoque.weapon),
      /^goat_hood .* › weapon:/m,
    ],
    ['a duplicate id', (items) => items.splice(1, 0, items[0]), /: duplicate id$/m],
    ['unsorted ids', (items) => items.reverse(), /: items must be sorted by id/m],
    [
      'a repeated effect text',
      set('poison_kunai', ['effects', 1, 'text'], '+22 Poison'),
      /^poison_kunai: duplicate effect text "\+22 Poison"$/m,
    ],
    [
      'damage.min above damage.max',
      set('estoque', ['weapon', 'damage', 'min'], 999),
      /^estoque: damage\.min 999 is above/m,
    ],
    [
      'a wrong displayedDps',
      set('estoque', ['weapon', 'displayedDps'], 1),
      /^estoque: displayedDps 1 should be/m,
    ],
  ])('rejects %s', (_, mutate, expected) => {
    expect(problemsAfter(mutate)).toMatch(expected);
  });
});
