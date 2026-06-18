/**
 * Main entry — framework-agnostic. `LiquidGlassTabBar` is a controlled bar: use it directly, or
 * as a React Navigation `tabBar`. The file-based-router components are exported from the
 * "/router" subpath so apps without that router still bundle. See the README.
 */
export * from './types';
export { LiquidGlassTabBar } from './LiquidGlassTabBar';
export { GlassSurface } from './GlassSurface';
export { useScrollShrink } from './useScrollShrink';
