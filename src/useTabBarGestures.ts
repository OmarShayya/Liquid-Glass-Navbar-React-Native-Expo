import { useCallback, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SPRING, SPRING_BOUNCY, hoveredIndexFromX, clamp } from './liquidGlass';
import { tabSelectionHaptic, tabCrossingHaptic } from './haptics';

export interface TabBarGestureState {
  pillCenter: SharedValue<number>;
  pressed: SharedValue<number>;
  overflowX: SharedValue<number>;
  stretch: SharedValue<number>;
  hoveredIndex: SharedValue<number>;
  gesture: ReturnType<typeof Gesture.Pan>;
}

interface Options {
  rowWidth: number;
  count: number;
  activeIndex: number;
  /** Commit a selection (JS thread). */
  onCommit: (index: number) => void;
  enabled: boolean;
}

export function useTabBarGestures({ rowWidth, count, activeIndex, onCommit, enabled }: Options): TabBarGestureState {
  const pillCenter = useSharedValue(0);
  const pressed = useSharedValue(0);
  const overflowX = useSharedValue(0);
  const stretch = useSharedValue(0);
  const hoveredIndex = useSharedValue(-1);

  const commit = useCallback((i: number) => onCommit(i), [onCommit]);

  const gesture = useMemo(() => {
    const slot = count > 0 ? rowWidth / count : 0;
    const half = slot / 2;
    const centerOf = (i: number) => slot * i + half;

    return Gesture.Pan()
      .enabled(enabled)
      .minDistance(0)
      .onBegin((e) => {
        pressed.value = withTiming(1, { duration: 90 });
        const i = hoveredIndexFromX(e.x, rowWidth, count);
        hoveredIndex.value = i;
        pillCenter.value = withSpring(clamp(e.x, half, rowWidth - half), SPRING);
      })
      .onUpdate((e) => {
        pillCenter.value = clamp(e.x, half, rowWidth - half);
        overflowX.value = e.x < 0 ? e.x : e.x > rowWidth ? e.x - rowWidth : 0;
        stretch.value = clamp(Math.abs(e.velocityX) / 3200, 0, 0.4);
        const i = hoveredIndexFromX(e.x, rowWidth, count);
        if (i !== hoveredIndex.value) {
          hoveredIndex.value = i;
          if (i >= 0) scheduleOnRN(tabCrossingHaptic);
        }
      })
      .onFinalize(() => {
        const i = hoveredIndex.value;
        pressed.value = withTiming(0, { duration: 140 });
        overflowX.value = withSpring(0, SPRING_BOUNCY);
        stretch.value = withTiming(0, { duration: 220 });
        if (i >= 0) {
          pillCenter.value = withSpring(centerOf(i), SPRING);
          scheduleOnRN(commit, i);
          scheduleOnRN(tabSelectionHaptic);
        } else {
          pillCenter.value = withSpring(centerOf(activeIndex), SPRING);
        }
        hoveredIndex.value = -1;
      });
  }, [rowWidth, count, activeIndex, enabled, commit]);

  return { pillCenter, pressed, overflowX, stretch, hoveredIndex, gesture };
}
