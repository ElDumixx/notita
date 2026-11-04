import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { meshBackground, useGlass } from '@/theme/glass';

/**
 * Android: fondo pastel del estilo cristal. El contenedor nativo de cada pantalla ignora
 * `backgroundImage`, así que se pinta con una View normal. Todas las capas miden lo mismo que
 * la ventana y parten de su borde superior, así el degradado sigue sin cortes entre la
 * cabecera, el contenido y la barra de pestañas. En iOS lo pinta `contentStyle`.
 */
export function GlassBackdrop({ offsetTop = 0, radius }: { offsetTop?: number; radius?: number }) {
  const theme = useTheme();
  const glass = useGlass();
  const { height } = useWindowDimensions();
  if (process.env.EXPO_OS !== 'android' || !glass.enabled) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: -offsetTop,
        height,
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        backgroundColor: theme.bg,
        backgroundImage: meshBackground(theme),
      }}
    />
  );
}

/**
 * Márgenes seguros laterales: la barra lateral de iPad, la isla dinámica o el recorte de la
 * cámara en horizontal. La barra de navegación ya los respeta; así el contenido se alinea con ella.
 */
function SideSafeArea({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1 }}>
      {children}
    </SafeAreaView>
  );
}

function AndroidScreen({ children }: { children: ReactNode }) {
  // El contenido empieza bajo la cabecera: se sube el fondo para que encaje con el de detrás.
  const headerHeight = useHeaderHeight();
  return (
    <View style={{ flex: 1 }}>
      <GlassBackdrop offsetTop={headerHeight} />
      <SideSafeArea>{children}</SideSafeArea>
    </View>
  );
}

/** `screenLayout` de las pilas de las pestañas. */
export function tabScreenLayout({ children }: { children: ReactNode }) {
  return process.env.EXPO_OS === 'android' ? <AndroidScreen>{children}</AndroidScreen> : <SideSafeArea>{children}</SideSafeArea>;
}
