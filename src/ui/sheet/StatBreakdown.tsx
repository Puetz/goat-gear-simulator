import type { ReactNode } from 'react';
import { CURSED_HP_PERCENT } from '../../engine/cursed.ts';
import {
  type Attribute,
  BASE_CRITICAL_DAMAGE,
  isAttribute,
  regenerationFromIntelligence,
} from '../../engine/derived.ts';
import type { Contribution } from '../../engine/effects.ts';
import { ATTRIBUTE_TIERS, roundTo1 } from '../../engine/math.ts';
import type { PanelStat, SimulationResult } from '../../engine/simulate.ts';
import type { ItemSource } from '../../engine/tags.ts';
import { EffectText } from '../common/EffectText.tsx';
import { ItemIcon } from '../common/ItemIcon.tsx';
import { cx } from '../common/styles.ts';
import { TagChip } from '../common/TagChip.tsx';
import { ATTRIBUTE_CLASSES, CHROMATIC_TIER_NAMES, STAT_DISPLAY } from '../display.ts';
import { equippedName, formatNumber, formatSigned } from '../format.ts';

/** Where a stat's value comes from, as a receipt of items, formula parts and the total. */
export function StatBreakdown({ stat, result }: { stat: PanelStat; result: SimulationResult }) {
  switch (stat) {
    case 'hp':
      return <HpReceipt result={result} />;
    case 'base_dps':
      return <DpsReceipt result={result} />;
    default:
      return <EffectReceipt stat={stat} result={result} />;
  }
}

function HpReceipt({ result }: { result: SimulationResult }) {
  const { hp, attributes, chromatic, tags } = result;
  return (
    <Receipt>
      <Line label="Base" value={formatNumber(hp.base)} />
      <Line
        label={<AttributeName attribute="stamina" />}
        detail={`10 per point. ${attributes.stamina.raw} counts as ${attributes.stamina.effective}`}
        value={formatSigned(hp.fromStamina)}
      />
      <Line
        label={<AttributeName attribute="strength" />}
        detail={`1 per point. ${attributes.strength.raw} counts as ${attributes.strength.effective}`}
        value={formatSigned(hp.fromStrength)}
      />
      {hp.flat !== 0 && <Line label="HP from items" value={formatSigned(hp.flat)} />}
      <Line
        label="Subtotal"
        value={formatNumber(hp.base + hp.fromStamina + hp.fromStrength + hp.flat)}
      />
      <Line
        label={CHROMATIC_TIER_NAMES[chromatic.tier]}
        detail={
          chromatic.qualifying.length > 0 && (
            <span className="inline-flex flex-wrap items-center gap-1">
              From
              {chromatic.qualifying.map(([tag]) => (
                <TagChip key={tag} tag={tag} count={tags.final[tag]} size="xs" qualifies />
              ))}
            </span>
          )
        }
        value={`×${chromatic.multiplier}`}
      />
      {hp.cursedItems > 0 && (
        <Line
          label={hp.cursedItems === 1 ? 'Cursed item' : `${hp.cursedItems} cursed items`}
          detail={`${formatNumber(CURSED_HP_PERCENT)}% HP each, taken off the multiplier: ×${hp.multiplier}`}
          value={`${formatNumber(hp.cursedItems * CURSED_HP_PERCENT)}%`}
        />
      )}
      <Line total label="HP" value={formatNumber(hp.total)} />
    </Receipt>
  );
}

function DpsReceipt({ result }: { result: SimulationResult }) {
  const { weapons, chromatic, panel } = result;
  return (
    <>
      <Receipt>
        {weapons.length === 0 && <Line label="No weapon equipped" value="0" />}
        {weapons.map((weapon) => (
          <Line
            key={weapon.slot}
            source={weapon}
            label={equippedName(weapon)}
            detail={
              <>
                {weapon.hitMin}–{weapon.hitMax} per hit, every {weapon.speed.toFixed(1)} s.{' '}
                <AttributeName attribute={weapon.scalingStat} /> adds {formatNumber(weapon.bonus)}
                {weapon.rangedDamagePercent !== 0 &&
                  `. Ranged damage ${formatSigned(weapon.rangedDamagePercent)}%`}
              </>
            }
            value={formatNumber(roundTo1(weapon.dps))}
          />
        ))}
        <Line total label="Base DPS" value={formatNumber(panel.base_dps)} />
      </Receipt>
      <p className="mt-2 text-note font-medium text-ink-3">
        Hits include{' '}
        {chromatic.tier === 'none'
          ? 'no chromatic bonus'
          : `the chromatic bonus ×${chromatic.multiplier}`}
        . Crits and procs aren't part of Base DPS.
      </p>
    </>
  );
}

function EffectReceipt({
  stat,
  result,
}: {
  stat: Exclude<PanelStat, 'hp' | 'base_dps'>;
  result: SimulationResult;
}) {
  const { label, unit } = STAT_DISPLAY[stat];
  const contributions = result.effects.contributions[stat] ?? [];
  const { agility } = result.attributes;
  const fromIntelligence = regenerationFromIntelligence(result.attributes);
  const attribute = isAttribute(stat) ? result.attributes[stat] : null;

  return (
    <>
      <Receipt>
        {stat === 'critical_chance' && (
          <Line
            label={<AttributeName attribute="agility" />}
            detail={`1% per point. ${agility.raw} counts as ${agility.effective}`}
            value={`${formatSigned(agility.effective)}%`}
          />
        )}
        {stat === 'critical_damage' && <Line label="Base" value={`${BASE_CRITICAL_DAMAGE}%`} />}
        {contributions.map((entry) => (
          <ContributionLine key={`${entry.slot}-${entry.text}`} entry={entry} unit={unit} />
        ))}
        {stat === 'regeneration' && fromIntelligence !== 0 && (
          <Line
            label={<AttributeName attribute="intelligence" />}
            detail={`1 per 3 points. ${result.attributes.intelligence.raw} counts as ${result.attributes.intelligence.effective}`}
            value={formatSigned(fromIntelligence)}
          />
        )}
        {contributions.length === 0 && stat !== 'critical_chance' && stat !== 'regeneration' && (
          <Line
            label={
              <span className="font-normal text-ink-2">No item adds to {label} in this build.</span>
            }
            value=""
          />
        )}
        {!(attribute && attribute.raw > 100) && (
          <Line total label={label} value={`${formatNumber(result.panel[stat])}${unit}`} />
        )}
      </Receipt>
      {attribute && attribute.raw > 100 && isAttribute(stat) && (
        <DiminishingReturns attribute={stat} raw={attribute.raw} effective={attribute.effective} />
      )}
    </>
  );
}

function ContributionLine({ entry, unit }: { entry: Contribution; unit: string }) {
  const { detail } = entry;
  return (
    <Line
      source={entry}
      label={equippedName(entry)}
      detail={
        <>
          <EffectText text={entry.text} />
          {detail && (
            <span className="text-ink-3">
              {' '}
              (
              {detail.kind === 'perTag'
                ? `${detail.tagCount} worn`
                : `${detail.coins} coins${detail.capped ? ', at the cap' : ''}`}
              )
            </span>
          )}
        </>
      }
      value={`${formatSigned(entry.value)}${unit}`}
    />
  );
}

/** What each attribute's effective value feeds (RULES.md §6). */
const ATTRIBUTE_USES: Record<Attribute, string> = {
  stamina: 'HP',
  strength: 'HP and damage with Strength weapons',
  agility: 'Critical Chance and damage with Agility weapons',
  intelligence: 'Regeneration and damage with Intelligence weapons',
};

/** A bar showing how much of a high attribute each diminishing-returns tier keeps. */
function DiminishingReturns({
  attribute,
  raw,
  effective,
}: {
  attribute: Attribute;
  raw: number;
  effective: number;
}) {
  const { label } = STAT_DISPLAY[attribute];
  const color = ATTRIBUTE_CLASSES[attribute].bg;
  const tiers = ATTRIBUTE_TIERS.flatMap(({ from, to, rate }) => {
    const lower = Math.max(from, 0);
    const amount = Math.min(raw, to) - lower;
    return amount > 0 ? [{ lower, amount, rate }] : [];
  });

  return (
    <div className="mt-2 rounded-xl bg-well px-3 py-2.5">
      <p className="mb-[7px] text-sm font-semibold">
        {label} <b className="font-display text-[17px] font-normal">{raw}</b>, counts as{' '}
        <b className="font-display text-[17px] font-normal">{effective}</b> for{' '}
        {ATTRIBUTE_USES[attribute]}
      </p>
      <div
        role="img"
        aria-label={`${raw} ${label} counts as ${effective}`}
        className="flex h-[18px] overflow-hidden rounded-[7px] border-2 border-ink bg-white"
      >
        {tiers.map(({ lower, amount, rate }) => (
          <span
            key={lower}
            className="flex h-full border-r-2 border-ink last:border-r-0"
            style={{ width: `${(amount / raw) * 100}%` }}
          >
            <span className={cx('h-full', color)} style={{ width: `${rate * 100}%` }} />
            <span className="h-full flex-1 bg-[repeating-linear-gradient(135deg,rgb(31_21_53/0.28)_0_3px,transparent_3px_7px)]" />
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-caption font-semibold text-ink-2">
        {tiers.map(({ lower, amount, rate }) => (
          <span key={lower} className="inline-flex items-center gap-[5px]">
            <i className={cx('h-2.5 w-3 rounded-[3px] border-[1.5px] border-ink', color)} />
            {rate === 1
              ? `First ${amount} count fully`
              : `Next ${amount} count ${rate * 100}%: ${formatNumber(roundTo1(amount * rate))}`}
          </span>
        ))}
        <span className="inline-flex items-center gap-[5px]">
          <i className="h-2.5 w-3 rounded-[3px] border-[1.5px] border-ink bg-[repeating-linear-gradient(135deg,rgb(31_21_53/0.35)_0_2px,#fff_2px_5px)]" />
          Lost to diminishing returns: {raw - effective}
        </span>
      </div>
    </div>
  );
}

function AttributeName({ attribute }: { attribute: Attribute }) {
  return (
    <span className={cx('font-bold', ATTRIBUTE_CLASSES[attribute].text)}>
      {STAT_DISPLAY[attribute].label}
    </span>
  );
}

function Receipt({ children }: { children: ReactNode }) {
  return <ul className="border-t-2 border-dashed border-[#c9c2ee]">{children}</ul>;
}

interface LineProps {
  label: ReactNode;
  value: string;
  detail?: ReactNode;
  /** Shows the item's icon in front of the line. */
  source?: ItemSource;
  total?: boolean;
}

function Line({ label, value, detail, source, total = false }: LineProps) {
  return (
    <li
      className={cx(
        'grid items-center gap-2.5',
        source ? 'grid-cols-[26px_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]',
        total ? 'pt-2 pb-[7px]' : 'border-b-2 border-dashed border-[#e1dcf7] py-[7px]',
      )}
    >
      {source && <ItemIcon item={source.item} cursed={source.cursed} size={26} />}
      <span className="flex min-w-0 flex-col text-body leading-[1.3]">
        <b className={cx(total ? 'font-display text-[17px] font-normal' : 'text-sm font-bold')}>
          {label}
        </b>
        {detail && <span className="text-ink-2">{detail}</span>}
      </span>
      <span
        className={cx(
          'whitespace-nowrap tabular-nums',
          total ? 'font-display text-xl' : 'text-control font-bold',
        )}
      >
        {value}
      </span>
    </li>
  );
}
