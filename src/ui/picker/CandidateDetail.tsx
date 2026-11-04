import type { Item } from '../../catalog/schema.ts';
import { EffectText } from '../common/EffectText.tsx';
import { ItemTags, WeaponSummary } from '../common/ItemDetails.tsx';
import { RARITY_STYLES } from '../display.ts';
import { itemName } from '../format.ts';

/**
 * The picker's footer: details of the item being previewed. Not a live region: the focused
 * row's label already announces the change, so announcing this too would repeat it.
 */
export function CandidateDetail({ item, cursed }: { item: Item | null; cursed: boolean }) {
  return (
    <div className="min-h-32 flex-none border-t-4 border-ink bg-well-2 px-3.5 pt-2.5 pb-3">
      {item ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg">{itemName(item, cursed)}</h3>
            <span
              className="rounded-md border-[1.5px] border-ink px-1.5 py-px text-micro font-bold"
              style={{ backgroundColor: RARITY_STYLES[item.rarity].color }}
            >
              {RARITY_STYLES[item.rarity].label}
            </span>
          </div>
          <div className="mt-1.5 mb-[5px] flex flex-wrap gap-[5px]">
            <ItemTags item={item} cursed={cursed} size="xs" />
          </div>
          {item.slot === 'weapon' && (
            <WeaponSummary weapon={item.weapon} className="mb-0.5 text-body text-ink-2" />
          )}
          <ul className="text-body leading-[1.45]">
            {item.effects.map((effect) => (
              <li key={effect.text}>
                <EffectText text={effect.text} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="pt-1.5 text-sm font-semibold text-ink-3">
          Point at an item to preview it in your build. Click it to equip.
        </p>
      )}
    </div>
  );
}
