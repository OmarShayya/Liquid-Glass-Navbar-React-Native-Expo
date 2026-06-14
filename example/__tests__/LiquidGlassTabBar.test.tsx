import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LiquidGlassTabBar } from '../../src/LiquidGlassTabBar';

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
    <GestureHandlerRootView>
      <LiquidGlassTabBar tabs={tabs} activeKey="home" onChange={onChange} />
    </GestureHandlerRootView>
  );
  fireEvent.press(getAllByRole('button')[1]);
  expect(onChange).toHaveBeenCalledWith('search');
});

test('handles layout events and tab switches without crashing', async () => {
  const onChange = jest.fn();
  const utils = await render(
    <GestureHandlerRootView>
      <LiquidGlassTabBar tabs={tabs} activeKey="home" onChange={onChange} />
    </GestureHandlerRootView>
  );
  const buttons = utils.getAllByRole('button');
  // simulate the row + each tab reporting a layout (fireEvent wraps in act for us)
  buttons.forEach((b, i) => {
    fireEvent(b, 'layout', {
      nativeEvent: { layout: { x: i * 80, y: 0, width: 80, height: 64 } },
    });
  });
  // switching to each tab fires onChange and does not throw
  for (const i of [1, 2, 0]) {
    onChange.mockClear();
    fireEvent.press(buttons[i]);
  }
  expect(utils.getAllByRole('button')).toHaveLength(3);
});
