import {
  useDerivedValue,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';

export interface ScrollShrink {
  /** 0 = fully expanded, 1 = fully compact. */
  compact: SharedValue<number>;
  expandedHeight: number;
}

/**
 * Derives a 0..1 "compact" progress from a scroll position.
 * Scrolling down past `threshold` compacts the bar; scrolling back up expands it.
 * When `scrollY` is undefined, compact is pinned at 0 (feature disabled).
 */
export function useScrollShrink(
  scrollY: SharedValue<number> | undefined,
  expandedHeight: number,
  threshold = 120
): ScrollShrink {
  const fallback = useSharedValue(0);

  const compact = useDerivedValue(() => {
    if (!scrollY) return 0;
    const target = scrollY.value > threshold ? 1 : 0;
    return withTiming(target, { duration: 220 });
  }, [scrollY, threshold]);

  return { compact: scrollY ? compact : fallback, expandedHeight };
}

/** Helper for consumers: map compact -> animated dimensions. */
export function compactInterpolate(compact: number, from: number, to: number): number {
  'worklet';
  return interpolate(compact, [0, 1], [from, to], Extrapolation.CLAMP);
}
