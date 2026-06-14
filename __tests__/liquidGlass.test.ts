import { hoveredIndexFromX, clamp, liquidGlassTransform } from '../src/components/liquid-glass-navbar/liquidGlass';

test('hoveredIndexFromX maps x to the right slot, -1 when out of range', () => {
  expect(hoveredIndexFromX(50, 300, 3)).toBe(0);
  expect(hoveredIndexFromX(150, 300, 3)).toBe(1);
  expect(hoveredIndexFromX(250, 300, 3)).toBe(2);
  expect(hoveredIndexFromX(-5, 300, 3)).toBe(-1);
  expect(hoveredIndexFromX(305, 300, 3)).toBe(-1);
});

test('clamp bounds a value', () => {
  expect(clamp(5, 0, 10)).toBe(5);
  expect(clamp(-1, 0, 10)).toBe(0);
  expect(clamp(99, 0, 10)).toBe(10);
});

test('liquidGlassTransform stretches more with larger overflow and compresses perpendicular', () => {
  const none = liquidGlassTransform(0, 0, 30);
  expect(none.scaleX).toBeCloseTo(1, 5);
  expect(none.translateX).toBeCloseTo(0, 5);
  const pulled = liquidGlassTransform(1, 80, 30);
  expect(pulled.scaleX).toBeGreaterThan(1);
  expect(pulled.scaleY).toBeLessThan(1.04);
  expect(pulled.translateX).toBeGreaterThan(0);
});
