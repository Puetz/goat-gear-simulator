import { useId } from 'react';
import type { NotCalculated } from '../../engine/effects.ts';
import { EffectText } from '../common/EffectText.tsx';
import { ItemIcon } from '../common/ItemIcon.tsx';
import { NOT_CALCULATED_REASONS } from '../display.ts';
import { equippedName } from '../format.ts';

/** Effects that are on the equipped items but left out of the numbers, and why. */
export function NotCalculatedBox({ entries }: { entries: readonly NotCalculated[] }) {
  const titleId = useId();
  if (entries.length === 0) return null;
  return (
    <section
      aria-labelledby={titleId}
      className="mt-4 rounded-[14px] border-2 border-dashed border-ink-3 px-3 pt-2.5 pb-3"
    >
      <h3 id={titleId} className="font-display text-lg">
        Not calculated
      </h3>
      <p className="mt-0.5 mb-2 text-body font-medium text-ink-3">
        Shown on your items but left out of the numbers above.
      </p>
      <ul className="grid gap-2">
        {entries.map((entry) => (
          <li
            key={`${entry.slot}-${entry.reason}-${entry.text}`}
            className="grid grid-cols-[26px_minmax(0,1fr)] items-start gap-2.5 text-body"
          >
            <ItemIcon item={entry.item} cursed={entry.cursed} size={26} />
            <span>
              <b className="font-bold">{equippedName(entry)}:</b> <EffectText text={entry.text} />
              <span className="mt-px block text-caption text-ink-3">
                {NOT_CALCULATED_REASONS[entry.reason]}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
