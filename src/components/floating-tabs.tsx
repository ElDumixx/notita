import type { Href } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, useTabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { useGlass } from '@/theme/glass';
import { COLOR_FADE, MOVE_SPRING } from '@/theme/motion';
import { alpha } from '@/theme/palette';

import { useReduceTransparency } from './glass';
import { BlurScope, BlurTarget, GlassBlur, hasRealBlur } from './glass-blur';
import { Icon, type IconName } from './icon';
import { TopBar } from './top-bar';

export type TabDef = { name: string; href: Href; label: string; icon: IconName };

/** Alto de la barra flotante; las pantallas dejan este hueco (y el de abajo) al final del scroll. */
export const TAB_BAR_HEIGHT = 64;

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

type ButtonProps = TabTriggerSlotProps & { tab: TabDef };

function TabButton({ tab, isFocused, onPress, onLongPress, href }: ButtonProps) {
  const theme = useTheme();
  const color = isFocused ? theme.tint : theme.textSecondary;
  return (
    <Pressable
      {...({ href } as object)}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={tab.label}
      onPress={(e) => {
        if (!isFocused) haptic.tap();
        onPress?.(e);
      }}
      onLongPress={onLongPress}
      style={{ flex: 1, height: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <Icon name={tab.icon} size={24} color={color} weight={isFocused ? 'semibold' : 'regular'} />
      <Animated.Text numberOfLines={1} style={[{ fontSize: 11, fontWeight: isFocused ? '700' : '500', color, letterSpacing: 0.1 }, COLOR_FADE]}>
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

/**
 * Barra de pestañas flotante de cristal (Android y web), como la de iOS 26: una cápsula con una
 * «lente» que se desliza a la pestaña activa. El "+" de cada pantalla va arriba, como en iOS.
 */
function FloatingBar({ tabs }: { tabs: TabDef[] }) {
  const theme = useTheme();
  const g = useGlass();
  const reduce = useReduceTransparency();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const keyboard = useKeyboardVisible();
  const { getTrigger } = useTabTrigger({ name: tabs[0].name });
  const [lastIndex, setLastIndex] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  // Con una hoja abierta encima ninguna pestaña está enfocada: la lente se queda donde estaba.
  const focused = tabs.findIndex((t) => getTrigger(t.name)?.isFocused);
  const index = focused >= 0 ? focused : lastIndex;
  if (focused >= 0 && focused !== lastIndex) setLastIndex(focused);

  const itemWidth = barWidth / tabs.length;
  const lensX = useSharedValue(0);
  useEffect(() => {
    if (itemWidth > 0) lensX.set(withSpring(index * itemWidth, MOVE_SPRING));
  }, [index, itemWidth, lensX]);
  const lensStyle = useAnimatedStyle(() => ({ transform: [{ translateX: lensX.get() }] }));

  const margin = width < 600 ? 16 : 24;
  const glassy = g.enabled && !reduce;
  // La barra flota sobre el contenido y debe leerse bien. Con desenfoque real (web y Android 12+)
  // puede ser tan clara como la de iOS; sin él, es más opaca.
  const web = process.env.EXPO_OS === 'web';
  const opacity = hasRealBlur ? Math.max(0.42, 0.66 - g.transparency * 0.26) : web ? Math.max(0.6, 0.86 - g.transparency * 0.3) : Math.max(0.84, 0.95 - g.transparency * 0.15);
  const fill = glassy ? alpha(theme.surface, opacity) : theme.surface;
  const surface = {
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderCurve: 'continuous' as const,
    backgroundColor: fill,
    borderWidth: 1,
    borderColor: glassy ? g.rim : theme.separator,
    boxShadow: theme.scheme === 'dark' ? '0 10px 30px rgba(0,0,0,0.45)' : '0 10px 30px rgba(80,60,150,0.16)',
    ...(web && glassy ? { backdropFilter: 'blur(22px) saturate(180%)' } : null),
  };

  if (keyboard) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 10, paddingLeft: insets.left + margin, paddingRight: insets.right + margin, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 560 }}>
        <View accessibilityRole="tablist" style={[surface, { flex: 1, overflow: 'hidden', backgroundColor: hasRealBlur && glassy ? 'transparent' : fill, borderWidth: 0 }]}>
          {/* Desenfoque de lo de detrás, el tinte y el reflejo; el borde va encima de todo. */}
          <GlassBlur radius={TAB_BAR_HEIGHT / 2} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: hasRealBlur && glassy ? fill : undefined, backgroundImage: glassy ? g.sheen : undefined }]} />
          <View style={{ flex: 1, flexDirection: 'row' }} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
            {itemWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  { position: 'absolute', top: 6, bottom: 6, left: 4, width: itemWidth - 8, borderRadius: 26, borderCurve: 'continuous', backgroundColor: alpha(theme.tintSoft, glassy ? 0.92 : 1) },
                  lensStyle,
                ]}
              />
            ) : null}
            {tabs.map((t) => (
              <TabTrigger key={t.name} name={t.name} asChild>
                <TabButton tab={t} />
              </TabTrigger>
            ))}
          </View>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: TAB_BAR_HEIGHT / 2, borderWidth: 1, borderColor: surface.borderColor }]} />
        </View>
      </View>
    </View>
  );
}

/**
 * Pestañas con la barra flotante. Las rutas son las mismas que usan las pestañas nativas de iOS.
 * En Android, la barra de pestañas y la de arriba desenfocan el fondo y las pantallas que pasan por
 * debajo; en la web eso lo hace el navegador y cada pantalla pone su propia barra de arriba.
 */
export function FloatingTabs({ tabs, backdrop }: { tabs: TabDef[]; backdrop?: ReactNode }) {
  return (
    <BlurScope>
      <Tabs style={{ flex: 1 }}>
        <BlurTarget style={{ flex: 1 }}>
          {backdrop}
          <TabSlot style={{ flex: 1 }} />
        </BlurTarget>
        {process.env.EXPO_OS === 'android' ? <TopBar /> : null}
        <FloatingBar tabs={tabs} />
        <TabList style={{ display: 'none' }}>
          {tabs.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} />
          ))}
        </TabList>
      </Tabs>
    </BlurScope>
  );
}
