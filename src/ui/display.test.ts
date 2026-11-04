import { expect, test } from 'vitest';
import { TAGS } from '../catalog/schema.ts';
import { contrastRatio, TAG_STYLES } from './display.ts';

/** WCAG 2.2 AA for normal-size text; tag labels are 11 to 14 px. Written out so it can't drift. */
const AA_NORMAL_TEXT = 4.5;

test('contrast ratios match the WCAG formula', () => {
  expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21);
  expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
  expect(contrastRatio('#777777', '#777777')).toBe(1);
  expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
});

test.each(TAGS)('the %s tag label is readable on its chip, faded or not', (tag) => {
  const { background, color, faded } = TAG_STYLES[tag];
  expect(contrastRatio(background, color)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  expect(contrastRatio(faded.background, faded.color)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
});

test('a faded chip sits between its game color and the light panel', () => {
  const channels = (hex: string) =>
    [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  const panel = channels('#edeafd');
  for (const tag of TAGS) {
    const full = channels(TAG_STYLES[tag].background);
    channels(TAG_STYLES[tag].faded.background).forEach((value, index) => {
      const [low, high] = [full[index] ?? 0, panel[index] ?? 0].sort((a, b) => a - b);
      expect(value).toBeGreaterThanOrEqual(low ?? 0);
      expect(value).toBeLessThanOrEqual(high ?? 0);
    });
  }
});
