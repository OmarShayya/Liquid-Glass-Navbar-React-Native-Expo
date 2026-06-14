import * as Haptics from 'expo-haptics';

/** Fire a selection tick on tab change. No-ops if unsupported. */
export function tabSelectionHaptic(): void {
  try {
    Haptics.selectionAsync();
  } catch {
    // haptics unavailable (web / unsupported device) — ignore
  }
}

/** A light tick as the dragged pill crosses into a new tab. No-ops if unsupported. */
export function tabCrossingHaptic(): void {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // unsupported — ignore
  }
}
