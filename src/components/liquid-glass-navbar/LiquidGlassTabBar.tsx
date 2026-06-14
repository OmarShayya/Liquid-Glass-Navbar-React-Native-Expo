import React, { useCallback, useState } from 'react';
import { StyleSheet, View, LayoutChangeEvent, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { GlassSurface } from './GlassSurface';
import { ElasticPill } from './ElasticPill';
import { TabItem } from './TabItem';
import { useScrollShrink, compactInterpolate } from './useScrollShrink';
import { useTabBarGestures } from './useTabBarGestures';
import { tabSelectionHaptic } from './haptics';
import type { LiquidGlassTabBarProps } from './types';

const H_PADDING = 6;
const EXPANDED_HEIGHT = 64;
const COMPACT_HEIGHT = 50;
const PILL_HEIGHT = 44;

export function LiquidGlassTabBar({
  tabs,
  activeKey,
  onChange,
  scrollY,
  accentColor = '#0A84FF',
  inactiveColor,
  tintColor,
  colorScheme = 'system',
  bottomInset = 0,
  enableGestures = true,
}: LiquidGlassTabBarProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const liveCenter = useSharedValue(0); // published by ElasticPill (gesture or resting spring)

  // Resolve light/dark so default colors look right with zero config.
  const systemScheme = useColorScheme();
  const effectiveScheme = colorScheme === 'system' ? (systemScheme ?? 'light') : colorScheme;
  const resolvedInactive =
    inactiveColor ?? (effectiveScheme === 'dark' ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)');

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeKey));
  const tabSlot = rowWidth > 0 ? rowWidth / tabs.length : 0;
  const targetCenterX = tabSlot * activeIndex + tabSlot / 2;
  const pillWidth = Math.max(44, tabSlot - 10);

  const { compact, expandedHeight } = useScrollShrink(scrollY, EXPANDED_HEIGHT);
  const containerStyle = useAnimatedStyle(() => ({
    height: compactInterpolate(compact.value, expandedHeight, COMPACT_HEIGHT),
  }));

  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    setRowWidth(e.nativeEvent.layout.width);
  }, []);

  const commitIndex = useCallback(
    (i: number) => {
      const tab = tabs[i];
      if (tab && tab.key !== activeKey) {
        tabSelectionHaptic();
        onChange(tab.key);
      }
    },
    [tabs, activeKey, onChange]
  );

  const { pillCenter, pressed, overflowX, stretch, hoveredIndex, gesture } = useTabBarGestures({
    rowWidth,
    count: tabs.length,
    activeIndex,
    onCommit: commitIndex,
    enabled: enableGestures && rowWidth > 0,
  });

  const row = (
    <View style={styles.row} onLayout={onRowLayout}>
      {rowWidth > 0 && (
        <ElasticPill
          targetCenterX={targetCenterX}
          width={pillWidth}
          height={PILL_HEIGHT}
          color={hexWithAlpha(accentColor, 0.18)}
          centerXOut={liveCenter}
          pillCenter={enableGestures ? pillCenter : undefined}
          pressed={enableGestures ? pressed : undefined}
          overflowX={enableGestures ? overflowX : undefined}
          stretch={enableGestures ? stretch : undefined}
        />
      )}
      {tabs.map((tab, i) => (
        <TabItem
          key={tab.key}
          tab={tab}
          index={i}
          count={tabs.length}
          rowWidth={rowWidth}
          pillCenter={liveCenter}
          hoveredIndex={hoveredIndex}
          accentColor={accentColor}
          inactiveColor={resolvedInactive}
          onPress={() => commitIndex(i)}
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset }]} pointerEvents="box-none">
      <Animated.View style={[styles.container, containerStyle]}>
        <GlassSurface borderRadius={32} tintColor={tintColor} colorScheme={colorScheme} style={StyleSheet.absoluteFill}>
          {enableGestures ? <GestureDetector gesture={gesture}>{row}</GestureDetector> : row}
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  container: { width: '92%', marginBottom: 18, borderRadius: 32, overflow: 'visible' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: H_PADDING },
});
