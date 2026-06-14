# Liquid Glass Tabs — npm Package Design Spec

**Date:** 2026-06-14
**Status:** Approved (pending spec review)
**Supersedes/extends:** [2026-06-14-liquid-glass-navbar-design.md] (the original two-navbar build)

## Context

We built two working navbars in this repo: a custom cross-platform `LiquidGlassTabBar`
(tap-based elastic pill) and `NativeLiquidGlassTabBar` (Apple's iOS 26 system tab bar via
Expo Router `NativeTabs`). The user now wants to:

1. Ship it as a **public npm package** (`@<scope>/liquid-glass-tabs`) + a public GitHub repo,
   importable into any of their Expo projects.
2. **Rewrite the Android/custom bar interaction** into a gesture-driven model: quick tap
   selects; press-and-hold detaches the pill to chase the finger with elastic liquid
   deformation; drag moves it live; hold-and-scroll keeps it following while the bar
   minimizes; release over a tab commits. (Matches the iOS feel + the Linear-style drag.)
3. Have **clean, clear documentation**.

The user defers to best practice ("whatever's cleanest"). npm username TBD (email given is not
a username — scope assumed `@omarcshayya`, confirm before publish).

## Goals

- A standard, publishable React Native library (builder-bob, JS-only) with ESM + CJS + types.
- Gesture-driven Android bar (tap + press-hold-drag + elastic stretch + follow-finger + hold-and-scroll).
- iOS native bar reaches parity with the user's working example (`minimizeBehavior`, theme anti-flicker).
- Clear README with install, peer deps, usage for all three exports, and a props reference.
- Reuse existing, working units (`GlassSurface`, `useScrollShrink`, `haptics`) unchanged where possible.

## Flexibility & ease-of-use requirements (consumer-facing)

- **Any icons:** `TabDescriptor.icon` is a render prop `(active, color) => ReactNode` — consumers
  pass Ionicons, custom SVG, `<Image>`, emoji, anything. The lib never hard-codes an icon set.
- **Any number of tabs, including dynamic:** per-tab animated values are computed **inside each
  `TabItem`** (one `useDerivedValue` per instance), never via a hooks-in-a-loop in the parent —
  so changing the tab count at runtime cannot violate the Rules of Hooks. (Native iOS bar still
  inherits Apple's/Material's own limits, e.g. Android caps native tabs at 5.)
- **Light & dark out of the box:** `colorScheme: 'light' | 'dark' | 'system'` (default `system`
  resolves via RN `useColorScheme()`). Default `inactiveColor` adapts to the resolved scheme
  (light secondary vs dark secondary); `accentColor` defaults to iOS blue (legible in both).
- **Minimal required props:** only `tabs`, `activeKey`, `onChange` are required; everything else
  (colors, tint, scroll, gestures) has sensible defaults.

## Non-Goals

- Authoring a native module (we depend on native modules but write none — JS-only library).
- Supporting non-Expo React Native CLI apps for the native bar (NativeTabs is Expo Router only).
- Web support beyond graceful no-op/fallback.
- Publishing without the user's npm/GitHub auth (see Publishing section).

## Architecture

### Repository layout (react-native-builder-bob, JS-only)

Restructure the repo into the standard library + example layout:

```
liquid-glass-tabs/                 # package root (published)
├── src/                           # library source (the current component folder, moved up)
│   ├── index.tsx                  # public exports
│   ├── types.ts
│   ├── LiquidGlassTabBar.tsx      # controlled gesture bar (cross-platform)
│   ├── NativeLiquidGlassTabBar.tsx# iOS Apple NativeTabs wrapper (+ minimizeBehavior, theme)
│   ├── LiquidGlassTabs.tsx        # Expo Router adapter: iOS→native, Android→custom tabBar
│   ├── ElasticPill.tsx            # gesture-driven pill (follow-finger + damped stretch)
│   ├── TabItem.tsx                # icon tint driven by hovered/proximity
│   ├── GlassSurface.tsx           # (reused) native glass + blur fallback
│   ├── useTabBarGestures.ts       # NEW: Pan+LongPress+Tap composition + commit logic
│   ├── useScrollShrink.ts         # (reused) scroll-driven shrink/expand
│   ├── liquidGlass.ts             # NEW: damped elastic-stretch worklet + spring constants
│   └── haptics.ts                 # (reused) selection + crossing haptics
├── example/                       # the Expo demo app (current app/ moves here) — NOT published
│   └── app/ ... (custom-demo, native-demo, landing)
├── package.json                   # name, peerDeps, exports, builder-bob targets, files
├── tsconfig.json, tsconfig.build.json
├── babel.config.js
├── react-native-builder-bob config (in package.json)
├── .npmignore / "files" allowlist
├── README.md                      # the clean docs
├── LICENSE                        # MIT
└── docs/superpowers/...           # specs/plans (not published)
```

builder-bob targets: `module` (ESM), `commonjs` (CJS), `typescript` (.d.ts). `package.json`
`main`/`module`/`types`/`exports` point at `lib/`. `files` allowlist ships only `src` + `lib`.

### Public API (3 exports)

1. **`LiquidGlassTabBar`** — controlled, cross-platform, gesture-driven. Props (extends current
   `LiquidGlassTabBarProps`):
   ```
   tabs, activeKey, onChange, scrollY?, accentColor?, inactiveColor?,
   tintColor?, colorScheme?, bottomInset?,
   enableGestures?: boolean (default true)   // press-hold-drag
   ```
   No router dependency. Works on iOS and Android.

2. **`NativeLiquidGlassTabBar`** — iOS Apple system tab bar via `NativeTabs`. Props:
   ```
   tabs: NativeTabDescriptor[],
   minimizeBehavior?: 'onScrollDown' | 'never' | ...   // native scroll-minimize
   ```
   Used inside an Expo Router `_layout.tsx`. Wrap-with-theme handled internally or documented.

3. **`LiquidGlassTabs`** — Expo Router convenience adapter. One `tabs` config; internally
   `Platform.OS === 'ios'` → `NativeLiquidGlassTabBar`; else → Expo Router JS `Tabs` with
   `tabBar={(p) => <LiquidGlassTabBar .../>}` mapping router state → `activeKey`/`onChange`.
   This is the "pass nothing, get the right bar per platform" path.

### Android gesture model (`useTabBarGestures` + `liquidGlass.ts`)

`useTabBarGestures` builds a `Gesture.Race(Gesture.Tap(), Gesture.Simultaneous(LongPress, Pan))`
and exposes shared values consumed by `ElasticPill`/`TabItem`:

- **State (SharedValues):** `pillCenter`, `pressed` (0..1), `overflowX`, `hoveredIndex`, `touchX`.
- **Tap:** select tapped tab → `onChange`, pill springs to its center, selection haptic.
- **LongPress(0) / Pan start:** `pressed→1`; pill animates toward `touchX` (auto-move to press).
- **Pan update:** `pillCenter` follows clamped `touchX`; compute `hoveredIndex` from x; emit a
  crossing haptic when it changes; compute `overflowX` when finger passes the row edges.
- **Release (onEnd):** commit `hoveredIndex` → `onChange`; `pressed→0`; pill springs to the
  committed tab; overflow relaxes with a bouncy spring.
- **`liquidGlass.ts`** exports a `liquidGlassTransform(pressed, overflowX, overflowY, halfW, halfH)`
  worklet returning a damped translate+scaleX/scaleY (stretch toward drag, compress
  perpendicular) — the elastic feel. Plus `SPRING` / `SPRING_BOUNCY` constants. (Technique
  re-implemented from the no-license Linear reference; no code copied.)

`ElasticPill` reads `pillCenter`/`pressed`/`overflow` and applies `liquidGlassTransform`. When
not pressed, it springs to the active tab's center (current behavior). `TabItem` tint is driven
by `hoveredIndex` (pressed) or proximity to `pillCenter` (resting) — keeps the Telegram cross-fade.

Hold-and-scroll: the existing `useScrollShrink` continues to drive container height from
`scrollY`; the gesture overlays it, so the pill follows the finger while the bar minimizes.

### Data flow

```
GestureDetector (row) ──> useTabBarGestures ──> {pillCenter, pressed, overflowX, hoveredIndex}
  tap/release ──> onChange(key) + haptic
  pillCenter/pressed/overflow ──> ElasticPill (liquidGlassTransform)
  hoveredIndex / pillCenter ──> TabItem tint cross-fade
scrollY ──> useScrollShrink ──> container height (overlays gesture)
LiquidGlassTabs (iOS) ──> NativeLiquidGlassTabBar ; (Android) ──> Expo Router Tabs tabBar ──> LiquidGlassTabBar
```

## Error / edge handling (real cases only)

- `enableGestures={false}` → falls back to pure tap behavior (current implementation path).
- No `scrollY` → no shrink (unchanged).
- Native glass unavailable → `GlassSurface` blur fallback (unchanged).
- Release outside any tab → snap pill back to current active tab, no `onChange`.
- Android > 5 tabs on native path → documented Material limitation (native bar only).
- Haptics unsupported → no-op (unchanged).

## Documentation (README)

Clean, scannable README covering: one-line pitch + GIF placeholder; install (`npm i` + the
`npx expo install` peer-deps line); a "which component?" table (LiquidGlassTabBar vs Native vs
LiquidGlassTabs); minimal usage snippet for each export; full props reference tables; the iOS 26
/ Xcode 26 caveat for real glass; Expo Router requirement for the native/adapter exports;
platform support matrix; license. Keep prose tight (use plain, direct language).

## Testing

- `liquidGlass.ts`: unit-test the transform worklet math (pure function) — stretch grows with
  overflow, compresses perpendicular, clamps at max pull.
- `useTabBarGestures`: unit-test the pure helpers (hovered-index-from-x, clamp, commit decision).
- Components: render tests + `onChange` on tap; regression test for layout/center wiring (as now).
- Full suite must pass; `tsc` clean; `npx expo export` (in `example/`) bundles; `bob build`
  produces `lib/` with `.d.ts`.

## Publishing — what's needed from the user

- **npm username** to set the scope (email is not a username). Default assumption `@omarcshayya`.
- **npm auth** to publish: `npm login` in-session OR an automation token OR the user runs the
  final `npm publish`. The package is built and verified publish-ready regardless.
- **GitHub:** a repo + `gh auth`/token to push, or the user pushes. `LICENSE` (MIT) + README included.
- `npm publish --access public` (scoped packages default to restricted; `--access public` required).

## Phased delivery

1. **Gesture rewrite** of the custom bar (`liquidGlass.ts`, `useTabBarGestures.ts`, update
   `ElasticPill`/`TabItem`/`LiquidGlassTabBar`) + tests, in the current app structure.
2. **iOS parity** (`minimizeBehavior`, theme wrap) on `NativeLiquidGlassTabBar` + `LiquidGlassTabs` adapter.
3. **Package restructure** to builder-bob (root `src/`, `example/` app), package.json/exports/peerDeps, MIT LICENSE.
4. **Docs** (README) + final verification (bob build, types, example bundle).
5. **Publish prep** (dry-run `npm pack`, version 0.1.0) — actual publish gated on user auth.

## Open questions

- Exact npm username/scope (blocks only the final publish, not the build).
