import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { useGlass } from '@/theme/glass';
import { DURATION } from '@/theme/motion';
import { alpha } from '@/theme/palette';

import { useGlassActive } from './glass';
import { GlassBlur, hasRealBlur } from './glass-blur';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';
import { useHeaderCompact, useScreenHeader } from './screen-header';
import { useTabBarAction } from './tab-bar-action';

/** Alto de la barra de arriba (sin contar la barra de estado). */
export const TOP_BAR = 52;

const FADE = { transitionProperty: 'opacity', transitionDuration: DURATION.quick, transitionTimingFunction: 'ease-out' } as const;

/** Botón redondo de cristal, como los de la barra de navegación de iOS 26. */
function GlassCircle({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  const g = useGlass();
  const glassy = useGlassActive();
  const dark = theme.scheme === 'dark';
  const fill = !glassy ? theme.surface : alpha(theme.surface, hasRealBlur ? (dark ? 0.3 : 0.45) : dark ? 0.7 : 0.82);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      scaleTo={0.92}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={{ width: 44, height: 44, borderRadius: 22, boxShadow: dark ? '0 4px 14px rgba(0,0,0,0.35)' : '0 4px 14px rgba(80,60,150,0.14)' }}>
      <View style={{ flex: 1, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <GlassBlur radius={22} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fill, backgroundImage: glassy ? g.sheen : undefined }]} />
        <Icon name={icon} size={22} color={theme.tint} weight="semibold" />
        {/* El borde va encima del desenfoque (si fuera el del contenedor, el desenfoque lo taparía). */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 22, borderWidth: 1, borderColor: glassy ? g.rim : theme.separator }]} />
      </View>
    </PressableScale>
  );
}

/**
 * Android: la barra de arriba de iOS. Mientras se ve el título grande es transparente y solo tiene
 * los botones de cristal (volver y "+"); al hacer scroll aparece detrás un cristal desenfocado con
 * el título pequeño en el centro.
 */
export function TopBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const glassy = useGlassActive();
  const focusedHeader = useScreenHeader();
  const focusedAction = useTabBarAction();
  const compact = useHeaderCompact();
  // Con una hoja abierta encima ninguna pantalla está enfocada: la barra se queda como estaba.
  const [last, setLast] = useState({ header: focusedHeader, action: focusedAction });
  if (focusedHeader && (focusedHeader !== last.header || focusedAction !== last.action)) setLast({ header: focusedHeader, action: focusedAction });
  const { header, action } = focusedHeader ? { header: focusedHeader, action: focusedAction } : last;
  if (!header) return null;

  const solid = !header.large || compact;
  const fill = !glassy ? theme.bg : alpha(theme.bg, hasRealBlur ? 0.55 : 0.9);

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + TOP_BAR }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: solid ? 1 : 0 }, FADE]}>
        <GlassBlur />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: fill, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.separator }]} />
      </Animated.View>
      <View
        pointerEvents="box-none"
        style={{ flex: 1, marginTop: insets.top, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 44 }}>{header.back ? <GlassCircle icon="chevronLeft" label="Volver" onPress={() => router.back()} /> : null}</View>
        <Animated.Text numberOfLines={1} style={[{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: theme.text, opacity: solid ? 1 : 0 }, FADE]}>
          {header.title}
        </Animated.Text>
        <View style={{ width: 44 }}>{action ? <GlassCircle icon="add" label={action.label} onPress={action.run} /> : null}</View>
      </View>
    </View>
  );
}
