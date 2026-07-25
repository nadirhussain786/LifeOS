# LifeOS Design System

> A calm, spatial operating system for a whole life. Not a trendy UI — a
> premium, trustworthy environment people reach for every day because it lowers
> cognitive load, shows progress honestly, and always answers one question:
> **what should I do next?**

**Interactive companion:** an interactive, theme-aware version of this document
(live contrast ratios, real Sora/Literata specimens, animated rings) is
published at
<https://claude.ai/code/artifact/35dc7583-c05a-4e74-875b-93a6e2401ccf>.

**Where the tokens live (source of truth):**

| Layer | File | Use it for |
|---|---|---|
| CSS variables (HSL) | [`global.css`](../global.css) | The values themselves, light + dark |
| NativeWind classes | [`tailwind.config.js`](../tailwind.config.js) | Screens — `bg-card`, `text-habit`, `shadow-e2`, `rounded-xl` … |
| Native mirror (TS) | [`constants/design-tokens.ts`](../constants/design-tokens.ts) | SVG, StatusBar, Reanimated, gradients — anywhere a className can't reach |
| Color helpers | [`lib/color.ts`](../lib/color.ts) | Deriving gradients / glows / tints from a single module hex |

**Reference implementation:** the dashboard hero
[`features/dashboard/components/today-focus-card.tsx`](../features/dashboard/components/today-focus-card.tsx)
puts the whole system to work in one screen.

Rule of thumb: **prefer the className.** Drop to the TS mirror only when a
className genuinely can't reach the surface.

---

## 1. Philosophy — a Spatial Design System

Depth comes from **layered surfaces, elevation, and whitespace** — never from
neomorphic bevels or skeuomorphic texture. The interface behaves like a quiet
room: content rests on surfaces, rises when you touch it, and settles back.

- **Layered, not decorated.** A three-tier stack — sunken `surface` → resting
  `card` → `raised` element. Hierarchy is read through elevation and contrast,
  not borders and ornament.
- **Calm by default.** Near-grayscale chrome with a whisper of emerald in the
  neutrals. The eye rests until color deliberately directs it.
- **One primary action.** Every screen has a single, obvious next step in the
  brand accent. Everything else recedes.

**What we avoid:** dopamine-baiting badges, autoplay confetti, red notification
bombs, infinite feeds. Reinforcement is gentle and tied to *meaningful*
completion.

The five words the product should always feel like: **Calm · Focused · Premium
· Human · Intelligent.**

---

## 2. UX Principles

Each screen is auditable against these. If a screen breaks one, the *screen* is
wrong — not the rule.

1. **Reduce cognitive load before adding features.** Fewest things needed to
   decide. Summary first, detail on demand.
2. **One primary action per screen.** Exactly one accent CTA. Secondary actions
   are quiet; destructive actions ask twice.
3. **Always answer "what next?"** Empty, completed, and idle states each suggest
   a meaningful next step — never a dead end.
4. **Progress must be honest.** Rings and bars reflect real state. Trust is the
   retention strategy.
5. **Motion clarifies, never entertains.** Every animation explains a spatial
   relationship.
6. **Consistency is kindness.** The same gesture does the same thing everywhere.
7. **Respect the person, not the metric.** No manipulation, no guilt. Missing a
   day is fine and recoverable.

---

## 3. Psychology Rationale

Behavioral science applied to make good habits **easier**, not usage
**compulsive**. We reduce friction toward the user's own goals rather than
engineering cravings.

| Principle | How LifeOS uses it |
|---|---|
| **Progress principle** | Small visible wins are the strongest daily motivator. Rings fill, streaks tick, the day's bar advances. |
| **Goal-gradient effect** | Near-complete rings brighten with a subtle glow, nudging the last step without pressure. |
| **Cognitive load theory** | Whitespace, chunking, and one-action screens keep the UI under the working-memory threshold. |
| **Peak-end + reinforcement** | A gentle haptic + soft ring bloom on meaningful completion — a calm reward, not a slot-machine payout. |
| **Fresh-start effect** | Mornings, Mondays, month turns framed as clean slates. Streaks reset kindly. |
| **Recognition over recall** | Color-coded modules and consistent icons mean users recognize where to go. |

---

## 4. Color System

Spend color like currency: **one brand accent · one signature tint per module ·
a strictly separate semantic set.** Everything else is a near-grayscale neutral
with a faint emerald bias, so chrome reads *chosen*, not clinical.

- **Contrast:** primary text clears **WCAG AAA** on its ground in both themes;
  body text ≥ AA (4.5:1); large text / UI ≥ 3:1.
- **Never color alone:** priority, status and completion always carry an icon,
  label, or shape as well as hue (color-blind safe).

### Core (light)

| Token | Variable | HEX | RGB | HSL |
|---|---|---|---|---|
| Background | `--background` | `#F8FBF9` | `248 251 249` | `140 27% 98%` |
| Surface | `--surface` | `#EEF3F0` | `238 243 240` | `144 17% 94%` |
| Card | `--card` | `#FFFFFF` | `255 255 255` | `0 0% 100%` |
| Foreground | `--foreground` | `#161C19` | `22 28 25` | `150 12% 10%` |
| Muted fg | `--muted-foreground` | `#6D7A74` | `109 122 116` | `152 6% 45%` |
| Accent | `--accent` | `#188B61` | `24 139 97` | `158 71% 32%` |
| Border | `--border` | `#E2E9E5` | `226 233 229` | `146 14% 90%` |

### Core (dark)

| Token | Variable | HEX | RGB | HSL |
|---|---|---|---|---|
| Background | `--background` | `#0E1210` | `14 18 16` | `150 13% 6%` |
| Surface | `--surface` | `#161C19` | `22 28 25` | `150 12% 10%` |
| Card | `--card` | `#1A201D` | `26 32 29` | `150 10% 11%` |
| Foreground | `--foreground` | `#EEF3F0` | `238 243 240` | `144 17% 94%` |
| Muted fg | `--muted-foreground` | `#9AA8A1` | `154 168 161` | `150 7% 63%` |
| Accent | `--accent` | `#47D19F` | `71 209 159` | `158 60% 55%` |
| Border | `--border` | `#2B332E` | `43 51 46` | `142 9% 18%` |

**Psychology of the core:** green = growth & safety → the accent reads as calm
confidence, never alarm. Neutrals carry a subtle emerald hue bias so the
grayscale feels warm and deliberate.

### Semantic — state, never brand

Kept strictly distinct from the accent and module tints, so a red always means
real stakes and a "done" green never reads as "tap me."

| Token | Variable | HEX (light) | RGB | HSL | Purpose |
|---|---|---|---|---|---|
| Success | `--success` | `#16A34A` | `22 163 74` | `142 76% 36%` | Completion, confirmation |
| Warning | `--warning` | `#D97706` | `217 119 6` | `32 95% 44%` | Caution, attention soon |
| Error | `--destructive` | `#DC2626` | `220 38 38` | `0 72% 51%` | Destructive actions, validation |
| Info | `--info` | `#2563EB` | `37 99 235` | `221 83% 53%` | Neutral info, tips |

Dark variants (brightened / desaturated to sit on deep grounds): success
`#4ADE80`, warning `#FBBF24`, error `#F87171`, info `#60A5FA`.

### Module signature tints

One hue per life area, driving that module's progress ring, hero wash and chart
series — **never** chrome. Conceptual map: **cool family** = structure & rest
(calendar, water, sleep, journal); **warm family** = energy & aspiration
(fitness, goals); **emerald** = growth (habits).

| Module | Variable | HEX (light) | HEX (dark) | HSL (light) | Meaning |
|---|---|---|---|---|---|
| Habit | `--habit` | `#10B981` | `#34D399` | `160 84% 39%` | Growth, streaks |
| Calendar | `--calendar` | `#3B82F6` | `#60A5FA` | `217 91% 60%` | Structure, time |
| Water | `--water` | `#06B6D4` | `#22D3EE` | `189 94% 43%` | Hydration, clarity |
| Sleep | `--sleep` | `#6366F1` | `#818CF8` | `239 84% 67%` | Night, rest |
| Journal | `--journal` | `#8B5CF6` | `#A78BFA` | `258 90% 66%` | Reflection |
| Fitness | `--fitness` | `#F97316` | `#FB923C` | `25 95% 53%` | Exertion, energy |
| Goals | `--goals` | `#F43F5E` | `#FB7185` | `350 89% 60%` | Aspiration, achievement |
| Budget | `--budget` | `#0D9488` | `#2DD4BF` | `175 84% 32%` | Balance, ledgers |
| Study | `--study` | `#7C3AED` | `#A78BFA` | `262 83% 58%` | Focus |

Derive a module's full look from its one hex with [`lib/color.ts`](../lib/color.ts):
`tintGradient()` / `tintGradientTriple()` for washes, `glowShadow()` for the
colored elevation, `alpha()` for soft tinted fills.

### Categorical chart palette

Ordered so adjacent series stay distinct at a glance. Feed the row for the
active theme (`chartSeries.light` / `.dark` in the token file):
`emerald → blue → violet → orange → cyan → rose → indigo`. Give an area fill and
an emphasized endpoint the same care as the line.

**Content color-coding** (task categories, note folders) is a separate, small
curated palette in [`constants/theme.ts`](../constants/theme.ts) —
`categoryColorPalette`, `priorityColors` (blue → amber → red ladder), and
`habitDoneColor`.

---

## 5. Typography

**Sora** (geometric humanist sans) carries all chrome. **Literata**
(reading-optimized serif) is reserved for the one place writing should feel
literary: the Journal's own words. The contrast is the point.

| Role | Size / line-height | Weight | Tracking | Notes |
|---|---|---|---|---|
| Display | 40 / 44 | ExtraBold 800 | -0.8 | Splash / big moments |
| H1 | 30 / 36 | ExtraBold 800 | -0.5 | Screen greeting |
| H2 | 24 / 30 | Bold 700 | -0.4 | Section title |
| H3 | 20 / 26 | SemiBold 600 | -0.2 | Sub-section |
| Title | 17 / 24 | SemiBold 600 | -0.1 | Card / list item title |
| Body (lg) | 17 / 26 | Regular 400 | 0 | Comfortable reading |
| Body | 15 / 23 | Regular 400 | 0 | Default |
| Label | 13 / 18 | SemiBold 600 | 0 | Form labels |
| Caption | 12 / 16 | Regular 400 | +0.1 | Metadata |
| Micro | 11 / 14 | Medium 500 | +0.4 | UPPERCASE eyebrows |
| Stat | 34 | ExtraBold 800 | -1.0 | Numeric readouts, **tabular** |

- **Numbers** use `font-variant-numeric: tabular-nums` + tight tracking so stats
  align in columns and don't jitter as they animate.
- **RN caveat:** React Native doesn't synthesize bold from one font file — heavier
  weights need their own class (`font-sora-semibold`, `font-sora-extrabold`, …).
  See the `fontFamily` block in [`tailwind.config.js`](../tailwind.config.js).
- Map named steps to the `Text` component variants: `heading`, `subheading`,
  `muted`, `caption`, `micro` — see [`components/ui/text.tsx`](../components/ui/text.tsx).

---

## 6. Spacing — 8-point rhythm on a 4px base

Every gap, pad, and margin is a multiple of 4 — mostly 8. Consistent rhythm is
what makes a layout feel calm before you can say why.

| Key (× 4px) | px | Common use |
|---|---|---|
| `2` | 8 | Icon ↔ label |
| `3` | 12 | List row gap |
| `4` | 16 | Card padding |
| `5` | 20 | **Screen gutter**, hero padding |
| `6` | 24 | Section gap |
| `8` | 32 | Major separation |
| `10`–`24` | 40–96 | Empty-state / hero vertical space |

Named layout constants (`layout.*` in the token file): screen gutter **20**,
card padding **16**, section gap **24**, tab-bar height **64**, FAB **56**,
minimum touch target **44** (never smaller).

---

## 7. Shape & Depth

**Radius:** `sm 8 · md 12 · lg 16 · xl 20 · 2xl 28 · full 9999`. Pill radius
(`full`) is reserved for buttons, chips, and the FAB — so "fully round" always
signals "tappable action." Cards use `lg`–`2xl`.

**Elevation ladder** (neutral shadows for chrome; swap for `glowShadow(tint)` on
colored surfaces):

| Level | Class | Use |
|---|---|---|
| e0 | — | Flat, on-ground |
| e1 | `shadow-e1` | Resting card |
| e2 | `shadow-e2` | Raised card, hero, FAB |
| e3 | `shadow-e3` | Bottom sheet |
| e4 | `shadow-e4` | Modal / popover |

Native shadow objects (with the matching Android `elevation`) are in
`elevation.e1…e4` in the token file. **On dark, elevation is expressed by
lighter surfaces** (`surface → card → raised`), not just heavier shadow.

---

## 8. Components

Every component ships with **resting, hover/press, focused, and disabled**
states plus a defined radius, elevation, and motion. Interactive things look
interactive; state is encoded in form as well as color.

| Component | File | Notes |
|---|---|---|
| Button | [`components/ui/button.tsx`](../components/ui/button.tsx) | `primary · secondary · ghost · destructive · accent`. Accent paints a gradient + glow. Springs to 0.96 on press. |
| Card | [`components/ui/card.tsx`](../components/ui/card.tsx) | `rounded-lg border bg-card` base surface |
| Text | [`components/ui/text.tsx`](../components/ui/text.tsx) | Type-scale variants |
| Progress ring | [`components/ui/progress-ring.tsx`](../components/ui/progress-ring.tsx) | Signature glowing arc — SVG + gradient, animated sweep |
| Stat tile | [`components/ui/stat-tile.tsx`](../components/ui/stat-tile.tsx) | Tinted icon chip + big value, staggered entrance |
| Hero card | [`components/ui/hero-card.tsx`](../components/ui/hero-card.tsx) | Gradient wash + glow + decorative orbs |
| FAB | [`components/ui/fab.tsx`](../components/ui/fab.tsx) | Accent gradient, 56pt, scale-on-press |
| Tab bar | [`components/ui/tab-bar.tsx`](../components/ui/tab-bar.tsx) | Bottom navigation |
| Section header | [`components/ui/section-header.tsx`](../components/ui/section-header.tsx) | Title + optional action link |

**States at a glance:** focus grows a 4px accent halo on inputs; disabled =
`opacity-40`; pressed = spring scale 0.96; destructive confirms before acting.
**Empty states** always offer the next step and a single accent CTA.
**Loading** uses shimmer skeletons that mirror the real layout — never a spinner
where content will land.

---

## 9. Motion — purpose before decoration

Motion explains space and change: where a sheet came from, how a card expanded,
that a tap registered. Durations stay short; springs feel physical.

| Token | Value | Used for |
|---|---|---|
| `instant` | 100ms | State flips — checkbox, toggle |
| `fast` | 160ms | Press feedback, small fades |
| `base` | 220ms | Most enter/exit, card expand |
| `slow` | 320ms | Page transitions, sheet present |
| `slower` | 480ms | Ring sweeps, celebratory reveals |
| `spring.press` | damping 16 · stiffness 400 | Snappy tap-down (scale 0.96) |
| `spring.release` | damping 12 · stiffness 300 | Soft settle back |
| `spring.gentle` | damping 18 · stiffness 180 | Sheets, reorder |
| `spring.bouncy` | damping 10 · stiffness 220 | Streak celebration **only** |
| `easing.standard` | `cubic-bezier(.2,0,0,1)` | Default enter + exit |

Rings animate **from the last value**, never from zero, so change reads as
change. **All celebratory / non-essential motion is gated behind
`prefers-reduced-motion`** → reduced-motion sees a static checkmark instead of a
bloom.

---

## 10. Accessibility

- **Contrast:** AA for body, AAA for primary text on ground; live-verified in the
  interactive doc.
- **Touch targets:** nothing tappable smaller than 44×44pt, regardless of visual
  size.
- **Never color alone:** state carries icon/label/shape as well as hue.
- **Focus:** every focusable control has a visible 4px accent focus ring.
- **Motion:** respects `prefers-reduced-motion`.
- **Dynamic Type:** font scaling supported; layouts reflow rather than clip.

---

## 11. Dark Mode

Designed twice, not inverted. Grounds deepen to a green-biased near-black
(`#0E1210 → #161C19 → #1A201D → #202723`); module tints lift in lightness and
drop in saturation to stay vivid without glare; shadows do less work while the
raised-surface tier does more. Accent lifts `#188B61 → #47D19F` and pairs with a
dark `#0F241C` foreground so CTAs stay legible.

Driven by NativeWind's `dark:` class strategy (`darkMode: 'class'`) —
see [`hooks/use-color-scheme.ts`](../hooks/use-color-scheme.ts).

---

## 12. Tokens & Implementation

### Usage — NativeWind (preferred)

```tsx
// spatial stack + one accent CTA
<View className="bg-background">
  <View className="bg-card rounded-lg border border-border shadow-e1 p-4">
    <Text className="text-foreground font-sora-semibold">Today</Text>
    <Text className="text-muted-foreground text-sm">3 tasks left</Text>
  </View>
  <ProgressRing color={moduleTint('water', scheme)} gradient />
  <Button variant="accent" label="Log water" />
</View>
```

### Native mirror — `constants/design-tokens.ts`

```ts
const t = tokens('dark');
t.module('habit')      // '#34d399'
t.motion.spring.press  // { damping: 16, stiffness: 400 }
t.elevation.e2         // native shadow object (+ Android elevation)
t.typography.stat      // { size: 34, family: Sora ExtraBold, tracking: -1 }
```

### Recommendations for React Native · NativeWind · Reanimated

- **NativeWind:** keep raw hex out of screens — always go through tokens so a
  retune is one file. Use `dark:` variants; the class strategy is already wired.
- **Reanimated 4:** share the `spring.press` / `release` presets so every
  pressable feels identical. Gate `bouncy` celebrations behind a reduced-motion
  check.
- **react-native-svg rings:** feed `ProgressRing` a module tint + `gradient` —
  it already embodies the signature glowing arc via `tintGradient()`.
- **Android elevation:** pair each `shadow-*` with the matching `elevation`
  value from the token's native object; shadows render differently per platform.

---

*This system extends LifeOS's existing language (emerald accent, Sora/Literata,
gradient rings) rather than replacing it. Keep `global.css`,
`tailwind.config.js`, and `constants/design-tokens.ts` in sync when values
change.*
