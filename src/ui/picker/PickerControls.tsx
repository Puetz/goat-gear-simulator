import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { type RefObject, useId } from 'react';
import { RARITIES, type Tag } from '../../catalog/schema.ts';
import type { PanelStat } from '../../engine/simulate.ts';
import {
  type PickerSort,
  usePickerActions,
  usePickerQuery,
  usePickerRarities,
  usePickerSort,
  usePickerTag,
} from '../../state/picker-store.ts';
import { RarityGem } from '../common/ItemIcon.tsx';
import { SearchIcon } from '../common/icons.tsx';
import { SelectField } from '../common/SelectField.tsx';
import { cx } from '../common/styles.ts';
import { RARITY_STYLES, STAT_DISPLAY } from '../display.ts';

const SORTS: readonly { value: PickerSort; label: string }[] = [
  { value: 'impact', label: 'Impact' },
  { value: 'name', label: 'Name' },
  { value: 'rarity', label: 'Rarity' },
];

const PILL =
  'inline-flex h-[30px] items-center gap-1.5 rounded-[9px] border-2 border-ink bg-well-2 pr-[9px] pl-2 text-body font-bold shadow-ink-sm data-pressed:bg-ink data-pressed:text-white';

interface PickerControlsProps {
  slotLabel: string;
  /** Tags that occur on the slot's items, for the tag filter. */
  tags: readonly Tag[];
  /** Stats the slot's items change, for the impact sort. */
  stats: readonly PanelStat[];
  shownCount: number;
  /** The stat "Impact" sorts by, after falling back for stats this slot can't change. */
  sortStat: PanelStat;
  searchRef: RefObject<HTMLInputElement | null>;
  /** Moves focus from the search field into the list. */
  onSearchArrowDown: () => void;
}

/** Search, tag and rarity filters, and the sort order of the picker list. */
export function PickerControls({
  slotLabel,
  tags,
  stats,
  shownCount,
  sortStat,
  searchRef,
  onSearchArrowDown,
}: PickerControlsProps) {
  const query = usePickerQuery();
  const tag = usePickerTag();
  const rarities = usePickerRarities();
  const sort = usePickerSort();
  const sortLabelId = useId();
  const { setQuery, setTag, setRarities, setSort, setSortStat } = usePickerActions();

  return (
    <div className="grid flex-none gap-2 px-3 pt-2.5 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <label className="relative flex min-w-0 flex-1 items-center">
          <span className="sr-only">Search items</span>
          <SearchIcon className="pointer-events-none absolute left-[11px] size-4 text-ink" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowDown') return;
              event.preventDefault();
              onSearchArrowDown();
            }}
            placeholder={`Search ${slotLabel.toLowerCase()} items`}
            autoComplete="off"
            className="h-9 min-w-0 flex-1 rounded-[11px] border-3 border-ink bg-white pr-2.5 pl-[34px] text-control font-semibold placeholder:font-medium placeholder:text-[#716a99]"
          />
        </label>
        <SelectField<Tag | null>
          label="Filter by tag"
          value={tag}
          onValueChange={setTag}
          options={[
            { value: null, label: 'Any tag' },
            ...tags.map((value) => ({ value, label: value.toUpperCase() })),
          ]}
          className="w-[134px]"
        />
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <ToggleGroup
          aria-label="Filter by rarity"
          multiple
          value={rarities}
          onValueChange={setRarities}
          className="flex flex-wrap gap-2"
        >
          {RARITIES.map((rarity) => (
            <Toggle key={rarity} value={rarity} className={cx(PILL, 'group')}>
              <RarityGem
                color={RARITY_STYLES[rarity].color}
                className="group-data-pressed:border-white"
              />
              {RARITY_STYLES[rarity].label}
            </Toggle>
          ))}
        </ToggleGroup>
        <span className="ml-auto text-note font-semibold whitespace-nowrap text-ink-2">
          {shownCount} {shownCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span
          id={sortLabelId}
          className="text-body font-bold whitespace-nowrap text-ink-2 max-xl:sr-only"
        >
          Sort by
        </span>
        <ToggleGroup
          aria-labelledby={sortLabelId}
          value={[sort]}
          onValueChange={([value]) => value && setSort(value)}
          className="inline-flex overflow-hidden rounded-[10px] border-2 border-ink bg-well-2 shadow-ink-sm"
        >
          {SORTS.map(({ value, label }) => (
            <Toggle
              key={value}
              value={value}
              className="h-7 border-r-2 border-ink px-2.5 text-body max-xl:px-2 font-bold last:border-r-0 focus-visible:-outline-offset-4 focus-visible:[--focus-ring:var(--color-gold)] data-pressed:bg-ink data-pressed:text-white"
            >
              {label}
            </Toggle>
          ))}
        </ToggleGroup>
        <span className="ml-1 text-body font-bold text-ink-2">on</span>
        <SelectField<PanelStat>
          label="Stat to sort by"
          value={sortStat}
          onValueChange={(value) => value && setSortStat(value)}
          options={stats.map((value) => ({ value, label: STAT_DISPLAY[value].label }))}
          size="sm"
          className="w-[150px] max-xl:w-[118px]"
        />
      </div>
    </div>
  );
}
