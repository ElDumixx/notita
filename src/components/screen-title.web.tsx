import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { useGlass } from '@/theme/glass';
import { alpha } from '@/theme/palette';

import { Icon, type IconName } from './icon';
import { useTabBarAction } from './tab-bar-action';
import { TEXT_INSET } from './ui';

type Props = { title: string; large?: boolean; back?: boolean; /** Espacio extra bajo el título (pantallas sin separación propia). */ spacing?: number };

const BAR = 52;
const BLUR = { backdropFilter: 'blur(20px) saturate(180%)' } as ViewStyle;
const FADE = { transitionProperty: 'background-color, border-color, opacity', transitionDuration: '220ms' } as ViewStyle;

function NavButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  const g = useGlass();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: alpha(theme.surface, theme.scheme === 'dark' ? 0.5 : 0.72),
          borderWidth: 1,
          borderColor: g.rim,
          boxShadow: theme.scheme === 'dark' ? '0 4px 14px rgba(0,0,0,0.35)' : '0 4px 14px rgba(80,60,150,0.12)',
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
        BLUR,
      ]}>
      <Icon name={icon} size={22} color={theme.tint} weight="semibold" />
    </Pressable>
  );
}

/**
 * Web: título grande como el de iOS. Al hacer scroll se va con el contenido y aparece una barra
 * fija de cristal con el título pequeño, el botón "+" de la pantalla y, si hace falta, el de volver.
 */
export function ScreenTitle({ title, large = true, back = false, spacing = 0 }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const action = useTabBarAction();
  // En la web la ref de una View es el elemento del DOM.
  const sentinel = useRef<HTMLElement | null>(null);
  const [compact, setCompact] = useState(!large);

  useEffect(() => {
    const node = sentinel.current;
    if (!large || !node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), { rootMargin: `-${insets.top + BAR}px 0px 0px 0px` });
    io.observe(node);
    return () => io.disconnect();
  }, [large, insets.top]);

  return (
    <View>
      <View style={{ height: insets.top + BAR - 4 }} />
      {large ? (
        <View ref={sentinel as never} style={{ paddingHorizontal: TEXT_INSET, paddingBottom: 4 + spacing }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37, color: theme.text }}>
            {title}
          </Text>
        </View>
      ) : null}
      {focused ? (
        <View
          pointerEvents="box-none"
          style={[
            {
              position: 'fixed' as ViewStyle['position'],
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              height: insets.top + BAR,
              paddingTop: insets.top,
              paddingLeft: insets.left + 16,
              paddingRight: insets.right + 16,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: compact ? alpha(theme.bg, theme.scheme === 'dark' ? 0.62 : 0.66) : 'transparent',
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: compact ? theme.separator : 'transparent',
            },
            compact ? BLUR : null,
            FADE,
          ]}>
          <View style={{ width: 44 }}>{back ? <NavButton icon="chevronLeft" label="Volver" onPress={() => router.back()} /> : null}</View>
          <Text numberOfLines={1} style={[{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: theme.text, opacity: compact ? 1 : 0 }, FADE]}>
            {title}
          </Text>
          <View style={{ width: 44 }}>{action ? <NavButton icon="add" label={action.label} onPress={action.run} /> : null}</View>
        </View>
      ) : null}
    </View>
  );
}
