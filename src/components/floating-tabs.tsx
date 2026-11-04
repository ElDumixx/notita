import type { Href } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, useTabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { useGlass } from '@/theme/glass';
import { COLOR_FADE, EXIT, MOVE_SPRING, POP } from '@/theme/motion';
import { alpha } from '@/theme/palette';

import { useReduceTransparency } from './glass';
import { Icon, type IconName } from './icon';
import { useTabBarAction } from './tab-bar-action';

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
 * Barra de pestañas flotante de cristal (Android y web), al estilo de la de iOS 26: una cápsula
 * con una «lente» que se desliza a la pestaña activa y, a la derecha, el botón "+" de la pantalla.
 */
function FloatingBar({ tabs }: { tabs: TabDef[] }) {
  const theme = useTheme();
  const g = useGlass();
  const reduce = useReduceTransparency();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const registered = useTabBarAction();
  // En la web el "+" va arriba, en la barra de navegación (como en iOS).
  const action = process.env.EXPO_OS === 'web' ? null : registered;
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
  // Siempre algo más opaca que las tarjetas: la barra flota sobre el contenido y debe leerse bien.
  // En la web el navegador desenfoca lo de detrás; en Android no hay desenfoque, así que es más opaca.
  const web = process.env.EXPO_OS === 'web';
  const opacity = web ? Math.max(0.6, 0.86 - g.transparency * 0.3) : Math.max(0.84, 0.95 - g.transparency * 0.15);
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
        <View accessibilityRole="tablist" style={[surface, { flex: 1, overflow: 'hidden', backgroundImage: glassy ? g.sheen : undefined }]}>
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
        </View>
        {action ? (
          <Animated.View key={action.key} entering={POP} exiting={EXIT}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => {
                haptic.tap();
                action.run();
              }}
              style={({ pressed }) => [
                surface,
                {
                  width: TAB_BAR_HEIGHT,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: alpha(theme.tint, pressed ? 0.8 : 0.94),
                  borderColor: 'rgba(255,255,255,0.35)',
                  boxShadow: `0 10px 26px ${theme.scheme === 'dark' ? 'rgba(0,0,0,0.5)' : alpha(theme.tint, 0.4)}`,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}>
              <Icon name="add" size={28} color={theme.onTint} weight="semibold" />
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/** Pestañas con la barra flotante. Las rutas son las mismas que usan las pestañas nativas de iOS. */
export function FloatingTabs({ tabs }: { tabs: TabDef[] }) {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <FloatingBar tabs={tabs} />
      <TabList style={{ display: 'none' }}>
        {tabs.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} />
        ))}
      </TabList>
    </Tabs>
  );
}
