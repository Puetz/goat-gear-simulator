import type { Item } from './schema.ts';

/**
 * Checks that span several fields or items, which the zod schema can't express. Shared by the
 * app's catalog loader, `pnpm catalog:check` and the catalog test. Returns readable problems.
 */
export function checkIntegrity(items: readonly Item[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  items.forEach((item, index) => {
    if (seen.has(item.id)) problems.push(`${item.id}: duplicate id`);
    seen.add(item.id);

    const previous = items[index - 1];
    if (previous && previous.id >= item.id) {
      problems.push(`${item.id}: items must be sorted by id (comes after ${previous.id})`);
    }

    if (item.slot === 'weapon') {
      const { damage, speed, displayedDps } = item.weapon;
      if (damage.min > damage.max) {
        problems.push(`${item.id}: damage.min ${damage.min} is above damage.max ${damage.max}`);
      }
      const expected = Math.round(((damage.min + damage.max) / 2 / speed) * 10) / 10;
      if (expected !== displayedDps) {
        problems.push(`${item.id}: displayedDps ${displayedDps} should be ${expected}`);
      }
    }
  });

  return problems;
}
