# GOAT gear simulator rules

The game mechanics the simulator implements, measured in the live game (GOAT Steam
demo 0.5.6) and read from item screenshots. Formulas are empirical unless stated
otherwise; §7 lists what the measurements don't cover.

The model reproduces **63 reference cases** measured in the game: 59 stat panels
from Normal and Hard runs, plus four screenshots (a cursed item in §3, a run with
attributes above 2000 in §4, and two Poison Kunai runs in §6). They run as the test suite in
`src/engine/reference-cases.test.ts`. Expected values there are always what the game
showed, never what the engine computed. The cases don't establish every combat
interaction or future game version.

## 1. Product scope

- A gear **stat** simulator: choose equipment and see resulting stats and tags.
  It is not a battle simulator or a validated strongest-build optimizer.
- Eight nullable slots: main hand accepts a weapon; off-hand accepts a weapon
  or shield; head, chest, legs, waist, shoulders, feet accept their own item types.
  A shield cannot occupy the main hand. Dual wielding contributes both weapons.
  The game does not allow the same weapon in both hands.
- Stack: Vite + React SPA, TypeScript, zod (see the README).
- Equipment on the left, stats on the right. No character model. The app keeps
  three unnamed gear sets (own gear and sockets, shared coins); they are a
  simulator convenience, not a game mechanic. Sockets are plain tag counters;
  cursed variants are a per-slot switch (see "Cursed variants" in §3).
- **Missing-HP bonuses are out of scope.** Their catalog data is kept and shown
  as not calculated; there is no HP-percentage input. Fixed max-HP bonuses and
  penalties are in scope.
- Coin-dependent stats are in scope, with a nonnegative integer coin input.
  The measured Normal and Hard cases need no separate difficulty formula.

## 2. Catalog contract

`items.json` and `items.schema.json` define the format: schemaVersion 1, JSON Schema
draft 2020-12. The catalog contains all 228 items in the game.

- Items are sorted by `id`. IDs use lowercase words separated by underscores,
  with apostrophes removed, and must be unique. Each item's icon is
  `public/icons/<id>.webp`.
- Item fields: `id`, `name`, `slot`, `rarity`, `properties`, `weapon`, `effects`,
  `flavorText`. `properties` means the game's tags.
- `weapon` is null for nonweapons; `flavorText` is null when absent.
  `weapon.type` is null when no subtype is printed. `ranged` records an explicit
  ranged label. Choose the scaling attribute from `scalingStat`, not appearance.
- Weapon damage, speed, and `displayedDps` are transcribed tooltip values. Speed is
  seconds between attacks. `displayedDps` matches average base damage / speed
  rounded to one decimal for every catalog weapon; it is not the character's
  Base DPS.
- The one speed that isn't transcribed is Moon Wand's: its tooltip shows 1.3, but
  its 24–30 damage at 21.6 dps only fits 1.25 (27 / 1.3 would be 20.8). The catalog
  stores 1.25; the app shows speeds to one decimal, so it reads 1.3 as in the game.
- Effects have a strict `kind` discriminator. Percentages use whole points:
  15 means 15%, not 0.15. Preserve signs, caps, and conditional structure.
  `text` retains wording without loadout-specific `(now +X)` annotations.
  Empty effects mean no displayed bonuses. Do not invent a magnitude for text
  such as "Extra slow." Duplicate flavor texts can be legitimate.
- Eleven screenshot spot checks and the tooltips seen while measuring found no
  transcription errors. Not every one of the 228 items was checked in the game.

The zod schema in `src/catalog/schema.ts` is the source of truth and generates
`items.schema.json`; it rejects unknown fields and invalid enums. Checks across
fields and items live in `src/catalog/integrity.ts` and run when the app loads the
catalog: unique and sorted IDs, damage.min <= damage.max, and the tooltip-DPS
cross-check. `pnpm catalog:check` additionally checks that every item has an icon and
that `items.schema.json` is current. TypeScript types alone do not validate JSON.

Display metadata (tag colors, stat labels and units) lives in typed tables in
`src/ui/display.ts`. Extra-attack and coin-loot effects become the display stats
`extra_attacks` and `loot_gold` in the engine; projectile, extra-slow and
damage-before-battle effects are kept as descriptive, not-calculated effects. Change
data and schema together.

## 3. Calculation order

Equipped items and sockets → raw tags → global multipliers → grants → summed
effects → effective attributes and chromatic bonuses → derived panel stats.
Missing keys contribute zero unless specified otherwise.

### Tags and grants

Each equipped item contributes **one** count per listed property. Each socket
adds one count of its tag. Multipliers apply globally, including their own item,
and stack **multiplicatively** (e.g. 2×2×2×3×2 = 48).

```text
raw[p] = number of equipped items listing p (×4 for cursed items, see below)
         + one CURSED per cursed item + socket count for p
mult[p] = product of equipped property_count_multiplier values for p (default 1)
baseTags[p] = raw[p] * mult[p]
tags = copy(baseTags)

for each property_grant:
    tags[grantedProperty] += baseTags[sourceProperty] * count * mult[grantedProperty]
```

Source multipliers apply before granting; destination multipliers apply to grants
too. Native plus granted tags add, as do multiple grants into the same tag. Final
tags drive per-property effects and chromatic qualification.

Four catalog grants were measured: GOAT Hood (WHITE → LEATHER), GOAT Hooves
(BONE → LEATHER), Rag Tunic (BONE → PAPER), Battle Mage Belt (BLUE → VIOLET).
Source/destination multiplication was isolated with WHITE/LEATHER and BONE/PAPER,
not independently with BLUE/VIOLET. The other grants were not measured and follow
the same rule: Conveyor Belt (METAL → SHARP, METAL → MAIL) and Jester's Guard
(RED → WHITE, WHITE → RED).

Jester's Guard makes grant cycles and chains possible: its two grants feed each
other, and RED → WHITE → LEATHER chains with GOAT Hood. The model is the single
pass above: every grant reads `baseTags`, never tags added by another grant, so
it stays finite. Example: Jester's Guard with Bloody Belt (MAIL, RED) has RED 2
and WHITE 1 before grants and RED 3, WHITE 3 after. This order fits the run
screenshots, including the Poison Kunai builds in §6, but wasn't independently
isolated; applying the grants one after another would give different counts.

Aggregate socket counts suffice for this global model; their location does not
affect the calculation. Each item holds at most one socket, so a build has at most
eight. Sockets can carry every tag except CURSED. Observed gem mapping: ruby = RED,
crimson round = UNHOLY, white web = CLOTH, amber = ORANGE. The 2026-11-02 run
screenshot (§4) adds white faceted = WHITE and red spiky = SHARP. That was not read
from a tooltip: it is the only socket set that reproduces that run's Stamina and Agility.
The two Poison Kunai runs supplied 2026-11-04 use the same icons: six WHITE and
two SHARP with Scarlet Vest, three WHITE and five SHARP with Vampire Garments.

CURSED occurs on no catalog item. It comes from cursed item variants, not from
sockets.

### Cursed variants

Cursed items are rewards from cursed goats. A cursed item is the normal item with
three changes:

- Each of its own tags counts **4 times** in the raw counts, before global
  multipliers. Example: Cursed Fur Pants (FURRY, WHITE) next to Vampire Garments
  (WHITE counts 3 times) gives WHITE 4 × 3 = 12 and FURRY 4.
- It adds **one CURSED** tag.
- It has a **−20% HP** penalty, the same on every cursed item. Each cursed item
  takes 20 percentage points off the HP multiplier, next to the chromatic bonus
  (§6).

Its other effects match the normal item. The simulator treats "cursed" as a
property of the slot. Whether the same weapon may be equipped in both hands as a
cursed and a normal copy is unknown; the simulator blocks it like any duplicate
weapon.

### Effect accumulation

Let `S[stat]` be the sum of applicable contributions:

| Effect kind | Contribution |
|---|---|
| `stat_bonus` | Add `value` to its stat |
| `stat_per_property` | Add `value * tags[property]` to its stat |
| `stat_per_currency` | Add `min(floor(coins / currencyStep) * value, maxBonus)` |
| `extra_attack_on_hit` | Add `chancePercent` to display stat `extra_attacks` |
| `loot_on_hit` with coin currency | Add `chancePercent` to display stat `loot_gold` |
| `property_count_multiplier`, `property_grant` | Already handled in the tag phase |
| `stat_per_missing_health` | Not calculated (out of scope, §1) |
| `projectile_chance`, `extra_slow` | Preserve descriptive effects; no calibrated numeric DPS contribution |
| `damage_before_battle` | Preserve as descriptive; it lowers the HP a battle starts with, not max HP |

All current coin-loot effects have amount 1. Adding chances reproduces panel
totals, not a tested combat reward distribution. Similarly, summing chance stats
does not establish proc independence or combat caps.

Formal Jacket gives 6 Strength per complete 5 coins, capped at 60: 23 coins gave
24 Strength; 73 coins gave 60. Exact 49/50 readings and other currency items were
not separately tested; use their structured catalog parameters.

## 4. Effective attributes and rounding

The panel displays raw Stamina, Strength, Agility, and Intelligence (`S`). Derived
stats use effective values `E(S)`:

```text
E(x) = roundEven(
    min(x, 100)
    + 0.8 * max(0, min(x - 100, 400))
    + 0.5 * max(0, min(x - 500, 500))
    + 0.2 * max(0, min(x - 1000, 1000))
    + 0.1 * max(0, x - 2000)
)
```

`roundEven` means nearest integer with exact half-ties going to the even integer.
`floor` rounds toward negative infinity; `trunc` rounds toward zero. They differ
for negative values. **Do not clamp attributes to zero.**

The fit gives full value through 100, then marginal rates of 80%, 50%, 20%, and 10%.
Agility 100/101/102/103 produced crit 100/101/102/102 without direct crit bonuses,
supporting the first breakpoint. Adjacent values around 500, 1000, and 2000 were not
isolated, so those exact breakpoint locations remain empirical.

The 10% tier comes from a run screenshot (2026-11-02, trichromatic, no direct crit,
HP, or Strength bonuses): Stamina 2369 gave HP 12352, so E = 907; Agility 3573 gave
crit 1027 and Base DPS 4227.8 with Estoque, so E = 1027. Keeping the 20% rate above
2000 would give 944 and 1185 instead. The two readings put the rate between 9.9% and
10.05% and the breakpoint between 1996 and 2002. Nothing above 3573 has been
observed, so a further tier is possible.

Attribute half-ties were tested: Strength 693 gives 516.5 → 516; Strength 891
gives 615.5 → 616. Both HP and weapon DPS agree. Implement true nearest-even
behavior, including negative inputs. In JavaScript, do not use `lower + lower % 2`
to resolve ties: signed remainder gives incorrect results for negative odd values.
For a half-tie, use `lower % 2 === 0 ? lower : lower + 1`, where
`lower = Math.floor(value)`.

## 5. Chromatic bonuses

Count distinct **final tags** whose count is at least 10:

```text
q = number of tags with tags[p] >= 10
C = 1 + (q >= 2 ? 0.25 : 0) + (q >= 3 ? 0.10 : 0)
```

Live tooltips identify Bichromatic (+25% Damage/HP) and Trichromatic (+10%).
Bonuses add: C is 1, 1.25, or 1.35. More qualifying tags do not add another tier
in this model. Granted tags qualify. Apply C at the stages below, not to final DPS.

## 6. Derived panel stats

### HP

```text
HP = roundEven((80 + 10*E(S.stamina) + E(S.strength) + S.hp) * C)
```

Normal and Hard observations use the same base 80 and coefficients. No separate
Hard constant is needed. Fixed HP additions/penalties apply before C: Vampire
Mantle with Stamina 45 and one WOODEN tag produced `(80+450-30)*1.25 = 625`.

With cursed items, C is replaced by `C - 0.20 * cursedItems` (see "Cursed
variants" in §3). Example: one cursed item in a bichromatic build gives `×1.05`;
two cursed items without a chromatic bonus give `×0.6`. HP has no floor in this
model.
HP half-ties include 4937.5 → 4938 and 5462.5 → 5462. Max-HP penalties are distinct
from missing-health conditions.

### Weapon damage and Base DPS

For each equipped weapon, read its own `scalingStat`:

```text
bonus = trunc(fround(weapon.speed) * (15 + 3*E(S[weapon.scalingStat])))
R = weapon.ranged ? 1 + S.ranged_damage / 100 : 1
hitMin = max(0, roundEven((weapon.damage.min + bonus) * C * R))
hitMax = max(0, roundEven((weapon.damage.max + bonus) * C * R))
weaponDps = (hitMin + hitMax) / (2 * weapon.speed)

BaseDps = sum(weaponDps for both hands)
displayed BaseDps = Math.round(BaseDps * 10) / 10
```

`fround` converts to IEEE-754 binary32 (JavaScript `Math.fround`), promoted back
for remaining arithmetic. Only the bonus uses this conversion; use the catalog
decimal speed in the divisor. This is an empirical precision model, not a reading
of game internals. Speed is seconds between attacks.

Do not round individual weapon DPS before summing. Apply chromatic multiplication
and the ranged-damage multiplier before integer rounding each damage endpoint,
not to final DPS. The same coefficient
3 applies to Strength, Agility, and Intelligence weapons, including the tested
ranged Demonic Jewel. Devil's Fork scales with Intelligence despite its appearance.

Mighty Mallet (speed 2.6) distinguishes the precision rule: Strength 0 gave 53.3
DPS without chromatic and 66.7 with C=1.25; Strength 60 gave 233.3 and 291.5.
Simple decimal multiplication before truncation misses these values. At Agility
-9, Forearm Blade's bonus -7.2 truncates to -7. Beginner's Dagger contributed zero
when its resulting damage was negative. A zero floor on damage fits; mixed-sign
endpoint ordering remains unisolated.

Two Poison Kunai run panels supplied 2026-11-04 calibrate ranged damage. The
catalog matches its tooltip: 36–38 ranged damage, 1.1 speed, Agility scaling,
+22 Poison, and +3% Ranged Dmg. per SHARP. Both runs are trichromatic (C=1.35):

- Reigngames, seed 85266, run 92, Scarlet Vest: SHARP 10 gives +30% ranged
  damage. Agility 1243 gives E=719 and bonus 2389. Damage endpoints become
  4256 and 4259, giving **3870.5 Base DPS**, as shown.
- Tammo, seed 87395, run 36, Vampire Garments: SHARP 16 gives +48% ranged
  damage. Agility 2420 gives E=912 and bonus 3026. Damage endpoints become
  6118 and 6122, giving **5563.6 Base DPS**, as shown. Multiplying DPS after
  endpoint rounding would instead give 5563.5.

Both builds also reproduce every other visible numeric stat. Their ranged-damage
percentages are derived from tags and the item tooltip, not separately displayed
on those run panels. Apply the global bonus to weapons labeled `ranged`, in either
hand; its interaction with a second weapon hasn't been measured independently.

Base DPS is the displayed base weapon rate, not expected combat damage. Do not
fold crits, procs, poison, or uncalibrated `damage`/`melee_damage` effects into it
as though their interactions were tested. Preserve applicable bonus totals
separately. No weapon means zero weapon DPS in this model; unarmed combat is not
modeled.

### Critical chance, critical damage, regeneration

```text
critical_chance = E(S.agility) + S.critical_chance
critical_damage = 100 + S.critical_damage
regeneration = S.regeneration + floor(E(S.intelligence) / 3)
```

Critical chance has no display clamp: negative and >100 values were observed.
Raw Agility 54/220/324/432 gave crit 54/196/279/366 without direct bonuses. This
establishes displayed values, not how combat resolves >100% crit.

Regeneration was measured at Intelligence 0, 4, 6, 7, 10, 20, 35, 50, 328, 636,
1606, and 1884. At Int 6, Rag Tunic added its direct 22 Regen to the derived 2.

### Other stats and display

Other modeled panel stats are accumulated effect totals. Keep percentages in
whole points; hide zero/default rows as the game does. Critical damage's
unmodified default is 100. Hiding defaults must not erase negative values.

The Block tooltip says it reduces incoming attack damage by the block percentage;
with a shield, every hit is blocked; poison and other fixed damage bypass Block.
This is tooltip evidence, not a combat test of shieldless behavior or block caps.
The HP tooltip says HP regenerates after each battle. Combat healing and timing
are outside the stat model.

## 7. Known limitations

- Attribute breakpoints around 500, 1000, and 2000 are fitted, not measured at
  adjacent values. Attributes above 3573 are unobserved.
- The coin cap boundary (49/50 coins) and currency items other than Formal Jacket
  weren't measured separately.
- Battle Mage Belt's source/destination multipliers weren't isolated; it uses the
  grant order measured with the other grants. Grant cycles and chains (Jester's
  Guard, also with GOAT Hood) use the single pass from §3; run screenshots fit it,
  but its order hasn't been independently isolated.
- Binary32 speed is a fit to observed output. Damage endpoint half-ties, mixed-sign
  endpoints, and one-decimal DPS ties weren't isolated.
- Negative attributes are tested, but extreme negatives and an HP floor are not.
  Whether item stars change stats wasn't tested.
- Ranged damage is calibrated on two single-weapon Poison Kunai panels; applying
  it to other ranged weapons and mixed or dual-wield builds follows the tooltip
  classification, without an independent in-game measurement.
- Not modeled: combat (proc timing, crits above 100%, block caps, projectile
  damage, extra slow, other damage modifiers), missing-HP effects (§1), and damage
  taken before battles (Dutch Clogs); the panel shows max HP.
