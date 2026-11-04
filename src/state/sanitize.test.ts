import { expect, test } from 'vitest';
import { catalog } from '../catalog/items.ts';
import { EMPTY_SLOTS } from '../engine/build.ts';
import { EMPTY_GEAR_SET, EMPTY_SAVED_GEAR, type GearSet, type SavedGear } from './gear-sets.ts';
import { migrateSaved, sanitizeGearSet, sanitizeSaved } from './sanitize.ts';

const VALID: GearSet = {
  slots: {
    ...EMPTY_SLOTS,
    mainHand: { itemId: 'pro_gamer_knife', cursed: false },
    offHand: { itemId: 'wee_remote', cursed: false },
    legs: { itemId: 'fur_pants', cursed: true },
  },
  sockets: { red: 2, unholy: 1 },
};

const OTHER: GearSet = {
  slots: { ...EMPTY_SLOTS, head: { itemId: 'goat_hood', cursed: false } },
  sockets: { blue: 1 },
};

const SAVED: SavedGear = { sets: [VALID, EMPTY_GEAR_SET, OTHER], activeSet: 2, coins: 37 };

const slots = (overrides: Record<string, unknown>) => ({ ...VALID.slots, ...overrides });

/** Saved data can be from an older version, edited by hand or cut off; loading must not break. */
test.each<[string, unknown, GearSet]>([
  ['keeps a valid set as is', VALID, VALID],
  ['gives an empty set for non-objects', 'not json', EMPTY_GEAR_SET],
  ['gives an empty set for null', null, EMPTY_GEAR_SET],
  [
    'drops unknown items',
    { ...VALID, slots: slots({ head: { itemId: 'golden_crown', cursed: false } }) },
    VALID,
  ],
  [
    'drops items in the wrong slot',
    { ...VALID, slots: slots({ head: { itemId: 'fur_pants', cursed: false } }) },
    VALID,
  ],
  [
    'drops a shield in the main hand',
    { ...VALID, slots: slots({ mainHand: { itemId: 'orange_guard', cursed: false } }) },
    { ...VALID, slots: { ...VALID.slots, mainHand: null } },
  ],
  [
    'drops the off-hand copy of the main-hand weapon, even a cursed one',
    { ...VALID, slots: slots({ offHand: { itemId: 'pro_gamer_knife', cursed: true } }) },
    { ...VALID, slots: { ...VALID.slots, offHand: null } },
  ],
  [
    'reads a missing cursed flag as not cursed',
    { ...VALID, slots: slots({ legs: { itemId: 'fur_pants' } }) },
    { ...VALID, slots: { ...VALID.slots, legs: { itemId: 'fur_pants', cursed: false } } },
  ],
  [
    'drops unknown slots',
    { ...VALID, slots: slots({ ring: { itemId: 'goat_hood', cursed: false } }) },
    VALID,
  ],
  [
    'caps sockets at 8 and drops CURSED and unknown tags',
    { ...VALID, sockets: { red: 6, blue: 5, cursed: 1, shiny: 2 } },
    { ...VALID, sockets: { blue: 5, red: 3 } },
  ],
  [
    'drops negative and fractional socket counts to whole numbers',
    { ...VALID, sockets: { red: -2, blue: 2.7 } },
    { ...VALID, sockets: { blue: 2 } },
  ],
  ['reads a broken part as empty', { ...VALID, sockets: 'lots' }, { ...VALID, sockets: {} }],
  ['drops coins, which belong to the save', { ...VALID, coins: 5 }, VALID],
])('sanitizeGearSet %s', (_, saved, expected) => {
  expect(sanitizeGearSet(saved, catalog)).toEqual(expected);
});

test.each<[string, unknown, SavedGear]>([
  ['keeps a valid save as is', SAVED, SAVED],
  ['gives empty sets for non-objects', 'not json', EMPTY_SAVED_GEAR],
  ['gives empty sets for null', null, EMPTY_SAVED_GEAR],
  [
    'fills missing sets with empty ones',
    { ...SAVED, sets: [VALID], activeSet: 0 },
    { ...SAVED, sets: [VALID, EMPTY_GEAR_SET, EMPTY_GEAR_SET], activeSet: 0 },
  ],
  ['drops sets after the third', { ...SAVED, sets: [VALID, EMPTY_GEAR_SET, OTHER, VALID] }, SAVED],
  [
    'empties a broken set without touching the others',
    { ...SAVED, sets: [VALID, 'broken', OTHER] },
    SAVED,
  ],
  [
    'sanitizes each set',
    {
      ...SAVED,
      sets: [VALID, EMPTY_GEAR_SET, { ...OTHER, slots: { head: { itemId: 'fur_pants' } } }],
    },
    { ...SAVED, sets: [VALID, EMPTY_GEAR_SET, { ...OTHER, slots: EMPTY_SLOTS }] },
  ],
  [
    'reads a broken set list as empty sets',
    { ...SAVED, sets: 'lots' },
    { ...EMPTY_SAVED_GEAR, activeSet: 2, coins: 37 },
  ],
  [
    'falls back to Set 1 for an active set past the last',
    { ...SAVED, activeSet: 3 },
    { ...SAVED, activeSet: 0 },
  ],
  [
    'falls back to Set 1 for a negative active set',
    { ...SAVED, activeSet: -1 },
    { ...SAVED, activeSet: 0 },
  ],
  [
    'falls back to Set 1 for a fractional active set',
    { ...SAVED, activeSet: 1.5 },
    { ...SAVED, activeSet: 0 },
  ],
  [
    'falls back to Set 1 for a text active set',
    { ...SAVED, activeSet: '2' },
    { ...SAVED, activeSet: 0 },
  ],
  [
    'falls back to Set 1 for a missing active set',
    { sets: SAVED.sets, coins: 37 },
    { ...SAVED, activeSet: 0 },
  ],
  ['makes coins whole and non-negative', { ...SAVED, coins: -5 }, { ...SAVED, coins: 0 }],
  ['rounds fractional coins down', { ...SAVED, coins: 12.9 }, { ...SAVED, coins: 12 }],
])('sanitizeSaved %s', (_, saved, expected) => {
  expect(sanitizeSaved(saved, catalog)).toEqual(expected);
});

test.each<[string, unknown, SavedGear]>([
  [
    'turns the build into Set 1 and keeps its coins',
    { ...VALID, coins: 37 },
    { sets: [VALID, EMPTY_GEAR_SET, EMPTY_GEAR_SET], activeSet: 0, coins: 37 },
  ],
  [
    'still sanitizes the build',
    { ...VALID, sockets: { red: 9 }, coins: -1 },
    {
      sets: [{ ...VALID, sockets: { red: 8 } }, EMPTY_GEAR_SET, EMPTY_GEAR_SET],
      activeSet: 0,
      coins: 0,
    },
  ],
  ['gives empty sets for an unreadable build', 'not json', EMPTY_SAVED_GEAR],
])('a version 1 save %s', (_, saved, expected) => {
  expect(sanitizeSaved(migrateSaved(saved, 1), catalog)).toEqual(expected);
});

test('migrateSaved leaves current saves alone', () => {
  expect(migrateSaved(SAVED, 2)).toBe(SAVED);
});
