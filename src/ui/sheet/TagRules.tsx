import { useId } from 'react';
import type { TagRule } from '../../engine/tags.ts';
import { ItemIcon } from '../common/ItemIcon.tsx';
import { TagChip } from '../common/TagChip.tsx';
import { equippedName } from '../format.ts';

/** Multipliers first, then grants, each with the item it comes from. */
export function TagRules({ rules }: { rules: readonly TagRule[] }) {
  const titleId = useId();
  const sorted = [...rules].sort((a, b) => Number(a.kind === 'grant') - Number(b.kind === 'grant'));

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="mb-2 font-display text-xl">
        Tag rules
      </h3>
      {sorted.length === 0 ? (
        <p className="text-body font-semibold text-ink-3">
          None of your items multiply or add tags.
        </p>
      ) : (
        <ul className="grid gap-[5px]">
          {sorted.map((rule) => (
            <li
              key={`${rule.source.slot}-${rule.kind}-${rule.kind === 'multiplier' ? rule.tag : rule.to}`}
              className="grid min-h-[34px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[11px] bg-well-2 py-1 pr-2 pl-[9px] text-sm font-medium max-xl:grid-cols-1"
            >
              <span className="flex flex-wrap items-center gap-x-[5px] gap-y-[3px] whitespace-nowrap">
                {rule.kind === 'multiplier' ? (
                  <>
                    <TagChip tag={rule.tag} size="xs" /> counts <b>{rule.multiplier} times</b>
                  </>
                ) : (
                  <>
                    <TagChip tag={rule.from} size="xs" /> also adds <b>{rule.count}</b>
                    <TagChip tag={rule.to} size="xs" />
                  </>
                )}
              </span>
              <span className="flex items-center gap-1.5 text-note font-semibold whitespace-nowrap text-ink-2">
                <ItemIcon item={rule.source.item} cursed={rule.source.cursed} size={22} />
                {equippedName(rule.source)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
