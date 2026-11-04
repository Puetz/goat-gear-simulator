import type { CSSProperties } from 'react';

/** Sets CSS custom properties through `style`, for colors that come from data. */
export function cssVars(vars: Readonly<Record<`--${string}`, string>>): CSSProperties {
  return vars as CSSProperties;
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const BUTTON_BASE =
  'font-display leading-none tracking-[0.02em] whitespace-nowrap border-ink ' +
  'active:translate-y-0.5 active:shadow-ink-sm disabled:cursor-not-allowed disabled:opacity-45 ' +
  'disabled:active:translate-y-0';

const BUTTON_VARIANTS = {
  plain: 'bg-well-2 text-ink hover:enabled:bg-white',
  orange:
    'bg-linear-to-b from-orange-hi from-0% to-orange to-60% text-white text-outline-thin ' +
    'hover:enabled:from-[#ffb283] hover:enabled:to-[#f88a4e]',
} as const;

const BUTTON_SIZES = {
  sm: 'rounded-[9px] border-2 px-2.5 pt-1 pb-1.5 text-sm shadow-ink-sm',
  md: 'rounded-[11px] border-3 px-3 pt-1.5 pb-[7px] text-control shadow-ink',
} as const;

/** The game's chunky outlined buttons. */
export function buttonClass(
  variant: keyof typeof BUTTON_VARIANTS = 'plain',
  size: keyof typeof BUTTON_SIZES = 'md',
): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]}`;
}
