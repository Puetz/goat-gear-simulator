import { iconPath } from '../../catalog/paths.ts';
import type { Item } from '../../catalog/schema.ts';
import { RARITY_STYLES } from '../display.ts';
import { cssVars, cx } from './styles.ts';

const SIZES = {
  22: 'size-[22px] rounded-md border-[1.5px]',
  26: 'size-[26px] rounded-[7px] border-2',
  30: 'size-[30px] rounded-lg border-2',
  34: 'size-[34px] rounded-[9px] border-2',
  46: 'size-[46px] rounded-[11px] border-3',
  68: 'size-[68px] rounded-[14px] border-3 shadow-ink',
  72: 'size-[72px] rounded-[14px] border-3',
} as const;

interface ItemIconProps {
  item: Item;
  cursed?: boolean;
  size: keyof typeof SIZES;
  className?: string;
}

/** The item's icon in a frame of its rarity color (or the cursed color). */
export function ItemIcon({ item, cursed = false, size, className }: ItemIconProps) {
  const frame = RARITY_STYLES[cursed ? 'cursed' : item.rarity].burst;
  // Bigger icons get an inner ring in the frame color, like the game's.
  const ring = size >= 46 ? 'after:shadow-[inset_0_0_0_3px_var(--frame)]' : '';
  return (
    <span
      className={cx(
        'relative block flex-none overflow-hidden border-ink bg-(--frame) after:absolute after:inset-0 after:rounded-[inherit]',
        ring,
        SIZES[size],
        className,
      )}
      style={cssVars({ '--frame': frame })}
    >
      <img
        src={`${import.meta.env.BASE_URL}${iconPath(item.id)}`}
        alt=""
        loading="lazy"
        className="block size-full scale-110 object-cover"
      />
    </span>
  );
}

const GEM_SIZES = { sm: 'size-[9px] border-[1.5px]', md: 'size-[11px] border-2' } as const;

interface RarityGemProps {
  color: string;
  size?: keyof typeof GEM_SIZES;
  className?: string;
}

/** The small diamond that marks a rarity. */
export function RarityGem({ color, size = 'md', className }: RarityGemProps) {
  return (
    <i
      aria-hidden="true"
      className={cx('flex-none rotate-45 rounded-[2px] border-ink', GEM_SIZES[size], className)}
      style={{ backgroundColor: color }}
    />
  );
}
