import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { useStore } from '@/store';
import { useTheme } from '@/theme';
import { TOAST_IN, TOAST_OUT } from '@/theme/motion';

import { Glass, useGlassActive } from './glass';
import { Icon } from './icon';

const VISIBLE_MS = 7000;

/** Aviso "Eliminado · Deshacer": borrar es fácil, y equivocarse no cuesta nada. */
export function UndoToast() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const trash = useStore((s) => s.trash);
  const undo = useStore((s) => s.undoDelete);
  const clear = useStore((s) => s.clearTrash);
  const glass = useGlassActive();

  useEffect(() => {
    if (!trash) return;
    const t = setTimeout(clear, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [trash, clear]);

  if (!trash) return null;

  const n = trash.reminders.length;
  const label = trash.notebook
    ? `Libreta «${trash.notebook.name}» eliminada`
    : trash.anniversary
      ? `«${trash.anniversary.name}» eliminado`
      : n === 1
      ? 'Recordatorio eliminado'
      : `${n} recordatorios eliminados`;

  const bottom = insets.bottom + (process.env.EXPO_OS === 'ios' ? 66 : 96);

  return (
    <Animated.View
      key={trash.at}
      entering={TOAST_IN}
      exiting={TOAST_OUT}
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, bottom, alignItems: 'center' }}>
      <Glass radius={24} style={{ maxWidth: 440, width: '100%' }} fallback={theme.scheme === 'dark' ? '#2A2826' : '#2E2A26'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 6, height: 48, gap: 10 }}>
          <Icon name="trash" size={16} color={glass ? theme.textSecondary : '#D9D2C9'} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, color: glass ? theme.text : '#FFFFFF' }}>
            {label}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptic.tap();
              undo();
            }}
            style={({ pressed }) => ({ paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: glass ? theme.tint : '#C9C1FF' }}>Deshacer</Text>
          </Pressable>
        </View>
      </Glass>
    </Animated.View>
  );
}
