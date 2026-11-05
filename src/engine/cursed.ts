/**
 * Cursed item variants (see RULES.md, "Cursed variants"). A cursed item is the normal item with
 * its own tags counted four times, before global multipliers, plus one CURSED tag, and a
 * penalty of 20% HP. The penalty is the same on every cursed item and adds up per cursed item.
 */
export const CURSED_TAG_FACTOR = 4;
export const CURSED_TAGS_PER_ITEM = 1;
/** In whole percent; penalties add together, then multiply chromatic HP. */
export const CURSED_HP_PERCENT = -20;
