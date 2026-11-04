import { describe, expect, test } from 'vitest';
import { arrowTarget } from './candidate-list.ts';

describe('arrow keys in the picker list', () => {
  test('with no item focused, either key goes to the first item', () => {
    expect(arrowTarget(-1, 5, 'ArrowDown')).toBe(0);
    expect(arrowTarget(-1, 5, 'ArrowUp')).toBe(0);
  });

  test('ArrowDown and ArrowUp move one item', () => {
    expect(arrowTarget(2, 5, 'ArrowDown')).toBe(3);
    expect(arrowTarget(2, 5, 'ArrowUp')).toBe(1);
  });

  test("focus stays put at either end: the list doesn't wrap", () => {
    expect(arrowTarget(4, 5, 'ArrowDown')).toBeUndefined();
    expect(arrowTarget(0, 5, 'ArrowUp')).toBeUndefined();
  });

  test('an empty list has nowhere to go', () => {
    expect(arrowTarget(-1, 0, 'ArrowDown')).toBeUndefined();
  });
});
