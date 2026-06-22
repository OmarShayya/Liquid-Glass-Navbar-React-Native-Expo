import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export type ColorSchemePref = 'light' | 'dark' | 'system';

export interface TabDescriptor {
  /** Stable unique key, also used by onChange. */
  key: string;
  /**
   * Render the icon.
   * - `active`: whether this tab is selected — swap filled/outline or trigger a one-shot
   *   animation (e.g. a Lottie that rings on select) with a `useEffect` on this flag.
   * - `color`: the resolved tint for the current state.
   * - `progress`: a 0→1 shared value of how "selected" this tab is (tracks the pill). Drive
   *   smooth Reanimated animations off `progress.value` (scale, rotate, etc.). Optional to use.
   */
  icon: (active: boolean, color: string, progress: SharedValue<number>) => ReactNode;
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
  /** Optional badge value shown on the tab (e.g. an unread count). */
  badge?: string;
}
