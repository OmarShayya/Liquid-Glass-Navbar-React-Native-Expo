import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { GlassSurface } from './GlassSurface';
import { ElasticPill } from './ElasticPill';
import { TabItem } from './TabItem';
import { useScrollShrink, compactInterpolate } from './useScrollShrink';
import { tabSelectionHaptic } from './haptics';
import type { LiquidGlassTabBarProps } from './types';

const H_PADDING = 6;
const EXPANDED_HEIGHT = 64;
const PILL_HEIGHT = 44;

export function LiquidGlassTabBar({
  tabs,
  activeKey,
  onChange,
  scrollY,
  accentColor = '#0A84FF',
  inactiveColor = 'rgba(60,60,67,0.6)',
  tintColor,
  colorScheme = 'system',
  bottomInset = 0,
}: LiquidGlassTabBarProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const centers = useRef<Record<string, number>>({});
  const pillCenter = useSharedValue(0);

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeKey));
  const tabSlot = rowWidth > 0 ? rowWidth / tabs.length : 0;
  const targetCenterX = tabSlot * activeIndex + tabSlot / 2;
  const pillWidth = Math.max(44, tabSlot - 10);

  const { compact } = useScrollShrink(scrollY, EXPANDED_HEIGHT);

  const containerStyle = useAnimatedStyle(() => ({
    height: compactInterpolate(compact.value, EXPANDED_HEIGHT, 50),
  }));

  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    setRowWidth(e.nativeEvent.layout.width);
  }, []);

  const handlePress = useCallback(
    (key: string) => {
      if (key !== activeKey) {
        tabSelectionHaptic();
        onChange(key);
      }
    },
    [activeKey, onChange]
  );

  // proximity per tab: 1 when pill center is over the tab center, fading with distance.
  const proximities = tabs.map((t) =>
    useDerivedValue(() => {
      const c = centers.current[t.key];
      if (c == null || tabSlot === 0) return t.key === activeKey ? 1 : 0;
      const d = Math.abs(pillCenter.value - c);
      return Math.max(0, 1 - d / (tabSlot * 0.9));
    }, [tabSlot, activeKey])
  );

  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset }]} pointerEvents="box-none">
      <Animated.View style={[styles.container, containerStyle]}>
        <GlassSurface
          borderRadius={32}
          tintColor={tintColor}
          colorScheme={colorScheme}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.row} onLayout={onRowLayout}>
            {rowWidth > 0 && (
              <ElasticPill
                targetCenterX={targetCenterX}
                width={pillWidth}
                height={PILL_HEIGHT}
                color={hexWithAlpha(accentColor, 0.18)}
                centerXOut={pillCenter}
              />
            )}
            {tabs.map((tab, i) => (
              <TabItem
                key={tab.key}
                tab={tab}
                proximity={proximities[i]}
                accentColor={accentColor}
                inactiveColor={inactiveColor}
                onPress={() => handlePress(tab.key)}
                onLayoutCenter={(cx) => {
                  centers.current[tab.key] = cx;
                }}
              />
            ))}
          </View>
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

/** Add alpha to a #RRGGBB color (used to make a translucent pill from the accent). */
function hexWithAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  container: {
    width: '92%',
    marginBottom: 18,
    borderRadius: 32,
    overflow: 'visible',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PADDING,
  },
});
