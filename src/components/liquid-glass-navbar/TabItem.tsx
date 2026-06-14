import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { TabDescriptor } from './types';

interface Props {
  tab: TabDescriptor;
  /** 0..1 — how centered the moving pill is over this tab. */
  proximity: SharedValue<number>;
  accentColor: string;
  inactiveColor: string;
  onPress: () => void;
  /** Reports this tab's horizontal center (relative to the row) once laid out. */
  onLayoutCenter: (centerX: number) => void;
}

export function TabItem({ tab, proximity, accentColor, inactiveColor, onPress, onLayoutCenter }: Props) {
  const pressScale = useSharedValue(1);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      onLayoutCenter(x + width / 2);
    },
    [onLayoutCenter]
  );

  const activeLayer = useAnimatedStyle(() => ({ opacity: proximity.value }));
  const inactiveLayer = useAnimatedStyle(() => ({ opacity: 1 - proximity.value }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      onLayout={onLayout}
      onPressIn={() => (pressScale.value = withTiming(0.86, { duration: 90 }))}
      onPressOut={() => (pressScale.value = withTiming(1, { duration: 140 }))}
      onPress={onPress}
      style={styles.item}
    >
      <Animated.View style={scaleStyle}>
        <View style={styles.iconStack}>
          <Animated.View style={inactiveLayer}>{tab.icon(false, inactiveColor)}</Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, activeLayer]}>
            {tab.icon(true, accentColor)}
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  iconStack: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
