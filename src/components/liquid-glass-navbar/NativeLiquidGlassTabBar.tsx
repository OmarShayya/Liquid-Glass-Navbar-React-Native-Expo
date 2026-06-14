import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { AndroidSymbol } from 'expo-symbols';
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
          <NativeTabs.Trigger.Icon sf={t.sf as SFSymbol} md={t.md as AndroidSymbol} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
