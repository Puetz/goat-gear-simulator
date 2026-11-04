import { create } from 'zustand';
import { catalog } from '../catalog/items.ts';
import type { Item, Rarity, Tag } from '../catalog/schema.ts';
import type { SlotId } from '../engine/build.ts';
import type { PanelStat } from '../engine/simulate.ts';

export type PickerSort = 'impact' | 'name' | 'rarity';

/** Which items the picker lists. */
export interface PickerFilter {
  readonly query: string;
  readonly tag: Tag | null;
  /** Rarities to show; empty shows all. */
  readonly rarities: readonly Rarity[];
}

/** True if the item's name contains the search and it has the tag and one of the rarities. */
export function matchesFilter(item: Item, { query, tag, rarities }: PickerFilter): boolean {
  const needle = query.trim().toLowerCase();
  return (
    (!needle || item.name.toLowerCase().includes(needle)) &&
    (!tag || item.properties.includes(tag)) &&
    (rarities.length === 0 || rarities.includes(item.rarity))
  );
}

interface PickerActions {
  /** Opens the picker for a slot with a fresh search; sorting carries over between slots. */
  open: (slot: SlotId) => void;
  close: () => void;
  /** The item the stats panel previews in place of the slot's item, or null for none. */
  preview: (itemId: string | null) => void;
  /** Filter changes end the preview of an item they hide. */
  setQuery: (query: string) => void;
  setTag: (tag: Tag | null) => void;
  setRarities: (rarities: readonly Rarity[]) => void;
  setSort: (sort: PickerSort) => void;
  setSortStat: (stat: PanelStat) => void;
}

interface PickerState extends PickerFilter {
  readonly slot: SlotId | null;
  readonly previewId: string | null;
  readonly sort: PickerSort;
  /** The stat that "Impact" sorts by. */
  readonly sortStat: PanelStat;
  readonly actions: PickerActions;
}

/** Applies a filter change, and ends the preview if the new filter hides the previewed item. */
function withFilter(state: PickerState, change: Partial<PickerFilter>) {
  const { query, tag, rarities } = state;
  const filter: PickerFilter = { query, tag, rarities, ...change };
  const item = state.previewId === null ? undefined : catalog.byId.get(state.previewId);
  return { ...change, previewId: item && matchesFilter(item, filter) ? item.id : null };
}

/** The item picker's UI state. Not saved: the picker always starts closed. */
export const createPickerStore = () =>
  create<PickerState>()((set) => ({
    slot: null,
    previewId: null,
    query: '',
    tag: null,
    rarities: [],
    sort: 'impact',
    sortStat: 'hp',
    actions: {
      open: (slot) => set({ slot, previewId: null, query: '', tag: null, rarities: [] }),
      close: () => set({ slot: null, previewId: null }),
      preview: (previewId) => set({ previewId }),
      setQuery: (query) => set((state) => withFilter(state, { query })),
      setTag: (tag) => set((state) => withFilter(state, { tag })),
      setRarities: (rarities) => set((state) => withFilter(state, { rarities })),
      setSort: (sort) => set({ sort }),
      setSortStat: (sortStat) => set({ sortStat }),
    },
  }));

const usePickerStore = createPickerStore();

export const usePickerSlot = () => usePickerStore((state) => state.slot);
export const usePreviewId = () => usePickerStore((state) => state.previewId);
export const usePickerQuery = () => usePickerStore((state) => state.query);
export const usePickerTag = () => usePickerStore((state) => state.tag);
export const usePickerRarities = () => usePickerStore((state) => state.rarities);
export const usePickerSort = () => usePickerStore((state) => state.sort);
export const usePickerSortStat = () => usePickerStore((state) => state.sortStat);
export const usePickerActions = () => usePickerStore((state) => state.actions);
