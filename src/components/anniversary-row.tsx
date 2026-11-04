import { Link, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useNow } from '@/hooks/use-now';
import { anniversaryTitle, countdown, dayMonth, KINDS, yearsLabel } from '@/lib/anniversaries';
import { dayDiff } from '@/lib/dates';
import { useStore } from '@/store';
import type { Anniversary } from '@/store/types';
import { notebookColors, useTheme } from '@/theme';
import { ENTER, EXIT, LAYOUT } from '@/theme/motion';
import { PASTELS } from '@/theme/palette';

type Props = {
  anniversary: Anniversary;
  /** Celebración que se muestra (medianoche). */
  date: number;
  isLast?: boolean;
  /** Ocultar la fecha cuando ya la indica la sección (día del calendario). */
  showDate?: boolean;
};

/** Fila de un cumpleaños o aniversario: icono, a quién, qué se cumple y cuánto falta. */
export function AnniversaryRow({ anniversary: a, date, isLast, showDate = true }: Props) {
  const theme = useTheme();
  const now = useNow();
  const deleteAnniversary = useStore((s) => s.deleteAnniversary);
  const c = notebookColors(a.color, theme);
  const days = dayDiff(date, now);
  const meta = [showDate ? dayMonth(a) : null, yearsLabel(a, date) || KINDS[a.kind].label].filter(Boolean).join(' · ');
  const today = days === 0;

  const content = (
    <Pressable
      accessibilityRole="button"
      onPress={process.env.EXPO_OS === 'ios' ? undefined : () => router.push(`/anniversary/${a.id}`)}
      android_ripple={{ color: theme.separator }}
      style={({ pressed }) => ({ backgroundColor: pressed && process.env.EXPO_OS !== 'android' ? theme.surfaceAlt : 'transparent' })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 56 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, borderCurve: 'continuous', backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>{a.emoji}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, color: theme.text }}>
            {anniversaryTitle(a)}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 13, color: theme.textSecondary }}>
            {meta}
          </Text>
        </View>
        {days >= 0 ? (
          <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: today ? PASTELS.rosa.strong : c.bg, justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: today ? '#FFFFFF' : c.ink }}>{today ? '¡Hoy! 🎉' : countdown(days)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <Animated.View entering={ENTER} exiting={EXIT} layout={LAYOUT}>
      {process.env.EXPO_OS === 'ios' ? (
        <Link href={`/anniversary/${a.id}`} asChild>
          <Link.Trigger>{content}</Link.Trigger>
          <Link.Menu>
            <Link.MenuAction title="Editar" icon="pencil" onPress={() => router.push(`/anniversary/${a.id}`)} />
            <Link.MenuAction title="Eliminar" icon="trash" destructive onPress={() => deleteAnniversary(a.id)} />
          </Link.Menu>
        </Link>
      ) : (
        content
      )}
      {!isLast ? <View style={{ height: 1, backgroundColor: theme.separator, marginLeft: 58 }} /> : null}
    </Animated.View>
  );
}
