import { Dialog } from '@base-ui/react/dialog';
import { type KeyboardEvent, type RefObject, useRef } from 'react';
import { catalog } from '../../catalog/items.ts';
import { TAGS } from '../../catalog/schema.ts';
import type { SlotId } from '../../engine/build.ts';
import { evaluateCandidates } from '../../engine/candidates.ts';
import { PANEL_STATS, type SimulationResult } from '../../engine/simulate.ts';
import { useBuild, useBuildActions } from '../../state/build-store.ts';
import {
  usePickerActions,
  usePickerQuery,
  usePickerRarities,
  usePickerSlot,
  usePickerSort,
  usePickerSortStat,
  usePickerTag,
  usePreviewId,
} from '../../state/picker-store.ts';
import { buttonClass } from '../common/styles.ts';
import { SLOT_LABELS } from '../display.ts';
import { CandidateDetail } from './CandidateDetail.tsx';
import { CandidateRow } from './CandidateRow.tsx';
import { arrowTarget, filterCandidates, sortCandidates } from './candidate-list.ts';
import { PickerControls } from './PickerControls.tsx';

interface ItemPickerProps {
  /** The gear column; the picker covers it and leaves the stats visible. */
  container: RefObject<HTMLElement | null>;
  current: SimulationResult;
}

/**
 * Picks the item for a slot. It's a non-modal dialog over the gear column, so the stats stay
 * visible and usable: pointing at an item previews it there. Esc closes it.
 */
export function ItemPicker({ container, current }: ItemPickerProps) {
  const slot = usePickerSlot();
  const { close } = usePickerActions();
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog.Root
      open={slot !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      modal={false}
      disablePointerDismissal
    >
      <Dialog.Portal container={container}>
        <Dialog.Popup
          initialFocus={searchRef}
          className="absolute inset-0 z-30 flex animate-slide-in flex-col overflow-hidden rounded-3xl border-4 border-ink bg-sheet shadow-[0_6px_0_var(--color-ink),0_24px_60px_rgb(8_4_24/0.55)] [--focus-ring:var(--color-ink)]"
        >
          {slot && <PickerBody slot={slot} current={current} searchRef={searchRef} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface PickerBodyProps {
  slot: SlotId;
  current: SimulationResult;
  searchRef: RefObject<HTMLInputElement | null>;
}

function PickerBody({ slot, current, searchRef }: PickerBodyProps) {
  const build = useBuild();
  const { equip, clear } = useBuildActions();
  const { close, preview } = usePickerActions();
  const previewId = usePreviewId();
  const query = usePickerQuery();
  const tag = usePickerTag();
  const rarities = usePickerRarities();
  const sort = usePickerSort();
  const sortStat = usePickerSortStat();

  const listRef = useRef<HTMLUListElement>(null);
  const label = SLOT_LABELS[slot];
  const cursed = build.slots[slot]?.cursed ?? false;
  const candidates = evaluateCandidates(build, slot, current, catalog);
  const tags = TAGS.filter((value) =>
    candidates.some(({ item }) => item.properties.includes(value)),
  );
  const stats = PANEL_STATS.filter(
    (stat) =>
      stat === 'hp' ||
      stat === 'base_dps' ||
      candidates.some((candidate) => candidate.allowed && candidate.delta[stat] !== undefined),
  );
  // The sort stat carries over between slots; fall back to HP where no item changes it.
  const sortBy = stats.includes(sortStat) ? sortStat : 'hp';
  const shown = sortCandidates(
    filterCandidates(candidates, { query, tag, rarities }),
    sort,
    sortBy,
  );
  // Only items that can be equipped are previewed, here and in the stats panel.
  const allowed = shown.filter((candidate) => candidate.allowed);
  const previewed = allowed.find(({ item }) => item.id === previewId)?.item ?? null;
  // One tab stop for the whole list: the previewed item, or else the first one.
  const tabStop = (allowed.find(({ item }) => item.id === previewId) ?? allowed[0])?.item.id;

  const choose = (itemId: string) => {
    equip(slot, itemId);
    close();
  };

  const focusList = () =>
    listRef.current?.querySelector<HTMLButtonElement>('[data-candidate][tabindex="0"]')?.focus();

  // Arrow keys move between items; focusing an item previews it.
  const moveFocus = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-candidate]'),
    ];
    const focused = document.activeElement;
    const index = focused instanceof HTMLButtonElement ? buttons.indexOf(focused) : -1;
    const target = arrowTarget(index, buttons.length, event.key);
    const next = target === undefined ? undefined : buttons[target];
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  // Leaving the list with the mouse falls back to the focused item, if any.
  const previewFocused = () => {
    const focused = document.activeElement?.closest<HTMLElement>('[data-candidate]');
    preview(focused?.dataset.itemId ?? null);
  };

  return (
    <>
      <div className="flex min-h-14 flex-none items-center gap-2 border-b-4 border-ink bg-head py-2 pr-2.5 pl-4">
        <Dialog.Title className="mr-auto flex items-center gap-2.5 font-display text-[25px] text-outline">
          {label}
          {cursed && (
            <span className="rounded-lg border-2 border-ink bg-curse px-2 py-0.5 font-sans text-caption font-bold tracking-[0.02em] text-white shadow-ink-sm [text-shadow:none]">
              Cursed slot
            </span>
          )}
        </Dialog.Title>
        <button
          type="button"
          disabled={!build.slots[slot]}
          onClick={() => {
            clear(slot);
            close();
          }}
          className={buttonClass('plain', 'sm')}
        >
          Clear slot
        </button>
        <Dialog.Close className={buttonClass('orange')}>Close</Dialog.Close>
      </div>

      <PickerControls
        slotLabel={label}
        tags={tags}
        stats={stats}
        shownCount={shown.length}
        sortStat={sortBy}
        searchRef={searchRef}
        onSearchArrowDown={focusList}
      />

      <ul
        ref={listRef}
        aria-label={`Items for ${label.toLowerCase()}`}
        onKeyDown={moveFocus}
        onMouseLeave={previewFocused}
        className="grid min-h-0 flex-1 content-start gap-[7px] overflow-auto px-3 pt-1 pb-3 scrollbar-thin-ink-3"
      >
        {shown.length === 0 && (
          <li className="px-1.5 py-[18px] text-center font-semibold text-ink-2">
            No {label.toLowerCase()} items match. Try another name, tag or rarity.
          </li>
        )}
        {shown.map((candidate) => (
          <CandidateRow
            key={candidate.item.id}
            candidate={candidate}
            cursed={cursed}
            sortStat={sortBy}
            currentChromatic={current.chromatic}
            previewed={candidate.item.id === previewId}
            tabbable={candidate.item.id === tabStop}
            onChoose={choose}
            onPreview={preview}
          />
        ))}
      </ul>

      <CandidateDetail item={previewed} cursed={cursed} />
    </>
  );
}
