import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { LiquidGlassTabBar } from '../src/components/liquid-glass-navbar/LiquidGlassTabBar';

jest.mock('expo-glass-effect', () => ({
  isLiquidGlassAvailable: () => false,
  GlassView: () => null,
}));

const tabs = [
  { key: 'home', icon: () => <Text>H</Text> },
  { key: 'search', icon: () => <Text>S</Text> },
  { key: 'me', icon: () => <Text>M</Text> },
];

test('calls onChange with the tapped tab key', async () => {
  const onChange = jest.fn();
  const { getAllByRole } = await render(
    <LiquidGlassTabBar tabs={tabs} activeKey="home" onChange={onChange} />
  );
  fireEvent.press(getAllByRole('button')[1]);
  expect(onChange).toHaveBeenCalledWith('search');
});
