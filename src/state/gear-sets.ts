import { type Build, EMPTY_SLOTS } from '../engine/build.ts';

/** The three gear sets, shown as "Set 1" to "Set 3". */
export const SET_INDEXES = [0, 1, 2] as const;
export type SetIndex = (typeof SET_INDEXES)[number];

/** One set's gear and sockets. Coins aren't part of a set: all sets share them. */
export type GearSet = Pick<Build, 'slots' | 'sockets'>;
type GearSets = readonly [GearSet, GearSet, GearSet];

export const EMPTY_GEAR_SET: GearSet = { slots: EMPTY_SLOTS, sockets: {} };

/** What's saved: the three sets, the one being edited and the shared coins. */
export interface SavedGear {
  readonly sets: GearSets;
  readonly activeSet: SetIndex;
  readonly coins: number;
}

export const EMPTY_SAVED_GEAR: SavedGear = {
  sets: [EMPTY_GEAR_SET, EMPTY_GEAR_SET, EMPTY_GEAR_SET],
  activeSet: 0,
  coins: 0,
};

/** The set being edited, with the shared coins: the build that gets simulated. */
export function activeBuild({ sets, activeSet, coins }: SavedGear): Build {
  return { ...sets[activeSet], coins };
}
