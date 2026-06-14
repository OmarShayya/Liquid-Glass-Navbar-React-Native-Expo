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
