import { expect, test } from 'vitest';
import { EMPTY_SLOTS } from '../engine/build.ts';
import { createBuildStore } from './build-store.ts';
import { activeBuild, EMPTY_GEAR_SET, EMPTY_SAVED_GEAR, type GearSet } from './gear-sets.ts';
import type { SyncStorage } from './save-storage.ts';

const KEY = 'goat-gear-simulator/build';

const KNIFE_SET: GearSet = {
  slots: {
    ...EMPTY_SLOTS,
    mainHand: { itemId: 'pro_gamer_knife', cursed: true },
    legs: { itemId: 'fur_pants', cursed: false },
  },
  sockets: { red: 2 },
};

const HOOD = { itemId: 'goat_hood', cursed: false };

/** A storage that lives in a Map, so each test starts from its own save. */
function memoryStorage(saved?: unknown) {
  const items = new Map<string, string>();
  if (saved !== undefined) items.set(KEY, JSON.stringify(saved));
  const storage: SyncStorage = {
    getItem: (name) => items.get(name) ?? null,
    setItem: (name, value) => void items.set(name, value),
    removeItem: (name) => void items.delete(name),
  };
  return { storage, items, read: (): unknown => JSON.parse(items.get(KEY) ?? 'null') };
}

/** What a page that loads from `storage` sees. */
const load = (storage: SyncStorage) => createBuildStore(() => storage).useBuildStore.getState();

test('a version 1 save loads into Set 1 and is saved again as version 2', () => {
  const { storage, read } = memoryStorage({ state: { ...KNIFE_SET, coins: 37 }, version: 1 });
  const state = load(storage);

  expect(state.sets).toEqual([KNIFE_SET, EMPTY_GEAR_SET, EMPTY_GEAR_SET]);
  expect(state.activeSet).toBe(0);
  expect(state.coins).toBe(37);
  expect(read()).toEqual({
    state: { sets: [KNIFE_SET, EMPTY_GEAR_SET, EMPTY_GEAR_SET], activeSet: 0, coins: 37 },
    version: 2,
  });
});

test('the sets and the active set survive a reload', () => {
  const { storage } = memoryStorage();
  const { actions } = load(storage);
  actions.selectSet(1);
  actions.equip('head', 'goat_hood');
  actions.selectSet(2);

  const reloaded = load(storage);
  expect(reloaded.activeSet).toBe(2);
  expect(reloaded.sets[1].slots.head).toEqual(HOOD);
});

test('switching sets switches gear and sockets but keeps the coins', () => {
  const { useBuildStore: store } = createBuildStore(() => memoryStorage().storage);
  const { actions } = store.getState();
  actions.setCoins(50);
  actions.equip('mainHand', 'pro_gamer_knife');
  actions.setCursed('mainHand', true);
  actions.equip('legs', 'fur_pants');
  actions.setSocket('red', 2);

  actions.selectSet(1);
  expect(activeBuild(store.getState())).toEqual({ ...EMPTY_GEAR_SET, coins: 50 });

  actions.equip('mainHand', 'pro_gamer_knife');
  actions.setCoins(60);
  actions.selectSet(0);
  expect(activeBuild(store.getState())).toEqual({ ...KNIFE_SET, coins: 60 });
  expect(store.getState().sets[1].slots.mainHand).toEqual({
    itemId: 'pro_gamer_knife',
    cursed: false,
  });
});

test('clearing gear empties the active set and its cursed flags, keeping sockets', () => {
  const { storage } = memoryStorage({
    state: { sets: [KNIFE_SET, KNIFE_SET, EMPTY_GEAR_SET], activeSet: 1, coins: 0 },
    version: 2,
  });
  const { useBuildStore: store } = createBuildStore(() => storage);
  store.getState().actions.clearGear();

  expect(store.getState().sets).toEqual([
    KNIFE_SET,
    { slots: EMPTY_SLOTS, sockets: KNIFE_SET.sockets },
    EMPTY_GEAR_SET,
  ]);
});

test('clearing sockets only touches the active set', () => {
  const { storage } = memoryStorage({
    state: { sets: [KNIFE_SET, KNIFE_SET, KNIFE_SET], activeSet: 2, coins: 0 },
    version: 2,
  });
  const { useBuildStore: store } = createBuildStore(() => storage);
  store.getState().actions.clearSockets();

  expect(store.getState().sets).toEqual([KNIFE_SET, KNIFE_SET, { ...KNIFE_SET, sockets: {} }]);
});

/** A storage that refuses to save while `full` is true, like a browser whose storage is full. */
function fullStorage() {
  const { storage } = memoryStorage();
  const state = { full: true };
  const failing: SyncStorage = {
    ...storage,
    setItem: (name, value) => {
      if (state.full) throw new DOMException('Storage is full', 'QuotaExceededError');
      storage.setItem(name, value);
    },
  };
  return { storage: failing, state };
}

test('a failed save keeps the change, reports it, and saves it on retry', () => {
  const { storage, state } = fullStorage();
  const page = createBuildStore(() => storage);
  const { actions } = page.useBuildStore.getState();

  expect(() => actions.equip('head', 'goat_hood')).not.toThrow();
  expect(page.useBuildStore.getState().sets[0].slots.head).toEqual(HOOD);
  expect(page.useSaveStore.getState().status).toBe('failing');
  expect(load(storage).sets[0].slots.head).toBeNull();

  state.full = false;
  page.useSaveStore.getState().actions.saveNow();
  expect(page.useSaveStore.getState().status).toBe('saved');
  expect(load(storage).sets[0].slots.head).toEqual(HOOD);
});

test('the next change after a failed save saves everything', () => {
  const { storage, state } = fullStorage();
  const page = createBuildStore(() => storage);
  const { actions } = page.useBuildStore.getState();
  actions.equip('head', 'goat_hood');

  state.full = false;
  actions.setCoins(12);
  expect(page.useSaveStore.getState().status).toBe('saved');
  expect(load(storage).sets[0].slots.head).toEqual(HOOD);
  expect(load(storage).coins).toBe(12);
});

test("a save that can't be read isn't overwritten until it's replaced", () => {
  const unreadable = '{"state": {"sets": [';
  const { storage, items } = memoryStorage();
  items.set(KEY, unreadable);
  const page = createBuildStore(() => storage);

  expect(page.useSaveStore.getState().status).toBe('unreadable');
  expect(page.useBuildStore.getState().sets).toEqual(EMPTY_SAVED_GEAR.sets);

  page.useBuildStore.getState().actions.equip('head', 'goat_hood');
  expect(items.get(KEY)).toBe(unreadable);

  page.useSaveStore.getState().actions.saveNow();
  expect(page.useSaveStore.getState().status).toBe('saved');
  expect(load(storage).sets[0].slots.head).toEqual(HOOD);
});

test("replacing an unreadable save without changes removes it, so it isn't read again", () => {
  const { storage, items } = memoryStorage();
  items.set(KEY, 'not json');
  createBuildStore(() => storage)
    .useSaveStore.getState()
    .actions.saveNow();

  expect(items.has(KEY)).toBe(false);
  expect(createBuildStore(() => storage).useSaveStore.getState().status).toBe('saved');
});

test("blocked storage leaves the app working in memory and says it can't save", () => {
  const refuse = () => {
    throw new DOMException('Storage is turned off', 'SecurityError');
  };
  const page = createBuildStore(() => ({ getItem: refuse, setItem: refuse, removeItem: refuse }));
  expect(page.useSaveStore.getState().status).toBe('unreadable');

  const { actions } = page.useBuildStore.getState();
  expect(() => actions.equip('head', 'goat_hood')).not.toThrow();
  expect(page.useBuildStore.getState().sets[0].slots.head).toEqual(HOOD);

  page.useSaveStore.getState().actions.saveNow();
  expect(page.useSaveStore.getState().status).toBe('failing');
});

/** A `storage` event as the browser fires it in the other tabs. */
const storageEvent = (key: string, newValue: string | null) =>
  Object.assign(new Event('storage'), { key, newValue });

/**
 * Tabs that share one storage, like localStorage: a save in one tab fires a `storage` event in
 * every other tab, but not in itself, and only when the value changes.
 */
function browser() {
  const { storage, items } = memoryStorage();
  const windows: EventTarget[] = [];
  /** Every save any tab attempted, including ones that didn't change the value. */
  const writes: string[] = [];

  const openTab = () => {
    const window = new EventTarget();
    windows.push(window);
    const notifyOthers = (key: string, newValue: string | null) => {
      for (const other of windows) {
        if (other !== window) other.dispatchEvent(storageEvent(key, newValue));
      }
    };
    const tab = createBuildStore(() => ({
      getItem: storage.getItem,
      setItem: (key, value) => {
        writes.push(value);
        if (items.get(key) === value) return;
        storage.setItem(key, value);
        notifyOthers(key, value);
      },
      removeItem: (key) => {
        storage.removeItem(key);
        notifyOthers(key, null);
      },
    }));
    tab.syncAcrossTabs(window);
    return tab;
  };

  return { openTab, items, writes, reload: () => load(storage) };
}

test("a change in one tab isn't lost when another tab saves", () => {
  const { openTab, reload } = browser();
  const tabA = openTab().useBuildStore;
  const tabB = openTab().useBuildStore;

  tabA.getState().actions.equip('head', 'goat_hood');
  expect(tabB.getState().sets[0].slots.head).toEqual(HOOD);

  tabB.getState().actions.setCoins(25);
  expect(tabA.getState().coins).toBe(25);
  expect(reload().sets[0].slots.head).toEqual(HOOD);
  expect(reload().coins).toBe(25);
});

test("loading another tab's save never saves again, so tabs don't echo each other", () => {
  const { openTab, writes } = browser();
  const tabA = openTab().useBuildStore;
  openTab();
  openTab();

  tabA.getState().actions.equip('head', 'goat_hood');
  expect(writes).toHaveLength(1);
});

test('each tab stays on its own set when another tab saves', () => {
  const { openTab, reload } = browser();
  const tabA = openTab().useBuildStore;
  const tabB = openTab().useBuildStore;

  tabB.getState().actions.selectSet(1);
  tabB.getState().actions.equip('legs', 'fur_pants');
  expect(tabA.getState().activeSet).toBe(0);
  expect(tabA.getState().sets[1].slots.legs).toEqual({ itemId: 'fur_pants', cursed: false });

  tabA.getState().actions.equip('head', 'goat_hood');
  expect(tabB.getState().activeSet).toBe(1);
  expect(tabB.getState().sets[0].slots.head).toEqual(HOOD);
  // A reload opens the set of the tab that saved last.
  expect(reload().activeSet).toBe(0);
});

test("a tab keeps its sets when another tab's save can't be read", () => {
  const { storage } = memoryStorage();
  const window = new EventTarget();
  const page = createBuildStore(() => storage);
  page.syncAcrossTabs(window);
  page.useBuildStore.getState().actions.equip('head', 'goat_hood');

  storage.setItem(KEY, '{"state": ');
  window.dispatchEvent(storageEvent(KEY, '{"state": '));
  expect(page.useBuildStore.getState().sets[0].slots.head).toEqual(HOOD);
  expect(page.useSaveStore.getState().status).toBe('unreadable');

  // Nothing is saved over the unreadable save until it's replaced.
  page.useBuildStore.getState().actions.setCoins(3);
  expect(storage.getItem(KEY)).toBe('{"state": ');
});

test('replacing an unreadable save from another tab saves the sets this tab shows', () => {
  const { storage } = memoryStorage();
  const window = new EventTarget();
  const page = createBuildStore(() => storage);
  page.syncAcrossTabs(window);
  page.useBuildStore.getState().actions.equip('head', 'goat_hood');

  storage.setItem(KEY, 'not json');
  window.dispatchEvent(storageEvent(KEY, 'not json'));
  page.useSaveStore.getState().actions.saveNow();
  expect(page.useSaveStore.getState().status).toBe('saved');
  expect(load(storage).sets[0].slots.head).toEqual(HOOD);
});

test('a tab saves its sets again if the save is gone by the time it reads it', () => {
  const { storage, items } = memoryStorage();
  const window = new EventTarget();
  const page = createBuildStore(() => storage);
  page.syncAcrossTabs(window);
  page.useBuildStore.getState().actions.equip('head', 'goat_hood');

  items.delete(KEY);
  window.dispatchEvent(storageEvent(KEY, '{"state": {}, "version": 2}'));
  expect(page.useBuildStore.getState().sets[0].slots.head).toEqual(HOOD);
  expect(load(storage).sets[0].slots.head).toEqual(HOOD);
});

test("a tab that couldn't load recovers when another tab replaces the save", () => {
  const { openTab, items, reload } = browser();
  items.set(KEY, 'not json');
  const tabA = openTab();
  const tabB = openTab();
  expect(tabA.useSaveStore.getState().status).toBe('unreadable');

  tabB.useBuildStore.getState().actions.equip('head', 'goat_hood');
  tabB.useSaveStore.getState().actions.saveNow();
  expect(tabA.useSaveStore.getState().status).toBe('saved');
  expect(tabA.useBuildStore.getState().sets[0].slots.head).toEqual(HOOD);

  tabA.useBuildStore.getState().actions.setCoins(8);
  expect(reload().coins).toBe(8);
  expect(reload().sets[0].slots.head).toEqual(HOOD);
});

test('only changes to the save key are loaded from other tabs', () => {
  const { storage } = memoryStorage();
  const window = new EventTarget();
  const page = createBuildStore(() => storage);
  page.syncAcrossTabs(window);
  page.useBuildStore.getState().actions.setCoins(5);

  const otherTabSave = JSON.stringify({ state: { ...EMPTY_SAVED_GEAR, coins: 9 }, version: 2 });
  storage.setItem(KEY, otherTabSave);
  window.dispatchEvent(storageEvent('some-other-key', '{}'));
  window.dispatchEvent(storageEvent(KEY, null));
  expect(page.useBuildStore.getState().coins).toBe(5);

  window.dispatchEvent(storageEvent(KEY, otherTabSave));
  expect(page.useBuildStore.getState().coins).toBe(9);
});

test('syncing stops when asked', () => {
  const { storage } = memoryStorage();
  const window = new EventTarget();
  const page = createBuildStore(() => storage);
  const stop = page.syncAcrossTabs(window);
  stop();

  const otherTabSave = JSON.stringify({ state: { ...EMPTY_SAVED_GEAR, coins: 9 }, version: 2 });
  storage.setItem(KEY, otherTabSave);
  window.dispatchEvent(storageEvent(KEY, otherTabSave));
  expect(page.useBuildStore.getState().coins).toBe(0);
});
