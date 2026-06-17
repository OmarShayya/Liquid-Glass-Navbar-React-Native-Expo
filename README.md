# @omarshayya/liquid-glass-tabs

Apple **iOS 26 Liquid Glass** tab bars for **Expo & React Native** — the real native system
tab bar on iOS, and a gesture-driven custom bar (elastic pill, Telegram-style icon tint,
scroll-to-minimize) that looks the part on Android too.

```bash
npm install @omarshayya/liquid-glass-tabs
```

## Demo

> A demo recording is coming soon. To try it now, run the example app:
> `cd example && npx expo run:ios` — press-and-hold the pill and drag between tabs, and tap to
> see icons animate.

## Features

- **Real iOS 26 Liquid Glass** via Apple's own system tab bar (Expo Router `NativeTabs`)
- **Gesture-driven custom bar** — tap to switch, or press-and-hold and drag the pill between
  tabs with an elastic stretch-and-settle, crossing haptics, and a glass surface
- **Telegram-style tint** that tracks the pill
- **Scroll-to-minimize** (shrinks into a compact pill as you scroll)
- **Any icons** (render-prop), **any number of tabs** (even dynamic), **light & dark** out of the box

## Install

```bash
npm install @omarshayya/liquid-glass-tabs
# peer dependencies (Expo):
npx expo install react-native-reanimated react-native-gesture-handler react-native-worklets \
  expo-blur expo-linear-gradient expo-glass-effect expo-haptics \
  @react-native-masked-view/masked-view react-native-safe-area-context
# expo-router is only needed for NativeLiquidGlassTabBar / LiquidGlassTabs
```

Wrap your app root in `GestureHandlerRootView` (required for the gesture bar):

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// <GestureHandlerRootView style={{ flex: 1 }}>...</GestureHandlerRootView>
```

## Which component?

| Component | What it is | Platforms | Needs Expo Router |
|---|---|---|---|
| `LiquidGlassTabBar` | Controlled custom bar (gesture pill + tint + scroll-shrink) | iOS + Android | No |
| `NativeLiquidGlassTabBar` | Apple's real iOS 26 system Liquid Glass tab bar | iOS (Android → Material) | Yes |
| `LiquidGlassTabs` | Auto-switch: native bar on iOS, custom bar on Android | iOS + Android | Yes |

## Usage

### `LiquidGlassTabBar` (controlled, works anywhere)

```tsx
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSharedValue } from 'react-native-reanimated';
import { LiquidGlassTabBar } from '@omarshayya/liquid-glass-tabs';

const TABS = [
  { key: 'home',   icon: (on, c) => <Ionicons name={on ? 'home' : 'home-outline'} size={24} color={c} /> },
  { key: 'search', icon: (on, c) => <Ionicons name={on ? 'search' : 'search-outline'} size={24} color={c} /> },
  { key: 'me',     icon: (on, c) => <Ionicons name={on ? 'person' : 'person-outline'} size={24} color={c} /> },
];

function Bar() {
  const [active, setActive] = useState('home');
  const scrollY = useSharedValue(0); // optional — enables scroll-to-minimize
  return <LiquidGlassTabBar tabs={TABS} activeKey={active} onChange={setActive} scrollY={scrollY} />;
}
```

### Animated icons (selected-state animations)

The `icon` render-prop receives `(active, color, progress)`. There are two ways to animate the
icon when its tab is selected — like Telegram's icons that react on tap:

**1. One-shot on select** — trigger an animation when `active` flips (great for Lottie, e.g. a
phone that "rings" on select):

```tsx
import LottieView from 'lottie-react-native';
import { useRef, useEffect } from 'react';

function RingingPhone({ active, color }: { active: boolean; color: string }) {
  const ref = useRef<LottieView>(null);
  useEffect(() => { if (active) ref.current?.play(); }, [active]);
  return <LottieView ref={ref} source={require('./phone.json')} loop={false} style={{ width: 26, height: 26 }} colorFilters={[{ keypath: '*', color }]} />;
}

const TABS = [
  { key: 'calls', icon: (active, color) => <RingingPhone active={active} color={color} /> },
  // ...
];
```

**2. Progress-driven** — drive a smooth Reanimated animation off `progress` (0→1 as the pill
arrives), e.g. a heart that scales up when selected:

```tsx
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

function PulseHeart({ active, color, progress }: { active: boolean; color: string; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + progress.value * 0.25 }] }));
  return <Animated.View style={style}><Ionicons name={active ? 'heart' : 'heart-outline'} size={24} color={color} /></Animated.View>;
}

const TABS = [
  { key: 'liked', icon: (active, color, progress) => <PulseHeart active={active} color={color} progress={progress} /> },
  // ...
];
```

Plain icons that ignore the extra args keep working — animation is fully opt-in.

### `NativeLiquidGlassTabBar` (real Apple bar) — in an Expo Router `app/(tabs)/_layout.tsx`

```tsx
import { NativeLiquidGlassTabBar } from '@omarshayya/liquid-glass-tabs';

export default function TabsLayout() {
  return (
    <NativeLiquidGlassTabBar
      minimizeBehavior="onScrollDown"
      tabs={[
        { name: 'index',   title: 'Home',    sf: 'house.fill',         md: 'home' },
        { name: 'search',  title: 'Search',  sf: 'magnifyingglass',    md: 'search' },
        { name: 'profile', title: 'Profile', sf: 'person.crop.circle', md: 'person' },
      ]}
    />
  );
}
```

### `LiquidGlassTabs` (auto-switch per platform) — in an Expo Router `_layout.tsx`

```tsx
import { Ionicons } from '@expo/vector-icons';
import { LiquidGlassTabs } from '@omarshayya/liquid-glass-tabs';

export default function Layout() {
  return (
    <LiquidGlassTabs
      accentColor="#0A84FF"
      nativeTabs={[
        { name: 'index',  title: 'Home',   sf: 'house.fill',      md: 'home' },
        { name: 'search', title: 'Search', sf: 'magnifyingglass', md: 'search' },
      ]}
      customTabs={[
        { key: 'index',  icon: (on, c) => <Ionicons name={on ? 'home' : 'home-outline'} size={24} color={c} /> },
        { key: 'search', icon: (on, c) => <Ionicons name={on ? 'search' : 'search-outline'} size={24} color={c} /> },
      ]}
    />
  );
}
```

## Props

### `LiquidGlassTabBar`

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` | `{ key: string; icon: (active, color, progress) => ReactNode }[]` | — | Tab list. `icon` is a render-prop — use any icon. `progress` (0→1 shared value) lets you animate the icon on select (see [Animated icons](#animated-icons-selected-state-animations)). |
| `activeKey` | `string` | — | Key of the active tab. |
| `onChange` | `(key: string) => void` | — | Called when a tab is selected. |
| `scrollY` | `SharedValue<number>` | — | Optional. Drives scroll-to-minimize. |
| `accentColor` | `string` | `#0A84FF` | Active icon + pill color. |
| `inactiveColor` | `string` | auto (light/dark) | Inactive icon color. |
| `tintColor` | `string` | — | Glass tint. |
| `colorScheme` | `'light' \| 'dark' \| 'system'` | `system` | Forces glass/colors light or dark. |
| `bottomInset` | `number` | `0` | Safe-area bottom padding. |
| `enableGestures` | `boolean` | `true` | Press-hold-drag gesture on the pill. |

### `NativeLiquidGlassTabBar`

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` | `{ name; title; sf; md }[]` | — | `name` matches the route file; `sf`/`md` are SF Symbol / Material icon names. |
| `minimizeBehavior` | `'automatic' \| 'never' \| 'onScrollDown' \| 'onScrollUp'` | `onScrollDown` | Native scroll-minimize. |

### `LiquidGlassTabs`

| Prop | Type | Description |
|---|---|---|
| `nativeTabs` | `{ name; title; sf; md }[]` | iOS tab config. |
| `customTabs` | `{ key; icon }[]` | Android tab config (keys match route names). |
| `accentColor` | `string` | Android pill/accent color. |
| `minimizeBehavior` | see above | iOS scroll-minimize. |

## Requirements & notes

- The **genuine Liquid Glass material** only renders on an **iOS 26 simulator/device built with
  Xcode 26**. It does not appear in Expo Go. On older iOS / Android the custom bar falls back to
  a blur-based glass; the native bar falls back to the standard system tab bar.
- `NativeLiquidGlassTabBar` / `LiquidGlassTabs` require **Expo Router** (SDK 54+). Android caps
  native tabs at 5.

## License

MIT © Omar Shayya
