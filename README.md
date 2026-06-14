# Liquid Glass Tabs

Apple **iOS 26 Liquid Glass** tab bars for **Expo & React Native** — the real native system
tab bar on iOS, and a gesture-driven custom bar (elastic pill, Telegram-style icon tint,
scroll-to-minimize) that looks the part on Android too.

> 🚧 **Work in progress.** Built in the open. Not yet published to npm — packaging as
> `@omarshayya/liquid-glass-tabs` is underway.

## Why

iOS 26 introduced Liquid Glass — the translucent, refractive material Apple, Telegram and Slack
use for their tab bars. This library gives you two ways to get it:

- **`NativeLiquidGlassTabBar`** — renders Apple's *actual* system tab bar via Expo Router, so on
  iOS 26 you get the genuine Liquid Glass material and Apple's own animations (100% native).
- **`LiquidGlassTabBar`** — a fully custom, controlled bar that recreates the look with
  `expo-blur` + a native glass surface, and adds a gesture-driven elastic pill: **tap** to
  switch, or **press-and-hold and drag** to fling the pill between tabs with a liquid
  stretch-and-settle. Works on iOS and Android.

## Features

- Real iOS 26 Liquid Glass on iOS (native), graceful blur-glass fallback elsewhere
- Gesture-driven elastic pill: press-hold-drag, follow-finger, elastic deformation, haptics
- Telegram-style icon tint that tracks the pill
- Scroll-to-minimize (shrinks into a compact pill as you scroll)
- Any icons (render-prop), any number of tabs, light & dark out of the box

## Status / roadmap

- [x] Native iOS Liquid Glass tab bar (Expo Router `NativeTabs`)
- [x] Custom cross-platform glass bar (blur + native glass surface)
- [x] Elastic pill + Telegram-style tint + scroll-minimize
- [~] Press-hold-drag gesture engine
- [ ] Expo Router auto-switch adapter (`LiquidGlassTabs`)
- [ ] Package & publish to npm
- [ ] Full API docs

## Requirements

- Expo SDK 54+ (built on SDK 56)
- The genuine Liquid Glass material only renders on an **iOS 26 simulator/device built with
  Xcode 26** — it does not appear in Expo Go. On older iOS / Android the custom bar falls back
  to a blur-based glass.

## Running the example

```bash
npm install
npx expo run:ios   # iOS 26 simulator to see the real glass
# or: npx expo start  → press i / a
```

## License

MIT © Omar Shayya
