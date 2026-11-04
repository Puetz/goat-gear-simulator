import { describe, expect, test } from 'vitest';
import { catalog } from '../catalog/items.ts';
import { type Build, canEquip, EMPTY_SLOTS, type SlotId } from './build.ts';
import { type Candidate, evaluateCandidates } from './candidates.ts';
import { simulate } from './simulate.ts';

/**
 * Equip rules (RULES.md §1) and cursed rules (RULES.md §3).
 * Expected values follow from those rules, never from running the engine.
 */

function build(slots: Partial<Record<SlotId, string | [string, 'cursed']>>, sockets = {}): Build {
  const filled = { ...EMPTY_SLOTS };
  for (const [slot, entry] of Object.entries(slots) as [SlotId, string | [string, 'cursed']][]) {
    filled[slot] =
      typeof entry === 'string'
        ? { itemId: entry, cursed: false }
        : { itemId: entry[0], cursed: true };
  }
  return { slots: filled, sockets, coins: 0 };
}

function item(id: string) {
  const found = catalog.byId.get(id);
  if (!found) throw new Error(`Unknown item ${id}`);
  return found;
}

function candidate(candidates: Candidate[], id: string): Candidate {
  const found = candidates.find((entry) => entry.item.id === id);
  if (!found) throw new Error(`No candidate ${id}`);
  return found;
}

describe('equip rules', () => {
  test.each<[string, SlotId, string, boolean]>([
    ['a weapon in the main hand', 'mainHand', 'pro_gamer_knife', true],
    ['a shield in the off-hand', 'offHand', 'orange_guard', true],
    ['a shield in the main hand', 'mainHand', 'orange_guard', false],
    ['legs in the head slot', 'head', 'fur_pants', false],
    ['the main-hand weapon again in the off-hand', 'offHand', 'pro_gamer_knife', false],
  ])('%s: %s', (_, slot, id, allowed) => {
    expect(canEquip(build({ mainHand: 'pro_gamer_knife' }), slot, item(id))).toBe(allowed);
  });
});

describe('picker candidates', () => {
  const current = build({
    mainHand: 'pro_gamer_knife',
    offHand: 'wee_remote',
    legs: ['fur_pants', 'cursed'],
  });
  const result = simulate(current, catalog);

  test('the off-hand offers every weapon and shield, with the main-hand weapon blocked', () => {
    const candidates = evaluateCandidates(current, 'offHand', result, catalog);
    expect(candidates).toHaveLength(catalog.bySlot.weapon.length + catalog.bySlot.shield.length);
    expect(candidate(candidates, 'pro_gamer_knife')).toMatchObject({
      allowed: false,
      blockedBy: 'mainHand',
    });
  });

  test('the equipped item reuses the current result and changes nothing', () => {
    const equipped = candidate(
      evaluateCandidates(current, 'offHand', result, catalog),
      'wee_remote',
    );
    expect(equipped).toMatchObject({ allowed: true, equipped: true, delta: {} });
    expect(equipped.allowed && equipped.result).toBe(result);
  });

  test('a cursed slot previews the cursed variant: its own tags ×4', () => {
    // Rag Legwraps (PAPER, UNHOLY, WHITE) replacing Fur Pants (FURRY, WHITE), both cursed.
    const swap = candidate(evaluateCandidates(current, 'legs', result, catalog), 'rag_legwraps');
    const tags = swap.allowed ? swap.result.tags.final : {};
    expect([tags.paper, tags.unholy, tags.furry ?? 0]).toEqual([4, 4, 0]);
  });
});

describe('tag sources', () => {
  test('a cursed item adds its tags ×4 and one CURSED; sockets add their own count', () => {
    const { tags } = simulate(build({ legs: ['fur_pants', 'cursed'] }, { white: 2 }), catalog);
    expect(tags.sources.white?.map(({ kind, count }) => [kind, count])).toEqual([
      ['item', 4],
      ['sockets', 2],
    ]);
    expect(tags.sources.cursed?.map(({ kind, count }) => [kind, count])).toEqual([['curse', 1]]);
    expect(tags.final).toMatchObject({ white: 6, furry: 4, cursed: 1 });
  });

  test('a grant reads the multiplied source and records how much it added', () => {
    // GOAT Hooves (BONE, FURRY, WHITE): BONE also adds 1 LEATHER. Bone Belt (BONE, BROWN):
    // BONE counts 2 times. Raw BONE = 1 + 1 + 2 sockets = 4, so 8 BONE add 8 LEATHER.
    const { tags } = simulate(
      build({ feet: 'goat_hooves', waist: 'bone_belt' }, { bone: 2 }),
      catalog,
    );
    expect(tags.rules).toContainEqual(
      expect.objectContaining({ kind: 'grant', from: 'bone', to: 'leather', added: 8 }),
    );
    expect(tags.final).toMatchObject({ bone: 8, leather: 8 });
  });

  test('one source tag can feed two grants', () => {
    // Conveyor Belt (METAL, DARK): each METAL also adds 1 SHARP and 1 MAIL.
    // Raw METAL = 1 + 2 sockets = 3.
    const { tags } = simulate(build({ waist: 'conveyor_belt' }, { metal: 2 }), catalog);
    expect(tags.final).toMatchObject({ metal: 3, sharp: 3, mail: 3 });
  });

  test('grants read the counts from before any grant, so a grant loop runs once', () => {
    // Jester's Guard (RED, WHITE, CRINGE): each RED also adds 1 WHITE, each WHITE adds 1 RED.
    // With Bloody Belt (MAIL, RED), RED = 2 and WHITE = 1 before grants.
    const { tags } = simulate(build({ offHand: 'jesters_guard', waist: 'bloody_belt' }), catalog);
    expect(tags.final).toMatchObject({ red: 3, white: 3 });
  });
});

describe('coin effects', () => {
  // Pro Gamer Knife: +5 Agility per 5 coins owned (max. 50).
  test.each<[number, number, boolean]>([
    [45, 45, false],
    [50, 50, true],
    [55, 50, true],
  ])('%i coins give %i Agility, at the cap: %s', (coins, agility, capped) => {
    const { effects } = simulate({ ...build({ mainHand: 'pro_gamer_knife' }), coins }, catalog);
    expect(effects.contributions.agility).toMatchObject([
      { value: agility, detail: { kind: 'perCoins', coins, capped } },
    ]);
  });
});

describe('cursed HP penalty', () => {
  // Each cursed item adds −20 points to the HP multiplier, next to the chromatic bonus.
  // Fur Pants (FURRY, WHITE): +1 Stamina for each worn WHITE. Vampire Garments: +9 Stamina,
  // WHITE counts 3 times.
  test.each<[string, Build, number, number]>([
    // WHITE 4 gives Stamina 4: (80 + 40) × 0.8.
    ['one cursed item', build({ legs: ['fur_pants', 'cursed'] }), 0.8, 96],
    // WHITE 12, every other tag 4, so no chromatic bonus. Stamina 21: (80 + 210) × 0.6.
    [
      'two cursed items',
      build({ chest: ['vampire_garments', 'cursed'], legs: ['fur_pants', 'cursed'] }),
      0.6,
      174,
    ],
    // WHITE 12 and FURRY 4 + 6 sockets are bichromatic. (80 + 210) × 1.05 = 304.5 goes to even.
    [
      'one cursed item with a chromatic bonus',
      build({ chest: 'vampire_garments', legs: ['fur_pants', 'cursed'] }, { furry: 6 }),
      1.05,
      304,
    ],
  ])('%s', (_, current, multiplier, hp) => {
    const result = simulate(current, catalog);
    expect(result.hp.multiplier).toBe(multiplier);
    expect(result.panel.hp).toBe(hp);
  });
});

describe('not calculated', () => {
  test('ranged damage scales with tags and stays separate from Base DPS', () => {
    const slots = { mainHand: 'poison_kunai' };
    const plain = simulate(build(slots), catalog);
    const withSharp = simulate(build(slots, { sharp: 2 }), catalog);

    expect(plain.panel.ranged_damage).toBe(3);
    expect(withSharp.panel.ranged_damage).toBe(9);
    expect(withSharp.panel.base_dps).toBe(plain.panel.base_dps);
    expect(withSharp.effects.contributions.ranged_damage).toMatchObject([
      { value: 9, detail: { kind: 'perTag', tag: 'sharp', tagCount: 3 } },
    ]);
    expect(withSharp.effects.notCalculated).toContainEqual(
      expect.objectContaining({ slot: 'mainHand', reason: 'damageModifier' }),
    );
  });

  test('lists missing-HP, combat, damage and before-battle effects, not the cursed penalty', () => {
    const { effects } = simulate(
      build({
        mainHand: 'goatmares_hand',
        offHand: 'wee_remote',
        chest: 'cardboard_armor',
        legs: ['neon_leggings', 'cursed'],
        feet: 'dutch_clogs',
      }),
      catalog,
    );
    expect(effects.notCalculated.map(({ slot, reason }) => [slot, reason])).toEqual([
      ['mainHand', 'combatEffect'],
      ['offHand', 'combatEffect'],
      ['chest', 'missingHealth'],
      ['legs', 'damageModifier'],
      ['feet', 'beforeBattle'],
    ]);
  });
});
