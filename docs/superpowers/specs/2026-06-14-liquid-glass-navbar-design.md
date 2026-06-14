# Liquid Glass Navbar — Design Spec

**Date:** 2026-06-14
**Status:** Approved (pending spec review)

## Context

The user wants a reusable Apple "Liquid Glass" (iOS 26 design language) navigation bar —
the floating, translucent, frosted tab bar used by Apple, Telegram, and Slack — implemented
in **React Native + Expo (TypeScript)**. It will be copied into many future mobile app
projects, so it must be self-contained and easy to drop in.

This folder is empty; we scaffold a fresh Expo app here both as a runnable demo/playground
and as the home of the reusable component folder.

The user asked for **two** navbars:
1. A cross-platform custom bar (iOS + Android) whose animations we fully control.
2. A native iOS bar that matches Apple **100%**.

Key insight driving the design: the only way to match Apple *exactly* is to render Apple's
**own** system tab bar (real `UIVisualEffectView` material + Apple's morph physics). So the
"100% Apple" bar wraps the OS tab bar; the custom bar re-creates the look/feel so we can own
the elastic-pill and icon-tint behavior on every platform.

## Goals

- A floating-pill, frosted "liquid glass" tab bar, reusable across projects.
- Signature animations on the custom bar:
  - **Elastic pill** that moves toward the tapped tab and stretches in width/height during
    travel, then settles (Apple "liquid" squish).
  - **Icon tint** that lights up as the pill arrives over a tab (Telegram-style).
  - **Scroll shrink/expand**: bar compacts on scroll-down, expands on scroll-up.
  - Press feedback + haptics.
- A separate native bar that is genuinely Apple's iOS 26 liquid glass tab bar.
- Graceful glass fallback so the custom bar looks good on Android and pre-iOS-26.

## Non-Goals

- Specular shimmer/light-sweep animation (deferred; optional polish, not requested).
- Publishing to npm. It's a copy-the-folder component, not a published package.
- Custom theming system beyond a few props (accent/tint/colorScheme).

## Architecture

### Project layout

```
liquid-glass-navbar/
├── app/                              # Expo Router demo app
│   ├── _layout.tsx                   # root stack; entry that links to both demos
│   ├── custom-demo.tsx               # scrollable screen using LiquidGlassTabBar
│   └── native-demo/                  # NativeTabs route group (100% Apple)
│       ├── _layout.tsx               # NativeLiquidGlassTabBar (NativeTabs)
│       └── ...screens
├── components/liquid-glass-navbar/   # THE reusable folder (copy this out)
│   ├── index.ts                      # public exports
│   ├── types.ts                      # Tab, props types
│   ├── LiquidGlassTabBar.tsx         # cross-platform custom bar (orchestrator)
│   ├── GlassSurface.tsx              # glass bg: expo-glass-effect | expo-blur fallback
│   ├── ElasticPill.tsx               # Reanimated elastic moving indicator
│   ├── TabItem.tsx                   # icon + label + color interpolation
│   ├── useScrollShrink.ts            # scroll-driven shrink/expand hook
│   ├── NativeLiquidGlassTabBar.tsx   # iOS-native 100% Apple wrapper (Expo Router NativeTabs)
│   └── haptics.ts                    # thin expo-haptics wrapper (no-op if unavailable)
└── docs/superpowers/specs/           # this spec
```

### Component 1 — `LiquidGlassTabBar` (cross-platform)

Navigation-agnostic, controlled component.

```tsx
<LiquidGlassTabBar
  tabs={[{ key: string, icon: (active, color) => ReactNode, label?: string }]}
  activeKey={string}
  onChange={(key: string) => void}
  scrollY?={SharedValue<number>}   // optional; enables shrink/expand
  accentColor?={string}            // active icon/pill color
  tintColor?={string}              // glass tint
  colorScheme?={'light' | 'dark' | 'system'}
/>
```

Internals:
- **GlassSurface** — the rounded glass background. If `expo-glass-effect`'s
  `isLiquidGlassAvailable()` is true (iOS 26+), render `GlassView` for the real material.
  Otherwise render `expo-blur` `BlurView` + `expo-linear-gradient` border + an inner
  top highlight to approximate the glass. Identical outer box model both ways.
- **ElasticPill** — a `useSharedValue` for pill center-x (and width). On `activeKey` change,
  animate center-x with `withSpring` (low damping → slight overshoot). Width is derived:
  it interpolates *wider* at mid-travel (proportional to travel distance/velocity) then
  relaxes to the resting width → the liquid stretch. Height squishes slightly inversely.
- **TabItem** — renders icon + optional label. Uses `useDerivedValue` + `interpolateColor`
  on the distance between pill center and this tab's center → icon/label color animates
  from inactive to `accentColor` as the pill arrives (Telegram effect). Press-in scales the
  icon down; release triggers `onChange` + haptic.
- **useScrollShrink** — given an optional `scrollY` shared value, derive a 0..1 `compact`
  progress from scroll position/direction. Drives bar height, vertical padding, and label
  opacity via `useAnimatedStyle`. Scroll down → compact; up → expand.
- **haptics** — `selectionAsync()` on tab change; guarded so it no-ops if the module/platform
  doesn't support it.

### Component 2 — `NativeLiquidGlassTabBar` (iOS, 100% Apple)

A thin wrapper over **Expo Router `NativeTabs`** (SDK 54+). Renders the genuine iOS 26 system
liquid glass tab bar — Apple's real material and exact animations. On Android it degrades to
the native Material tab bar. No hand-rolled animation; the OS owns it. Exposes a minimal
`tabs={[{ name, title, icon }]}` style config mapping to native tab screens.

## Dependencies

- `expo` (latest stable SDK with iOS 26 support — 54+), `expo-router`
- `react-native-reanimated` (v4), `react-native-gesture-handler`
- `expo-blur`, `expo-linear-gradient`
- `expo-glass-effect` (native iOS 26 glass; degrades gracefully)
- `expo-haptics`
- An icon set (`@expo/vector-icons`, bundled with Expo) for demo tabs

## Data Flow

```
host screen ──activeKey/onChange──> LiquidGlassTabBar
host ScrollView ──scrollY (SharedValue)──> useScrollShrink ──compact──> bar styles
activeKey change ──> ElasticPill spring (x + width) ──> TabItem color interpolation
tab press ──> onChange + haptics
```

## Error / Edge Handling (only real cases)

- `expo-glass-effect` unavailable or pre-iOS-26 → `GlassSurface` falls back to blur. Detected
  via `isLiquidGlassAvailable()`; no try/catch theater.
- `scrollY` not provided → shrink/expand disabled, bar stays at rest height.
- Empty/!changed `activeKey` → pill stays put (no spurious animation).
- Haptics unsupported → silent no-op.

## Testing / Verification

- `npx expo start`; run the **custom** demo in the iOS simulator and on Android:
  verify elastic pill travel + stretch, icon tint arrival, scroll shrink/expand, haptics,
  and the blur fallback rendering.
- The **true native glass** (`expo-glass-effect` / `NativeTabs`) only shows real refraction on
  an **iOS 26 simulator/device with Xcode 26 + a dev build**. If this machine lacks iOS 26
  tooling, that path renders the fallback locally — this will be flagged, not claimed as
  verified.

## Open Questions

None blocking. Shimmer animation intentionally deferred.
