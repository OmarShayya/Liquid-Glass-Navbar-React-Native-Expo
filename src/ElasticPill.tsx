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
import { liquidGlassTransform, SPRING } from './liquidGlass';

interface Props {
  targetCenterX: number;
  width: number;
  height: number;
  color: string;
  /** Live pill center-x output (consumed by TabItems for proximity). */
  centerXOut: SharedValue<number>;
  /** Optional gesture inputs. When provided, the pill follows them. */
  pillCenter?: SharedValue<number>;
  pressed?: SharedValue<number>;
  overflowX?: SharedValue<number>;
  stretch?: SharedValue<number>;
}

export function ElasticPill({
  targetCenterX,
  width,
  height,
  color,
  centerXOut,
  pillCenter,
  pressed,
  overflowX,
  stretch,
}: Props) {
  // Internal spring position used only when there is no external gesture position.
  const selfCenter = useSharedValue(targetCenterX);
  const squish = useSharedValue(0);

  useEffect(() => {
    if (pillCenter) return; // gesture owns position
    squish.value = withSequence(withTiming(1, { duration: 130 }), withTiming(0, { duration: 240 }));
    selfCenter.value = withSpring(targetCenterX, SPRING);
  }, [targetCenterX, pillCenter, selfCenter, squish]);

  // Publish the live center (gesture position if present, else internal spring).
  useDerivedValue(() => {
    centerXOut.value = pillCenter ? pillCenter.value : selfCenter.value;
  });

  const style = useAnimatedStyle(() => {
    const cx = pillCenter ? pillCenter.value : selfCenter.value;
    const p = pressed ? pressed.value : 0;
    const ov = overflowX ? overflowX.value : 0;
    const st = stretch ? stretch.value : 0;
    const t = liquidGlassTransform(p, ov, width / 2);
    const seq = squish.value;
    return {
      width,
      height,
      borderRadius: height / 2,
      backgroundColor: color,
      marginTop: -height / 2,
      transform: [
        { translateX: cx - width / 2 + t.translateX },
        { scaleX: t.scaleX * (1 + st + seq * 0.5) },
        { scaleY: t.scaleY * (1 - seq * 0.18) },
      ],
    };
  });

  return <Animated.View pointerEvents="none" style={[styles.pill, style]} />;
}

const styles = StyleSheet.create({
  pill: { position: 'absolute', left: 0, top: '50%' },
});
