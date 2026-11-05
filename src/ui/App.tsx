import { Tooltip } from '@base-ui/react/tooltip';
import { useEffect } from 'react';
import { syncAcrossTabs } from '../state/build-store.ts';
import { usePreview, useSimulation } from '../state/simulation.ts';
import { Footer } from './Footer.tsx';
import { GearColumn } from './gear/GearColumn.tsx';
import { ResultSheet } from './sheet/ResultSheet.tsx';

export function App() {
  const current = useSimulation();
  const preview = usePreview();

  // A change saved in another tab shows up here too.
  useEffect(() => syncAcrossTabs(window), []);

  return (
    <Tooltip.Provider delay={150}>
      {/* Fills the window. The minimum height keeps a few rows of sockets in view; shorter
          windows scroll the page instead. */}
      <div className="grid h-full min-h-[800px] grid-cols-[470px_minmax(0,1fr)] gap-5 px-5 pt-[18px] pb-[22px] max-xl:grid-cols-[380px_minmax(0,1fr)] max-xl:gap-3.5 max-xl:p-3.5">
        <GearColumn current={current} />
        <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto]">
          <ResultSheet current={current} preview={preview} />
          <Footer />
        </div>
      </div>
    </Tooltip.Provider>
  );
}
