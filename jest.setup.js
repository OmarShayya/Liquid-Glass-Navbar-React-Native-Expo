// Silence/native-mock Reanimated for jest.
require('react-native-reanimated').setUpTests?.();
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));
