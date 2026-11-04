import { Stack } from 'expo-router';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

type Props = { onPress: () => void; label: string };

/** iOS: botón "+" en la barra de navegación (cápsula de Liquid Glass en iOS 26+). */
export function AddButton({ onPress, label }: Props) {
  const theme = useTheme();
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon="plus"
        tintColor={theme.tint}
        accessibilityLabel={label}
        onPress={() => {
          haptic.tap();
          onPress();
        }}
      />
    </Stack.Toolbar>
  );
}
