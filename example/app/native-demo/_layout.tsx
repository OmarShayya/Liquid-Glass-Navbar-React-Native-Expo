import { NativeLiquidGlassTabBar } from 'expo-liquid-glass-tabs';

export default function NativeDemoLayout() {
  return (
    <NativeLiquidGlassTabBar
      tabs={[
        { name: 'index',   title: 'Home',    sf: 'house.fill',           md: 'home' },
        { name: 'search',  title: 'Search',  sf: 'magnifyingglass',      md: 'search' },
        { name: 'profile', title: 'Profile', sf: 'person.crop.circle',   md: 'person' },
      ]}
    />
  );
}
