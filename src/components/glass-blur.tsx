import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Desenfoque real de lo que hay detrás del cristal. Solo se dibuja en Android
 * (glass-blur.android.tsx): en iOS lo pone el Liquid Glass nativo y en la web, `backdrop-filter`.
 */
export const hasRealBlur = false;

/** Zona que comparte el contenido desenfocable y las superficies que lo desenfocan. */
export function BlurScope({ children }: { children: ReactNode }) {
  return children;
}

/** Contenido que se ve (desenfocado) a través de las superficies de cristal. */
export function BlurTarget({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={style}>{children}</View>;
}

/** Capa de desenfoque para el fondo de una superficie de cristal (primer hijo, a todo su tamaño). */
export function GlassBlur(_props: { radius?: number }) {
  return null;
}
