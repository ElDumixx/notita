import { BlurTargetView, BlurView } from 'expo-blur';
import { createContext, use, useRef, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { useGlassActive } from './glass';

/** Android 12+ desenfoca con RenderNode, que es rápido; en versiones anteriores no se desenfoca. */
export const hasRealBlur = (Platform.Version as number) >= 31;

type TargetRef = RefObject<ComponentRef<typeof View> | null>;

const Target = createContext<TargetRef | null>(null);

/** Zona que comparte el contenido desenfocable y las superficies que lo desenfocan. */
export function BlurScope({ children }: { children: ReactNode }) {
  const ref: TargetRef = useRef(null);
  return <Target value={ref}>{children}</Target>;
}

/** Contenido que se ve (desenfocado) a través de las superficies de cristal. */
export function BlurTarget({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = use(Target);
  if (!ref) return <View style={style}>{children}</View>;
  return (
    <BlurTargetView ref={ref} style={style}>
      {children}
    </BlurTargetView>
  );
}

/** Capa de desenfoque para el fondo de una superficie de cristal (primer hijo, a todo su tamaño). */
export function GlassBlur({ radius = 0 }: { radius?: number }) {
  const target = use(Target);
  const theme = useTheme();
  const glassy = useGlassActive();
  if (!target || !hasRealBlur || !glassy) return null;
  return (
    <BlurView
      pointerEvents="none"
      blurTarget={target}
      blurMethod="dimezisBlurViewSdk31Plus"
      intensity={70}
      tint={theme.scheme === 'dark' ? 'dark' : 'default'}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    />
  );
}
