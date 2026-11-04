import { z } from 'zod';
import { Catalog } from './schema.ts';

export const SCHEMA_PATH = new URL('../../items.schema.json', import.meta.url);

/** The JSON Schema for items.json, as written to items.schema.json (with a final newline). */
export function catalogJsonSchema(): string {
  const schema = z.toJSONSchema(Catalog, { target: 'draft-2020-12', io: 'input' });
  return `${JSON.stringify(schema, null, 2)}\n`;
}
