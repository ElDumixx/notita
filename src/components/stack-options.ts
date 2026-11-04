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
  // Web: sin cabecera de la pila; cada pantalla pone su título grande (ScreenTitle), como en iOS.
  if (process.env.EXPO_OS === 'web') return { headerShown: false, contentStyle } as Options;
  return {
    headerShadowVisible: false,
    // Con el cristal, la cabecera deja ver el fondo pastel que pinta GlassBackdrop detrás.
    headerStyle: { backgroundColor: glass.enabled ? 'transparent' : theme.bg },
    headerTitleStyle: { color: theme.text, fontSize: 24, fontWeight: '700' },
    headerTintColor: theme.tint,
    contentStyle,
  } as Options;
}
