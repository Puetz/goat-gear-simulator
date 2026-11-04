import type { ReactNode } from 'react';
import type { Candidate } from '../../engine/candidates.ts';
import type { Chromatic } from '../../engine/derived.ts';
import type { PanelStat } from '../../engine/simulate.ts';
import { ItemTags } from '../common/ItemDetails.tsx';
import { ItemIcon, RarityGem } from '../common/ItemIcon.tsx';
import { cx } from '../common/styles.ts';
import { CHROMATIC_TIER_NAMES, RARITY_STYLES, SLOT_LABELS, STAT_DISPLAY } from '../display.ts';
import { formatSigned, itemName } from '../format.ts';
import { impactOf } from './candidate-list.ts';

interface CandidateRowProps {
  candidate: Candidate;
  /** The slot is cursed, so the item would be its cursed variant. */
  cursed: boolean;
  sortStat: PanelStat;
  currentChromatic: Chromatic;
  previewed: boolean;
  /** The list has one tab stop; arrow keys move between rows. */
  tabbable: boolean;
  onChoose: (itemId: string) => void;
  onPreview: (itemId: string) => void;
}

/** One item in the picker, with the change it makes to the sort stat. */
export function CandidateRow({
  candidate,
  cursed,
  sortStat,
  currentChromatic,
  previewed,
  tabbable,
  onChoose,
  onPreview,
}: CandidateRowProps) {
  const { item } = candidate;
  const name = itemName(item, cursed);
  const rarity = RARITY_STYLES[item.rarity];

  if (!candidate.allowed) {
    return (
      <li>
        <div
          aria-disabled="true"
          className="grid w-full cursor-not-allowed grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-[11px] rounded-[14px] border-3 border-dashed border-ink bg-well px-2.5 py-1 opacity-60 grayscale-85"
        >
          <ItemIcon item={item} size={34} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-display text-control">{item.name}</span>
            <span className="text-caption font-semibold text-ink-2">
              In {SLOT_LABELS[candidate.blockedBy].toLowerCase()}. The same weapon can't go in both
              hands.
            </span>
          </span>
          <small className="text-micro font-bold text-ink-3">Unavailable</small>
        </div>
      </li>
    );
  }

  const change = impactOf(candidate, sortStat);
  const { label, unit } = STAT_DISPLAY[sortStat];
  const tier = candidate.result.chromatic;

  return (
    <li>
      <button
        type="button"
        data-candidate
        data-item-id={item.id}
        tabIndex={tabbable ? 0 : -1}
        onClick={() => onChoose(item.id)}
        onMouseEnter={() => onPreview(item.id)}
        onFocus={() => onPreview(item.id)}
        aria-label={`${name}, ${rarity.label}${candidate.equipped ? ', equipped' : ''}. ${label} ${change ? formatSigned(change) : 'no change'}`}
        className={cx(
          'grid w-full grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-[11px] rounded-[14px] border-3 border-ink py-1.5 pr-2.5 pl-[7px] text-left focus-visible:outline-offset-3',
          previewed
            ? 'bg-white shadow-[0_3px_0_var(--color-ink),0_0_0_3px_var(--color-orange)]'
            : 'bg-well shadow-ink',
        )}
      >
        <ItemIcon item={item} cursed={cursed} size={46} />
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate font-display text-[16.5px] leading-[1.1]">
              {name}
            </span>
            {candidate.equipped && <Pill tone="ink">Equipped</Pill>}
            {tier.multiplier > currentChromatic.multiplier && (
              <Pill tone="gold">{CHROMATIC_TIER_NAMES[tier.tier]}</Pill>
            )}
            {tier.multiplier < currentChromatic.multiplier && (
              <Pill tone="loss">Loses {CHROMATIC_TIER_NAMES[currentChromatic.tier]}</Pill>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-x-[5px] gap-y-1 text-caption font-semibold text-ink-2">
            <RarityGem color={rarity.color} size="sm" className="mr-px" />
            {rarity.label}
            <ItemTags item={item} cursed={cursed} size="xs" showCursedTag={false} />
          </span>
        </span>
        <span className="flex min-w-16 flex-col items-end">
          <b
            className={cx(
              'font-display text-xl leading-none font-normal',
              change > 0 && 'text-gain',
              change < 0 && 'text-loss',
              change === 0 && 'text-ink-3',
            )}
          >
            {change === 0 ? '±0' : `${formatSigned(change)}${unit}`}
          </b>
          <small className="text-micro font-bold text-ink-3">{label}</small>
        </span>
      </button>
    </li>
  );
}

const PILL_TONES = {
  ink: 'border-ink bg-ink text-white',
  gold: 'border-ink bg-gold text-ink',
  loss: 'border-loss bg-loss-bg text-loss',
} as const;

function Pill({ tone, children }: { tone: keyof typeof PILL_TONES; children: ReactNode }) {
  return (
    <span
      className={cx(
        'rounded-md border-[1.5px] px-1.5 py-px text-micro font-bold whitespace-nowrap',
        PILL_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
