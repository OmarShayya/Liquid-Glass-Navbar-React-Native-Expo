import { renderHook, act } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useScrollShrink } from '../src/components/liquid-glass-navbar/useScrollShrink';

// Notes on the test environment:
// - @testing-library/react-native v14's `renderHook` is async (it returns a
//   Promise and populates `result.current` via a useEffect), so each test
//   awaits it.
// - Under the jest reanimated mock, `withTiming` runs a real (real-clock)
//   animation rather than snapping to its target synchronously. We therefore
//   let the animation run (its duration is 220ms) before asserting that the
//   derived `compact` progress has moved off 0 toward the compact target.

const SETTLE_MS = 300; // > the hook's 220ms timing duration

test('compact stays 0 and reports expandedHeight when no scrollY provided', async () => {
  const { result } = await renderHook(() => useScrollShrink(undefined, 64));
  expect(result.current.compact.value).toBe(0);
  expect(result.current.expandedHeight).toBe(64);
});

test('derives a compact value from scroll position past the threshold', async () => {
  const { result } = await renderHook(() => {
    const scrollY = useSharedValue(0);
    const shrink = useScrollShrink(scrollY, 64);
    return { scrollY, shrink };
  });

  await act(async () => {
    result.current.scrollY.value = 200; // scrolled down past threshold
    // Let the withTiming animation run to its target.
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  });

  expect(result.current.shrink.compact.value).toBeGreaterThan(0);
});
