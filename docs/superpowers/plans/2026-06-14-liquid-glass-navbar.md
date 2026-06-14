# Liquid Glass Navbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two reusable Expo navbars in this folder — a cross-platform custom "liquid glass" tab bar (elastic moving pill + Telegram-style icon tint + scroll shrink/expand) and a native iOS bar wrapping Apple's own iOS 26 system liquid glass tab bar — inside a runnable demo app.

**Architecture:** Scaffold an Expo Router (TypeScript) app. The reusable component lives in `components/liquid-glass-navbar/` (copy-the-folder distribution). The custom bar is composed from small focused units: a `GlassSurface` (real `expo-glass-effect` on iOS 26+, `expo-blur` fallback elsewhere), an `ElasticPill` (Reanimated indicator that travels and squishes), `TabItem`s (cross-fade icon/label tint), and a `useScrollShrink` hook. The native bar is a thin wrapper over Expo Router `NativeTabs`.

**Tech Stack:** Expo SDK 54+ (Expo Router), TypeScript, React Native Reanimated 4 (+ react-native-worklets), react-native-gesture-handler, expo-blur, expo-linear-gradient, expo-glass-effect, expo-haptics, jest-expo + @testing-library/react-native.

---

## File Structure

```
liquid-glass-navbar/
├── app/                                  # Expo Router routes (demo app)
│   ├── _layout.tsx                       # root Stack
│   ├── index.tsx                         # landing: links to both demos
│   ├── custom-demo.tsx                   # scroll screen using LiquidGlassTabBar
│   └── native-demo/
│       ├── _layout.tsx                   # NativeLiquidGlassTabBar (NativeTabs)
│       ├── index.tsx                     # native tab 1
│       ├── search.tsx                    # native tab 2
│       └── profile.tsx                   # native tab 3
├── components/liquid-glass-navbar/       # THE reusable folder
│   ├── index.ts                          # public exports
│   ├── types.ts
│   ├── haptics.ts
│   ├── GlassSurface.tsx
│   ├── TabItem.tsx
│   ├── ElasticPill.tsx
│   ├── useScrollShrink.ts
│   ├── LiquidGlassTabBar.tsx
│   └── NativeLiquidGlassTabBar.tsx
├── __tests__/                            # unit tests
│   ├── GlassSurface.test.tsx
│   ├── TabItem.test.tsx
│   ├── useScrollShrink.test.tsx
│   └── LiquidGlassTabBar.test.tsx
├── jest.setup.js
└── (standard Expo config files)
```

---

## Task 1: Scaffold Expo app and install dependencies

**Files:**
- Create: entire Expo project in repo root (preserving existing `docs/`, `.git/`, `.gitignore`)
- Modify: `babel.config.js`, `.gitignore`, `package.json`

- [ ] **Step 1: Scaffold into a temp dir, then move into root**

The repo root is non-empty (`.git/`, `docs/`, `.gitignore`, `.superpowers/`), so scaffold in a subdir and lift the files up.

```bash
npx create-expo-app@latest _scaffold --template default --no-install
# move everything (including dotfiles) except its .git into the repo root
shopt -s dotglob
mv _scaffold/* .
shopt -u dotglob
rm -rf _scaffold/.git _scaffold
```

Expected: root now has `app/`, `package.json`, `app.json`, `tsconfig.json`, `babel.config.js` (or none yet), etc. If `create-expo-app` overwrote `.gitignore`, re-add the brainstorm ignore in Step 5.

- [ ] **Step 2: Remove the template's starter routes we will replace**

```bash
rm -rf app/* components/* constants/ hooks/ scripts/ 2>/dev/null || true
mkdir -p components/liquid-glass-navbar __tests__
```

Expected: `app/` and `components/` are empty and ready for our files.

- [ ] **Step 3: Install runtime dependencies**

```bash
npx expo install react-native-reanimated react-native-gesture-handler \
  react-native-worklets expo-blur expo-linear-gradient expo-glass-effect \
  expo-haptics react-native-safe-area-context
```

Expected: all packages added to `package.json` with Expo-compatible versions.

- [ ] **Step 4: Install dev/test dependencies**

```bash
npm install --save-dev jest jest-expo @testing-library/react-native @types/jest react-test-renderer
```

- [ ] **Step 5: Configure Babel, Jest, and .gitignore**

Create/overwrite `babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 uses the worklets plugin; it MUST be last.
    plugins: ['react-native-worklets/plugin'],
  };
};
```

Create `jest.setup.js`:

```js
// Silence/native-mock Reanimated for jest.
require('react-native-reanimated').setUpTests?.();
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));
```

Add to `package.json` (merge, don't clobber existing keys):

```json
{
  "scripts": {
    "test": "jest",
    "start": "expo start",
    "ios": "expo run:ios",
    "android": "expo run:android"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-worklets|react-native-gesture-handler))"
    ]
  }
}
```

Ensure `.gitignore` still contains the brainstorm + Expo ignores (re-add if Step 1 overwrote it):

```
.superpowers/
node_modules/
.expo/
dist/
web-build/
*.log
.DS_Store
ios/
android/
```

- [ ] **Step 6: Verify the toolchain runs**

Run: `npx tsc --noEmit`
Expected: no type errors (empty `app/` may warn about no routes — that's fine; we add routes next).

Run: `npm test -- --passWithNoTests`
Expected: Jest boots, exits 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo app and install liquid-glass deps"
```

---

## Task 2: Types and public exports

**Files:**
- Create: `components/liquid-glass-navbar/types.ts`
- Create: `components/liquid-glass-navbar/index.ts`

- [ ] **Step 1: Write `types.ts`**

```ts
import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export type ColorSchemePref = 'light' | 'dark' | 'system';

export interface TabDescriptor {
  /** Stable unique key, also used by onChange. */
  key: string;
  /** Optional label under the icon. */
  label?: string;
  /**
   * Render the icon. `active` lets you swap filled/outline variants;
   * `color` is the resolved tint for the current state.
   */
  icon: (active: boolean, color: string) => ReactNode;
}

export interface LiquidGlassTabBarProps {
  tabs: TabDescriptor[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Optional scroll position; when provided, enables shrink/expand. */
  scrollY?: SharedValue<number>;
  /** Active icon/label + pill color. Default '#0A84FF'. */
  accentColor?: string;
  /** Inactive icon/label color. Default 'rgba(60,60,67,0.6)'. */
  inactiveColor?: string;
  /** Glass tint color. */
  tintColor?: string;
  colorScheme?: ColorSchemePref;
  /** Bottom inset (e.g. safe area). Default 0. */
  bottomInset?: number;
}

export interface NativeTabDescriptor {
  /** Must match the Expo Router route file name. */
  name: string;
  title: string;
  /** SF Symbol name (iOS). */
  sf: string;
  /** Material icon name (Android). */
  md: string;
}
```

- [ ] **Step 2: Write `index.ts` (exports added as files are created; start with types)**

```ts
export * from './types';
export { LiquidGlassTabBar } from './LiquidGlassTabBar';
export { NativeLiquidGlassTabBar } from './NativeLiquidGlassTabBar';
export { GlassSurface } from './GlassSurface';
export { useScrollShrink } from './useScrollShrink';
```

(Type-check will fail until later tasks create those files — that's expected; we don't run tsc here.)

- [ ] **Step 3: Commit**

```bash
git add components/liquid-glass-navbar/types.ts components/liquid-glass-navbar/index.ts
git commit -m "feat: liquid glass navbar types and export surface"
```

---

## Task 3: Haptics helper

**Files:**
- Create: `components/liquid-glass-navbar/haptics.ts`

- [ ] **Step 1: Write `haptics.ts`**

```ts
import * as Haptics from 'expo-haptics';

/** Fire a selection tick on tab change. No-ops if unsupported. */
export function tabSelectionHaptic(): void {
  try {
    Haptics.selectionAsync();
  } catch {
    // haptics unavailable (web / unsupported device) — ignore
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/liquid-glass-navbar/haptics.ts
git commit -m "feat: haptics helper for tab selection"
```

---

## Task 4: GlassSurface (native glass + blur fallback)

**Files:**
- Create: `components/liquid-glass-navbar/GlassSurface.tsx`
- Test: `__tests__/GlassSurface.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('expo-glass-effect', () => ({
  isLiquidGlassAvailable: () => false,
  GlassView: () => null,
}));

import { GlassSurface } from '../components/liquid-glass-navbar/GlassSurface';

test('renders children and falls back to blur when native glass unavailable', () => {
  const { getByText, getByTestId } = render(
    <GlassSurface testID="surface" borderRadius={20}>
      <Text>tabs</Text>
    </GlassSurface>
  );
  expect(getByText('tabs')).toBeTruthy();
  expect(getByTestId('surface-blur-fallback')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- GlassSurface`
Expected: FAIL — cannot find module `GlassSurface`.

- [ ] **Step 3: Implement `GlassSurface.tsx`**

```tsx
import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ColorSchemePref } from './types';

interface Props {
  children: React.ReactNode;
  borderRadius: number;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
  colorScheme?: ColorSchemePref;
  testID?: string;
}

/**
 * Rounded glass background. Uses the real iOS 26 material via expo-glass-effect
 * when available; otherwise approximates it with a blur + gradient border + top highlight.
 */
export function GlassSurface({
  children,
  borderRadius,
  style,
  tintColor,
  colorScheme = 'system',
  testID,
}: Props) {
  const native = isLiquidGlassAvailable();

  if (native) {
    return (
      <GlassView
        testID={testID ? `${testID}-glass` : undefined}
        glassEffectStyle="regular"
        isInteractive
        tintColor={tintColor}
        colorScheme={colorScheme === 'system' ? 'auto' : colorScheme}
        style={[{ borderRadius, overflow: 'hidden' }, style]}
      >
        {children}
      </GlassView>
    );
  }

  const blurTint = colorScheme === 'dark' ? 'dark' : 'light';
  return (
    <View
      testID={testID ? `${testID}-blur-fallback` : undefined}
      style={[{ borderRadius, overflow: 'hidden' }, styles.fallbackShadow, style]}
    >
      <BlurView intensity={50} tint={blurTint} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View pointerEvents="none" style={[styles.hairline, { borderRadius }]} />
      {tintColor ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tintColor }]} />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  hairline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.6)',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- GlassSurface`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/liquid-glass-navbar/GlassSurface.tsx __tests__/GlassSurface.test.tsx
git commit -m "feat: GlassSurface with native glass + blur fallback"
```

---

## Task 5: TabItem (icon/label with Telegram-style tint cross-fade)

**Files:**
- Create: `components/liquid-glass-navbar/TabItem.tsx`
- Test: `__tests__/TabItem.test.tsx`

The active tint is achieved by stacking an inactive-colored icon and an active-colored icon and animating the active one's opacity from how close the pill is (`proximity`, a 0..1 SharedValue owned by the parent). This avoids the difficulty of animating vector-icon color directly.

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { TabItem } from '../components/liquid-glass-navbar/TabItem';

function Harness({ onPress }: { onPress: () => void }) {
  const proximity = useSharedValue(0);
  return (
    <TabItem
      tab={{ key: 'home', label: 'Home', icon: (active, color) => <Text>{active ? 'on' : 'off'}:{color}</Text> }}
      proximity={proximity}
      accentColor="#0A84FF"
      inactiveColor="#888"
      onPress={onPress}
      onLayoutCenter={() => {}}
    />
  );
}

test('fires onPress when tapped', () => {
  const onPress = jest.fn();
  const { getByRole } = render(<Harness onPress={onPress} />);
  fireEvent.press(getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- TabItem`
Expected: FAIL — cannot find module `TabItem`.

- [ ] **Step 3: Implement `TabItem.tsx`**

```tsx
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { TabDescriptor } from './types';

interface Props {
  tab: TabDescriptor;
  /** 0..1 — how centered the moving pill is over this tab. */
  proximity: SharedValue<number>;
  accentColor: string;
  inactiveColor: string;
  onPress: () => void;
  /** Reports this tab's horizontal center (relative to the row) once laid out. */
  onLayoutCenter: (centerX: number) => void;
}

export function TabItem({ tab, proximity, accentColor, inactiveColor, onPress, onLayoutCenter }: Props) {
  const pressScale = useSharedValue(1);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      onLayoutCenter(x + width / 2);
    },
    [onLayoutCenter]
  );

  const activeLayer = useAnimatedStyle(() => ({ opacity: proximity.value }));
  const inactiveLayer = useAnimatedStyle(() => ({ opacity: 1 - proximity.value }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      onLayout={onLayout}
      onPressIn={() => (pressScale.value = withTiming(0.86, { duration: 90 }))}
      onPressOut={() => (pressScale.value = withTiming(1, { duration: 140 }))}
      onPress={onPress}
      style={styles.item}
    >
      <Animated.View style={scaleStyle}>
        <View style={styles.iconStack}>
          <Animated.View style={inactiveLayer}>{tab.icon(false, inactiveColor)}</Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, activeLayer]}>
            {tab.icon(true, accentColor)}
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  iconStack: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
```

> Note: labels are intentionally omitted from the icon stack to keep the resting bar compact; the `label` field stays in the type for callers who want it and can be rendered by extending `tab.icon`. (YAGNI — add a label row only if the demo shows it's needed.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- TabItem`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/liquid-glass-navbar/TabItem.tsx __tests__/TabItem.test.tsx
git commit -m "feat: TabItem with proximity-driven tint cross-fade"
```

---

## Task 6: ElasticPill (Reanimated moving + squishing indicator)

**Files:**
- Create: `components/liquid-glass-navbar/ElasticPill.tsx`

This is a purely visual component; verification is via the demo app. We add a render smoke test only.

- [ ] **Step 1: Implement `ElasticPill.tsx`**

```tsx
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

interface Props {
  /** Target center-x of the active tab, in row coordinates. */
  targetCenterX: number;
  width: number;
  height: number;
  color: string;
  /** Shared output: live pill center-x, consumed by TabItems for proximity. */
  centerXOut: SharedValue<number>;
}

const SPRING = { damping: 14, stiffness: 180, mass: 0.9 } as const;

/**
 * Pill that springs toward the active tab and squishes (stretch in X, compress in Y)
 * during travel, then relaxes — the "liquid" feel.
 */
export function ElasticPill({ targetCenterX, width, height, color, centerXOut }: Props) {
  const centerX = useSharedValue(targetCenterX);
  const squish = useSharedValue(0); // 0 rest .. 1 mid-travel

  useEffect(() => {
    // squish out then back while the spring travels
    squish.value = withSequence(
      withTiming(1, { duration: 130 }),
      withTiming(0, { duration: 240 })
    );
    centerX.value = withSpring(targetCenterX, SPRING);
  }, [targetCenterX, centerX, squish]);

  // keep parent's shared center in sync for proximity calc
  useAnimatedStyle(() => {
    centerXOut.value = centerX.value;
    return {};
  });

  const style = useAnimatedStyle(() => ({
    width,
    height,
    borderRadius: height / 2,
    backgroundColor: color,
    transform: [
      { translateX: centerX.value - width / 2 },
      { scaleX: 1 + squish.value * 0.5 },
      { scaleY: 1 - squish.value * 0.22 },
    ],
  }));

  return <Animated.View pointerEvents="none" style={[styles.pill, style]} />;
}

const styles = StyleSheet.create({
  pill: { position: 'absolute', left: 0, top: '50%', marginTop: -1 },
});
```

> Note: `top: '50%'` plus the parent centering the row vertically keeps the pill behind the icons. Final vertical offset is tuned against the real bar height in Task 8 / Task 9.

- [ ] **Step 2: Render smoke test**

Add to a quick test file `__tests__/ElasticPill.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import { ElasticPill } from '../components/liquid-glass-navbar/ElasticPill';

function Harness() {
  const out = useSharedValue(0);
  return <ElasticPill targetCenterX={40} width={48} height={36} color="#0A84FF" centerXOut={out} />;
}

test('renders without crashing', () => {
  expect(() => render(<Harness />)).not.toThrow();
});
```

Run: `npm test -- ElasticPill`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/liquid-glass-navbar/ElasticPill.tsx __tests__/ElasticPill.test.tsx
git commit -m "feat: ElasticPill spring + squish indicator"
```

---

## Task 7: useScrollShrink hook

**Files:**
- Create: `components/liquid-glass-navbar/useScrollShrink.ts`
- Test: `__tests__/useScrollShrink.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { renderHook, act } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useScrollShrink } from '../components/liquid-glass-navbar/useScrollShrink';

test('compact stays 0 when no scrollY provided', () => {
  const { result } = renderHook(() => useScrollShrink(undefined, 64));
  expect(result.current.compact.value).toBe(0);
  expect(result.current.expandedHeight).toBe(64);
});

test('derives a compact value from scroll position', () => {
  const { result } = renderHook(() => {
    const scrollY = useSharedValue(0);
    const shrink = useScrollShrink(scrollY, 64);
    return { scrollY, shrink };
  });
  act(() => {
    result.current.scrollY.value = 200; // scrolled down past threshold
  });
  // compact is a derived value; once driven it should head toward 1
  expect(result.current.shrink.compact.value).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useScrollShrink`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `useScrollShrink.ts`**

```ts
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';

export interface ScrollShrink {
  /** 0 = fully expanded, 1 = fully compact. */
  compact: SharedValue<number>;
  expandedHeight: number;
}

/**
 * Derives a 0..1 "compact" progress from a scroll position.
 * Scrolling down past `threshold` compacts the bar; scrolling back up expands it.
 * When `scrollY` is undefined, compact is pinned at 0 (feature disabled).
 */
export function useScrollShrink(
  scrollY: SharedValue<number> | undefined,
  expandedHeight: number,
  threshold = 120
): ScrollShrink {
  const fallback = useSharedValue(0);

  const compact = useDerivedValue(() => {
    if (!scrollY) return 0;
    const target = scrollY.value > threshold ? 1 : 0;
    return withTiming(target, { duration: 220 });
  }, [scrollY, threshold]);

  return { compact: scrollY ? compact : fallback, expandedHeight };
}

/** Helper for consumers: map compact -> animated dimensions. */
export function compactInterpolate(compact: number, from: number, to: number): number {
  'worklet';
  return interpolate(compact, [0, 1], [from, to], Extrapolation.CLAMP);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useScrollShrink`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/liquid-glass-navbar/useScrollShrink.ts __tests__/useScrollShrink.test.tsx
git commit -m "feat: useScrollShrink scroll-driven shrink/expand hook"
```

---

## Task 8: LiquidGlassTabBar (orchestrator)

**Files:**
- Create: `components/liquid-glass-navbar/LiquidGlassTabBar.tsx`
- Test: `__tests__/LiquidGlassTabBar.test.tsx`

Composes `GlassSurface` + `ElasticPill` + `TabItem`s, owns the live pill center and per-tab proximity, fires `onChange` + haptic on press, and applies `useScrollShrink` to the container height.

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { LiquidGlassTabBar } from '../components/liquid-glass-navbar/LiquidGlassTabBar';

jest.mock('expo-glass-effect', () => ({
  isLiquidGlassAvailable: () => false,
  GlassView: () => null,
}));

const tabs = [
  { key: 'home', icon: () => <Text>H</Text> },
  { key: 'search', icon: () => <Text>S</Text> },
  { key: 'me', icon: () => <Text>M</Text> },
];

test('calls onChange with the tapped tab key', () => {
  const onChange = jest.fn();
  const { getAllByRole } = render(
    <LiquidGlassTabBar tabs={tabs} activeKey="home" onChange={onChange} />
  );
  fireEvent.press(getAllByRole('button')[1]);
  expect(onChange).toHaveBeenCalledWith('search');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- LiquidGlassTabBar`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `LiquidGlassTabBar.tsx`**

```tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { GlassSurface } from './GlassSurface';
import { ElasticPill } from './ElasticPill';
import { TabItem } from './TabItem';
import { useScrollShrink, compactInterpolate } from './useScrollShrink';
import { tabSelectionHaptic } from './haptics';
import type { LiquidGlassTabBarProps } from './types';

const H_PADDING = 6;
const EXPANDED_HEIGHT = 64;
const PILL_HEIGHT = 44;

export function LiquidGlassTabBar({
  tabs,
  activeKey,
  onChange,
  scrollY,
  accentColor = '#0A84FF',
  inactiveColor = 'rgba(60,60,67,0.6)',
  tintColor,
  colorScheme = 'system',
  bottomInset = 0,
}: LiquidGlassTabBarProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const centers = useRef<Record<string, number>>({});
  const pillCenter = useSharedValue(0);

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeKey));
  const tabSlot = rowWidth > 0 ? rowWidth / tabs.length : 0;
  const targetCenterX = tabSlot * activeIndex + tabSlot / 2;
  const pillWidth = Math.max(44, tabSlot - 10);

  const { compact } = useScrollShrink(scrollY, EXPANDED_HEIGHT);

  const containerStyle = useAnimatedStyle(() => ({
    height: compactInterpolate(compact.value, EXPANDED_HEIGHT, 50),
  }));

  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    setRowWidth(e.nativeEvent.layout.width);
  }, []);

  const handlePress = useCallback(
    (key: string) => {
      if (key !== activeKey) {
        tabSelectionHaptic();
        onChange(key);
      }
    },
    [activeKey, onChange]
  );

  // proximity per tab: 1 when pill center is over the tab center, fading with distance.
  const proximities = tabs.map((t) =>
    useDerivedValue(() => {
      const c = centers.current[t.key];
      if (c == null || tabSlot === 0) return t.key === activeKey ? 1 : 0;
      const d = Math.abs(pillCenter.value - c);
      return Math.max(0, 1 - d / (tabSlot * 0.9));
    }, [tabSlot, activeKey])
  );

  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset }]} pointerEvents="box-none">
      <Animated.View style={[styles.container, containerStyle]}>
        <GlassSurface
          borderRadius={32}
          tintColor={tintColor}
          colorScheme={colorScheme}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.row} onLayout={onRowLayout}>
            {rowWidth > 0 && (
              <ElasticPill
                targetCenterX={targetCenterX}
                width={pillWidth}
                height={PILL_HEIGHT}
                color={hexWithAlpha(accentColor, 0.18)}
                centerXOut={pillCenter}
              />
            )}
            {tabs.map((tab, i) => (
              <TabItem
                key={tab.key}
                tab={tab}
                proximity={proximities[i]}
                accentColor={accentColor}
                inactiveColor={inactiveColor}
                onPress={() => handlePress(tab.key)}
                onLayoutCenter={(cx) => {
                  centers.current[tab.key] = cx;
                }}
              />
            ))}
          </View>
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

/** Add alpha to a #RRGGBB color (used to make a translucent pill from the accent). */
function hexWithAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  container: {
    width: '92%',
    marginBottom: 18,
    borderRadius: 32,
    overflow: 'visible',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PADDING,
  },
});
```

> Note: the `proximities` array calls `useDerivedValue` in a `.map`. This is safe **only because `tabs` is a fixed-length list for a given screen** (Rules of Hooks: stable order/length). Document this constraint in code review; if a caller needs dynamic tab counts, switch to a single derived value keyed by index.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- LiquidGlassTabBar`
Expected: PASS — `onChange` called with `'search'`.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/liquid-glass-navbar/LiquidGlassTabBar.tsx __tests__/LiquidGlassTabBar.test.tsx
git commit -m "feat: LiquidGlassTabBar orchestrator (pill + tint + scroll shrink)"
```

---

## Task 9: NativeLiquidGlassTabBar (100% Apple wrapper)

**Files:**
- Create: `components/liquid-glass-navbar/NativeLiquidGlassTabBar.tsx`

- [ ] **Step 1: Implement `NativeLiquidGlassTabBar.tsx`**

```tsx
import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { NativeTabDescriptor } from './types';

interface Props {
  tabs: NativeTabDescriptor[];
}

/**
 * Renders Apple's genuine iOS 26 system liquid glass tab bar via Expo Router NativeTabs.
 * The route files referenced by `tab.name` must exist in the same router group.
 * On Android this degrades to the native Material tab bar. 100% Apple on iOS 26 — the OS
 * owns the material and the morph animation.
 *
 * Use inside an Expo Router `_layout.tsx`.
 */
export function NativeLiquidGlassTabBar({ tabs }: Props) {
  return (
    <NativeTabs>
      {tabs.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.title}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={t.sf} md={t.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in the component folder. (If `expo-router/unstable-native-tabs` types are missing, ensure `expo-router` is installed and SDK ≥ 54.)

- [ ] **Step 3: Commit**

```bash
git add components/liquid-glass-navbar/NativeLiquidGlassTabBar.tsx
git commit -m "feat: NativeLiquidGlassTabBar wrapping Expo Router NativeTabs"
```

---

## Task 10: Demo app routes

**Files:**
- Create: `app/_layout.tsx`, `app/index.tsx`, `app/custom-demo.tsx`
- Create: `app/native-demo/_layout.tsx`, `app/native-demo/index.tsx`, `app/native-demo/search.tsx`, `app/native-demo/profile.tsx`

- [ ] **Step 1: Root layout + GestureHandler root**

`app/_layout.tsx`:

```tsx
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Landing screen linking both demos**

`app/index.tsx`:

```tsx
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={styles.c}>
      <Text style={styles.h}>Liquid Glass Navbar</Text>
      <Link href="/custom-demo" style={styles.link}>Custom bar (iOS + Android)</Link>
      <Link href="/native-demo" style={styles.link}>Native Apple bar (iOS 26)</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: '#fff' },
  h: { fontSize: 24, fontWeight: '700' },
  link: { fontSize: 17, color: '#0A84FF' },
});
```

- [ ] **Step 3: Custom-bar demo over a colorful scroll list**

`app/custom-demo.tsx`:

```tsx
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LiquidGlassTabBar } from '../components/liquid-glass-navbar';

const TABS = [
  { key: 'home',   icon: (a: boolean, c: string) => <Ionicons name={a ? 'home' : 'home-outline'} size={24} color={c} /> },
  { key: 'search', icon: (a: boolean, c: string) => <Ionicons name={a ? 'search' : 'search-outline'} size={24} color={c} /> },
  { key: 'liked',  icon: (a: boolean, c: string) => <Ionicons name={a ? 'heart' : 'heart-outline'} size={24} color={c} /> },
  { key: 'me',     icon: (a: boolean, c: string) => <Ionicons name={a ? 'person' : 'person-outline'} size={24} color={c} /> },
];

const COLORS = ['#ff7eb3', '#ff9966', '#7afcff', '#4f9dff', '#b388ff', '#69f0ae'];

export default function CustomDemo() {
  const [active, setActive] = useState('home');
  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 140 }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <View key={i} style={[styles.card, { backgroundColor: COLORS[i % COLORS.length] }]}>
            <Text style={styles.cardText}>Card {i + 1}</Text>
          </View>
        ))}
      </Animated.ScrollView>

      <LiquidGlassTabBar
        tabs={TABS}
        activeKey={active}
        onChange={setActive}
        scrollY={scrollY}
        accentColor="#0A84FF"
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 90, marginHorizontal: 16, marginTop: 14, borderRadius: 18, justifyContent: 'center', paddingHorizontal: 18 },
  cardText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
```

- [ ] **Step 4: Native demo route group**

`app/native-demo/_layout.tsx`:

```tsx
import { NativeLiquidGlassTabBar } from '../../components/liquid-glass-navbar';

export default function NativeDemoLayout() {
  return (
    <NativeLiquidGlassTabBar
      tabs={[
        { name: 'index',   title: 'Home',    sf: 'house.fill',           md: 'home' },
        { name: 'search',  title: 'Search',  sf: 'magnifyingglass',      md: 'search' },
        { name: 'profile', title: 'Profile', sf: 'person.crop.circle',   md: 'person' },
      ]}
    />
  );
}
```

`app/native-demo/index.tsx`, `search.tsx`, `profile.tsx` (three near-identical screens — repeated in full so they can be created independently):

```tsx
// app/native-demo/index.tsx
import { StyleSheet, Text, View } from 'react-native';
export default function Screen() {
  return <View style={styles.c}><Text style={styles.t}>Home</Text></View>;
}
const styles = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center' }, t: { fontSize: 22, fontWeight: '700' } });
```

```tsx
// app/native-demo/search.tsx
import { StyleSheet, Text, View } from 'react-native';
export default function Screen() {
  return <View style={styles.c}><Text style={styles.t}>Search</Text></View>;
}
const styles = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center' }, t: { fontSize: 22, fontWeight: '700' } });
```

```tsx
// app/native-demo/profile.tsx
import { StyleSheet, Text, View } from 'react-native';
export default function Screen() {
  return <View style={styles.c}><Text style={styles.t}>Profile</Text></View>;
}
const styles = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center' }, t: { fontSize: 22, fontWeight: '700' } });
```

- [ ] **Step 5: Type-check + tests**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/
git commit -m "feat: demo app routes for custom and native liquid glass bars"
```

---

## Task 11: End-to-end verification

**Files:** none (manual verification + notes)

- [ ] **Step 1: Launch on iOS simulator**

Run: `npx expo start --ios`
Verify on the **custom-demo** screen:
- The glass pill **springs toward** the tapped tab and **stretches then settles** (liquid squish).
- The tapped icon **tints to the accent color as the pill arrives** (cross-fade), others go inactive.
- **Scrolling down shrinks** the bar; **scrolling up expands** it.
- A **haptic tick** fires on tab change (device only; simulator has no haptics).

- [ ] **Step 2: Launch on Android**

Run: `npx expo start --android`
Verify the custom bar renders the **blur fallback** glass and all animations work.

- [ ] **Step 3: Native bar / true glass check (conditional)**

If an **iOS 26 simulator/device with Xcode 26** is available, build a dev client (`npx expo run:ios`) and open **native-demo**: confirm the real system liquid glass tab bar. If iOS 26 tooling is **not** available, record this explicitly: `GlassSurface` shows the blur fallback and `NativeTabs` renders the legacy/system tab bar — the true-glass path is **not** verified here.

- [ ] **Step 4: Final commit / notes**

```bash
git add -A
git commit -m "docs: verification notes for liquid glass navbar" || echo "nothing to commit"
```

---

## Self-Review Notes (author)

- **Spec coverage:** floating pill (Task 8 styles), elastic pill (Task 6), Telegram tint (Task 5 + proximity in Task 8), scroll shrink (Task 7 + Task 8), haptics (Task 3), native glass + fallback (Task 4), 100% Apple native bar (Task 9), demo app (Task 10), verification + honest caveat (Task 11). Shimmer intentionally deferred per spec — no task. ✓
- **Type consistency:** `LiquidGlassTabBarProps`, `TabDescriptor`, `NativeTabDescriptor` defined in Task 2 and used unchanged in Tasks 5/8/9. `centerXOut`/`pillCenter` SharedValue threaded from Task 8 → Task 6. `compact` from Task 7 used in Task 8. ✓
- **Known constraint flagged for review:** `useDerivedValue` inside `tabs.map` in Task 8 requires a stable tab count (Rules of Hooks). Documented in-code.
```
