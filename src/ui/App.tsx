import { Tooltip } from '@base-ui/react/tooltip';
import { useEffect } from 'react';
import { syncAcrossTabs } from '../state/build-store.ts';
import { usePreview, useSimulation } from '../state/simulation.ts';
import { GearColumn } from './gear/GearColumn.tsx';
import { ResultSheet } from './sheet/ResultSheet.tsx';

export function App() {
  const current = useSimulation();
  const preview = usePreview();

  // A change saved in another tab shows up here too.
  useEffect(() => syncAcrossTabs(window), []);

  return (
    <Tooltip.Provider delay={150}>
      <div className="grid h-full min-h-[720px] grid-cols-[470px_minmax(0,1fr)] gap-5 px-5 pt-[18px] pb-[22px] max-xl:grid-cols-[380px_minmax(0,1fr)] max-xl:gap-3.5 max-xl:p-3.5 [@media(max-height:820px)]:min-h-0">
        <GearColumn current={current} />
        <ResultSheet current={current} preview={preview} />
      </div>
    </Tooltip.Provider>
  );
}
