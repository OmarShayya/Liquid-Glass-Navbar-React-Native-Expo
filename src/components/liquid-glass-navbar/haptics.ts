import * as Haptics from 'expo-haptics';

/** Fire a selection tick on tab change. No-ops if unsupported. */
export function tabSelectionHaptic(): void {
  try {
    Haptics.selectionAsync();
  } catch {
    // haptics unavailable (web / unsupported device) — ignore
  }
}
