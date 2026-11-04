import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { catalog } from '../catalog/items.ts';
import { TAGS, Tag } from '../catalog/schema.ts';
import fixtureJson from './__fixtures__/reference-cases.json' with { type: 'json' };
import { type Build, EMPTY_SLOTS, SLOT_IDS, SOCKET_TAGS } from './build.ts';
import { PANEL_STATS, simulate } from './simulate.ts';

/**
 * Every case is an in-game measurement (see the introduction of RULES.md). Expected values are
 * what the game showed, never what this engine computed, so a change in the math can't quietly
 * update them.
 */
const Fixture = z.strictObject({
  $comment: z.string(),
  cases: z.array(
    z
      .strictObject({
        name: z.string(),
        source: z.enum(['inherited', 'observation', 'screenshot']),
        slots: z.partialRecord(z.enum(SLOT_IDS), z.string()),
        cursed: z.array(z.enum(SLOT_IDS)).optional(),
        sockets: z.partialRecord(z.enum(SOCKET_TAGS), z.int().positive()),
        coins: z.int().min(0),
        panel: z.partialRecord(z.enum(PANEL_STATS), z.number()).optional(),
        tags: z.partialRecord(Tag, z.int().min(0)).optional(),
      })
      .refine((entry) => entry.panel ?? entry.tags, 'A case needs measured panel stats or tags'),
  ),
});

type Case = z.infer<typeof Fixture>['cases'][number];
const { cases } = Fixture.parse(fixtureJson);

function toBuild({ slots, cursed = [], sockets, coins }: Case): Build {
  const filled = { ...EMPTY_SLOTS };
  for (const slot of SLOT_IDS) {
    const itemId = slots[slot];
    if (!itemId) continue;
    if (!catalog.byId.has(itemId)) throw new Error(`Unknown item ${itemId}`);
    filled[slot] = { itemId, cursed: cursed.includes(slot) };
  }
  return { slots: filled, sockets, coins };
}

describe('reference cases', () => {
  test('covers the 59 calibration cases and the four screenshots', () => {
    const bySource = Object.groupBy(cases, (c) => c.source);
    expect(bySource.inherited).toHaveLength(9);
    expect(bySource.observation).toHaveLength(50);
    expect(bySource.screenshot).toHaveLength(4);
  });

  test.each(cases)('$name', (fixture) => {
    const { panel, tags } = simulate(toBuild(fixture), catalog);
    const expectedPanel = fixture.panel ?? {};
    const expectedTags = fixture.tags ?? {};

    // Compare only what was measured; the game hides some stats and every zero tag.
    const actualPanel = PANEL_STATS.filter((stat) => stat in expectedPanel).map((stat) => [
      stat,
      panel[stat],
    ]);
    const actualTags = TAGS.filter((tag) => tag in expectedTags).map((tag) => [
      tag,
      tags.final[tag] ?? 0,
    ]);
    expect(Object.fromEntries(actualPanel)).toEqual(expectedPanel);
    expect(Object.fromEntries(actualTags)).toEqual(expectedTags);
  });
});
