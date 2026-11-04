import { formatSigned } from '../format.ts';
import { cx } from './styles.ts';

/**
 * A green or red badge with the change a preview would make. A zero change keeps its space but
 * stays invisible, so the values in a column line up.
 */
export function ChangeBadge({ change, unit = '' }: { change: number; unit?: string }) {
  return (
    <span
      className={cx(
        'inline-flex min-w-16 max-xl:min-w-12 animate-pop justify-center rounded-lg px-[7px] py-0.5 text-sm font-bold',
        change > 0 && 'bg-gain-bg text-gain',
        change < 0 && 'bg-loss-bg text-loss',
        change === 0 && 'invisible',
      )}
    >
      {formatSigned(change)}
      {change === 0 ? '' : unit}
    </span>
  );
}
