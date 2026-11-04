import { Select } from '@base-ui/react/select';
import { cx } from './styles.ts';

interface SelectOption<Value> {
  readonly value: Value;
  readonly label: string;
}

const SIZES = {
  sm: 'h-8 text-sm',
  md: 'h-9 text-control',
} as const;

interface SelectFieldProps<Value> {
  /** Read by screen readers; not shown. */
  label: string;
  value: Value;
  /** Null when the selection is cleared. */
  onValueChange: (value: Value | null) => void;
  options: readonly SelectOption<Value>[];
  size?: keyof typeof SIZES;
  /** Width and layout only; size and text come from `size`. */
  className?: string;
}

/** A select in the app's outlined field style. */
export function SelectField<Value>({
  label,
  value,
  onValueChange,
  options,
  size = 'md',
  className,
}: SelectFieldProps<Value>) {
  return (
    <Select.Root items={options} value={value} onValueChange={(next) => onValueChange(next)}>
      <Select.Trigger
        aria-label={label}
        className={cx(
          'flex min-w-0 items-center justify-between gap-2 rounded-[11px] border-3 border-ink bg-white px-2.5 font-semibold',
          SIZES[size],
          className,
        )}
      >
        <Select.Value className="truncate" />
        <Select.Icon>
          <svg viewBox="0 0 10 7" aria-hidden="true" className="h-[7px] w-2.5">
            <path
              d="M1 1l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={4}
          alignItemWithTrigger={false}
          className="z-80 outline-none"
        >
          <Select.Popup className="max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-xl border-3 border-ink bg-white py-1 shadow-ink-md">
            <Select.List>
              {options.map((option) => (
                <Select.Item
                  key={String(option.value)}
                  value={option.value}
                  className="cursor-default px-3 py-1 text-sm font-semibold outline-none select-none data-highlighted:bg-ink data-highlighted:text-white data-selected:font-bold"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
