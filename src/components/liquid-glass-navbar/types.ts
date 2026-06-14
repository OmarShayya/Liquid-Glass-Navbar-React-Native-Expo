import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export type ColorSchemePref = 'light' | 'dark' | 'system';

export interface TabDescriptor {
  /** Stable unique key, also used by onChange. */
  key: string;
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
  /** Enable press-hold-drag gesture on the pill (default true). */
  enableGestures?: boolean;
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
