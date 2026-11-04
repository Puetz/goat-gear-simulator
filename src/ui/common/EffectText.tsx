import type { ReactNode } from 'react';
import { Tag } from '../../catalog/schema.ts';
import type { Attribute } from '../../engine/derived.ts';
import { ATTRIBUTE_CLASSES } from '../display.ts';
import { TagChip } from './TagChip.tsx';

/** Stat names in effect texts and the attribute whose color they take. */
const STAT_WORDS: Readonly<Record<string, Attribute>> = {
  Stamina: 'stamina',
  Strength: 'strength',
  Agility: 'agility',
  'Critical Chance': 'agility',
  'Critical Damage': 'agility',
  Intelligence: 'intelligence',
  'Int.': 'intelligence',
  Regeneration: 'intelligence',
};

/** Tag names in capitals, signed numbers, or stat names. */
const TOKENS =
  /\b(?<tag>[A-Z]{3,})\b|(?<=^|[\s(])(?<number>[+\-−]?\d+(?:\.\d+)?%?)|(?<stat>Critical Chance|Critical Damage|Stamina|Strength|Agility|Intelligence|Int\.|Regeneration)/g;

interface EffectTextProps {
  text: string;
  /** `light` for the dark tooltip. */
  tone?: 'dark' | 'light';
}

/** An item effect as the game prints it: tag names as chips, numbers bold, stats colored. */
export function EffectText({ text, tone = 'dark' }: EffectTextProps) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKENS)) {
    const { tag, number, stat } = match.groups ?? {};
    const tagMatch = tag === undefined ? null : Tag.safeParse(tag.toLowerCase());
    if (tag !== undefined && !tagMatch?.success) continue;

    parts.push(text.slice(last, match.index));
    const key = match.index;
    if (tagMatch?.success) {
      parts.push(<TagChip key={key} tag={tagMatch.data} size="xs" />);
    } else if (number !== undefined) {
      parts.push(
        <b key={key} className={tone === 'light' ? 'text-white' : undefined}>
          {number}
        </b>,
      );
    } else if (stat !== undefined) {
      const attribute = STAT_WORDS[stat];
      const classes = attribute && ATTRIBUTE_CLASSES[attribute];
      parts.push(
        <span
          key={key}
          className={`font-bold ${classes ? classes[tone === 'light' ? 'light' : 'text'] : ''}`}
        >
          {stat}
        </span>,
      );
    }
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
