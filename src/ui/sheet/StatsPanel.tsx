import { Accordion } from '@base-ui/react/accordion';
import { Fragment, type ReactNode } from 'react';
import type { SlotId } from '../../engine/build.ts';
import { type Attribute, isAttribute } from '../../engine/derived.ts';
import { roundTo1 } from '../../engine/math.ts';
import { PANEL_STATS, type PanelStat, type SimulationResult } from '../../engine/simulate.ts';
import { ChangeBadge } from '../common/ChangeBadge.tsx';
import { ChevronIcon, HeartIcon, SwordIcon } from '../common/icons.tsx';
import { cx } from '../common/styles.ts';
import { ATTRIBUTE_CLASSES, STAT_DISPLAY } from '../display.ts';
import { formatNumber } from '../format.ts';
import { StatBreakdown } from './StatBreakdown.tsx';

interface StatsPanelProps {
  current: SimulationResult;
  /** The previewed build, or null when nothing is previewed. */
  preview: SimulationResult | null;
}

/**
 * The game's stat panel: rows that differ from their default, each opening a breakdown of
 * where the value comes from. While previewing, rows show the old and new value.
 */
export function StatsPanel({ current, preview }: StatsPanelProps) {
  const shown = preview ?? current;
  const visible = (stat: PanelStat) =>
    current.panel[stat] !== STAT_DISPLAY[stat].defaultValue ||
    shown.panel[stat] !== STAT_DISPLAY[stat].defaultValue;
  const hasWeapon = current.weapons.length > 0 || shown.weapons.length > 0;

  return (
    <Accordion.Root className="grid gap-[5px]">
      {PANEL_STATS.map((stat) => (
        <Fragment key={stat}>
          {visible(stat) && <StatRow stat={stat} current={current} preview={preview} />}
          {/* Weapon facts follow Base DPS, and stay even when every hit floors to 0 DPS. */}
          {stat === 'base_dps' && hasWeapon && (
            <>
              <WeaponRow label="Scaling" current={current} preview={preview} facts={scalingFacts} />
              <WeaponRow label="Speed" current={current} preview={preview} facts={speedFacts} />
            </>
          )}
        </Fragment>
      ))}
    </Accordion.Root>
  );
}

interface StatRowProps extends StatsPanelProps {
  stat: PanelStat;
}

function StatRow({ stat, current, preview }: StatRowProps) {
  const { label, unit } = STAT_DISPLAY[stat];
  const big = stat === 'hp' || stat === 'base_dps';
  const attribute = isAttribute(stat) ? stat : null;
  const before = current.panel[stat];
  const after = (preview ?? current).panel[stat];
  const effective = attribute ? (preview ?? current).attributes[attribute].effective : after;

  return (
    <Accordion.Item
      value={stat}
      className="group rounded-[13px] bg-well-2 data-open:my-[3px] data-open:mb-[7px] data-open:bg-white data-open:shadow-[0_0_0_3px_var(--color-ink),0_4px_0_3px_var(--color-ink)]"
    >
      <Accordion.Header>
        <Accordion.Trigger
          className={cx(
            'grid w-full grid-cols-[minmax(0,1fr)_auto_18px] items-center gap-2.5 rounded-[13px] py-1 pr-2.5 pl-3 text-left hover:bg-[rgb(123_112_210/0.12)]',
            big ? 'min-h-[54px]' : 'min-h-[39px]',
          )}
        >
          <span
            className={cx(
              'flex min-w-0 items-center gap-2',
              big ? 'font-display text-xl tracking-[0.01em]' : 'text-base font-bold',
              attribute && ATTRIBUTE_CLASSES[attribute].text,
            )}
          >
            {stat === 'hp' && <HeartIcon className="size-[22px] flex-none" />}
            {stat === 'base_dps' && <SwordIcon className="size-[22px] flex-none" />}
            {attribute && (
              <i
                aria-hidden="true"
                className={cx(
                  'mx-[3px] ml-0.5 size-3 flex-none rotate-45 rounded-[2px] border-2 border-ink',
                  ATTRIBUTE_CLASSES[attribute].bg,
                )}
              />
            )}
            {label}
          </span>
          <span className="flex items-center justify-end gap-2 text-[17px] font-bold whitespace-nowrap tabular-nums">
            {preview ? (
              <>
                {after !== before && (
                  // Below 1280 px the change badge alone shows the difference.
                  <span className="contents max-xl:hidden">
                    <span
                      className={cx(
                        'text-ink-3',
                        big ? 'font-display text-lg font-normal' : 'text-sm font-semibold',
                      )}
                    >
                      {formatNumber(before)}
                      {unit}
                    </span>
                    <span className="text-note text-ink-3">›</span>
                  </span>
                )}
                <Value big={big}>
                  {formatNumber(after)}
                  {unit}
                </Value>
                <ChangeBadge change={roundTo1(after - before)} unit={unit} />
              </>
            ) : (
              <span className="flex flex-col items-end leading-[1.1]">
                <Value big={big}>
                  {formatNumber(after)}
                  {unit}
                </Value>
                {attribute && effective !== after && (
                  <span className="text-caption font-semibold text-ink-3">
                    counts as {effective}
                  </span>
                )}
              </span>
            )}
          </span>
          <ChevronIcon className="size-2.5 justify-self-center text-ink-3 transition-transform duration-150 group-data-open:rotate-90 group-data-open:text-ink" />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Panel className="px-3.5 pt-0.5 pb-3">
        <StatBreakdown stat={stat} result={preview ?? current} />
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function Value({ big, children }: { big: boolean; children: ReactNode }) {
  return (
    <span className={cx('text-ink', big && 'font-display text-[30px] leading-none font-normal')}>
      {children}
    </span>
  );
}

interface WeaponFact {
  readonly hand: string;
  readonly value: string;
  readonly attribute: Attribute | null;
}

const handLabel = (slot: SlotId) => (slot === 'mainHand' ? 'Main' : 'Off');

const scalingFacts = (result: SimulationResult): WeaponFact[] =>
  result.weapons.map((weapon) => ({
    hand: handLabel(weapon.slot),
    value: STAT_DISPLAY[weapon.scalingStat].label,
    attribute: weapon.scalingStat,
  }));

const speedFacts = (result: SimulationResult): WeaponFact[] =>
  result.weapons.map((weapon) => ({
    hand: handLabel(weapon.slot),
    value: `${weapon.speed.toFixed(1)} s`,
    attribute: null,
  }));

interface WeaponRowProps extends StatsPanelProps {
  label: string;
  facts: (result: SimulationResult) => WeaponFact[];
}

/** A small row without a breakdown, describing the equipped weapons. */
function WeaponRow({ label, current, preview, facts }: WeaponRowProps) {
  const before = facts(current);
  const after = facts(preview ?? current);
  const changed = JSON.stringify(before) !== JSON.stringify(after);

  return (
    <div className="grid min-h-[30px] grid-cols-[minmax(0,1fr)_auto_18px] items-center gap-2.5 rounded-[13px] bg-well-2 py-1 pr-2.5 pl-3">
      <span className="text-row font-semibold text-ink-2">{label}</span>
      <span className="flex items-center gap-2">
        {changed && (
          // Below 1280 px there's only room for the new value.
          <span className="contents max-xl:hidden">
            <FactList facts={before} muted />
            <span className="text-note text-ink-3">›</span>
          </span>
        )}
        <FactList facts={after} />
      </span>
      <span />
    </div>
  );
}

function FactList({ facts, muted = false }: { facts: WeaponFact[]; muted?: boolean }) {
  return (
    <span
      className={cx(
        'flex flex-col items-end text-body leading-[1.15] font-semibold',
        muted && 'text-ink-3',
      )}
    >
      {facts.length === 0 && 'None'}
      {facts.map(({ hand, value, attribute }) => (
        <span key={hand}>
          {hand}:{' '}
          <span
            className={cx('font-bold', attribute && !muted && ATTRIBUTE_CLASSES[attribute].text)}
          >
            {value}
          </span>
        </span>
      ))}
    </span>
  );
}
