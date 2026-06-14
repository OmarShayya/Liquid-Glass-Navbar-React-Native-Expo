/**
 * Liquid Glass Navbar — reusable Expo/React Native tab bars.
 *
 * To reuse: copy this `liquid-glass-navbar/` folder into your app's components.
 * Peer deps (install with `npx expo install`): react-native-reanimated,
 * react-native-gesture-handler, react-native-worklets, expo-blur,
 * expo-linear-gradient, expo-glass-effect, expo-haptics,
 * @react-native-masked-view/masked-view, react-native-safe-area-context.
 * NativeLiquidGlassTabBar additionally requires expo-router (SDK 54+).
 *
 * Cross-platform custom bar:
 *   const [active, setActive] = useState('home');
 *   const scrollY = useSharedValue(0); // optional, enables shrink/expand
 *   <LiquidGlassTabBar
 *     tabs={[{ key: 'home', icon: (on, c) => <Ionicons name={on ? 'home' : 'home-outline'} color={c} size={24} /> }]}
 *     activeKey={active}
 *     onChange={setActive}
 *     scrollY={scrollY}
 *   />
 *
 * Native iOS (Apple's system liquid glass tab bar) — use inside an Expo Router _layout.tsx:
 *   <NativeLiquidGlassTabBar tabs={[{ name: 'index', title: 'Home', sf: 'house.fill', md: 'home' }]} />
 */
export * from './types';
export { LiquidGlassTabBar } from './LiquidGlassTabBar';
export { NativeLiquidGlassTabBar } from './NativeLiquidGlassTabBar';
export { LiquidGlassTabs } from './LiquidGlassTabs';
export { GlassSurface } from './GlassSurface';
export { useScrollShrink } from './useScrollShrink';
