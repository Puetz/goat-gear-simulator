import { Component, type ReactNode } from 'react';
import { SAVE_KEY } from '../state/save-key.ts';
import { buttonClass } from './common/styles.ts';
import { ErrorScreen } from './ErrorScreen.tsx';

/** A saved set that makes the app crash would do it again after every reload. */
function deleteSaveAndReload() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // The browser blocks storage, so there's no save to delete.
  }
  location.reload();
}

/** Shown when the app fails, with a way out that doesn't need the browser's site settings. */
export function CrashScreen({ title, error }: { title: string; error: unknown }) {
  return (
    <ErrorScreen
      title={title}
      intro="Reload the page to try again. If it keeps happening, deleting your saved gear sets may help. This is the error:"
      problems={[String(error)]}
    >
      <button type="button" onClick={() => location.reload()} className={buttonClass('orange')}>
        Reload
      </button>
      <button type="button" onClick={deleteSaveAndReload} className={buttonClass('plain')}>
        Delete saved sets and reload
      </button>
    </ErrorScreen>
  );
}

/**
 * Catches an error while the app renders, so a crash shows the crash screen instead of a blank
 * page. React logs the error to the console.
 */
export class CrashBoundary extends Component<{ children: ReactNode }, { error?: unknown }> {
  override state: { error?: unknown } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override render() {
    return 'error' in this.state ? (
      <CrashScreen title="Something went wrong" error={this.state.error} />
    ) : (
      this.props.children
    );
  }
}
