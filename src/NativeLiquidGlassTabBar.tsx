import React from 'react';
import type { ColorValue } from 'react-native';
import {
  NativeTabs,
  type NativeTabsBlurEffect,
  type NativeTabsLabelStyle,
} from 'expo-router/unstable-native-tabs';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { NativeTabDescriptor } from './types';

type MinimizeBehavior = 'automatic' | 'never' | 'onScrollDown' | 'onScrollUp';

interface Props {
  tabs: NativeTabDescriptor[];
  /** iOS 26: collapse the bar into a pill on scroll. Default 'onScrollDown'. */
  minimizeBehavior?: MinimizeBehavior;
  /** Selected (active) icon/label tint — your accent color. */
  tintColor?: ColorValue;
  /** Unselected icon color. */
  iconColor?: ColorValue;
  /** Tab-bar background color. */
  backgroundColor?: ColorValue;
  /**
   * The glass material. Set this to honor a *manual* light/dark toggle that doesn't follow the
   * system, e.g. `isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'`.
   * Omit to let the system pick automatically.
   */
  blurEffect?: NativeTabsBlurEffect;
  /** Label text style (font, size, color, …). */
  labelStyle?: NativeTabsLabelStyle;
  /** Background color of every badge. */
  badgeBackgroundColor?: ColorValue;
  /** Text color of every badge. */
  badgeTextColor?: ColorValue;
}

/**
 * Apple's genuine iOS 26 system liquid glass tab bar via Expo Router NativeTabs.
 * Route files referenced by `tab.name` must exist in the same router group.
 * Use inside an Expo Router `_layout.tsx`. All styling props are optional — omit them for the
 * system's automatic theming.
 */
export function NativeLiquidGlassTabBar({
  tabs,
  minimizeBehavior = 'onScrollDown',
  tintColor,
  iconColor,
  backgroundColor,
  blurEffect,
  labelStyle,
  badgeBackgroundColor,
  badgeTextColor,
}: Props) {
  return (
    <NativeTabs
      minimizeBehavior={minimizeBehavior}
      tintColor={tintColor}
      iconColor={iconColor}
      backgroundColor={backgroundColor}
      blurEffect={blurEffect}
      labelStyle={labelStyle}
      badgeBackgroundColor={badgeBackgroundColor}
      badgeTextColor={badgeTextColor}
    >
      {tabs.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Icon sf={t.sf as SFSymbol} md={t.md as never} />
          <NativeTabs.Trigger.Label>{t.title}</NativeTabs.Trigger.Label>
          {t.badge != null ? (
            <NativeTabs.Trigger.Badge>{t.badge}</NativeTabs.Trigger.Badge>
          ) : null}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
