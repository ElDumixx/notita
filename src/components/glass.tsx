import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSyncExternalStore, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { useGlass } from '@/theme/glass';
import { alpha } from '@/theme/palette';

// Desenfoque de lo que hay detrás (solo existe en la web; RN lo ignora en Android).
const WEB_BLUR = process.env.EXPO_OS === 'web' ? ({ backdropFilter: 'blur(20px) saturate(170%)' } as ViewStyle) : null;

/** Liquid Glass nativo disponible (iOS 26+). */
export const canUseGlass = process.env.EXPO_OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

// Un único oyente para toda la app (antes había uno por cada superficie de cristal).
let reduceTransparency = false;
const listeners = new Set<() => void>();
const setReduce = (value: boolean) => {
  if (value === reduceTransparency) return;
  reduceTransparency = value;
  listeners.forEach((l) => l());
};
if (process.env.EXPO_OS === 'web') {
  // En la web, la preferencia equivalente es la consulta de medios «prefers-reduced-transparency».
  const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-transparency: reduce)') : null;
  if (mq) {
    setReduce(mq.matches);
    mq.addEventListener?.('change', (e) => setReduce(e.matches));
  }
} else {
  AccessibilityInfo.isReduceTransparencyEnabled().then(setReduce);
  AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useReduceTransparency() {
  return useSyncExternalStore(subscribe, () => reduceTransparency);
}

/** Relleno de las tarjetas dentro de las hojas (formularios). */
export function useCardFill() {
  const theme = useTheme();
  const g = useGlass();
  const reduce = useReduceTransparency();
  if (canUseGlass) return theme.fill;
  return g.enabled && !reduce ? g.fill() : theme.surface;
}

/** ¿Se está dibujando el estilo cristal ahora mismo (ajuste activado y sin "Reducir transparencia")? */
export function useGlassActive() {
  const { enabled } = useGlass();
  const reduce = useReduceTransparency();
  return enabled && !reduce;
}

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  /** Color hex del cristal tintado (p. ej. el pastel de una libreta). */
  tint?: string;
  /** Color sólido cuando el estilo cristal está desactivado. */
  fallback?: ColorValue;
  /** Radio de las esquinas (el velo interior debe coincidir con el del cristal). */
  radius?: number;
  /** Acción principal: el tinte se mantiene vivo aunque la transparencia sea alta (legibilidad). */
  strong?: boolean;
};

/**
 * Superficie de cristal con la transparencia elegida en Ajustes.
 * - iOS 26+: Liquid Glass nativo (UIGlassEffect) + un velo interior que lo vuelve más opaco.
 * - Android / iOS anterior: relleno translúcido, brillo en el borde, reflejo y sombra suave.
 * - Web: lo mismo más el desenfoque real del navegador (backdrop-filter), como el cristal de iOS.
 * - Estilo desactivado o "Reducir transparencia": superficie sólida.
 */
export function Glass({ children, style, interactive, tint, fallback, radius = 0, strong }: Props) {
  const theme = useTheme();
  const g = useGlass();
  const reduce = useReduceTransparency();
  const corner = { borderRadius: radius, borderCurve: 'continuous' as const };

  if (!g.enabled || reduce) {
    return (
      <View style={[corner, { backgroundColor: fallback ?? tint ?? theme.surface, boxShadow: theme.scheme === 'dark' ? undefined : `0 1px 2px ${theme.shadow}` }, style]}>
        {children}
      </View>
    );
  }

  if (canUseGlass) {
    return (
      <GlassView
        isInteractive={interactive}
        glassEffectStyle={g.transparency > 0.66 ? 'clear' : 'regular'}
        tintColor={tint}
        style={[corner, style]}>
        {g.veil > 0.02 ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, corner, { backgroundColor: tint ?? theme.surface, opacity: g.veil }]} />
        ) : null}
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        corner,
        {
          backgroundColor: strong && tint ? alpha(tint, 0.9) : g.fill(tint),
          backgroundImage: g.sheen,
          borderWidth: 1,
          borderColor: g.rim,
          boxShadow: g.shadow,
        },
        WEB_BLUR,
        style,
      ]}>
      {children}
    </View>
  );
}
