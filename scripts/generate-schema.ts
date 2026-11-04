/**
 * Writes items.schema.json from the zod catalog schema: `pnpm schema`.
 * The catalog test fails when the committed file is out of date.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { catalogJsonSchema, SCHEMA_PATH } from '../src/catalog/json-schema.ts';

writeFileSync(SCHEMA_PATH, catalogJsonSchema());
console.log(`Wrote ${fileURLToPath(SCHEMA_PATH)}`);
