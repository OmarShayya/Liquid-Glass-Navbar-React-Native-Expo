import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { TabItem } from '../src/components/liquid-glass-navbar/TabItem';

function Harness({ onPress }: { onPress: () => void }) {
  const proximity = useSharedValue(0);
  return (
    <TabItem
      tab={{ key: 'home', label: 'Home', icon: (active, color) => <Text>{active ? 'on' : 'off'}:{color}</Text> }}
      proximity={proximity}
      accentColor="#0A84FF"
      inactiveColor="#888"
      onPress={onPress}
      onLayoutCenter={() => {}}
    />
  );
}

test('fires onPress when tapped', async () => {
  const onPress = jest.fn();
  const { getByRole } = await render(<Harness onPress={onPress} />);
  fireEvent.press(getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
