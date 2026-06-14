import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

interface Props {
  /** Target center-x of the active tab, in row coordinates. */
  targetCenterX: number;
  width: number;
  height: number;
  color: string;
  /** Shared output: live pill center-x, consumed by TabItems for proximity. */
  centerXOut: SharedValue<number>;
}

const SPRING = { damping: 14, stiffness: 180, mass: 0.9 } as const;

/**
 * Pill that springs toward the active tab and squishes (stretch in X, compress in Y)
 * during travel, then relaxes — the "liquid" feel.
 */
export function ElasticPill({ targetCenterX, width, height, color, centerXOut }: Props) {
  const centerX = useSharedValue(targetCenterX);
  const squish = useSharedValue(0); // 0 rest .. 1 mid-travel

  useEffect(() => {
    // squish out then back while the spring travels
    squish.value = withSequence(
      withTiming(1, { duration: 130 }),
      withTiming(0, { duration: 240 })
    );
    centerX.value = withSpring(targetCenterX, SPRING);
  }, [targetCenterX, centerX, squish]);

  // keep parent's shared center in sync for proximity calc.
  // useDerivedValue runs reactively on the UI thread whenever centerX changes,
  // independent of view attachment (unlike a side-effecting useAnimatedStyle).
  useDerivedValue(() => {
    centerXOut.value = centerX.value;
  });

  const style = useAnimatedStyle(() => ({
    width,
    height,
    borderRadius: height / 2,
    backgroundColor: color,
    transform: [
      { translateX: centerX.value - width / 2 },
      { scaleX: 1 + squish.value * 0.5 },
      { scaleY: 1 - squish.value * 0.22 },
    ],
  }));

  return <Animated.View pointerEvents="none" style={[styles.pill, style]} />;
}

const styles = StyleSheet.create({
  pill: { position: 'absolute', left: 0, top: '50%', marginTop: -1 },
});
