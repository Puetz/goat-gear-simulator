import type { Item } from '../catalog/schema.ts';

const MINUS = '−';

/** Whole numbers as is, others with one decimal; a typographic minus for negatives. */
export function formatNumber(value: number): string {
  const digits = Number.isInteger(value) ? String(Math.abs(value)) : Math.abs(value).toFixed(1);
  return value < 0 ? `${MINUS}${digits}` : digits;
}

/** Like {@link formatNumber}, with a plus sign on positive values and zero ("+0", as the game). */
export function formatSigned(value: number): string {
  return value < 0 ? formatNumber(value) : `+${formatNumber(value)}`;
}

export function itemName(item: Item, cursed: boolean): string {
  return cursed ? `Cursed ${item.name}` : item.name;
}

/** The name of an equipped item, with "Cursed" for a cursed slot. */
export function equippedName({ item, cursed }: { readonly item: Item; readonly cursed: boolean }) {
  return itemName(item, cursed);
}
