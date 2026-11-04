import { useRef } from 'react';
import { SLOT_IDS } from '../../engine/build.ts';
import type { SimulationResult } from '../../engine/simulate.ts';
import { usePickerSlot } from '../../state/picker-store.ts';
import { ItemPicker } from '../picker/ItemPicker.tsx';
import { CoinPill } from './CoinPill.tsx';
import { GearSetBar } from './GearSetBar.tsx';
import { SaveNotice } from './SaveNotice.tsx';
import { SlotCard } from './SlotCard.tsx';
import { SocketsPanel } from './SocketsPanel.tsx';

/**
 * The left column: title, coins, the eight slots, the set switcher, a notice when saving fails
 * and sockets. The picker slides over it.
 */
export function GearColumn({ current }: { current: SimulationResult }) {
  const columnRef = useRef<HTMLDivElement>(null);
  const pickerOpen = usePickerSlot() !== null;
  const contributions = Object.values(current.effects.contributions).flat();

  return (
    <div ref={columnRef} data-gear-column className="relative flex min-h-0 flex-col gap-3.5">
      {/* While the picker covers the column, what's underneath can't take focus or clicks. */}
      <div className="contents" inert={pickerOpen}>
        <header className="flex h-12 flex-none items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 font-display text-[23px] whitespace-nowrap text-outline max-xl:text-xl">
            <span className="inline-grid h-[34px] place-items-center rounded-[11px] border-3 border-ink bg-linear-to-b from-orange-hi to-orange to-60% px-2 pb-0.5 text-lg shadow-ink max-xl:h-8">
              GOAT
            </span>
            Gear simulator
          </h1>
          <CoinPill effects={current.effects} />
        </header>

        <section aria-label="Equipped gear" className="grid flex-none grid-cols-2 gap-3">
          {SLOT_IDS.map((slot) => (
            <SlotCard
              key={slot}
              slot={slot}
              equipped={current.equipped.find((entry) => entry.slot === slot)}
              contributions={contributions.filter((entry) => entry.slot === slot)}
            />
          ))}
        </section>

        <GearSetBar />
        <SaveNotice />
        <SocketsPanel />
      </div>
      <ItemPicker container={columnRef} current={current} />
    </div>
  );
}
