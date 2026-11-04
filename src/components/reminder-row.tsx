import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { showAlert } from '@/lib/alert';
import { addDays, formatDue, isOverdue, startOfDay } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { useStore } from '@/store';
import type { Notebook, Reminder } from '@/store/types';
import { notebookColors, useTheme } from '@/theme';
import { COLOR_FADE, COMPLETE_DELAY, ENTER, EXIT, LAYOUT } from '@/theme/motion';
import { PASTELS } from '@/theme/palette';

import { Checkbox } from './checkbox';
import { useGlassActive } from './glass';
import { Icon } from './icon';

type Props = {
  reminder: Reminder;
  notebook?: Notebook;
  showNotebook?: boolean;
  isLast?: boolean;
  /** Sustituye la fecha de la fila (en el calendario el día ya se sabe; null = no mostrarla). */
  when?: string | null;
  /** Repetición futura calculada: se puede abrir, pero no marcar ni borrar desde aquí. */
  projected?: boolean;
};

const ACTION_WIDTH = 84;

function DeleteAction({ drag, color, bg }: { drag: SharedValue<number>; color: string; bg: string }) {
  const fade = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.abs(drag.get()) / (ACTION_WIDTH * 0.5)) }));
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.abs(drag.get()) / ACTION_WIDTH);
    return { transform: [{ scale: 0.7 + p * 0.3 }] };
  });
  return (
    <Animated.View style={[{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, fade]}>
      <Animated.View style={[{ alignItems: 'center', gap: 2 }, style]}>
        <Icon name="trash" size={20} color={color} />
        <Text style={{ color, fontSize: 12, fontWeight: '600' }}>Eliminar</Text>
      </Animated.View>
    </Animated.View>
  );
}

export function ReminderRow({ reminder: r, notebook, showNotebook = true, isLast, when, projected }: Props) {
  const theme = useTheme();
  const glass = useGlassActive();
  // Sobre cristal la fila es transparente; en modo sólido, opaca como la tarjeta.
  const rowBg = glass ? 'transparent' : theme.surface;
  const swipe = useRef<SwipeableMethods>(null);
  const toggleComplete = useStore((s) => s.toggleComplete);
  const deleteReminders = useStore((s) => s.deleteReminders);
  const updateReminder = useStore((s) => s.updateReminder);

  // Al marcar, la casilla se rellena aquí mismo y la tarea se va de la lista un instante después.
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const done = !!r.completedAt || checking;
  const color = notebook ? notebookColors(notebook.color, theme).strong : PASTELS.lavanda.strong;
  const overdue = !done && isOverdue(r.dueAt, r.hasTime);

  const remove = () => {
    haptic.warning();
    deleteReminders([r.id]);
  };
  const toggle = () => {
    if (checking) {
      clearTimeout(timer.current);
      setChecking(false);
      haptic.tap();
      return;
    }
    if (r.completedAt) {
      haptic.tap();
      toggleComplete(r.id);
      return;
    }
    haptic.success();
    setChecking(true);
    timer.current = setTimeout(() => {
      toggleComplete(r.id);
      setChecking(false);
    }, COMPLETE_DELAY);
  };
  const postpone = () => {
    const base = r.dueAt ?? startOfDay(Date.now());
    updateReminder(r.id, { dueAt: addDays(Math.max(base, startOfDay(Date.now())), 1), completedAt: null });
  };

  const meta: string[] = [];
  if (showNotebook && notebook) meta.push(`${notebook.emoji} ${notebook.name}`);
  if (when !== undefined) {
    if (when) meta.push(when);
  } else if (r.dueAt != null) meta.push(formatDue(r.dueAt, r.hasTime));

  const androidMenu = () =>
    showAlert(r.title, undefined, [
      { text: done ? 'Marcar pendiente' : 'Marcar como hecho', onPress: toggle },
      { text: 'Pasar a mañana', onPress: postpone },
      { text: r.important ? 'Quitar importante' : 'Marcar importante', onPress: () => updateReminder(r.id, { important: !r.important }) },
      { text: 'Eliminar', style: 'destructive', onPress: remove },
      { text: 'Cancelar', style: 'cancel' },
    ]);

  // El estilo va en un View interior: el Link de iOS sustituye el estilo del Pressable que envuelve.
  const content = (
    <Pressable
      onPress={process.env.EXPO_OS === 'android' ? () => router.push(`/reminder/${r.id}`) : undefined}
      onLongPress={process.env.EXPO_OS === 'android' && !projected ? androidMenu : undefined}
      android_ripple={{ color: theme.separator }}
      style={{ backgroundColor: rowBg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: rowBg }}>
      <View style={{ paddingTop: 1 }}>
        {projected ? (
          <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="repeat" size={11} color={color} />
          </View>
        ) : (
          <Checkbox checked={done} color={color} ring={theme.scheme === 'dark' ? theme.textTertiary : color} onToggle={toggle} label={`Completar ${r.title}`} />
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Animated.Text
          numberOfLines={2}
          style={[
            {
              fontSize: 16,
              lineHeight: 21,
              color: done ? theme.textTertiary : theme.text,
              textDecorationLine: done ? 'line-through' : 'none',
            },
            // El título se apaga con un fundido al completar, en vez de cambiar de golpe.
            COLOR_FADE,
          ]}>
          {r.title}
        </Animated.Text>
        {meta.length > 0 || r.repeat !== 'none' || r.alert !== 'none' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text numberOfLines={1} style={{ fontSize: 13, color: overdue ? theme.danger : theme.textSecondary, flexShrink: 1 }}>
              {meta.join(' · ')}
            </Text>
            {r.repeat !== 'none' ? <Icon name="repeat" size={12} color={theme.textTertiary} /> : null}
            {r.alert !== 'none' && r.dueAt != null && !done ? <Icon name="bell" size={12} color={theme.textTertiary} /> : null}
          </View>
        ) : null}
      </View>
      {r.important && !done ? <Icon name="starFill" size={15} color={PASTELS.limon.strong} /> : null}
      </View>
    </Pressable>
  );

  return (
    <Animated.View entering={ENTER} exiting={EXIT} layout={LAYOUT}>
      <ReanimatedSwipeable
        ref={swipe}
        enabled={!projected}
        friction={1.6}
        rightThreshold={ACTION_WIDTH * 0.9}
        overshootRight={false}
        renderRightActions={(_p, drag) => (
          <Pressable onPress={remove} accessibilityLabel="Eliminar recordatorio" style={{ width: ACTION_WIDTH, height: '100%' }}>
            <DeleteAction drag={drag} color={theme.danger} bg={theme.dangerSoft} />
          </Pressable>
        )}
        onSwipeableOpen={() => remove()}>
        {process.env.EXPO_OS === 'ios' && projected ? (
          <Link href={`/reminder/${r.id}`} asChild>
            {content}
          </Link>
        ) : process.env.EXPO_OS === 'ios' ? (
          <Link href={`/reminder/${r.id}`} asChild>
            <Link.Trigger>{content}</Link.Trigger>
            <Link.Menu>
              <Link.MenuAction title={done ? 'Marcar pendiente' : 'Marcar como hecho'} icon={done ? 'arrow.uturn.backward' : 'checkmark.circle'} onPress={toggle} />
              <Link.MenuAction title="Pasar a mañana" icon="sunrise" onPress={postpone} />
              <Link.MenuAction title={r.important ? 'Quitar importante' : 'Marcar importante'} icon={r.important ? 'star.slash' : 'star'} onPress={() => updateReminder(r.id, { important: !r.important })} />
              <Link.MenuAction title="Eliminar" icon="trash" destructive onPress={remove} />
            </Link.Menu>
          </Link>
        ) : (
          content
        )}
      </ReanimatedSwipeable>
      {!isLast ? <View style={{ height: 1, backgroundColor: theme.separator, marginLeft: 50 }} /> : null}
    </Animated.View>
  );
}
