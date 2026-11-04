import { RARITIES } from '../../catalog/schema.ts';
import type { Candidate } from '../../engine/candidates.ts';
import type { PanelStat } from '../../engine/simulate.ts';
import { matchesFilter, type PickerFilter, type PickerSort } from '../../state/picker-store.ts';

export function filterCandidates(
  candidates: readonly Candidate[],
  filter: PickerFilter,
): Candidate[] {
  return candidates.filter(({ item }) => matchesFilter(item, filter));
}

/** How much the candidate changes a stat; 0 for items that can't be equipped. */
export function impactOf(candidate: Candidate, stat: PanelStat): number {
  return candidate.allowed ? (candidate.delta[stat] ?? 0) : 0;
}

/** The chosen order, with blocked items last so they don't push useful ones down. */
export function sortCandidates(
  candidates: readonly Candidate[],
  sort: PickerSort,
  stat: PanelStat,
): Candidate[] {
  const byName = (a: Candidate, b: Candidate) => a.item.name.localeCompare(b.item.name);
  const compare: Record<PickerSort, (a: Candidate, b: Candidate) => number> = {
    impact: (a, b) => impactOf(b, stat) - impactOf(a, stat) || byName(a, b),
    name: byName,
    rarity: (a, b) =>
      RARITIES.indexOf(b.item.rarity) - RARITIES.indexOf(a.item.rarity) || byName(a, b),
  };
  return [...candidates].sort(
    (a, b) => Number(b.allowed) - Number(a.allowed) || compare[sort](a, b),
  );
}

/**
 * The row an arrow key moves focus to from the focused row, or undefined to stay put: the list
 * doesn't wrap around. With no row focused (-1), either key goes to the first row.
 */
export function arrowTarget(
  focused: number,
  rows: number,
  key: 'ArrowDown' | 'ArrowUp',
): number | undefined {
  if (rows === 0) return undefined;
  if (focused === -1) return 0;
  const next = focused + (key === 'ArrowDown' ? 1 : -1);
  return next >= 0 && next < rows ? next : undefined;
}
