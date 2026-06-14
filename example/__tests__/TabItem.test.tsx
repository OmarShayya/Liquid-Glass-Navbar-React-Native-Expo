import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { TabItem } from '../../src/TabItem';

function Harness({ onPress }: { onPress: () => void }) {
  const pillCenter = useSharedValue(0);
  const hoveredIndex = useSharedValue(-1);
  return (
    <TabItem
      tab={{ key: 'home', icon: (active, color) => <Text>{active ? 'on' : 'off'}:{color}</Text> }}
      index={0}
      count={3}
      rowWidth={300}
      pillCenter={pillCenter}
      hoveredIndex={hoveredIndex}
      accentColor="#0A84FF"
      inactiveColor="#888"
      onPress={onPress}
    />
  );
}

test('fires onPress when tapped', async () => {
  const onPress = jest.fn();
  const { getByRole } = await render(<Harness onPress={onPress} />);
  fireEvent.press(getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
