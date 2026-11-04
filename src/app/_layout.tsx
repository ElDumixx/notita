import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { canUseGlass } from '@/components/glass';
import { UndoToast } from '@/components/undo-toast';
import { WebSafeArea } from '@/components/web-safe-area';
import { rootScreenLayout } from '@/components/web-sheet';
import { useWebChrome } from '@/hooks/use-web-chrome';
import { useWebFonts } from '@/hooks/use-web-fonts';
import { configureNotifications, useNotificationNavigation } from '@/lib/notifications';
import { startSync } from '@/lib/sync';
import { useStore } from '@/store';
import { useTheme } from '@/theme';
import { meshBackground, useGlass } from '@/theme/glass';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 280, fade: true });
configureNotifications();
// Solo en compilaciones sin firmar (simulador): no afecta a las notificaciones locales.
LogBox.ignoreLogs(['[expo-notifications] Error reading persisted server registration']);

export default function RootLayout() {
  const theme = useTheme();
  const themePref = useStore((s) => s.settings.theme);

  useEffect(() => {
    if (process.env.EXPO_OS !== 'web') Appearance.setColorScheme(themePref === 'system' ? 'unspecified' : themePref);
  }, [themePref]);

  useEffect(() => {
    SplashScreen.hideAsync();
    return startSync();
  }, []);

  useNotificationNavigation();
  useWebFonts();

  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: theme.tint, background: theme.bg, card: theme.bg, text: theme.text, border: theme.separator },
  };

  // En iOS 26 las hojas con fondo transparente usan Liquid Glass; en el resto, el fondo en malla.
  const glass = useGlass();
  useWebChrome(theme, glass.enabled);
  const sheetStyle = canUseGlass
    ? { backgroundColor: 'transparent' }
    : { backgroundColor: theme.bg, backgroundImage: glass.enabled ? meshBackground(theme) : undefined };
  // En la web no hay hojas nativas: se dibujan encima de la pantalla anterior (ver web-sheet.tsx).
  const sheet = (detents: number[]) =>
    process.env.EXPO_OS === 'web'
      ? ({ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } } as const)
      : ({ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: detents, sheetCornerRadius: 28, contentStyle: sheetStyle } as const);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }}>
      <WebSafeArea>
        <ThemeProvider value={navTheme}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} screenLayout={rootScreenLayout}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="reminder/[id]"
              options={sheet([0.7, 1])}
            />
            <Stack.Screen
              name="notebook/[id]"
              options={sheet([0.75, 1])}
            />
            <Stack.Screen
              name="anniversary/[id]"
              options={sheet([0.8, 1])}
            />
            <Stack.Screen
              name="design/[id]"
              options={sheet([1])}
            />
          </Stack>
          <UndoToast />
          <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </WebSafeArea>
    </GestureHandlerRootView>
  );
}
