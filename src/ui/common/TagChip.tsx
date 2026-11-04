import type { ComponentProps } from 'react';
import type { Tag } from '../../catalog/schema.ts';
import { TAG_STYLES } from '../display.ts';
import { formatSigned } from '../format.ts';
import { cx } from './styles.ts';

const SIZES = {
  xs: 'h-[19px] rounded-[4px] border-[1.5px] text-[11px]',
  md: 'h-6 rounded-[5px] border-2 text-caption',
  lg: 'h-7 rounded-[5px] border-2 text-sm',
} as const;

function shadowClass(size: keyof typeof SIZES, gone: boolean, fresh: boolean): string {
  if (gone) return 'shadow-none';
  if (fresh) return 'shadow-[0_2px_0_var(--color-ink),0_0_0_3px_var(--color-gain)]';
  return size === 'xs' ? 'shadow-[0_1.5px_0_var(--color-ink)]' : 'shadow-ink-sm';
}

interface TagChipProps extends Omit<ComponentProps<'span'>, 'children'> {
  tag: Tag;
  /** Shown as "×N" next to the name. */
  count?: number | undefined;
  /** Shown as a green or red change badge. */
  change?: number | undefined;
  size?: keyof typeof SIZES;
  /** Highlights the count: the tag qualifies for a chromatic bonus. */
  qualifies?: boolean;
  /** Faded, dashed and struck through: the tag would disappear. */
  gone?: boolean;
  /** Ringed in green: the tag would be new. */
  fresh?: boolean;
}

/** A tag in the game's chip style, with optional count and change badges. */
export function TagChip({
  tag,
  count,
  change,
  size = 'md',
  qualifies = false,
  gone = false,
  fresh = false,
  className,
  ...props
}: TagChipProps) {
  const style = gone ? TAG_STYLES[tag].faded : TAG_STYLES[tag];
  const pad = size === 'xs' ? 'px-1' : 'px-1.5';
  return (
    <span
      {...props}
      className={cx(
        'inline-flex flex-none items-stretch overflow-hidden whitespace-nowrap border-ink align-middle font-bold leading-none tracking-[0.03em] font-stretch-[88%]',
        SIZES[size],
        shadowClass(size, gone, fresh),
        gone && 'border-dashed',
        className,
      )}
      style={{ backgroundColor: style.background, color: style.color }}
    >
      <span className={cx('flex items-center uppercase', pad, gone && 'line-through')}>{tag}</span>
      {count !== undefined && (
        <span
          className={cx(
            'flex items-center tracking-[0.01em] font-stretch-90%',
            pad,
            qualifies ? 'border-l-2 border-ink bg-gold text-ink' : 'bg-ink text-count',
          )}
        >
          ×{count}
        </span>
      )}
      {change !== undefined && change !== 0 && (
        <span
          className={cx(
            'flex items-center border-l-2 border-ink px-1.5 text-xs tracking-normal',
            change > 0 ? 'bg-gain-bg text-gain' : 'bg-loss-bg text-loss',
          )}
        >
          {formatSigned(change)}
        </span>
      )}
    </span>
  );
}
