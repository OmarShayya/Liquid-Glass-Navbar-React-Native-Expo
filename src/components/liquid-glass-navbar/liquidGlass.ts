import { interpolate, Extrapolation } from 'react-native-reanimated';

export const SPRING = { damping: 22, stiffness: 220, mass: 0.8 } as const;
export const SPRING_BOUNCY = { damping: 18, stiffness: 260, mass: 0.7 } as const;

const MAX_PULL = 56;
const MAX_STRETCH = 0.18;
const MAX_COMPRESS = 0.12;

/** Index of the tab slot containing row-local x, or -1 when out of the row. */
export function hoveredIndexFromX(x: number, rowWidth: number, count: number): number {
  'worklet';
  if (count <= 0 || rowWidth <= 0) return -1;
  if (x < 0 || x > rowWidth) return -1;
  const slot = rowWidth / count;
  return Math.min(count - 1, Math.max(0, Math.floor(x / slot)));
}

export function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Damped elastic transform for the pill. `pressed` (0..1) adds a subtle grow;
 * `overflowX` (px past the row edge) bends the pill toward the pull with a
 * diminishing-returns curve, stretching along X and compressing along Y.
 */
export function liquidGlassTransform(
  pressed: number,
  overflowX: number,
  halfW: number
): { scaleX: number; scaleY: number; translateX: number } {
  'worklet';
  const pressScale = interpolate(pressed, [0, 1], [1, 1.04], Extrapolation.CLAMP);
  const sign = overflowX < 0 ? -1 : 1;
  const damped = sign * MAX_PULL * (1 - 1 / (Math.abs(overflowX) / MAX_PULL + 1));
  const stretch = interpolate(Math.abs(damped), [0, MAX_PULL], [0, MAX_STRETCH], Extrapolation.CLAMP);
  const compress = interpolate(Math.abs(damped), [0, MAX_PULL], [0, MAX_COMPRESS], Extrapolation.CLAMP);
  return {
    translateX: sign * halfW * stretch,
    scaleX: pressScale * (1 + stretch),
    scaleY: pressScale * (1 - compress),
  };
}
