import { Checkbox } from '@base-ui/react/checkbox';
import { Tooltip } from '@base-ui/react/tooltip';
import { useId, useRef } from 'react';
import type { Item } from '../../catalog/schema.ts';
import type { Equipped, SlotId } from '../../engine/build.ts';
import { CURSED_HP_PERCENT, CURSED_TAG_FACTOR } from '../../engine/cursed.ts';
import type { Contribution } from '../../engine/effects.ts';
import { useBuildActions } from '../../state/build-store.ts';
import { usePickerActions, usePickerSlot } from '../../state/picker-store.ts';
import { ItemIcon, RarityGem } from '../common/ItemIcon.tsx';
import { CloseIcon } from '../common/icons.tsx';
import { cssVars, cx } from '../common/styles.ts';
import { RARITY_STYLES, SLOT_LABELS } from '../display.ts';
import { formatNumber, itemName } from '../format.ts';
import { ItemTooltip } from './ItemTooltip.tsx';

interface SlotCardProps {
  slot: SlotId;
  /** The slot's item from the current simulation, or undefined for an empty slot. */
  equipped: Equipped | undefined;
  /** Contributions of the item in this slot, for its tooltip. */
  contributions: readonly Contribution[];
}

/**
 * One gear slot: opens the picker, shows the item's tooltip on hover or focus, and, once it
 * holds an item, the slot's cursed checkbox and clear button.
 */
export function SlotCard({ slot, equipped, contributions }: SlotCardProps) {
  const pickerSlot = usePickerSlot();
  const { clear, setCursed } = useBuildActions();
  const { open } = usePickerActions();
  const cardRef = useRef<HTMLDivElement>(null);
  const descriptionId = useId();

  const item = equipped?.item;
  const cursed = equipped?.cursed ?? false;
  const label = SLOT_LABELS[slot];
  const rarity = item && RARITY_STYLES[cursed ? 'cursed' : item.rarity];

  // The tooltip sits beside the whole gear column, level with this card.
  const tooltipAnchor = () => {
    const card = cardRef.current;
    if (!card) return null;
    return {
      contextElement: card,
      getBoundingClientRect: () => {
        const { top, height } = card.getBoundingClientRect();
        const column = (card.closest('[data-gear-column]') ?? card).getBoundingClientRect();
        return new DOMRect(column.left, top, column.width, height);
      },
    };
  };

  return (
    <div
      ref={cardRef}
      className={cx(
        'relative h-[100px] overflow-hidden rounded-[18px] border-3 border-ink max-xl:h-24',
        item
          ? cx('sunburst shadow-ink-md', cursed ? 'bg-curse-bg' : 'bg-well')
          : 'border-dashed bg-well/90',
        'has-[[data-slot-button]:focus-visible]:outline-3 has-[[data-slot-button]:focus-visible]:outline-offset-4 has-[[data-slot-button]:focus-visible]:outline-focus',
      )}
      style={rarity ? cssVars({ '--rarity': rarity.burst }) : undefined}
    >
      <Tooltip.Root disabled={!item || pickerSlot !== null}>
        <Tooltip.Trigger
          data-slot-button
          aria-haspopup="dialog"
          aria-expanded={pickerSlot === slot}
          aria-describedby={item ? descriptionId : undefined}
          aria-label={
            item
              ? `${label}: ${itemName(item, cursed)}, ${RARITY_STYLES[item.rarity].label}. Change item`
              : `${label}: empty. Choose an item`
          }
          onClick={() => open(slot)}
          className="absolute inset-0 grid grid-cols-[68px_minmax(0,1fr)] items-start gap-x-3 rounded-[15px] py-2 pr-2.5 pl-2.5 text-left outline-none hover:bg-white/35 max-xl:grid-cols-[58px_minmax(0,1fr)] max-xl:gap-x-2.5"
        >
          {item ? (
            <ItemIcon item={item} cursed={cursed} size={68} className="max-xl:size-[58px]" />
          ) : (
            <span className="block size-[68px] rounded-[14px] border-3 border-dashed border-ink bg-[repeating-linear-gradient(135deg,#d6d0f5_0_6px,#cbc4f0_6px_12px)] max-xl:size-[58px]" />
          )}
          <span className="flex min-w-0 flex-col pt-px">
            <span
              className={cx('mr-6 text-note font-semibold', item ? 'text-ink-3' : 'text-ink-2')}
            >
              {label}
            </span>
            <span
              className={cx(
                'mt-px line-clamp-2 font-display text-[17px] leading-[1.08] max-xl:text-[15.5px]',
                item ? 'text-ink' : 'text-ink-2',
              )}
            >
              {item ? itemName(item, cursed) : 'Empty'}
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-note font-semibold text-ink-2">
              {item ? (
                <>
                  <RarityGem color={RARITY_STYLES[item.rarity].color} />
                  {RARITY_STYLES[item.rarity].label}
                </>
              ) : (
                'Choose an item'
              )}
            </span>
          </span>
        </Tooltip.Trigger>
        {item && (
          <Tooltip.Portal>
            <Tooltip.Positioner side="right" align="start" sideOffset={16} anchor={tooltipAnchor}>
              <Tooltip.Popup>
                <ItemTooltip
                  item={item}
                  slot={slot}
                  cursed={cursed}
                  contributions={contributions}
                />
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        )}
      </Tooltip.Root>
      {item && (
        // The tooltip is visual only, so screen readers get the item's details here.
        <span id={descriptionId} className="sr-only">
          {itemDescription(item, cursed)}
        </span>
      )}

      {item && (
        // biome-ignore lint/a11y/noLabelWithoutControl: Checkbox.Root inside is the control (Base UI's documented labeling pattern)
        <label
          className={cx(
            'absolute top-[66px] left-1.5 z-2 flex h-6 w-[78px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-ink text-note font-bold shadow-ink-sm select-none max-xl:top-[58px] max-xl:left-1 max-xl:w-[68px] max-xl:text-xs',
            cursed ? 'bg-curse text-white text-outline-thin' : 'bg-well-2',
            'has-focus-visible:outline-3 has-focus-visible:outline-offset-1 has-focus-visible:outline-ink',
          )}
        >
          <Checkbox.Root
            checked={cursed}
            onCheckedChange={(checked) => setCursed(slot, checked)}
            aria-label={`Cursed ${label.toLowerCase()}`}
            className="grid size-[13px] place-items-center rounded-[4px] border-2 border-ink bg-white outline-none"
          >
            <Checkbox.Indicator className="h-[3px] w-1.5 -translate-y-px -rotate-45 border-b-2 border-l-2 border-curse" />
          </Checkbox.Root>
          Cursed
        </label>
      )}

      {item && (
        <button
          type="button"
          onClick={() => clear(slot)}
          aria-label={`Clear ${label.toLowerCase()}`}
          title="Clear slot"
          className="absolute top-1.5 right-1.5 z-2 grid size-6 place-items-center rounded-full border-2 border-ink bg-well-2 text-ink [--focus-ring:var(--color-ink)] hover:bg-loss-bg"
        >
          <CloseIcon className="size-2.5" />
        </button>
      )}
    </div>
  );
}

/** The item's tags and effects as one sentence for screen readers. */
function itemDescription(item: Item, cursed: boolean): string {
  const factor = cursed ? ` ×${CURSED_TAG_FACTOR}` : '';
  const tags = item.properties.map((tag) => `${tag.toUpperCase()}${factor}`);
  if (cursed) tags.push('CURSED');
  const effects = item.effects.map((effect) => effect.text);
  if (cursed) effects.push(`${formatNumber(CURSED_HP_PERCENT)}% HP.`);
  return `Tags: ${tags.join(', ') || 'none'}. ${effects.join(' ')}`;
}
