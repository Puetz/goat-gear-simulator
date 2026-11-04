import { catalog } from '../catalog/items.ts';
import type { Item } from '../catalog/schema.ts';
import { canEquip, type SlotId, withItem } from '../engine/build.ts';
import { type SimulationResult, simulate } from '../engine/simulate.ts';
import { useBuild } from './build-store.ts';
import { usePickerSlot, usePreviewId } from './picker-store.ts';

/**
 * Stats are derived during render and never stored. The React Compiler memoizes the call, so
 * it only reruns when the build changes. Call it once, near the top, and pass the result down.
 */
export function useSimulation(): SimulationResult {
  return simulate(useBuild(), catalog);
}

export interface Preview {
  readonly slot: SlotId;
  readonly item: Item;
  /** The slot's cursed flag, which the previewed item takes over. */
  readonly cursed: boolean;
  /** The item the preview replaces, or null for an empty slot. */
  readonly replaces: Item | null;
  readonly result: SimulationResult;
}

/** The build with the picker's hovered item swapped in, or null when nothing is previewed. */
export function usePreview(): Preview | null {
  const build = useBuild();
  const slot = usePickerSlot();
  const previewId = usePreviewId();
  const item = previewId ? catalog.byId.get(previewId) : undefined;
  const equipped = slot ? build.slots[slot] : null;
  if (!slot || !item || equipped?.itemId === item.id || !canEquip(build, slot, item)) return null;

  return {
    slot,
    item,
    cursed: equipped?.cursed ?? false,
    replaces: (equipped && catalog.byId.get(equipped.itemId)) ?? null,
    result: simulate(withItem(build, slot, item.id), catalog),
  };
}
