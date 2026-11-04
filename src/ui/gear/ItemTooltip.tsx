import type { Item } from '../../catalog/schema.ts';
import type { SlotId } from '../../engine/build.ts';
import { CURSED_HP_PERCENT, CURSED_TAG_FACTOR } from '../../engine/cursed.ts';
import type { Contribution } from '../../engine/effects.ts';
import { EffectText } from '../common/EffectText.tsx';
import { ItemTags, WeaponSummary } from '../common/ItemDetails.tsx';
import { ItemIcon } from '../common/ItemIcon.tsx';
import { cx } from '../common/styles.ts';
import { RARITY_STYLES, SLOT_LABELS } from '../display.ts';
import { formatNumber, formatSigned, itemName } from '../format.ts';

interface ItemTooltipProps {
  item: Item;
  slot: SlotId;
  cursed: boolean;
  /** This item's contributions in the current build, for the game-style "(now +X)" values. */
  contributions: readonly Contribution[];
}

/** The game's dark item tooltip, with live values for effects that depend on the build. */
export function ItemTooltip({ item, slot, cursed, contributions }: ItemTooltipProps) {
  const rarity = RARITY_STYLES[cursed ? 'cursed' : item.rarity];
  const nowValue = (text: string) =>
    contributions.find((entry) => entry.text === text && entry.detail !== null)?.value;

  return (
    <div className="w-[360px] overflow-hidden rounded-[18px] border-4 border-ink bg-tip text-tip-text shadow-[0_6px_0_var(--color-ink),0_22px_50px_rgb(5_3_20/0.55)]">
      <div
        className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 border-b-3 border-ink py-2.5 pr-3.5 pl-2.5"
        style={{ backgroundColor: rarity.header }}
      >
        <ItemIcon item={item} cursed={cursed} size={72} />
        <div>
          <h3 className="font-display text-2xl leading-[1.02] text-outline">
            {itemName(item, cursed)}
          </h3>
          <p className="mt-1.5 flex items-center gap-2 text-control font-bold text-white">
            {SLOT_LABELS[slot]}
            <span
              className={cx(
                'rounded-[7px] border-2 px-2 py-px text-caption',
                cursed ? 'border-curse-pale bg-[#2a0c14] text-curse-pale' : 'border-ink text-ink',
              )}
              style={cursed ? undefined : { backgroundColor: rarity.burst }}
            >
              {rarity.label}
            </span>
          </p>
        </div>
      </div>
      <div className="px-4 pt-2.5 pb-3.5">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          <ItemTags item={item} cursed={cursed} />
        </div>
        {item.slot === 'weapon' && (
          <WeaponSummary
            weapon={item.weapon}
            tone="light"
            className="mb-2 text-row text-[#c9d3d8]"
          />
        )}
        <ul className="grid gap-1.5 text-control leading-[1.35]">
          {item.effects.map((effect) => {
            const now = nowValue(effect.text);
            return (
              <li key={effect.text}>
                <EffectText text={effect.text} tone="light" />
                {now !== undefined && (
                  <span className="font-bold text-now"> (now {formatSigned(now)})</span>
                )}
              </li>
            );
          })}
        </ul>
        {cursed && (
          <p className="mt-2.5 rounded-[10px] border-2 border-curse-hi/55 bg-curse-hi/16 px-2.5 py-1.5 text-body text-[#ffc4ce]">
            Cursed items count their tags {formatNumber(CURSED_TAG_FACTOR)} times and add one CURSED
            tag. Each one also gives {formatNumber(CURSED_HP_PERCENT)}% HP.
          </p>
        )}
        {item.flavorText && (
          <p className="mt-2.5 text-sm text-tip-muted italic">{item.flavorText}</p>
        )}
      </div>
    </div>
  );
}
