import React from 'react';
import { render } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import { ElasticPill } from '../src/components/liquid-glass-navbar/ElasticPill';

function Harness() {
  const out = useSharedValue(0);
  return <ElasticPill targetCenterX={40} width={48} height={36} color="#0A84FF" centerXOut={out} />;
}

test('renders without crashing', async () => {
  const view = await render(<Harness />);
  expect(view).toBeTruthy();
});
