import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { equippedCount } from '../../engine/build.ts';
import { useActiveSet, useBuildActions, useSlots } from '../../state/build-store.ts';
import { SET_INDEXES } from '../../state/gear-sets.ts';
import { buttonClass, cx } from '../common/styles.ts';

/** Switches between the three gear sets, and clears the active set's gear. */
export function GearSetBar() {
  const activeSet = useActiveSet();
  const slots = useSlots();
  const { selectSet, clearGear } = useBuildActions();

  return (
    <div className="flex flex-none items-center gap-2">
      <ToggleGroup
        aria-label="Gear set"
        value={[String(activeSet)]}
        onValueChange={([pressed]) => {
          // Pressing the active set would leave none selected, so that change is ignored.
          const index = SET_INDEXES.find((candidate) => String(candidate) === pressed);
          if (index !== undefined) selectSet(index);
        }}
        className="flex gap-2"
      >
        {SET_INDEXES.map((index) => (
          <Toggle
            key={index}
            value={String(index)}
            className={buttonClass(index === activeSet ? 'orange' : 'plain', 'sm')}
          >
            Set {index + 1}
          </Toggle>
        ))}
      </ToggleGroup>
      <button
        type="button"
        onClick={clearGear}
        disabled={equippedCount(slots) === 0}
        className={cx('ml-auto', buttonClass('plain', 'sm'))}
      >
        Clear gear
      </button>
    </div>
  );
}
