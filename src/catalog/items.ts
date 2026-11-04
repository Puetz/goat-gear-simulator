import itemsJson from '../../items.json' with { type: 'json' };
import { parseCatalog } from './catalog.ts';

/**
 * The bundled catalog, parsed once when the app starts. Throws a `CatalogError` at import time
 * if `items.json` is invalid; `main.tsx` imports the app lazily so it can show that error.
 */
export const catalog = parseCatalog(itemsJson);
