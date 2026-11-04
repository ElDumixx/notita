import { Stack } from 'expo-router';

import { tabScreenLayout } from '@/components/glass-backdrop';
import { useTabStackOptions } from '@/components/stack-options';

export default function LibretasLayout() {
  const options = useTabStackOptions();
  return (
    <Stack screenOptions={options} screenLayout={tabScreenLayout}>
      <Stack.Screen name="index" options={{ title: 'Libretas' }} />
      <Stack.Screen name="[id]" options={{ title: '', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
