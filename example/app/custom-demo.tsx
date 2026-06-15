import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LiquidGlassTabBar } from '@omarshayya/liquid-glass-tabs';

// Progress-driven animated icon: scales up + tilts as the tab becomes selected.
function AnimatedHeart({ active, color, progress }: { active: boolean; color: string; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.3 }, { rotate: `${progress.value * 12}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <Ionicons name={active ? 'heart' : 'heart-outline'} size={24} color={color} />
    </Animated.View>
  );
}

const TABS = [
  { key: 'home',   icon: (a: boolean, c: string) => <Ionicons name={a ? 'home' : 'home-outline'} size={24} color={c} /> },
  { key: 'search', icon: (a: boolean, c: string) => <Ionicons name={a ? 'search' : 'search-outline'} size={24} color={c} /> },
  { key: 'liked',  icon: (a: boolean, c: string, p: SharedValue<number>) => <AnimatedHeart active={a} color={c} progress={p} /> },
  { key: 'me',     icon: (a: boolean, c: string) => <Ionicons name={a ? 'person' : 'person-outline'} size={24} color={c} /> },
];

const COLORS = ['#ff7eb3', '#ff9966', '#7afcff', '#4f9dff', '#b388ff', '#69f0ae'];

export default function CustomDemo() {
  const [active, setActive] = useState('home');
  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 140 }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <View key={i} style={[styles.card, { backgroundColor: COLORS[i % COLORS.length] }]}>
            <Text style={styles.cardText}>Card {i + 1}</Text>
          </View>
        ))}
      </Animated.ScrollView>

      <LiquidGlassTabBar
        tabs={TABS}
        activeKey={active}
        onChange={setActive}
        scrollY={scrollY}
        accentColor="#0A84FF"
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 90, marginHorizontal: 16, marginTop: 14, borderRadius: 18, justifyContent: 'center', paddingHorizontal: 18 },
  cardText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
