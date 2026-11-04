import * as Haptics from 'expo-haptics';

import { useStore } from '@/store';

const enabled = () => useStore.getState().settings.haptics;

export const haptic = {
  tap: () => enabled() && Haptics.selectionAsync().catch(() => {}),
  success: () => enabled() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => enabled() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  soft: () => enabled() && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}),
};
