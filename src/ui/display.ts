import type { Rarity, Tag } from '../catalog/schema.ts';
import type { SlotId } from '../engine/build.ts';
import { type Attribute, BASE_CRITICAL_DAMAGE, type ChromaticTier } from '../engine/derived.ts';
import type { NotCalculatedReason } from '../engine/effects.ts';
import type { PanelStat } from '../engine/simulate.ts';

/**
 * How things look and read in the UI. Kept out of items.json so the catalog stays pure game
 * data. Tag colors are read from screenshots; bone, cold, green, holy and pirate are best guesses
 * until they're checked in the game.
 */
const TAG_COLORS: Readonly<Record<Tag, readonly [background: string, text: string]>> = {
  blue: ['#6b8cf5', '#ffffff'],
  blunt: ['#9b7a63', '#ffffff'],
  bone: ['#e9dfc6', '#3a2f22'],
  brown: ['#8b5a3c', '#ffffff'],
  cloth: ['#b89b6b', '#ffffff'],
  cold: ['#86d4f2', '#11364a'],
  cringe: ['#ff4fb8', '#ffffff'],
  cursed: ['#8a2be2', '#4a1080'],
  dark: ['#4b3f8f', '#ffffff'],
  dutch: ['#dc6d2c', '#ffffff'],
  elegant: ['#7b3fd0', '#ffffff'],
  enchanted: ['#22b24c', '#ffffff'],
  french: ['#1e6fe8', '#ffffff'],
  furry: ['#4e9c99', '#ffffff'],
  gothic: ['#2a2a2e', '#ffffff'],
  green: ['#3dbe3d', '#ffffff'],
  holy: ['#f3dc6b', '#5a4500'],
  hot: ['#fd5234', '#c3271f'],
  leather: ['#a0602a', '#ffffff'],
  mail: ['#a33a43', '#ffffff'],
  metal: ['#8e949c', '#ffffff'],
  orange: ['#f07a1a', '#ffffff'],
  paper: ['#e2b565', '#ffffff'],
  pink: ['#fd257c', '#ffffff'],
  pirate: ['#2fb5a8', '#ffffff'],
  red: ['#e21b1b', '#ffffff'],
  sharp: ['#e8413c', '#ffffff'],
  unholy: ['#8e0e1c', '#ffffff'],
  violet: ['#8a2be2', '#ffffff'],
  white: ['#ffffff', '#111111'],
  wooden: ['#c27a3a', '#ffffff'],
  yellow: ['#edc603', '#ffffff'],
};

interface TagColors {
  readonly background: string;
  readonly color: string;
}

interface TagStyle extends TagColors {
  /**
   * A dimmed chip, for a tag a preview would remove or an empty socket: a paler background with
   * text that's still readable, instead of lowering the opacity of the text too.
   */
  readonly faded: TagColors;
}

/** WCAG relative luminance of a `#rrggbb` color. */
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio of two `#rrggbb` colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** Tag labels are small, so WCAG AA asks for the normal-text contrast. */
const MIN_TAG_CONTRAST = 4.5;

/** `color` drawn at `alpha` over `surface`, as `#rrggbb`. */
function blend(color: string, surface: string, alpha: number): string {
  const channel = (offset: number) => {
    const [top, bottom] = [color, surface].map((hex) =>
      Number.parseInt(hex.slice(offset, offset + 2), 16),
    );
    return Math.round((top ?? 0) * alpha + (bottom ?? 0) * (1 - alpha))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** The light panel color (`--color-well`) that faded chips fade towards. */
const FADE_SURFACE = '#edeafd';

/**
 * Text for a chip: the preferred color where that's readable, else white, ink or black, whichever
 * comes first with enough contrast. Black always has enough where white doesn't.
 */
function readableText(background: string, preferred: string): string {
  return (
    [preferred, '#ffffff', '#1f1535'].find(
      (candidate) => contrastRatio(background, candidate) >= MIN_TAG_CONTRAST,
    ) ?? '#000000'
  );
}

/** The game's chip color, with its own text color where that's readable. */
function tagStyle([background, text]: readonly [string, string]): TagStyle {
  const fadedBackground = blend(background, FADE_SURFACE, 0.5);
  return {
    background,
    color: readableText(background, text),
    faded: { background: fadedBackground, color: readableText(fadedBackground, text) },
  };
}

export const TAG_STYLES = Object.fromEntries(
  Object.entries(TAG_COLORS).map(([tag, colors]) => [tag, tagStyle(colors)]),
) as Readonly<Record<Tag, TagStyle>>;

type RarityLook = Rarity | 'cursed';

interface RarityStyle {
  readonly label: string;
  /** The icon frame and the gem. */
  readonly color: string;
  /** The sunburst behind a slot card. */
  readonly burst: string;
  /** The tooltip header. */
  readonly header: string;
}

export const RARITY_STYLES: Readonly<Record<RarityLook, RarityStyle>> = {
  common: { label: 'Common', color: '#e8e8ee', burst: '#b1accf', header: '#5d5878' },
  uncommon: { label: 'Uncommon', color: '#2fb53a', burst: '#2fb53a', header: '#1f7f2a' },
  rare: { label: 'Rare', color: '#2f8ff0', burst: '#2f8ff0', header: '#1e64b8' },
  epic: { label: 'Epic', color: '#a650f0', burst: '#a650f0', header: '#7434b8' },
  cursed: { label: 'Cursed', color: '#c0263a', burst: '#d8324d', header: '#8c1a2e' },
};

export const SLOT_LABELS: Readonly<Record<SlotId, string>> = {
  mainHand: 'Main hand',
  offHand: 'Off-hand',
  head: 'Head',
  chest: 'Chest',
  legs: 'Legs',
  waist: 'Waist',
  shoulders: 'Shoulders',
  feet: 'Feet',
};

interface StatDisplay {
  readonly label: string;
  readonly unit: '' | '%';
  /** The panel hides a stat at this value, as the game does. */
  readonly defaultValue: number;
}

export const STAT_DISPLAY: Readonly<Record<PanelStat, StatDisplay>> = {
  hp: { label: 'HP', unit: '', defaultValue: 0 },
  base_dps: { label: 'Base DPS', unit: '', defaultValue: 0 },
  stamina: { label: 'Stamina', unit: '', defaultValue: 0 },
  strength: { label: 'Strength', unit: '', defaultValue: 0 },
  agility: { label: 'Agility', unit: '', defaultValue: 0 },
  intelligence: { label: 'Intelligence', unit: '', defaultValue: 0 },
  critical_chance: { label: 'Critical Chance', unit: '%', defaultValue: 0 },
  critical_damage: { label: 'Critical Damage', unit: '%', defaultValue: BASE_CRITICAL_DAMAGE },
  regeneration: { label: 'Regeneration', unit: '', defaultValue: 0 },
  block: { label: 'Block', unit: '%', defaultValue: 0 },
  life_steal: { label: 'Life Steal', unit: '', defaultValue: 0 },
  poison: { label: 'Poison', unit: '', defaultValue: 0 },
  reflected_damage: { label: 'Reflected Damage', unit: '', defaultValue: 0 },
  sneak_attack: { label: 'Sneak Attack', unit: '', defaultValue: 0 },
  stun_chance: { label: 'Stun Chance', unit: '%', defaultValue: 0 },
  item_luck: { label: 'Item Luck', unit: '%', defaultValue: 0 },
  extra_attacks: { label: 'Extra Attacks', unit: '%', defaultValue: 0 },
  loot_gold: { label: 'Coin Loot Chance', unit: '%', defaultValue: 0 },
  damage: { label: 'Damage', unit: '%', defaultValue: 0 },
  melee_damage: { label: 'Melee Damage', unit: '%', defaultValue: 0 },
  ranged_damage: { label: 'Ranged Damage', unit: '%', defaultValue: 0 },
};

interface AttributeClasses {
  /** Text on light surfaces. */
  readonly text: string;
  /** Text on the dark tooltip. */
  readonly light: string;
  readonly bg: string;
}

/** Tailwind classes per attribute, written out in full so Tailwind's scanner finds them. */
export const ATTRIBUTE_CLASSES: Readonly<Record<Attribute, AttributeClasses>> = {
  stamina: { text: 'text-stamina-text', light: 'text-stamina-light', bg: 'bg-stamina' },
  strength: { text: 'text-strength-text', light: 'text-strength-light', bg: 'bg-strength' },
  agility: { text: 'text-agility-text', light: 'text-agility-light', bg: 'bg-agility' },
  intelligence: {
    text: 'text-intelligence-text',
    light: 'text-intelligence-light',
    bg: 'bg-intelligence',
  },
};

export const CHROMATIC_TIER_NAMES: Readonly<Record<ChromaticTier, string>> = {
  none: 'No chromatic bonus',
  bichromatic: 'Bichromatic',
  trichromatic: 'Trichromatic',
};

export const NOT_CALCULATED_REASONS: Readonly<Record<NotCalculatedReason, string>> = {
  missingHealth: 'Depends on missing HP during combat',
  combatEffect: 'Combat effect without a calibrated value',
  damageModifier: 'Shown as a stat, not applied to Base DPS',
  beforeBattle: 'Damage taken before each battle, not a change to max HP',
};
