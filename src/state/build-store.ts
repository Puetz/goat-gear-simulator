import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import { catalog } from '../catalog/items.ts';
import {
  type Build,
  canEquip,
  EMPTY_SLOTS,
  normalizeCoins,
  type SlotId,
  type SocketTag,
  withItem,
  withSocketCount,
} from '../engine/build.ts';
import {
  activeBuild,
  EMPTY_SAVED_GEAR,
  type GearSet,
  type SavedGear,
  type SetIndex,
} from './gear-sets.ts';
import { migrateSaved, sanitizeSaved } from './sanitize.ts';
import { createSaveStorage, type SyncStorage } from './save-storage.ts';

const SAVE_KEY = 'goat-gear-simulator/build';

/** Gear and socket actions change the active set only. Coins are shared by all sets. */
interface BuildActions {
  /** Ignored when the item doesn't fit the slot or the other hand holds the same weapon. */
  equip: (slot: SlotId, itemId: string) => void;
  /** Empties the slot, which also removes its cursed flag. */
  clear: (slot: SlotId) => void;
  /** Empties every slot, which also removes their cursed flags. Sockets stay. */
  clearGear: () => void;
  /** Ignored for an empty slot. */
  setCursed: (slot: SlotId, cursed: boolean) => void;
  setCoins: (coins: number) => void;
  setSocket: (tag: SocketTag, count: number) => void;
  clearSockets: () => void;
  /** Switches the set being edited. Every set keeps its own gear and sockets. */
  selectSet: (index: SetIndex) => void;
}

interface BuildState extends SavedGear {
  readonly actions: BuildActions;
}

/** Applies a change to the active set. Returns the state itself when nothing changed. */
function inActiveSet(
  state: BuildState,
  change: (set: GearSet) => GearSet,
): BuildState | Pick<SavedGear, 'sets'> {
  const set = state.sets[state.activeSet];
  const changed = change(set);
  if (changed === set) return state;
  const sets: [GearSet, GearSet, GearSet] = [...state.sets];
  sets[state.activeSet] = changed;
  return { sets };
}

/** The parts of a browser `StorageEvent` that matter here. */
interface StorageChange extends Event {
  readonly key: string | null;
  readonly newValue: string | null;
}

/**
 * The three gear sets, saved to `getStorage()` (localStorage in the app, an in-memory storage
 * in tests). localStorage is synchronous, so the save is loaded while the store is created,
 * before the first render: no loading state and no flash of empty sets. Everything loaded goes
 * through `sanitizeSaved`.
 *
 * Returns the build store, the save status store and `syncAcrossTabs`.
 */
export function createBuildStore(getStorage: () => SyncStorage) {
  const { storage, useSaveStore } = createSaveStorage(SAVE_KEY, getStorage);
  /** True while loading a save another tab wrote. */
  let syncing = false;
  /** Set when that save couldn't be read, so this tab kept its own sets. */
  let keptOwnSets = false;

  const useBuildStore = create<BuildState>()(
    persist(
      (set) => ({
        ...EMPTY_SAVED_GEAR,
        actions: {
          equip: (slot, itemId) =>
            set((state) =>
              inActiveSet(state, (gear) => {
                const item = catalog.byId.get(itemId);
                return item && canEquip(gear, slot, item) ? withItem(gear, slot, itemId) : gear;
              }),
            ),
          clear: (slot) =>
            set((state) =>
              inActiveSet(state, (gear) => ({ ...gear, slots: { ...gear.slots, [slot]: null } })),
            ),
          clearGear: () =>
            set((state) => inActiveSet(state, (gear) => ({ ...gear, slots: EMPTY_SLOTS }))),
          setCursed: (slot, cursed) =>
            set((state) =>
              inActiveSet(state, (gear) => {
                const equipped = gear.slots[slot];
                return equipped
                  ? { ...gear, slots: { ...gear.slots, [slot]: { ...equipped, cursed } } }
                  : gear;
              }),
            ),
          setCoins: (coins) => set({ coins: normalizeCoins(coins) }),
          setSocket: (tag, count) =>
            set((state) =>
              inActiveSet(state, (gear) => ({
                ...gear,
                sockets: withSocketCount(gear.sockets, tag, count),
              })),
            ),
          clearSockets: () =>
            set((state) => inActiveSet(state, (gear) => ({ ...gear, sockets: {} }))),
          selectSet: (activeSet) => set({ activeSet }),
        },
      }),
      {
        name: SAVE_KEY,
        version: 2,
        storage,
        partialize: ({ sets, activeSet, coins }): SavedGear => ({ sets, activeSet, coins }),
        // Version 1 saved one build, which becomes Set 1. Saves from other versions are kept as
        // far as they're still valid: `merge` sanitizes them.
        migrate: migrateSaved,
        merge: (saved, current) => {
          // Another tab's save that can't be read (or is gone) keeps this tab's sets.
          if (syncing && saved === undefined) {
            keptOwnSets = true;
            return current;
          }
          const loaded = sanitizeSaved(saved, catalog);
          // A save from another tab doesn't switch the set this tab is editing.
          return {
            ...current,
            ...loaded,
            activeSet: syncing ? current.activeSet : loaded.activeSet,
          };
        },
      },
    ),
  );

  /**
   * Loads the sets whenever another tab saves them, so this tab's next change doesn't overwrite
   * that tab's changes with older sets: the latest save wins. That includes a change this tab
   * couldn't save, which the other tab's save replaces. Returns a function that stops syncing.
   */
  const syncAcrossTabs = (events: EventTarget) => {
    const onStorage = (event: Event) => {
      const { key, newValue } = event as StorageChange;
      if (key !== SAVE_KEY || newValue === null) return;
      syncing = true;
      keptOwnSets = false;
      try {
        // The storage is synchronous, so the save is merged before `rehydrate` returns.
        useBuildStore.persist.rehydrate();
      } finally {
        syncing = false;
      }
      // The kept sets aren't in storage. Saving them (an empty update still saves) stores them,
      // or, while the save is unreadable, holds them for "Replace saved sets" instead of
      // leaving nothing to replace it with.
      if (keptOwnSets) useBuildStore.setState({});
    };
    events.addEventListener('storage', onStorage);
    return () => events.removeEventListener('storage', onStorage);
  };

  return { useBuildStore, useSaveStore, syncAcrossTabs };
}

const app = createBuildStore(() => localStorage);
const { useBuildStore, useSaveStore } = app;

/** Keeps the app's sets in step with other tabs. Call it once, with the browser window. */
export const syncAcrossTabs = app.syncAcrossTabs;

/** The active set with the shared coins. */
export const useBuild = (): Build => useBuildStore(useShallow(activeBuild));
export const useSlots = () => useBuildStore((state) => state.sets[state.activeSet].slots);
export const useSockets = () => useBuildStore((state) => state.sets[state.activeSet].sockets);
export const useCoins = () => useBuildStore((state) => state.coins);
export const useActiveSet = () => useBuildStore((state) => state.activeSet);
export const useBuildActions = () => useBuildStore((state) => state.actions);
export const useSaveStatus = () => useSaveStore((state) => state.status);
export const useSaveActions = () => useSaveStore((state) => state.actions);
