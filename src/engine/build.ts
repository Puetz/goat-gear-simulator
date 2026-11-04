import type { CatalogIndex } from '../catalog/catalog.ts';
import { type Item, type ItemSlot, TAGS, type Tag } from '../catalog/schema.ts';

/** The eight gear slots, in the order the game lists them. */
export const SLOT_IDS = [
  'mainHand',
  'offHand',
  'chest',
  'head',
  'legs',
  'waist',
  'shoulders',
  'feet',
] as const;
export type SlotId = (typeof SLOT_IDS)[number];

const ACCEPTED_ITEM_SLOTS: Readonly<Record<SlotId, readonly ItemSlot[]>> = {
  mainHand: ['weapon'],
  offHand: ['weapon', 'shield'],
  chest: ['chest'],
  head: ['head'],
  legs: ['legs'],
  waist: ['waist'],
  shoulders: ['shoulders'],
  feet: ['feet'],
};

/** Sockets take every tag except CURSED, which only comes from cursed items. */
export type SocketTag = Exclude<Tag, 'cursed'>;
export const SOCKET_TAGS: readonly SocketTag[] = TAGS.filter(
  (tag): tag is SocketTag => tag !== 'cursed',
);

/** Each item carries at most one socket. */
export const MAX_SOCKETS = 8;

interface EquippedSlot {
  readonly itemId: string;
  /** Belongs to the slot: it stays when the item changes and goes when the slot is cleared. */
  readonly cursed: boolean;
}

type Slots = Readonly<Record<SlotId, EquippedSlot | null>>;
export type Sockets = Readonly<Partial<Record<SocketTag, number>>>;

export interface Build {
  readonly slots: Slots;
  readonly sockets: Sockets;
  readonly coins: number;
}

export const EMPTY_SLOTS: Slots = {
  mainHand: null,
  offHand: null,
  chest: null,
  head: null,
  legs: null,
  waist: null,
  shoulders: null,
  feet: null,
};

/** An item resolved from the catalog, in the slot it's equipped in. */
export interface Equipped {
  readonly slot: SlotId;
  readonly item: Item;
  readonly cursed: boolean;
}

function accepts(slot: SlotId, item: Item): boolean {
  return ACCEPTED_ITEM_SLOTS[slot].includes(item.slot);
}

/** Items that can go into a slot, ignoring the rest of the build. */
export function itemsForSlot(slot: SlotId, catalog: CatalogIndex): Item[] {
  return ACCEPTED_ITEM_SLOTS[slot].flatMap((itemSlot) => catalog.bySlot[itemSlot]);
}

function otherHand(slot: SlotId): SlotId | null {
  if (slot === 'mainHand') return 'offHand';
  if (slot === 'offHand') return 'mainHand';
  return null;
}

/**
 * The other hand, if it already holds this item. The game doesn't allow the same weapon in
 * both hands, cursed or not.
 */
export function blockedBy(
  build: Pick<Build, 'slots'>,
  slot: SlotId,
  itemId: string,
): SlotId | null {
  const other = otherHand(slot);
  return other && build.slots[other]?.itemId === itemId ? other : null;
}

export function canEquip(build: Pick<Build, 'slots'>, slot: SlotId, item: Item): boolean {
  return accepts(slot, item) && blockedBy(build, slot, item.id) === null;
}

/** Puts an item into a slot. The slot keeps its cursed flag. */
export function withItem<B extends Pick<Build, 'slots'>>(
  build: B,
  slot: SlotId,
  itemId: string,
): B {
  const cursed = build.slots[slot]?.cursed ?? false;
  return { ...build, slots: { ...build.slots, [slot]: { itemId, cursed } } };
}

export function resolveEquipped(build: Build, catalog: CatalogIndex): Equipped[] {
  return SLOT_IDS.flatMap((slot) => {
    const equipped = build.slots[slot];
    const item = equipped && catalog.byId.get(equipped.itemId);
    return item ? [{ slot, item, cursed: equipped.cursed }] : [];
  });
}

export function socketTotal(sockets: Sockets): number {
  return SOCKET_TAGS.reduce((sum, tag) => sum + (sockets[tag] ?? 0), 0);
}

/**
 * Sets one tag's socket count, as a whole number from 0 up to what the other sockets leave
 * free of {@link MAX_SOCKETS}. A count of 0 removes the tag.
 */
export function withSocketCount(sockets: Sockets, tag: SocketTag, count: number): Sockets {
  const others = socketTotal(sockets) - (sockets[tag] ?? 0);
  const clamped = Math.min(Math.max(0, Math.trunc(count) || 0), MAX_SOCKETS - others);
  const { [tag]: _, ...rest } = sockets;
  return clamped > 0 ? { ...rest, [tag]: clamped } : rest;
}

/** Coins are a whole, non-negative number. */
export function normalizeCoins(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function equippedCount(slots: Slots): number {
  return SLOT_IDS.filter((slot) => slots[slot] !== null).length;
}
