import type { SimulationResult } from '../../engine/simulate.ts';
import type { Preview } from '../../state/simulation.ts';
import { ItemIcon } from '../common/ItemIcon.tsx';
import { cx } from '../common/styles.ts';
import { SLOT_LABELS } from '../display.ts';
import { itemName } from '../format.ts';
import { ChromaMeter } from './ChromaMeter.tsx';
import { EquippedTags } from './EquippedTags.tsx';
import { NotCalculatedBox } from './NotCalculatedBox.tsx';
import { StatsPanel } from './StatsPanel.tsx';
import { TagRules } from './TagRules.tsx';

const COLUMN =
  'min-h-0 overflow-auto rounded-[18px] bg-well px-4 pt-3.5 pb-4 shadow-[inset_0_3px_0_rgb(31_21_53/0.12)] scrollbar-thin-sheet-edge max-xl:p-3';

interface ResultSheetProps {
  current: SimulationResult;
  preview: Preview | null;
}

/** The right side: tags on the left, stats on the right. Shows a preview while picking. */
export function ResultSheet({ current, preview }: ResultSheetProps) {
  const shown = preview?.result ?? current;

  return (
    <main
      aria-label="Build results"
      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border-4 border-ink bg-sheet shadow-ink-lg [--focus-ring:var(--color-ink)]"
    >
      <div
        className={cx(
          'relative grid h-[54px] flex-none grid-cols-[minmax(0,45fr)_minmax(0,55fr)] items-center gap-3 border-b-4 border-ink px-3 transition-colors duration-150 max-xl:grid-cols-2',
          preview ? 'bg-orange' : 'bg-head',
        )}
      >
        <div className={cx('px-4.5', preview && 'invisible')}>
          <h2 className="font-display text-[27px] text-outline">Tags</h2>
        </div>
        <div
          className={cx(
            'flex items-baseline justify-between gap-2.5 pr-4 pl-4.5',
            preview && 'invisible',
          )}
        >
          <h2 className="font-display text-[27px] text-outline">Stats</h2>
          <span className="text-body font-semibold whitespace-nowrap text-white [text-shadow:0_1px_0_rgb(31_21_53/0.55)]">
            Click a stat to see its sources
          </span>
        </div>
        <div className="absolute inset-0 flex items-center">
          {preview && <PreviewBanner preview={preview} />}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,45fr)_minmax(0,55fr)] gap-3 p-3 max-xl:grid-cols-2 max-xl:gap-2.5 max-xl:p-2.5">
        <div className={cx(COLUMN, 'space-y-[18px]')}>
          <ChromaMeter current={current.chromatic} shown={shown.chromatic} />
          <EquippedTags current={current.tags} shown={shown.tags} previewing={preview !== null} />
          <TagRules rules={shown.tags.rules} />
        </div>
        <div className={COLUMN}>
          <StatsPanel current={current} preview={preview?.result ?? null} />
          <NotCalculatedBox entries={shown.effects.notCalculated} />
        </div>
      </div>
    </main>
  );
}

function PreviewBanner({ preview }: { preview: Preview }) {
  const { slot, item, cursed, replaces } = preview;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 pr-[18px] pl-4 text-[15.5px] font-semibold text-ink">
      <ItemIcon item={item} cursed={cursed} size={30} />
      <span className="min-w-0 flex-1 truncate">
        Previewing{' '}
        <b className="mx-0.5 font-display text-xl font-normal tracking-[0.01em] text-outline">
          {itemName(item, cursed)}
        </b>{' '}
        {replaces
          ? `in place of ${itemName(replaces, cursed)}`
          : `in your ${SLOT_LABELS[slot].toLowerCase()} slot`}
      </span>
      <span className="rounded-[9px] bg-ink px-2.5 py-1 text-note font-bold whitespace-nowrap text-white max-xl:hidden">
        Click the item to equip it
      </span>
    </div>
  );
}
