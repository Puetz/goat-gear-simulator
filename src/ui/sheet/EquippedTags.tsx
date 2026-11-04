import { Popover } from '@base-ui/react/popover';
import { useId } from 'react';
import { TAGS, type Tag } from '../../catalog/schema.ts';
import { CHROMATIC_THRESHOLD } from '../../engine/derived.ts';
import type { GrantRule, MultiplierRule, TagSummary } from '../../engine/tags.ts';
import { TagChip } from '../common/TagChip.tsx';
import { equippedName, formatSigned } from '../format.ts';

interface EquippedTagsProps {
  current: TagSummary;
  /** The previewed build's tags, or the current ones when nothing is previewed. */
  shown: TagSummary;
  previewing: boolean;
}

/** Final tag counts as chips, with what a preview would change. Each chip explains its count. */
export function EquippedTags({ current, shown, previewing }: EquippedTagsProps) {
  const titleId = useId();
  const count = (summary: TagSummary, tag: Tag) => summary.final[tag] ?? 0;
  const tags = TAGS.filter((tag) => count(current, tag) > 0 || count(shown, tag) > 0).sort(
    (a, b) => count(shown, b) - count(shown, a) || a.localeCompare(b),
  );
  const unchanged = tags.every((tag) => count(shown, tag) === count(current, tag));

  return (
    <section aria-labelledby={titleId}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-0.5">
        <h3 id={titleId} className="font-display text-xl">
          Equipped tags
        </h3>
        <span className="text-note font-semibold text-ink-3">Point at a tag for its sources</span>
      </div>
      {tags.length === 0 ? (
        <p className="text-body font-semibold text-ink-3">
          Equip items or add sockets to collect tags.
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-1.5 gap-y-[7px]">
          {tags.map((tag) => {
            const before = count(current, tag);
            const after = count(shown, tag);
            return (
              <Popover.Root key={tag}>
                <Popover.Trigger
                  openOnHover
                  delay={80}
                  aria-label={`${tag.toUpperCase()} ${after}${after === before ? '' : `, changes by ${formatSigned(after - before)}`}${after >= CHROMATIC_THRESHOLD ? ', counts for chromatic' : ''}`}
                  className="cursor-help rounded-md [--focus-ring:var(--color-ink)]"
                >
                  <TagChip
                    tag={tag}
                    count={after}
                    change={after - before}
                    size={after >= CHROMATIC_THRESHOLD ? 'lg' : 'md'}
                    qualifies={after >= CHROMATIC_THRESHOLD}
                    gone={after === 0}
                    fresh={before === 0 && after > 0}
                  />
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-70">
                    <Popover.Popup className="max-w-[300px] rounded-xl border-3 border-ink bg-tip px-[11px] py-2 text-body leading-[1.4] text-tip-text shadow-ink-md">
                      <TagSources tag={tag} summary={shown} />
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            );
          })}
        </div>
      )}
      {previewing && unchanged && tags.length > 0 && (
        <p className="mt-2 text-body font-semibold text-ink-3">
          This item doesn't change your tags.
        </p>
      )}
    </section>
  );
}

/** How a tag's count comes about: raw sources, multipliers and grants. */
function TagSources({ tag, summary }: { tag: Tag; summary: TagSummary }) {
  const sources = summary.sources[tag] ?? [];
  const multiplier = summary.multipliers[tag];
  const multipliers = summary.rules.filter(
    (rule): rule is MultiplierRule => rule.kind === 'multiplier' && rule.tag === tag,
  );
  const grants = summary.rules.filter(
    (rule): rule is GrantRule => rule.kind === 'grant' && rule.to === tag,
  );
  const raw = summary.raw[tag] ?? 0;

  return (
    <>
      <Popover.Title className="mb-0.5 font-display text-base uppercase">
        {tag} ×{summary.final[tag] ?? 0}
      </Popover.Title>
      {sources.length > 0 && (
        <p>
          On items and sockets: <b>{raw}</b>{' '}
          <span className="text-tip-dim">
            (
            {sources
              .map((source) =>
                source.kind === 'sockets'
                  ? `Sockets ${source.count}`
                  : `${equippedName(source)}${source.kind === 'curse' ? ' (curse)' : ''} ${source.count}`,
              )
              .join(', ')}
            )
          </span>
        </p>
      )}
      {multiplier !== undefined && (
        <p>
          Counts <b>×{multiplier}</b>{' '}
          <span className="text-tip-dim">
            (
            {multipliers
              .map((rule) => `×${rule.multiplier} ${equippedName(rule.source)}`)
              .join(', ')}
            )
          </span>
        </p>
      )}
      {grants.map((rule) => (
        <p key={`${rule.source.slot}-${rule.from}`}>
          Added by {equippedName(rule.source)}: <b>{formatSigned(rule.added)}</b>{' '}
          <span className="text-tip-dim">
            (from <span className="uppercase">{rule.from}</span> {summary.base[rule.from] ?? 0})
          </span>
        </p>
      ))}
    </>
  );
}
