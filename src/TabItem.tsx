import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { TabDescriptor } from './types';

interface Props {
  tab: TabDescriptor;
  index: number;
  /** Tab count + row width define this tab's uniform slot center. */
  count: number;
  rowWidth: number;
  /** Live pill center-x (resting spring or gesture). */
  pillCenter: SharedValue<number>;
  /** Index hovered by an active drag, or -1 when not dragging. */
  hoveredIndex: SharedValue<number>;
  accentColor: string;
  inactiveColor: string;
  onPress: () => void;
}

/**
 * Tint strength is computed PER INSTANCE (one useDerivedValue here, not a hooks-in-a-loop in
 * the parent) so the tab count can be any size — even change at runtime — without breaking the
 * Rules of Hooks.
 */
export function TabItem({
  tab, index, count, rowWidth, pillCenter, hoveredIndex, accentColor, inactiveColor, onPress,
}: Props) {
  const pressScale = useSharedValue(1);

  const tint = useDerivedValue(() => {
    if (hoveredIndex.value >= 0) return hoveredIndex.value === index ? 1 : 0;
    if (count <= 0 || rowWidth <= 0) return 0;
    const slot = rowWidth / count;
    const center = slot * index + slot / 2;
    return Math.max(0, 1 - Math.abs(pillCenter.value - center) / (slot * 0.9));
  });

  const activeLayer = useAnimatedStyle(() => ({ opacity: tint.value }));
  const inactiveLayer = useAnimatedStyle(() => ({ opacity: 1 - tint.value }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      onPressIn={() => (pressScale.value = withTiming(0.86, { duration: 90 }))}
      onPressOut={() => (pressScale.value = withTiming(1, { duration: 140 }))}
      onPress={onPress}
      style={styles.item}
    >
      <Animated.View style={scaleStyle}>
        <View style={styles.iconStack}>
          <Animated.View style={inactiveLayer}>{tab.icon(false, inactiveColor, tint)}</Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, activeLayer]}>
            {tab.icon(true, accentColor, tint)}
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
