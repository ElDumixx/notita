import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

import { useTheme } from '@/theme';
import { meshBackground, useGlass } from '@/theme/glass';

type Options = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;

/** Cabecera de cada pestaña: título grande y transparente (cristal al hacer scroll en iOS 26). */
export function useTabStackOptions(): Options {
  const theme = useTheme();
  const glass = useGlass();
  // Con el estilo cristal, un fondo pastel en malla da algo que refractar a las superficies.
  const contentStyle = { backgroundColor: theme.bg, backgroundImage: glass.enabled ? meshBackground(theme) : undefined };
  if (process.env.EXPO_OS === 'ios') {
    return {
      headerTransparent: true,
      headerLargeTitleEnabled: true,
      headerShadowVisible: false,
      headerLargeTitleShadowVisible: false,
      headerLargeStyle: { backgroundColor: 'transparent' },
      headerTitleStyle: { color: theme.text },
      headerLargeTitleStyle: { color: theme.text },
      headerTintColor: theme.tint,
      headerBackButtonDisplayMode: 'minimal',
      contentStyle,
    } as Options;
  }
  // Android y web: sin cabecera de la pila. Cada pantalla pone su título grande (ScreenTitle) y
  // arriba flotan los botones de cristal, como en iOS.
  return { headerShown: false, contentStyle } as Options;
}
