import { NumberField } from '@base-ui/react/number-field';
import { useId } from 'react';
import {
  equippedCount,
  MAX_SOCKETS,
  SOCKET_TAGS,
  type SocketTag,
  socketTotal,
} from '../../engine/build.ts';
import { useBuildActions, useSlots, useSockets } from '../../state/build-store.ts';
import { CaretIcon } from '../common/icons.tsx';
import { buttonClass, cssVars, cx } from '../common/styles.ts';
import { TAG_STYLES } from '../display.ts';

/** Socket tag counts: up to 8 in total, one per item, any tag except CURSED. */
export function SocketsPanel() {
  const sockets = useSockets();
  const slots = useSlots();
  const { clearSockets } = useBuildActions();
  const total = socketTotal(sockets);
  const items = equippedCount(slots);
  const filled = SOCKET_TAGS.flatMap((tag) => Array<SocketTag>(sockets[tag] ?? 0).fill(tag));
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="flex min-h-0 flex-1 flex-col rounded-[20px] border-3 border-ink bg-sheet px-3 pt-2.5 pb-3 shadow-[0_5px_0_var(--color-ink)] [--focus-ring:var(--color-ink)]"
    >
      <div className="flex flex-none items-center gap-2.5">
        <h2 id={titleId} className="font-display text-[22px] text-outline">
          Sockets
        </h2>
        <span aria-hidden="true" className="ml-0.5 flex gap-[3px] max-xl:hidden">
          {Array.from({ length: MAX_SOCKETS }, (_, index) => {
            const tag = filled[index];
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed positions that never reorder
                key={index}
                className="relative h-[13px] w-[15px] bg-ink clip-hex after:absolute after:inset-0.5 after:bg-(--pip) after:clip-hex"
                style={cssVars({ '--pip': tag ? TAG_STYLES[tag].background : '#d9d4f7' })}
              />
            );
          })}
        </span>
        <span
          aria-live="polite"
          className={cx(
            'text-sm font-bold whitespace-nowrap',
            total >= MAX_SOCKETS ? 'text-curse' : 'text-ink',
          )}
        >
          {total} of {MAX_SOCKETS} sockets
        </span>
        <button
          type="button"
          onClick={clearSockets}
          disabled={total === 0}
          className={cx('ml-auto', buttonClass('plain', 'sm'))}
        >
          Clear all
        </button>
      </div>
      {/* The live region stays mounted so screen readers announce the warning when it appears. */}
      <div role="status">
        {total > items && (
          <p className="mt-2 rounded-[10px] border-2 border-curse bg-curse-bg px-2.5 py-1.5 text-body font-semibold text-curse-text">
            You have {total} sockets but only {items} {items === 1 ? 'item' : 'items'} equipped.
            Each item holds one socket.
          </p>
        )}
      </div>
      <div className="mt-3 grid min-h-0 grid-cols-4 content-start gap-x-1.5 gap-y-[7px] overflow-auto p-0.5 pb-1 max-xl:grid-cols-3">
        {SOCKET_TAGS.map((tag) => (
          <SocketCounter
            key={tag}
            tag={tag}
            count={sockets[tag] ?? 0}
            max={(sockets[tag] ?? 0) + MAX_SOCKETS - total}
          />
        ))}
      </div>
    </section>
  );
}

interface SocketCounterProps {
  tag: SocketTag;
  count: number;
  /** The most this tag can have, given the other sockets. */
  max: number;
}

function SocketCounter({ tag, count, max }: SocketCounterProps) {
  const { setSocket } = useBuildActions();
  const on = count > 0;
  // Empty sockets are faded, so the ones in use stand out.
  const style = on ? TAG_STYLES[tag] : TAG_STYLES[tag].faded;

  return (
    <NumberField.Root
      value={count}
      onValueChange={(value) => setSocket(tag, value ?? 0)}
      min={0}
      max={max}
      step={1}
      className={cx(
        'flex min-w-0 items-center gap-0.5',
        on && 'rounded-lg bg-gold shadow-[0_0_0_3px_var(--color-gold)]',
      )}
    >
      <NumberField.Group
        className={cx(
          'flex h-[27px] min-w-0 flex-auto items-stretch overflow-hidden rounded-[5px] border-2 border-ink text-[11px] font-bold leading-none font-stretch-75% has-focus-visible:outline-3 has-focus-visible:outline-offset-1 has-focus-visible:outline-ink',
          on && 'shadow-ink-sm',
        )}
        style={{ backgroundColor: style.background, color: style.color }}
      >
        <span
          aria-hidden="true"
          className="block min-w-0 flex-1 truncate pr-[3px] pl-[5px] leading-[23px] uppercase"
        >
          {tag}
        </span>
        <NumberField.Input
          aria-label={`${tag.toUpperCase()} sockets`}
          className={cx(
            'w-[22px] border-l-2 border-ink p-0 text-center text-note font-bold outline-none focus-visible:bg-gold-hi focus-visible:text-ink',
            on ? 'bg-ink text-count' : 'bg-[#f3f1fc] text-ink-3',
          )}
        />
      </NumberField.Group>
      <span className="flex flex-none flex-col gap-px">
        <NumberField.Increment
          tabIndex={-1}
          aria-hidden="true"
          className="grid h-3 w-[13px] place-items-center rounded-[3px] text-ink-2 hover:enabled:bg-ink/12 hover:enabled:text-ink disabled:cursor-default disabled:opacity-25"
        >
          <CaretIcon direction="up" className="h-1.5 w-2" />
        </NumberField.Increment>
        <NumberField.Decrement
          tabIndex={-1}
          aria-hidden="true"
          className="grid h-3 w-[13px] place-items-center rounded-[3px] text-ink-2 hover:enabled:bg-ink/12 hover:enabled:text-ink disabled:cursor-default disabled:opacity-25"
        >
          <CaretIcon direction="down" className="h-1.5 w-2" />
        </NumberField.Decrement>
      </span>
    </NumberField.Root>
  );
}
