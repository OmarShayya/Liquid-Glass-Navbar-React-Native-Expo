import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('expo-glass-effect', () => ({
  isLiquidGlassAvailable: () => false,
  GlassView: () => null,
}));

import { GlassSurface } from '../src/components/liquid-glass-navbar/GlassSurface';

test('renders children and falls back to blur when native glass unavailable', async () => {
  const { getByText, getByTestId } = await render(
    <GlassSurface testID="surface" borderRadius={20}>
      <Text>tabs</Text>
    </GlassSurface>
  );
  expect(getByText('tabs')).toBeTruthy();
  expect(getByTestId('surface-blur-fallback')).toBeTruthy();
});
