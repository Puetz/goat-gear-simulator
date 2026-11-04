/**
 * Validates items.json beyond what the app checks at startup: `pnpm catalog:check`.
 * Also checks that every item has an icon and that items.schema.json is current.
 */
import { existsSync, readFileSync } from 'node:fs';
import { CatalogError, parseCatalog } from '../src/catalog/catalog.ts';
import { catalogJsonSchema, SCHEMA_PATH } from '../src/catalog/json-schema.ts';
import { iconPath } from '../src/catalog/paths.ts';

const root = new URL('../', import.meta.url);

function check(): string[] {
  let items: ReturnType<typeof parseCatalog>['items'];
  try {
    items = parseCatalog(JSON.parse(readFileSync(new URL('items.json', root), 'utf8'))).items;
  } catch (error) {
    if (error instanceof CatalogError) return [...error.problems];
    throw error;
  }

  const problems: string[] = [];
  for (const item of items) {
    const icon = `public/${iconPath(item.id)}`;
    if (!existsSync(new URL(icon, root))) problems.push(`${item.id}: missing ${icon}`);
  }
  if (readFileSync(SCHEMA_PATH, 'utf8') !== catalogJsonSchema()) {
    problems.push('items.schema.json is out of date (pnpm schema)');
  }
  return problems;
}

const problems = check();
if (problems.length > 0) {
  console.error(`Catalog check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('Catalog check passed.');
}
