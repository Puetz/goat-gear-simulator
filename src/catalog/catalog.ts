import type { z } from 'zod';
import { checkIntegrity } from './integrity.ts';
import { Catalog, ITEM_SLOTS, type Item, type ItemSlot } from './schema.ts';

export interface CatalogIndex {
  readonly items: readonly Item[];
  readonly byId: ReadonlyMap<string, Item>;
  readonly bySlot: Readonly<Record<ItemSlot, readonly Item[]>>;
}

/** Thrown when the catalog doesn't match the schema or fails an integrity check. */
export class CatalogError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`The item catalog is invalid:\n${problems.join('\n')}`);
    this.name = 'CatalogError';
    this.problems = problems;
  }
}

/** Validates raw catalog JSON and indexes it. Throws a {@link CatalogError} on any problem. */
export function parseCatalog(json: unknown): CatalogIndex {
  const parsed = Catalog.safeParse(json);
  if (!parsed.success) throw new CatalogError(describeIssues(parsed.error, json));

  const problems = checkIntegrity(parsed.data.items);
  if (problems.length > 0) throw new CatalogError(problems);

  return indexItems(parsed.data.items);
}

function indexItems(items: readonly Item[]): CatalogIndex {
  const bySlot = Object.fromEntries(ITEM_SLOTS.map((slot) => [slot, [] as Item[]])) as Record<
    ItemSlot,
    Item[]
  >;
  for (const item of items) bySlot[item.slot].push(item);
  return { items, byId: new Map(items.map((item) => [item.id, item])), bySlot };
}

/** Turns zod issues into lines like `goat_hood (items[87]) › effects[0].value: …`. */
function describeIssues(error: z.ZodError, json: unknown): string[] {
  const rawItems = isRecord(json) && Array.isArray(json.items) ? json.items : [];
  return error.issues.map((issue) => {
    const [root, index, ...rest] = issue.path;
    if (root !== 'items' || typeof index !== 'number') {
      return `${formatPath(issue.path) || 'catalog'}: ${issue.message}`;
    }
    const raw: unknown = rawItems[index];
    const id = isRecord(raw) && typeof raw.id === 'string' ? raw.id : 'unknown id';
    const field = formatPath(rest);
    return `${id} (items[${index}])${field ? ` › ${field}` : ''}: ${issue.message}`;
  });
}

function formatPath(path: readonly PropertyKey[]): string {
  return path
    .map((key, i) => (typeof key === 'number' ? `[${key}]` : `${i === 0 ? '' : '.'}${String(key)}`))
    .join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
