import { z } from 'zod';
import type { CatalogIndex } from '../catalog/catalog.ts';
import {
  canEquip,
  normalizeCoins,
  SLOT_IDS,
  SOCKET_TAGS,
  type Sockets,
  withSocketCount,
} from '../engine/build.ts';
import {
  EMPTY_GEAR_SET,
  EMPTY_SAVED_GEAR,
  type GearSet,
  type SavedGear,
  SET_INDEXES,
  type SetIndex,
} from './gear-sets.ts';

/**
 * One saved set, read leniently: a broken part falls back on its own so the rest survives.
 * Item ids and counts are checked against the catalog and game rules afterwards.
 */
const SavedGearSet = z.object({
  slots: z
    .record(
      z.string(),
      z
        .object({ itemId: z.string(), cursed: z.boolean().catch(false) })
        .nullable()
        .catch(null),
    )
    .catch({}),
  sockets: z.record(z.string(), z.number().catch(0)).catch({}),
});

/** The whole save. Each set is read on its own, so one broken set doesn't take the others. */
const SavedGearSets = z.object({
  sets: z.array(z.unknown()).catch([]),
  activeSet: z.literal(SET_INDEXES).catch(0),
  coins: z.number().catch(0),
});

/** Before version 2 the save held a single build, coins included. */
const SavedV1 = z.object({ slots: z.unknown(), sockets: z.unknown(), coins: z.unknown() });

/**
 * Brings an older save up to the current shape; `sanitizeSaved` checks the result. A version 1
 * build becomes Set 1, and its coins become the shared coins.
 */
export function migrateSaved(saved: unknown, version: number): unknown {
  if (version >= 2) return saved;
  const parsed = SavedV1.safeParse(saved);
  if (!parsed.success) return saved;
  const { slots, sockets, coins } = parsed.data;
  return { sets: [{ slots, sockets }], activeSet: 0, coins };
}

/**
 * Turns whatever was saved into three valid sets: missing or unreadable sets are empty, extra
 * ones are dropped, an unknown active set becomes Set 1 and coins become a whole, non-negative
 * number. Anything unreadable gives three empty sets.
 */
export function sanitizeSaved(saved: unknown, catalog: CatalogIndex): SavedGear {
  const parsed = SavedGearSets.safeParse(saved);
  if (!parsed.success) return EMPTY_SAVED_GEAR;
  const { sets, activeSet, coins } = parsed.data;
  const set = (index: SetIndex) => sanitizeGearSet(sets[index], catalog);
  return { sets: [set(0), set(1), set(2)], activeSet, coins: normalizeCoins(coins) };
}

/**
 * Turns one saved set into a valid one: unknown or misplaced items are dropped, the off-hand
 * loses a duplicate of the main-hand weapon and sockets are capped at 8. Anything unreadable
 * gives an empty set.
 */
export function sanitizeGearSet(saved: unknown, catalog: CatalogIndex): GearSet {
  const parsed = SavedGearSet.safeParse(saved);
  if (!parsed.success) return EMPTY_GEAR_SET;
  const { slots: savedSlots, sockets: savedSockets } = parsed.data;

  let set = EMPTY_GEAR_SET;
  for (const slot of SLOT_IDS) {
    const saved = savedSlots[slot];
    const item = saved && catalog.byId.get(saved.itemId);
    if (!item || !canEquip(set, slot, item)) continue;
    set = { ...set, slots: { ...set.slots, [slot]: { itemId: item.id, cursed: saved.cursed } } };
  }

  let sockets: Sockets = {};
  for (const tag of SOCKET_TAGS) sockets = withSocketCount(sockets, tag, savedSockets[tag] ?? 0);

  return { ...set, sockets };
}
