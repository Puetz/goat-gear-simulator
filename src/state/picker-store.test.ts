import { expect, test } from 'vitest';
import { createPickerStore } from './picker-store.ts';

/** A picker open on the head slot, previewing GOAT Hood (epic; FURRY and WHITE). */
function previewingHood() {
  const store = createPickerStore();
  const { actions } = store.getState();
  actions.open('head');
  actions.preview('goat_hood');
  return { store, actions };
}

test('a search that still matches the previewed item keeps the preview', () => {
  const { store, actions } = previewingHood();
  actions.setQuery('  HOOD ');
  expect(store.getState().previewId).toBe('goat_hood');
});

test('a search that hides the previewed item ends the preview', () => {
  // Keyboard path: focus an item (which previews it), go back to the search field and type.
  const { store, actions } = previewingHood();
  actions.setQuery('knife');
  expect(store.getState().previewId).toBeNull();

  // Clearing the search again doesn't bring the old preview back.
  actions.setQuery('');
  expect(store.getState().previewId).toBeNull();
});

test('a tag filter keeps or ends the preview depending on the item', () => {
  const { store, actions } = previewingHood();
  actions.setTag('furry');
  expect(store.getState().previewId).toBe('goat_hood');
  actions.setTag('metal');
  expect(store.getState().previewId).toBeNull();
});

test('a rarity filter keeps or ends the preview depending on the item', () => {
  const { store, actions } = previewingHood();
  actions.setRarities(['rare', 'epic']);
  expect(store.getState().previewId).toBe('goat_hood');
  actions.setRarities(['common']);
  expect(store.getState().previewId).toBeNull();
});

test('filters combine: the preview ends when any filter hides the item', () => {
  const { store, actions } = previewingHood();
  actions.setTag('white');
  actions.setRarities(['epic']);
  actions.setQuery('goat');
  expect(store.getState().previewId).toBe('goat_hood');
  actions.setQuery('pants');
  expect(store.getState().previewId).toBeNull();
});

test('sorting never ends the preview', () => {
  const { store, actions } = previewingHood();
  actions.setSort('name');
  actions.setSortStat('stamina');
  expect(store.getState().previewId).toBe('goat_hood');
});

test('opening a slot starts a fresh search and closing ends the preview', () => {
  const { store, actions } = previewingHood();
  actions.setQuery('hood');
  actions.setSort('rarity');
  actions.open('legs');
  expect(store.getState()).toMatchObject({
    slot: 'legs',
    previewId: null,
    query: '',
    tag: null,
    rarities: [],
    sort: 'rarity',
  });

  actions.preview('fur_pants');
  actions.close();
  expect(store.getState()).toMatchObject({ slot: null, previewId: null });
});
