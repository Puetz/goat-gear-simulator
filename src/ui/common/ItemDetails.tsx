import type { Item, Weapon } from '../../catalog/schema.ts';
import { CURSED_TAG_FACTOR } from '../../engine/cursed.ts';
import { ATTRIBUTE_CLASSES, STAT_DISPLAY } from '../display.ts';
import { cx } from './styles.ts';
import { TagChip } from './TagChip.tsx';

interface ItemTagsProps {
  item: Item;
  /** The cursed variant: each tag ×4 plus one CURSED. */
  cursed: boolean;
  size?: 'xs' | 'md';
  /** Off in compact lists, where the name already says "Cursed". */
  showCursedTag?: boolean;
}

/** An item's tags as chips, as the game shows them on the item. */
export function ItemTags({ item, cursed, size = 'md', showCursedTag = true }: ItemTagsProps) {
  return (
    <>
      {item.properties.map((tag) => (
        <TagChip key={tag} tag={tag} size={size} count={cursed ? CURSED_TAG_FACTOR : undefined} />
      ))}
      {cursed && showCursedTag && <TagChip tag="cursed" size={size} />}
    </>
  );
}

interface WeaponSummaryProps {
  weapon: Weapon;
  /** `light` for the dark tooltip. */
  tone?: 'dark' | 'light';
  className?: string;
}

/** "12–18 damage, 0.8 speed, scales with Strength". */
export function WeaponSummary({ weapon, tone = 'dark', className }: WeaponSummaryProps) {
  const strong = tone === 'light' ? 'text-white' : undefined;
  return (
    <p className={className}>
      <b className={strong}>
        {weapon.damage.min}–{weapon.damage.max}
      </b>{' '}
      damage, <b className={strong}>{weapon.speed.toFixed(1)}</b> speed, scales with{' '}
      <span
        className={cx(
          'font-bold',
          ATTRIBUTE_CLASSES[weapon.scalingStat][tone === 'light' ? 'light' : 'text'],
        )}
      >
        {STAT_DISPLAY[weapon.scalingStat].label}
      </span>
    </p>
  );
}
