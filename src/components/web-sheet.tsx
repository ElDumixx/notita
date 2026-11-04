import { router } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { meshBackground, useGlass } from '@/theme/glass';

/**
 * Web: las hojas (editar recordatorio, libreta, diseño…) suben desde abajo sobre la pantalla
 * anterior oscurecida, con las esquinas redondeadas, igual que las hojas de iOS.
 */
function WebSheet({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const glass = useGlass();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <Animated.View entering={FadeIn.duration(220)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,16,30,0.3)' }]}>
        <Pressable accessibilityLabel="Cerrar" onPress={() => router.back()} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.springify().damping(22).stiffness(200)}
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 680,
          alignSelf: 'center',
          marginTop: insets.top + 10,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: 'hidden',
          backgroundColor: theme.bg,
          backgroundImage: glass.enabled ? meshBackground(theme) : undefined,
          boxShadow: '0 -10px 40px rgba(20,16,30,0.18)',
        }}>
        {children}
      </Animated.View>
    </View>
  );
}

/** `screenLayout` de la pila principal: en la web envuelve las hojas; las pestañas van tal cual. */
export function rootScreenLayout({ route, children }: { route: { name: string }; children: ReactElement }) {
  if (process.env.EXPO_OS !== 'web' || route.name === '(tabs)') return children;
  return <WebSheet>{children}</WebSheet>;
}
