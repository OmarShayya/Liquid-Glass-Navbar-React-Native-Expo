# Liquid Glass Tabs — npm Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing liquid-glass navbar into a publishable npm package `@omarshayya/liquid-glass-tabs` with a gesture-driven Android bar (tap + press-hold-drag + elastic follow), iOS native parity, an Expo Router auto-switch adapter, and clean docs.

**Architecture:** Phase 1-2 add the gesture engine and iOS parity in the current `src/components/liquid-glass-navbar/` folder. Phase 3 restructures the repo into the standard `react-native-builder-bob` JS-only library layout (`src/` = library, `example/` = the Expo demo). Phase 4 writes the README. Phase 5 prepares publish (auth-gated).

**Tech Stack:** Expo SDK 56, TypeScript, Reanimated 4 + react-native-worklets, react-native-gesture-handler, expo-blur/linear-gradient/glass-effect/haptics, @react-native-masked-view, expo-router, react-native-builder-bob (JS-only), jest-expo.

**Current state (before this plan):** working components in `src/components/liquid-glass-navbar/`: `types.ts`, `index.ts`, `haptics.ts`, `GlassSurface.tsx`, `TabItem.tsx`, `ElasticPill.tsx`, `useScrollShrink.ts`, `LiquidGlassTabBar.tsx`, `NativeLiquidGlassTabBar.tsx`. Tests in `__tests__/`. Demo routes in `src/app/`. `tsc` clean, jest green. Branch: `feat/liquid-glass-navbar`.

---

## PHASE 1 — Gesture-driven Android bar

### Task 1: `liquidGlass.ts` — elastic transform + pure helpers

**Files:**
- Create: `src/components/liquid-glass-navbar/liquidGlass.ts`
- Test: `__tests__/liquidGlass.test.ts`

- [ ] **Step 1: Write the failing test** (`__tests__/liquidGlass.test.ts`)

```ts
import { hoveredIndexFromX, clamp, liquidGlassTransform } from '../src/components/liquid-glass-navbar/liquidGlass';

test('hoveredIndexFromX maps x to the right slot, -1 when out of range', () => {
  // rowWidth 300, 3 tabs -> slots [0..100),[100..200),[200..300)
  expect(hoveredIndexFromX(50, 300, 3)).toBe(0);
  expect(hoveredIndexFromX(150, 300, 3)).toBe(1);
  expect(hoveredIndexFromX(250, 300, 3)).toBe(2);
  expect(hoveredIndexFromX(-5, 300, 3)).toBe(-1);
  expect(hoveredIndexFromX(305, 300, 3)).toBe(-1);
});

test('clamp bounds a value', () => {
  expect(clamp(5, 0, 10)).toBe(5);
  expect(clamp(-1, 0, 10)).toBe(0);
  expect(clamp(99, 0, 10)).toBe(10);
});

test('liquidGlassTransform stretches more with larger overflow and compresses perpendicular', () => {
  const none = liquidGlassTransform(0, 0, 30);
  expect(none.scaleX).toBeCloseTo(1, 5);
  expect(none.translateX).toBeCloseTo(0, 5);
  const pulled = liquidGlassTransform(1, 80, 30);
  expect(pulled.scaleX).toBeGreaterThan(1);     // stretched along drag
  expect(pulled.scaleY).toBeLessThan(1.04);     // compressed perpendicular
  expect(pulled.translateX).toBeGreaterThan(0); // shifted toward the pull
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npm test -- liquidGlass`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `liquidGlass.ts`**

```ts
import { interpolate, Extrapolation } from 'react-native-reanimated';

export const SPRING = { damping: 22, stiffness: 220, mass: 0.8 } as const;
export const SPRING_BOUNCY = { damping: 18, stiffness: 260, mass: 0.7 } as const;

const MAX_PULL = 56;
const MAX_STRETCH = 0.18;
const MAX_COMPRESS = 0.12;

/** Index of the tab slot containing row-local x, or -1 when out of the row. */
export function hoveredIndexFromX(x: number, rowWidth: number, count: number): number {
  'worklet';
  if (count <= 0 || rowWidth <= 0) return -1;
  if (x < 0 || x > rowWidth) return -1;
  const slot = rowWidth / count;
  return Math.min(count - 1, Math.max(0, Math.floor(x / slot)));
}

export function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Damped elastic transform for the pill. `pressed` (0..1) adds a subtle grow;
 * `overflowX` (px past the row edge) bends the pill toward the pull with a
 * diminishing-returns curve, stretching along X and compressing along Y.
 */
export function liquidGlassTransform(
  pressed: number,
  overflowX: number,
  halfW: number
): { scaleX: number; scaleY: number; translateX: number } {
  'worklet';
  const pressScale = interpolate(pressed, [0, 1], [1, 1.04], Extrapolation.CLAMP);
  const sign = overflowX < 0 ? -1 : 1;
  const damped = sign * MAX_PULL * (1 - 1 / (Math.abs(overflowX) / MAX_PULL + 1));
  const stretch = interpolate(Math.abs(damped), [0, MAX_PULL], [0, MAX_STRETCH], Extrapolation.CLAMP);
  const compress = interpolate(Math.abs(damped), [0, MAX_PULL], [0, MAX_COMPRESS], Extrapolation.CLAMP);
  return {
    translateX: sign * halfW * stretch,
    scaleX: pressScale * (1 + stretch),
    scaleY: pressScale * (1 - compress),
  };
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `npm test -- liquidGlass`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/liquid-glass-navbar/liquidGlass.ts __tests__/liquidGlass.test.ts
git commit -m "feat: liquidGlass elastic transform + pure gesture helpers"
```

---

### Task 2: Add crossing haptic to `haptics.ts`

**Files:**
- Modify: `src/components/liquid-glass-navbar/haptics.ts`

- [ ] **Step 1: Append a crossing haptic (keep existing `tabSelectionHaptic`)**

Add to `haptics.ts`:

```ts
/** A light tick as the dragged pill crosses into a new tab. No-ops if unsupported. */
export function tabCrossingHaptic(): void {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // unsupported — ignore
  }
}
```

- [ ] **Step 2: Confirm jest mock covers it**

The existing `jest.setup.js` mocks `expo-haptics` with `impactAsync` + `ImpactFeedbackStyle`. Run `npm test -- haptics 2>/dev/null || true` (no dedicated test; just ensure suite still green in Step from Task 5). No new test required for this trivial wrapper.

- [ ] **Step 3: Commit**

```bash
git add src/components/liquid-glass-navbar/haptics.ts
git commit -m "feat: add tab-crossing haptic"
```

---

### Task 3: `useTabBarGestures.ts` — tap + press-hold-drag composition

**Files:**
- Create: `src/components/liquid-glass-navbar/useTabBarGestures.ts`

This hook owns the gesture and the shared values the pill/items read. A single `Pan` with
`minDistance(0)` handles BOTH a quick tap (touch down + release without moving → commit the
touched tab) and a press-hold-drag (follow the finger, commit on release). Velocity drives a
live stretch; leaving the row edge drives `overflowX`.

- [ ] **Step 1: Implement `useTabBarGestures.ts`**

```ts
import { useCallback, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SPRING, SPRING_BOUNCY, hoveredIndexFromX, clamp } from './liquidGlass';
import { tabSelectionHaptic, tabCrossingHaptic } from './haptics';

export interface TabBarGestureState {
  pillCenter: SharedValue<number>;
  pressed: SharedValue<number>;
  overflowX: SharedValue<number>;
  stretch: SharedValue<number>;
  hoveredIndex: SharedValue<number>;
  gesture: ReturnType<typeof Gesture.Pan>;
}

interface Options {
  rowWidth: number;
  count: number;
  activeIndex: number;
  /** Commit a selection (JS thread). */
  onCommit: (index: number) => void;
  enabled: boolean;
}

export function useTabBarGestures({ rowWidth, count, activeIndex, onCommit, enabled }: Options): TabBarGestureState {
  const pillCenter = useSharedValue(0);
  const pressed = useSharedValue(0);
  const overflowX = useSharedValue(0);
  const stretch = useSharedValue(0);
  const hoveredIndex = useSharedValue(-1);

  const commit = useCallback((i: number) => onCommit(i), [onCommit]);

  const gesture = useMemo(() => {
    const slot = count > 0 ? rowWidth / count : 0;
    const half = slot / 2;
    const centerOf = (i: number) => slot * i + half;

    return Gesture.Pan()
      .enabled(enabled)
      .minDistance(0)
      .onBegin((e) => {
        pressed.value = withTiming(1, { duration: 90 });
        const i = hoveredIndexFromX(e.x, rowWidth, count);
        hoveredIndex.value = i;
        pillCenter.value = withSpring(clamp(e.x, half, rowWidth - half), SPRING);
      })
      .onUpdate((e) => {
        pillCenter.value = clamp(e.x, half, rowWidth - half);
        overflowX.value = e.x < 0 ? e.x : e.x > rowWidth ? e.x - rowWidth : 0;
        stretch.value = clamp(Math.abs(e.velocityX) / 3200, 0, 0.4);
        const i = hoveredIndexFromX(e.x, rowWidth, count);
        if (i !== hoveredIndex.value) {
          hoveredIndex.value = i;
          if (i >= 0) scheduleOnRN(tabCrossingHaptic);
        }
      })
      .onFinalize(() => {
        const i = hoveredIndex.value;
        pressed.value = withTiming(0, { duration: 140 });
        overflowX.value = withSpring(0, SPRING_BOUNCY);
        stretch.value = withTiming(0, { duration: 220 });
        if (i >= 0) {
          pillCenter.value = withSpring(centerOf(i), SPRING);
          scheduleOnRN(commit, i);
          scheduleOnRN(tabSelectionHaptic);
        } else {
          pillCenter.value = withSpring(centerOf(activeIndex), SPRING);
        }
        hoveredIndex.value = -1;
      });
  }, [rowWidth, count, activeIndex, enabled, commit]);

  return { pillCenter, pressed, overflowX, stretch, hoveredIndex, gesture };
}
```

- [ ] **Step 2: Type-check the new file compiles**

Run: `npx tsc --noEmit` and confirm NO errors in `useTabBarGestures.ts` or `liquidGlass.ts`. (Pre-existing unrelated errors elsewhere may remain; the gate is no errors in these two files.)

- [ ] **Step 3: Commit**

```bash
git add src/components/liquid-glass-navbar/useTabBarGestures.ts
git commit -m "feat: useTabBarGestures tap + press-hold-drag composition"
```

---

### Task 4: Make `ElasticPill` gesture-aware

**Files:**
- Modify: `src/components/liquid-glass-navbar/ElasticPill.tsx`

The pill must follow `pillCenter` directly when provided (gesture mode), apply
`liquidGlassTransform` for press/overflow, and add the velocity `stretch`. When no gesture
state is provided it keeps the existing spring-to-target behavior.

- [ ] **Step 1: Replace `ElasticPill.tsx` with EXACTLY**

```tsx
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { liquidGlassTransform, SPRING } from './liquidGlass';

interface Props {
  targetCenterX: number;
  width: number;
  height: number;
  color: string;
  /** Live pill center-x output (consumed by TabItems for proximity). */
  centerXOut: SharedValue<number>;
  /** Optional gesture inputs. When provided, the pill follows them. */
  pillCenter?: SharedValue<number>;
  pressed?: SharedValue<number>;
  overflowX?: SharedValue<number>;
  stretch?: SharedValue<number>;
}

export function ElasticPill({
  targetCenterX,
  width,
  height,
  color,
  centerXOut,
  pillCenter,
  pressed,
  overflowX,
  stretch,
}: Props) {
  // Internal spring position used only when there is no external gesture position.
  const selfCenter = useSharedValue(targetCenterX);
  const squish = useSharedValue(0);

  useEffect(() => {
    if (pillCenter) return; // gesture owns position
    squish.value = withSequence(withTiming(1, { duration: 130 }), withTiming(0, { duration: 240 }));
    selfCenter.value = withSpring(targetCenterX, SPRING);
  }, [targetCenterX, pillCenter, selfCenter, squish]);

  // Publish the live center (gesture position if present, else internal spring).
  useDerivedValue(() => {
    centerXOut.value = pillCenter ? pillCenter.value : selfCenter.value;
  });

  const style = useAnimatedStyle(() => {
    const cx = pillCenter ? pillCenter.value : selfCenter.value;
    const p = pressed ? pressed.value : 0;
    const ov = overflowX ? overflowX.value : 0;
    const st = stretch ? stretch.value : 0;
    const t = liquidGlassTransform(p, ov, width / 2);
    const seq = squish.value; // tap-mode squish
    return {
      width,
      height,
      borderRadius: height / 2,
      backgroundColor: color,
      marginTop: -height / 2,
      transform: [
        { translateX: cx - width / 2 + t.translateX },
        { scaleX: t.scaleX * (1 + st + seq * 0.5) },
        { scaleY: t.scaleY * (1 - seq * 0.18) },
      ],
    };
  });

  return <Animated.View pointerEvents="none" style={[styles.pill, style]} />;
}

const styles = StyleSheet.create({
  pill: { position: 'absolute', left: 0, top: '50%' },
});
```

- [ ] **Step 2: Run the existing ElasticPill smoke test**

Run: `npm test -- ElasticPill`
Expected: PASS (the harness passes only the required props; optional gesture props default to undefined). If the test file references removed props, it does not — it only passes `targetCenterX/width/height/color/centerXOut`. PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/liquid-glass-navbar/ElasticPill.tsx
git commit -m "feat: gesture-aware ElasticPill (follow finger + elastic transform)"
```

---

### Task 5: Drive `TabItem` tint from hovered index OR proximity

**Files:**
- Modify: `src/components/liquid-glass-navbar/TabItem.tsx`

Add an optional `hovered` boolean-ish SharedValue path: when the gesture is active the tab
tints if it is the hovered index; otherwise it falls back to the existing `proximity` value.

- [ ] **Step 1: Replace the `activeLayer`/`inactiveLayer` derivation in `TabItem.tsx`**

Change the `Props` interface to add an optional input and update the animated styles. The full updated file:

```tsx
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { TabDescriptor } from './types';

interface Props {
  tab: TabDescriptor;
  index: number;
  /** Tab count + row width define this tab's uniform slot center. */
  count: number;
  rowWidth: number;
  /** Live pill center-x (resting spring or gesture). */
  pillCenter: SharedValue<number>;
  /** Index hovered by an active drag, or -1 when not dragging. */
  hoveredIndex: SharedValue<number>;
  accentColor: string;
  inactiveColor: string;
  onPress: () => void;
}

/**
 * Tint strength is computed PER INSTANCE (one useDerivedValue here, not a hooks-in-a-loop in
 * the parent) so the tab count can be any size — even change at runtime — without breaking the
 * Rules of Hooks.
 */
export function TabItem({
  tab, index, count, rowWidth, pillCenter, hoveredIndex, accentColor, inactiveColor, onPress,
}: Props) {
  const pressScale = useSharedValue(1);

  const tint = useDerivedValue(() => {
    if (hoveredIndex.value >= 0) return hoveredIndex.value === index ? 1 : 0;
    if (count <= 0 || rowWidth <= 0) return 0;
    const slot = rowWidth / count;
    const center = slot * index + slot / 2;
    return Math.max(0, 1 - Math.abs(pillCenter.value - center) / (slot * 0.9));
  });

  const activeLayer = useAnimatedStyle(() => ({ opacity: tint.value }));
  const inactiveLayer = useAnimatedStyle(() => ({ opacity: 1 - tint.value }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
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

- [ ] **Step 2: Update `__tests__/TabItem.test.tsx` harness for the new props**

Replace the harness so it provides the new props (no more `proximity`/`onLayoutCenter`):

```tsx
function Harness({ onPress }: { onPress: () => void }) {
  const pillCenter = useSharedValue(0);
  const hoveredIndex = useSharedValue(-1);
  return (
    <TabItem
      tab={{ key: 'home', icon: (active, color) => <Text>{active ? 'on' : 'off'}:{color}</Text> }}
      index={0}
      count={3}
      rowWidth={300}
      pillCenter={pillCenter}
      hoveredIndex={hoveredIndex}
      accentColor="#0A84FF"
      inactiveColor="#888"
      onPress={onPress}
    />
  );
}
```

Keep the `fires onPress when tapped` assertion identical.

- [ ] **Step 3: Run**

Run: `npm test -- TabItem`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/liquid-glass-navbar/TabItem.tsx __tests__/TabItem.test.tsx
git commit -m "feat: TabItem tint from hovered index or resting proximity"
```

---

### Task 6: Wire gestures into `LiquidGlassTabBar`

**Files:**
- Modify: `src/components/liquid-glass-navbar/LiquidGlassTabBar.tsx`
- Modify: `src/components/liquid-glass-navbar/types.ts` (add `enableGestures?`)

- [ ] **Step 1: Add `enableGestures?: boolean` to `LiquidGlassTabBarProps` in `types.ts`**

Add this line inside `LiquidGlassTabBarProps` (after `bottomInset?`):

```ts
  /** Enable press-hold-drag gesture on the pill (default true). */
  enableGestures?: boolean;
```

- [ ] **Step 2: Replace `LiquidGlassTabBar.tsx` with EXACTLY**

```tsx
import React, { useCallback, useState } from 'react';
import { StyleSheet, View, LayoutChangeEvent, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { GlassSurface } from './GlassSurface';
import { ElasticPill } from './ElasticPill';
import { TabItem } from './TabItem';
import { useScrollShrink, compactInterpolate } from './useScrollShrink';
import { useTabBarGestures } from './useTabBarGestures';
import { tabSelectionHaptic } from './haptics';
import type { LiquidGlassTabBarProps } from './types';

const H_PADDING = 6;
const EXPANDED_HEIGHT = 64;
const COMPACT_HEIGHT = 50;
const PILL_HEIGHT = 44;

export function LiquidGlassTabBar({
  tabs,
  activeKey,
  onChange,
  scrollY,
  accentColor = '#0A84FF',
  inactiveColor,
  tintColor,
  colorScheme = 'system',
  bottomInset = 0,
  enableGestures = true,
}: LiquidGlassTabBarProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const liveCenter = useSharedValue(0); // published by ElasticPill (gesture or resting spring)

  // Resolve light/dark so default colors look right with zero config.
  const systemScheme = useColorScheme();
  const effectiveScheme = colorScheme === 'system' ? (systemScheme ?? 'light') : colorScheme;
  const resolvedInactive =
    inactiveColor ?? (effectiveScheme === 'dark' ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)');

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeKey));
  const tabSlot = rowWidth > 0 ? rowWidth / tabs.length : 0;
  const targetCenterX = tabSlot * activeIndex + tabSlot / 2;
  const pillWidth = Math.max(44, tabSlot - 10);

  const { compact, expandedHeight } = useScrollShrink(scrollY, EXPANDED_HEIGHT);
  const containerStyle = useAnimatedStyle(() => ({
    height: compactInterpolate(compact.value, expandedHeight, COMPACT_HEIGHT),
  }));

  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    setRowWidth(e.nativeEvent.layout.width);
  }, []);

  const commitIndex = useCallback(
    (i: number) => {
      const tab = tabs[i];
      if (tab && tab.key !== activeKey) {
        tabSelectionHaptic();
        onChange(tab.key);
      }
    },
    [tabs, activeKey, onChange]
  );

  const { pillCenter, pressed, overflowX, stretch, hoveredIndex, gesture } = useTabBarGestures({
    rowWidth,
    count: tabs.length,
    activeIndex,
    onCommit: commitIndex,
    enabled: enableGestures && rowWidth > 0,
  });

  const row = (
    <View style={styles.row} onLayout={onRowLayout}>
      {rowWidth > 0 && (
        <ElasticPill
          targetCenterX={targetCenterX}
          width={pillWidth}
          height={PILL_HEIGHT}
          color={hexWithAlpha(accentColor, 0.18)}
          centerXOut={liveCenter}
          pillCenter={enableGestures ? pillCenter : undefined}
          pressed={enableGestures ? pressed : undefined}
          overflowX={enableGestures ? overflowX : undefined}
          stretch={enableGestures ? stretch : undefined}
        />
      )}
      {tabs.map((tab, i) => (
        <TabItem
          key={tab.key}
          tab={tab}
          index={i}
          count={tabs.length}
          rowWidth={rowWidth}
          pillCenter={liveCenter}
          hoveredIndex={hoveredIndex}
          accentColor={accentColor}
          inactiveColor={resolvedInactive}
          onPress={() => commitIndex(i)}
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset }]} pointerEvents="box-none">
      <Animated.View style={[styles.container, containerStyle]}>
        <GlassSurface borderRadius={32} tintColor={tintColor} colorScheme={colorScheme} style={StyleSheet.absoluteFill}>
          {enableGestures ? <GestureDetector gesture={gesture}>{row}</GestureDetector> : row}
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  container: { width: '92%', marginBottom: 18, borderRadius: 32, overflow: 'visible' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: H_PADDING },
});
```

> Note: no hooks-in-a-loop in this component — each `TabItem` computes its own tint from
> `liveCenter` + its `index`/`count`, so the tab count can be any size or change at runtime.
> `liveCenter` is published by `ElasticPill` (the gesture position when dragging, else its
> resting spring), so the Telegram tint tracks the pill in both modes. Default `inactiveColor`
> adapts to the resolved light/dark scheme.

- [ ] **Step 3: Update `__tests__/LiquidGlassTabBar.test.tsx`**

The existing onChange test taps `getAllByRole('button')[1]` and expects `onChange('search')`.
With gestures wrapping the row, the per-tab `Pressable` `onPress` still fires `commitIndex(i)`
→ `onChange`. Add `enableGestures={false}` is NOT needed; keep both existing tests. Wrap the
render in a `GestureHandlerRootView` so the `GestureDetector` mounts cleanly under jest:

Replace the test's render calls to wrap with the provider. At the top add:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
```

and change each `await render(<LiquidGlassTabBar .../>)` to:

```tsx
await render(
  <GestureHandlerRootView>
    <LiquidGlassTabBar tabs={tabs} activeKey="home" onChange={onChange} />
  </GestureHandlerRootView>
);
```

(keep the assertions identical). If `getAllByRole('button')` now returns the same 3 buttons, the tests pass unchanged otherwise.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: all suites pass. If the gesture wrapper causes a jest issue with `GestureDetector`, ensure `react-native-gesture-handler/jestSetup` is included — add `import 'react-native-gesture-handler/jestSetup';` to the top of `jest.setup.js`. Report if added.

- [ ] **Step 5: Commit**

```bash
git add src/components/liquid-glass-navbar/LiquidGlassTabBar.tsx src/components/liquid-glass-navbar/types.ts __tests__/LiquidGlassTabBar.test.tsx jest.setup.js
git commit -m "feat: wire press-hold-drag gestures into LiquidGlassTabBar"
```

---

## PHASE 2 — iOS native parity + Expo Router adapter

### Task 7: `minimizeBehavior` + theme parity on the native bar

**Files:**
- Modify: `src/components/liquid-glass-navbar/NativeLiquidGlassTabBar.tsx`
- Modify: `src/components/liquid-glass-navbar/types.ts` (extend `NativeTabDescriptor` usage with a props type)

- [ ] **Step 1: Replace `NativeLiquidGlassTabBar.tsx` with EXACTLY**

```tsx
import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { NativeTabDescriptor } from './types';

type MinimizeBehavior = 'automatic' | 'never' | 'onScrollDown' | 'onScrollUp';

interface Props {
  tabs: NativeTabDescriptor[];
  /** iOS 26: collapse the bar into a pill on scroll. Default 'onScrollDown'. */
  minimizeBehavior?: MinimizeBehavior;
}

/**
 * Apple's genuine iOS 26 system liquid glass tab bar via Expo Router NativeTabs.
 * Route files referenced by `tab.name` must exist in the same router group.
 * Use inside an Expo Router `_layout.tsx`.
 */
export function NativeLiquidGlassTabBar({ tabs, minimizeBehavior = 'onScrollDown' }: Props) {
  return (
    <NativeTabs minimizeBehavior={minimizeBehavior}>
      {tabs.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Icon sf={t.sf as SFSymbol} md={t.md as never} />
          <NativeTabs.Trigger.Label>{t.title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
```

> If `tsc` reports the installed `NativeTabs` does not accept `minimizeBehavior`, check
> `node_modules/expo-router/`'s `NativeTabsProps` for the exact prop name (it may be
> `minimizeBehavior` on `<NativeTabs>` per SDK 56). Adapt to the real prop name and report it.
> The `md` cast uses `never` to satisfy the AndroidSymbol union from any string; if the installed
> type exports `AndroidSymbol`, import and cast to it instead.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `NativeLiquidGlassTabBar.tsx`. Report any prop-name adaptation made.

- [ ] **Step 3: Commit**

```bash
git add src/components/liquid-glass-navbar/NativeLiquidGlassTabBar.tsx
git commit -m "feat: native bar minimizeBehavior (scroll-minimize) parity"
```

---

### Task 8: `LiquidGlassTabs` — Expo Router platform adapter

**Files:**
- Create: `src/components/liquid-glass-navbar/LiquidGlassTabs.tsx`
- Modify: `src/components/liquid-glass-navbar/index.ts` (export it)

- [ ] **Step 1: Implement `LiquidGlassTabs.tsx`**

```tsx
import React, { useState } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeLiquidGlassTabBar } from './NativeLiquidGlassTabBar';
import { LiquidGlassTabBar } from './LiquidGlassTabBar';
import type { NativeTabDescriptor, TabDescriptor } from './types';

interface Props {
  /** Native (iOS) tab config — names must match route files. */
  nativeTabs: NativeTabDescriptor[];
  /** Custom (Android) tab rendering — keys must match route names. */
  customTabs: TabDescriptor[];
  accentColor?: string;
  minimizeBehavior?: 'automatic' | 'never' | 'onScrollDown' | 'onScrollUp';
}

/**
 * Drop-in Expo Router tab layout. iOS renders Apple's system liquid glass tab bar;
 * Android renders the custom gesture-driven LiquidGlassTabBar as a JS tabBar.
 * Use inside `app/(tabs)/_layout.tsx`.
 */
export function LiquidGlassTabs({ nativeTabs, customTabs, accentColor, minimizeBehavior }: Props) {
  if (Platform.OS === 'ios') {
    return <NativeLiquidGlassTabBar tabs={nativeTabs} minimizeBehavior={minimizeBehavior} />;
  }
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomBar {...props} customTabs={customTabs} accentColor={accentColor} />}
    >
      {customTabs.map((t) => (
        <Tabs.Screen key={t.key} name={t.key} />
      ))}
    </Tabs>
  );
}

function CustomBar({
  state,
  navigation,
  customTabs,
  accentColor,
}: BottomTabBarProps & { customTabs: TabDescriptor[]; accentColor?: string }) {
  const insets = useSafeAreaInsets();
  const activeKey = state.routes[state.index]?.name ?? customTabs[0]?.key;
  return (
    <LiquidGlassTabBar
      tabs={customTabs}
      activeKey={activeKey}
      onChange={(key) => navigation.navigate(key)}
      accentColor={accentColor}
      bottomInset={insets.bottom}
    />
  );
}
```

- [ ] **Step 2: Export from `index.ts`**

Add to `src/components/liquid-glass-navbar/index.ts`:

```ts
export { LiquidGlassTabs } from './LiquidGlassTabs';
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `LiquidGlassTabs.tsx`. If `@react-navigation/bottom-tabs` types aren't resolvable, it ships transitively with `expo-router`; if not found, the implementer should `npx expo install @react-navigation/bottom-tabs` and report it.

- [ ] **Step 4: Commit**

```bash
git add src/components/liquid-glass-navbar/LiquidGlassTabs.tsx src/components/liquid-glass-navbar/index.ts
git commit -m "feat: LiquidGlassTabs Expo Router platform adapter"
```

---

### Task 9: Update the example demo to exercise the gesture bar

**Files:**
- Modify: `src/app/custom-demo.tsx` (no API change needed, but confirm it still renders the gesture bar)

- [ ] **Step 1: Confirm `custom-demo.tsx` works unchanged**

`LiquidGlassTabBar` keeps the same required props, so the demo needs no change. Verify the app still bundles.

Run: `npx expo export --platform ios --output-dir /tmp/lg-export-p2`
Expected: exit 0.

- [ ] **Step 2: Commit (only if a change was needed; otherwise skip)**

```bash
git add -A && git commit -m "chore: verify demo against gesture bar" || echo "no change"
```

---

## PHASE 3 — Restructure into a builder-bob package

> This phase relocates files. Do it carefully; commit after each major move so it's reversible.

### Task 10: Move the Expo app into `example/`

**Files:** moves only.

- [ ] **Step 1: Create `example/` and move the app there**

```bash
mkdir -p example
git mv src/app example/app
git mv app.json example/app.json
git mv tsconfig.json example/tsconfig.json
git mv babel.config.js example/babel.config.js
git mv jest.setup.js example/jest.setup.js
[ -f .npmrc ] && git mv .npmrc example/.npmrc || true
[ -f expo-env.d.ts ] && git mv expo-env.d.ts example/expo-env.d.ts || true
[ -f metro.config.js ] && git mv metro.config.js example/metro.config.js || true
```

- [ ] **Step 2: Move the library source from `src/components/liquid-glass-navbar/` to root `src/`**

```bash
mkdir -p src_pkg
git mv src/components/liquid-glass-navbar/* src_pkg/
git rm -r src/components 2>/dev/null || true
# now relocate the staging dir to the final src/ (the old src/app already moved out)
rmdir src 2>/dev/null || true
git mv src_pkg src
```

- [ ] **Step 3: Move tests to `example/__tests__` (they import the library by relative path)**

```bash
mkdir -p example/__tests__
git mv __tests__/* example/__tests__/
rmdir __tests__ 2>/dev/null || true
```

- [ ] **Step 4: Commit the moves**

```bash
git add -A
git commit -m "refactor: split into library src/ and example/ app (builder-bob layout)"
```

---

### Task 11: Configure the library `package.json`, bob, tsconfig, LICENSE

**Files:**
- Create (root): `package.json` (library), `tsconfig.json`, `tsconfig.build.json`, `babel.config.js`, `LICENSE`, `.gitignore` (update)
- The `example/` keeps its own `package.json` (the previous app one).

- [ ] **Step 1: Split package.json — give `example/` the app one, root the library one**

First, copy the current root `package.json` into `example/package.json` (it's the Expo app's), then write the LIBRARY root `package.json`:

```bash
cp package.json example/package.json
```

Then OVERWRITE root `package.json` with EXACTLY (versions: read the installed versions from `example/package.json` for the `devDependencies`/`peerDependencies` ranges, using `*`-tolerant caret ranges shown):

```json
{
  "name": "@omarshayya/liquid-glass-tabs",
  "version": "0.1.0",
  "description": "Apple iOS 26 Liquid Glass tab bars for Expo & React Native — the real native bar on iOS and a gesture-driven custom bar (elastic pill, Telegram-style tint) on Android.",
  "main": "lib/commonjs/index.js",
  "module": "lib/module/index.js",
  "types": "lib/typescript/commonjs/src/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./lib/typescript/module/src/index.d.ts",
        "default": "./lib/module/index.js"
      },
      "require": {
        "types": "./lib/typescript/commonjs/src/index.d.ts",
        "default": "./lib/commonjs/index.js"
      }
    }
  },
  "files": ["src", "lib", "README.md", "LICENSE"],
  "scripts": {
    "build": "bob build",
    "prepare": "bob build",
    "typecheck": "tsc --noEmit",
    "test": "cd example && npm test"
  },
  "keywords": ["expo", "react-native", "liquid-glass", "ios26", "tab-bar", "navbar", "reanimated"],
  "repository": { "type": "git", "url": "https://github.com/omarshayya/liquid-glass-tabs.git" },
  "author": "omarshayya",
  "license": "MIT",
  "peerDependencies": {
    "react": "*",
    "react-native": "*",
    "react-native-reanimated": ">=4",
    "react-native-gesture-handler": ">=2",
    "react-native-worklets": "*",
    "react-native-safe-area-context": "*",
    "expo-blur": "*",
    "expo-linear-gradient": "*",
    "expo-glass-effect": "*",
    "expo-haptics": "*",
    "@react-native-masked-view/masked-view": "*",
    "expo-router": "*"
  },
  "peerDependenciesMeta": {
    "expo-router": { "optional": true }
  },
  "devDependencies": {
    "react-native-builder-bob": "^0.40.0",
    "typescript": "~5.9.2"
  },
  "react-native-builder-bob": {
    "source": "src",
    "output": "lib",
    "targets": [
      ["module", { "esm": true }],
      ["commonjs", { "esm": true }],
      "typescript"
    ]
  }
}
```

- [ ] **Step 2: Root `tsconfig.json` + `tsconfig.build.json`**

Root `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "module": "esnext",
    "moduleResolution": "bundler",
    "target": "esnext",
    "lib": ["esnext", "dom"],
    "skipLibCheck": true,
    "esModuleInterop": true,
    "declaration": true,
    "noEmit": true,
    "types": ["react", "react-native"]
  },
  "include": ["src"]
}
```

Root `tsconfig.build.json`:

```json
{ "extends": "./tsconfig.json", "exclude": ["example", "lib", "node_modules"] }
```

- [ ] **Step 3: Root `babel.config.js` (module build only needs preset)**

```js
module.exports = { presets: ['module:@react-native/babel-preset'], plugins: ['react-native-worklets/plugin'] };
```

> If `bob build` complains about the preset, switch to `presets: ['babel-preset-expo']`. Report which you used.

- [ ] **Step 4: `LICENSE` (MIT)**

Create `LICENSE` with the standard MIT text, `Copyright (c) 2026 omarshayya`.

- [ ] **Step 5: Write a clean root `.gitignore`** so the public GitHub repo only contains the
library, example, README, LICENSE, and configs — not build output, editor/AI folders, or internal
planning docs. Overwrite `.gitignore` with:

```
# deps / build
node_modules/
lib/
example/node_modules/
.expo/
dist/
web-build/
*.tsbuildinfo
expo-env.d.ts

# native (generated)
ios/
android/

# editor / tooling / AI
.vscode/
.idea/
.claude/
.superpowers/
.DS_Store
*.log

# internal planning docs (kept locally, not pushed)
docs/
```

Then stop tracking the clutter that is already committed (keeps the files on disk, removes them
from the repo that gets pushed):

```bash
git rm -r --cached docs .vscode .claude 2>/dev/null || true
```

> Result: the pushed GitHub repo = `src/`, `example/`, `package.json`, `tsconfig*.json`,
> `babel.config.js`, `README.md`, `LICENSE`, `.gitignore`. The npm tarball = `src/`, `lib/`,
> `README.md`, `LICENSE` (via the `files` allowlist). `docs/` (our specs/plans) stays on disk
> locally but is neither pushed nor published.

- [ ] **Step 6: Install builder-bob at the root**

```bash
npm install --save-dev react-native-builder-bob@latest typescript
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "build: configure @omarshayya/liquid-glass-tabs library package (bob)"
```

---

### Task 12: Make `example/` consume the library + build

**Files:**
- Modify: `example/package.json` (name, add the library as a file: dependency), `example/babel.config.js` (module-resolver), `example/app/**` imports.

- [ ] **Step 1: Point the example at the library**

In `example/package.json`: set `"name": "liquid-glass-tabs-example"`, and add a dependency on the library resolved to the parent:

```json
"dependencies": {
  "@omarshayya/liquid-glass-tabs": "link:.."
}
```

Run `cd example && npm install` to link it.

- [ ] **Step 2: Update example imports**

In every `example/app/**` file that imported `../components/liquid-glass-navbar` (or `../../components/...`), change the import to the package name:

```tsx
import { LiquidGlassTabBar, NativeLiquidGlassTabBar } from '@omarshayya/liquid-glass-tabs';
```

`grep -rl "components/liquid-glass-navbar" example/app` to find them; update each.

- [ ] **Step 3: Add babel module-resolver so Metro reads the library `src` directly (dev)**

In `example/babel.config.js`:

```js
const path = require('path');
const pkg = require('../package.json');
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        alias: { [pkg.name]: path.join(__dirname, '..', pkg.source || 'src') },
      }],
      'react-native-worklets/plugin',
    ],
  };
};
```

Run `cd example && npm install --save-dev babel-plugin-module-resolver`.

- [ ] **Step 4: Build the library and bundle the example**

```bash
npm run build              # bob build at root -> lib/ with .d.ts
cd example && npx expo export --platform ios --output-dir /tmp/lg-export-p3
```

Expected: `lib/module`, `lib/commonjs`, `lib/typescript` exist; example exports exit 0.

- [ ] **Step 5: Run tests + typecheck**

```bash
cd example && npm test           # jest suite green
cd .. && npm run typecheck        # library tsc clean
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "build: wire example app to consume the library; verify bob build + bundle"
```

---

## PHASE 4 — Documentation

### Task 13: Write the README

**Files:**
- Create/replace (root): `README.md`

- [ ] **Step 1: Write `README.md`** with these sections (full prose, scannable):

1. Title + one-line pitch + a screenshot/GIF placeholder line.
2. **Features** bullets (real native iOS glass; gesture Android bar; scroll-minimize; tint).
3. **Install**:
   ```bash
   npm install @omarshayya/liquid-glass-tabs
   npx expo install react-native-reanimated react-native-gesture-handler react-native-worklets \
     expo-blur expo-linear-gradient expo-glass-effect expo-haptics \
     @react-native-masked-view/masked-view react-native-safe-area-context
   # expo-router only needed for the native / adapter exports
   ```
4. **Which component?** table: `LiquidGlassTabBar` (controlled, any RN app) / `NativeLiquidGlassTabBar` (iOS, Expo Router) / `LiquidGlassTabs` (auto-switch, Expo Router).
5. **Usage** — one minimal snippet per export (copy from the JSDoc in `index.ts`, expanded).
6. **Props** — three small tables (LiquidGlassTabBar props, NativeLiquidGlassTabBar props, LiquidGlassTabs props), each row: prop · type · default · description.
7. **Requirements / caveats**: iOS 26 + Xcode 26 for real glass; not in Expo Go; Android caps native tabs at 5; gesture bar needs `GestureHandlerRootView` at the app root.
8. **License: MIT**.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with install, usage, props, and caveats"
```

---

## PHASE 5 — Publish prep (auth-gated)

### Task 14: Dry-run the publish

**Files:** none (verification).

- [ ] **Step 1: Pack and inspect contents**

```bash
npm pack --dry-run
```
Expected: the tarball includes `src/`, `lib/`, `README.md`, `LICENSE` and NOT `example/`, `docs/`, tests. If `example/` or `docs/` appear, fix the `files` allowlist.

- [ ] **Step 2: Verify the built entrypoints resolve**

```bash
node -e "require('./lib/commonjs/index.js'); console.log('cjs ok')"
node --input-type=module -e "import('./lib/module/index.js').then(()=>console.log('esm ok'))"
```
Expected: both print ok (they import React Native modules that are peerDeps; if Node can't resolve RN at runtime this step may warn — acceptable, the type/build artifacts existing is the gate).

- [ ] **Step 3: STOP — publish requires the user's npm auth**

Do NOT run `npm publish` autonomously. Report to the controller that the package is
publish-ready and the remaining steps need the user:
1. `npm login` (or an automation token) — the user runs `! npm login`.
2. Confirm email verified on npmjs.com.
3. Then: `npm publish --access public` (scoped packages need `--access public`).
4. GitHub: create `github.com/omarshayya/liquid-glass-tabs`, `git remote add origin`, `git push -u origin <branch>` — needs the user's GitHub auth.

- [ ] **Step 4: Tag the release locally (no push)**

```bash
git tag v0.1.0
git commit --allow-empty -m "chore: liquid-glass-tabs v0.1.0 publish-ready"
```

---

## Self-Review (author)

- **Spec coverage:** gesture model (Tasks 1-6), iOS parity minimizeBehavior+adapter (7-8), example (9), builder-bob restructure (10-12), README docs (13), publish prep+auth gate (14). ✓
- **Placeholder scan:** README task lists concrete sections (no "TBD"); every code task has full code. The only intentionally-deferred item is the actual `npm publish`/GitHub push, which is auth-gated by design and called out explicitly. ✓
- **Type consistency:** `liquidGlassTransform(pressed, overflowX, halfW)` signature matches between `liquidGlass.ts` (Task 1) and `ElasticPill` (Task 4). `TabBarGestureState` fields (`pillCenter/pressed/overflowX/stretch/hoveredIndex/gesture`) produced in Task 3 are consumed in Task 6. `enableGestures?` added to props in Task 6 Step 1. `hoveredIndex`/`index` added to `TabItem` in Task 5 and passed in Task 6. ✓
- **Known risks flagged for execution:** exact `NativeTabs` `minimizeBehavior` prop name (Task 7) and `@react-navigation/bottom-tabs` type availability (Task 8) are verify-against-installed-package steps; builder-bob babel preset choice (Task 11 Step 3) has a documented fallback.
