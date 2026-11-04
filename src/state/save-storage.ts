import { create } from 'zustand';
import type { PersistStorage } from 'zustand/middleware';

/** A synchronous key-value storage, like localStorage. */
export type SyncStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Whether the latest changes are saved:
 * - `saved`: they are, or nothing has changed since loading.
 * - `unreadable`: the save couldn't be loaded, so the app started with empty sets. Nothing is
 *   saved until `saveNow` replaces the old save, so it isn't overwritten by accident.
 * - `failing`: the browser refused the latest save, for example because storage is full or
 *   turned off. The next change, or `saveNow`, tries again.
 */
export type SaveStatus = 'saved' | 'unreadable' | 'failing';

interface SaveState {
  readonly status: SaveStatus;
  readonly actions: {
    /** Replaces a save that couldn't be loaded, or retries a failed save. */
    saveNow: () => void;
  };
}

/**
 * A persist storage for one key that never throws. A failed load or save becomes a status the
 * UI can show, and the app keeps working with what's in memory. Values are saved as JSON.
 */
export function createSaveStorage(key: string, getStorage: () => SyncStorage) {
  /**
   * The latest state that isn't saved yet, as JSON. While the status isn't `saved`, null means
   * nothing changed since the failed load, so saving removes the old save.
   */
  let unsaved: string | null = null;

  const save = () => {
    try {
      if (unsaved === null) getStorage().removeItem(key);
      else getStorage().setItem(key, unsaved);
      unsaved = null;
      useSaveStore.setState({ status: 'saved' });
    } catch {
      useSaveStore.setState({ status: 'failing' });
    }
  };

  const useSaveStore = create<SaveState>()((_, get) => ({
    status: 'saved',
    actions: {
      saveNow: () => {
        if (get().status !== 'saved') save();
      },
    },
  }));

  // What's loaded is checked by the store, so the storage doesn't know its shape.
  const storage: PersistStorage<unknown> = {
    getItem: () => {
      try {
        const json = getStorage().getItem(key);
        const value = json === null ? null : JSON.parse(json);
        // What's in memory is now what's saved.
        unsaved = null;
        useSaveStore.setState({ status: 'saved' });
        return value;
      } catch {
        useSaveStore.setState({ status: 'unreadable' });
        return null;
      }
    },
    setItem: (_, value) => {
      unsaved = JSON.stringify(value);
      if (useSaveStore.getState().status !== 'unreadable') save();
    },
    removeItem: () => {
      try {
        getStorage().removeItem(key);
      } catch {
        // Nothing to report: the save stays as it was.
      }
    },
  };

  return { storage, useSaveStore };
}
