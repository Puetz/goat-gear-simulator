import type { Tag } from '../../catalog/schema.ts';
import type { Chromatic } from '../../engine/derived.ts';
import { CHROMATIC_THRESHOLD } from '../../engine/derived.ts';
import { cssVars, cx } from '../common/styles.ts';
import { CHROMATIC_TIER_NAMES, TAG_STYLES } from '../display.ts';

const HEX_CAPTIONS = ['Tag 1', 'Tag 2: +25%', 'Tag 3: +10%'] as const;

// The hexes step down in size with the width of their row (a container): three columns and two
// connectors need 280 px at full size (3 × 84 + 2 × 14) and 238 px at the middle size
// (3 × 70 + 2 × 14). Narrower rows get the small size, which needs 200 px (3 × 60 + 2 × 10).
const HEX_SHAPE =
  'relative grid h-12 w-14 place-items-center bg-ink clip-hex before:absolute before:inset-x-[5px] before:inset-y-1 before:clip-hex @min-[238px]:h-[58px] @min-[238px]:w-[66px] @min-[280px]:h-[68px] @min-[280px]:w-20';

const percentBonus = ({ multiplier }: Chromatic) => `+${Math.round((multiplier - 1) * 100)}%`;

interface ChromaMeterProps {
  current: Chromatic;
  /** The previewed build's status, or the current one when nothing is previewed. */
  shown: Chromatic;
}

/** Three hexes for the three tags that count toward a chromatic bonus, plus the next step. */
export function ChromaMeter({ current, shown }: ChromaMeterProps) {
  const tierChanged = shown.tier !== current.tier;
  const { qualifying, closest } = shown;

  return (
    <div className="rounded-[18px] border-3 border-ink bg-well-2 px-3.5 py-3 shadow-ink-md">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h3
          className={cx(
            'font-display text-[26px] leading-none',
            shown.tier === 'none' && 'text-ink-3',
          )}
        >
          {CHROMATIC_TIER_NAMES[shown.tier]}
        </h3>
        <span
          className={cx(
            'rounded-[9px] border-2 px-[9px] py-[3px] text-sm font-bold whitespace-nowrap',
            shown.tier === 'none'
              ? 'border-ink-3 bg-[#e4e0f7] text-ink-3'
              : 'border-ink bg-gold shadow-ink-sm',
          )}
        >
          {tierChanged && (
            <span className="mr-1 font-semibold line-through opacity-60">
              {current.tier === 'none' ? 'none' : percentBonus(current)}
            </span>
          )}
          {shown.tier === 'none' ? 'No bonus yet' : `${percentBonus(shown)} damage and HP`}
        </span>
      </div>

      <div className="@container mt-3 mb-1.5 flex items-start">
        {HEX_CAPTIONS.map((caption, index) => {
          const entry = qualifying[index];
          const progress = !entry && index === qualifying.length ? closest : null;
          return (
            <div key={caption} className="contents">
              <div className="flex w-[60px] flex-none flex-col items-center gap-1.5 @min-[238px]:w-[70px] @min-[280px]:w-[84px]">
                <div className="drop-shadow-[0_3px_0_var(--color-ink)]">
                  <Hex
                    entry={entry ?? progress}
                    progress={progress !== null}
                    fresh={entry !== undefined && current.qualifying[index]?.[0] !== entry[0]}
                  />
                </div>
                <span
                  className={cx(
                    'text-center text-caption leading-[1.15]',
                    entry && index > 0 ? 'font-bold text-ink' : 'font-semibold text-ink-3',
                  )}
                >
                  {caption}
                </span>
              </div>
              {index < HEX_CAPTIONS.length - 1 && (
                // Centered on the hexes: half the hex height minus half its own 12 px.
                <span
                  className={cx(
                    'mt-[18px] h-3 min-w-2.5 flex-1 rounded-md border-3 border-ink @min-[238px]:mt-[23px] @min-[238px]:min-w-3.5 @min-[280px]:mt-7',
                    qualifying[index + 1] ? 'bg-gold' : 'bg-empty',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-row leading-[1.35] text-ink-2">
        <NextTierHint shown={shown} />
      </p>
    </div>
  );
}

interface HexProps {
  entry: readonly [Tag, number] | null;
  /** Shows the closest tag filling up toward the threshold. */
  progress: boolean;
  /** Pops in: the preview puts a new tag here. */
  fresh: boolean;
}

function Hex({ entry, progress, fresh }: HexProps) {
  if (!entry) {
    return (
      <div className={cx(HEX_SHAPE, 'before:bg-empty')}>
        <span className="relative font-display text-[21px] text-ink-3">?</span>
      </div>
    );
  }
  const [tag, count] = entry;
  const style = TAG_STYLES[tag];
  const fill = progress
    ? `linear-gradient(to top, ${style.background} 0 ${(count / CHROMATIC_THRESHOLD) * 100}%, var(--color-empty) 0 100%)`
    : style.background;

  return (
    <div
      className={cx(HEX_SHAPE, 'before:[background:var(--fill)]', fresh && 'animate-pop')}
      style={cssVars({ '--fill': fill })}
    >
      <span
        className={cx(
          'relative flex flex-col items-center leading-none',
          progress && 'text-ink [text-shadow:0_0_3px_#fff,0_0_2px_#fff]',
        )}
        style={progress ? undefined : { color: style.color }}
      >
        <span className="text-[10px] font-bold tracking-[0.03em] uppercase font-stretch-85% @min-[238px]:text-micro">
          {tag}
        </span>
        <span className="mt-0.5 font-display text-base @min-[238px]:text-lg @min-[280px]:text-[21px]">
          {progress ? `${count}/${CHROMATIC_THRESHOLD}` : count}
        </span>
      </span>
    </div>
  );
}

function NextTierHint({ shown }: { shown: Chromatic }) {
  const count = shown.qualifying.length;
  const closest = shown.closest && (
    <>
      {' '}
      <b className="font-bold text-ink uppercase">{shown.closest[0]}</b> is closest at{' '}
      {shown.closest[1]} of {CHROMATIC_THRESHOLD}.
    </>
  );
  if (count >= 3) {
    const extra = count - 3;
    const more = extra === 0 ? 'More tags' : `${extra} more ${extra === 1 ? 'tag' : 'tags'}`;
    return (
      <>
        Top bonus reached. {more} at {CHROMATIC_THRESHOLD} {extra === 1 ? 'adds' : 'add'} nothing
        extra.
      </>
    );
  }
  const next = <b className="font-bold text-ink">{count === 2 ? 'Trichromatic' : 'Bichromatic'}</b>;
  const gain = count === 2 ? '+10% more' : '+25% damage and HP';
  const [need, unlock] = count === 0 ? ['Two tags', 'unlock'] : ['One more tag', 'unlocks'];
  return (
    <>
      {need} at {CHROMATIC_THRESHOLD} {unlock} {next} ({gain}).
      {closest}
    </>
  );
}
