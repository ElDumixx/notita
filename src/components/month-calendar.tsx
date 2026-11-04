import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';

import { monthGrid } from '@/lib/calendar';
import { addMonths, formatLongDate, formatMonthYear, isSameMonth, startOfMonth, WEEKDAY_INITIALS } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { RADIUS, useTheme } from '@/theme';
import { ANDROID, EASE_OUT } from '@/theme/motion';

import { Glass } from './glass';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

type Props = {
  /** Primer día del mes que se muestra. */
  month: number;
  selected: number;
  today: number;
  /** Colores (uno por recordatorio pendiente) de cada día, con la medianoche como clave. */
  markers: Map<number, string[]>;
  onSelect: (day: number) => void;
  onMonthChange: (month: number) => void;
  /** Ancho disponible para la tarjeta. */
  width: number;
};

const PAD = 12;

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={14} color={theme.text} weight="semibold" />
      </View>
    </PressableScale>
  );
}

/** Calendario mensual: 6 semanas fijas (la tarjeta no cambia de alto) con un punto por recordatorio. */
export function MonthCalendar({ month, selected, today, markers, onSelect, onMonthChange, width }: Props) {
  const theme = useTheme();
  const [direction, setDirection] = useState(0);
  const days = monthGrid(month);
  const cell = Math.floor((width - PAD * 2) / 7);
  const rowHeight = Math.max(46, Math.min(cell, 62));
  const circle = Math.min(cell - 8, 38);

  const go = (delta: number) => {
    haptic.tap();
    setDirection(delta);
    onMonthChange(addMonths(month, delta));
  };
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-24, 24])
    .failOffsetY([-14, 14])
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 50 || Math.abs(e.velocityX) > 500) go(e.translationX < 0 ? 1 : -1);
    });

  // El mes nuevo entra desde el lado hacia el que se pasa; en Android, más corto.
  const d = ANDROID ? 170 : 220;
  const entering = (direction > 0 ? FadeInRight.duration(d) : direction < 0 ? FadeInLeft.duration(d) : FadeIn.duration(150)).easing(EASE_OUT);

  return (
    <Glass radius={RADIUS.lg} style={{ padding: PAD, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6 }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 20, fontWeight: '700', color: theme.text }}>
          {formatMonthYear(month)}
        </Text>
        {!isSameMonth(month, today) || selected !== today ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Ir a hoy"
            onPress={() => {
              haptic.tap();
              setDirection(Math.sign(today - month));
              onMonthChange(startOfMonth(today));
              onSelect(today);
            }}>
            <View style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: theme.tintSoft, justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.tint }}>Hoy</Text>
            </View>
          </PressableScale>
        ) : null}
        <RoundButton icon="chevronLeft" label="Mes anterior" onPress={() => go(-1)} />
        <RoundButton icon="chevron" label="Mes siguiente" onPress={() => go(1)} />
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAY_INITIALS.map((d, i) => (
          <Text key={d + i} style={{ width: cell, textAlign: 'center', fontSize: 12, fontWeight: '600', color: i >= 5 ? theme.textTertiary : theme.textSecondary }}>
            {d}
          </Text>
        ))}
      </View>

      <GestureDetector gesture={swipe}>
        <View collapsable={false}>
          <Animated.View key={month} entering={entering} style={{ flexDirection: 'row', flexWrap: 'wrap', width: cell * 7 }}>
            {days.map((day) => {
              const inMonth = isSameMonth(day, month);
              const isToday = day === today;
              const isSelected = day === selected;
              const dots = markers.get(day) ?? [];
              const bg = isSelected ? theme.tint : isToday ? theme.tintSoft : 'transparent';
              const fg = isSelected ? theme.onTint : isToday ? theme.tint : theme.text;
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${formatLongDate(day)}${dots.length ? `, ${dots.length} ${dots.length === 1 ? 'recordatorio' : 'recordatorios'}` : ''}`}
                  onPress={() => {
                    haptic.tap();
                    onSelect(day);
                    if (!inMonth) {
                      setDirection(Math.sign(day - month));
                      onMonthChange(startOfMonth(day));
                    }
                  }}
                  style={{ width: cell, height: rowHeight, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <View style={{ width: circle, height: circle, borderRadius: circle / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: inMonth ? 1 : 0.4 }}>
                    <Text style={{ fontSize: 16, fontWeight: isToday || isSelected ? '700' : '500', color: fg, fontVariant: ['tabular-nums'] }}>{new Date(day).getDate()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 3, height: 5, opacity: inMonth ? 1 : 0.4 }}>
                    {dots.slice(0, 3).map((c, i) => (
                      <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c }} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>
    </Glass>
  );
}
