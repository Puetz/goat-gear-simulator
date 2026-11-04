import { NumberField } from '@base-ui/react/number-field';
import { STATS } from '../../catalog/schema.ts';
import type { EffectTotals } from '../../engine/effects.ts';
import { useBuildActions, useCoins } from '../../state/build-store.ts';
import { STAT_DISPLAY } from '../display.ts';
import { formatSigned } from '../format.ts';

/** What the coins currently add, per stat, e.g. "+35 Agility". */
function coinBonuses({ contributions }: EffectTotals): string[] {
  return STATS.flatMap((stat) => {
    const fromCoins = (contributions[stat] ?? []).filter(
      (entry) => entry.detail?.kind === 'perCoins',
    );
    const total = fromCoins.reduce((sum, entry) => sum + entry.value, 0);
    return total === 0 ? [] : [`${formatSigned(total)} ${STAT_DISPLAY[stat].label}`];
  });
}

/** The coins the player holds, which some items turn into stats. */
export function CoinPill({ effects }: { effects: EffectTotals }) {
  const coins = useCoins();
  const { setCoins } = useBuildActions();
  const bonuses = coinBonuses(effects);

  return (
    <div className="flex h-[42px] items-center gap-1 rounded-[14px] border-3 border-ink bg-linear-to-b from-gold-hi to-gold to-55% pr-1 pl-1.5 shadow-ink-md [--focus-ring:var(--color-ink)]">
      <span
        aria-hidden="true"
        className="size-[26px] flex-none rounded-full border-3 border-ink bg-[radial-gradient(circle_at_40%_35%,#fff0b0_0_18%,#f4bd2e_19%_100%)] shadow-[inset_0_0_0_3px_#e3a41c]"
      />
      <NumberField.Root
        value={coins}
        onValueChange={(value) => setCoins(value ?? 0)}
        min={0}
        step={1}
      >
        <NumberField.Input
          aria-label="Coins"
          className="field-sizing-content h-[30px] min-w-11 bg-transparent px-0.5 text-right font-display text-[22px]"
        />
      </NumberField.Root>
      <span aria-hidden="true" className="mr-1 text-sm font-semibold">
        coins
      </span>
      {bonuses.length > 0 && (
        <span className="rounded-[9px] bg-ink px-2 py-1 text-note font-bold whitespace-nowrap text-[#b9f5a6] max-xl:hidden">
          {bonuses.join(', ')}
        </span>
      )}
    </div>
  );
}
