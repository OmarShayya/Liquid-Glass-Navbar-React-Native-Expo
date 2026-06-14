import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeLiquidGlassTabBar } from './NativeLiquidGlassTabBar';
import { LiquidGlassTabBar } from './LiquidGlassTabBar';
import type { NativeTabDescriptor, TabDescriptor } from './types';

/**
 * Derive the tabBar callback prop type from the `Tabs` component itself so it
 * matches the `BottomTabBarProps` flavour expo-router actually passes (its
 * bundled @react-navigation copy), avoiding a dual-package type clash.
 */
type TabsTabBarProp = NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>;
type BottomTabBarProps = Parameters<TabsTabBarProp>[0];

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
