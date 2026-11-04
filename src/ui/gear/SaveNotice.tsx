import { useSaveActions, useSaveStatus } from '../../state/build-store.ts';
import type { SaveStatus } from '../../state/save-storage.ts';
import { buttonClass } from '../common/styles.ts';

const NOTICES: Readonly<Record<Exclude<SaveStatus, 'saved'>, { text: string; action: string }>> = {
  unreadable: {
    text: "Your saved sets couldn't be loaded. Changes aren't saved until you replace them.",
    action: 'Replace saved sets',
  },
  failing: {
    text: "Changes aren't being saved. The browser's storage may be full or turned off.",
    action: 'Try again',
  },
};

/** Shows when the gear sets aren't being saved, with a way to fix it. */
export function SaveNotice() {
  const status = useSaveStatus();
  const { saveNow } = useSaveActions();
  if (status === 'saved') return null;
  const { text, action } = NOTICES[status];

  return (
    <div className="flex flex-none items-center gap-2.5 rounded-[10px] border-2 border-curse bg-curse-bg py-1.5 pr-1.5 pl-2.5">
      <p role="alert" className="flex-1 text-body font-semibold text-curse-text">
        {text}
      </p>
      <button type="button" onClick={saveNow} className={buttonClass('plain', 'sm')}>
        {action}
      </button>
    </div>
  );
}
