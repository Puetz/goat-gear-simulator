import type { CatalogIndex } from '../catalog/catalog.ts';
import type { Item } from '../catalog/schema.ts';
import { type Build, blockedBy, itemsForSlot, type SlotId, withItem } from './build.ts';
import { roundTo1 } from './math.ts';
import { PANEL_STATS, type PanelStat, type SimulationResult, simulate } from './simulate.ts';

type PanelDelta = Readonly<Partial<Record<PanelStat, number>>>;

export type Candidate =
  | {
      readonly item: Item;
      readonly allowed: true;
      /** The item is what the slot already holds. */
      readonly equipped: boolean;
      readonly result: SimulationResult;
      /** Panel changes against the current build, without zero entries. */
      readonly delta: PanelDelta;
    }
  | {
      readonly item: Item;
      readonly allowed: false;
      /** The other hand already holds this weapon. */
      readonly blockedBy: SlotId;
    };

/**
 * Every item that fits the slot, each simulated in place of the current one. The slot's cursed
 * flag carries over, so previews and sorting show the cursed variant when the slot is cursed.
 */
export function evaluateCandidates(
  build: Build,
  slot: SlotId,
  current: SimulationResult,
  catalog: CatalogIndex,
): Candidate[] {
  const equippedId = build.slots[slot]?.itemId;
  return itemsForSlot(slot, catalog).map((item): Candidate => {
    const blocked = blockedBy(build, slot, item.id);
    if (blocked) return { item, allowed: false, blockedBy: blocked };
    const result =
      item.id === equippedId ? current : simulate(withItem(build, slot, item.id), catalog);
    return {
      item,
      allowed: true,
      equipped: item.id === equippedId,
      result,
      delta: panelDelta(current, result),
    };
  });
}

function panelDelta(before: SimulationResult, after: SimulationResult): PanelDelta {
  const delta: Partial<Record<PanelStat, number>> = {};
  for (const stat of PANEL_STATS) {
    // Base DPS has one decimal; rounding drops float noise such as 0.1 + 0.2.
    const change = roundTo1(after.panel[stat] - before.panel[stat]);
    if (change !== 0) delta[stat] = change;
  }
  return delta;
}
