import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AddButton } from '@/components/add-button';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { ReminderRow } from '@/components/reminder-row';
import { Group, SectionTitle, TEXT_INSET } from '@/components/ui';
import { ScreenTitle } from '@/components/screen-title';
import { useNow } from '@/hooks/use-now';
import { READABLE_WIDTH, useResponsive } from '@/hooks/use-responsive';
import { formatLongDate, greeting } from '@/lib/dates';
import { useStore } from '@/store';
import { todaySections, type Section } from '@/store/selectors';
import type { Notebook, Reminder } from '@/store/types';
import { useTheme } from '@/theme';
import { ANDROID, EASE_OUT } from '@/theme/motion';
import { PASTELS } from '@/theme/palette';

function Progress({ done, total }: { done: number; total: number }) {
  const theme = useTheme();
  const ratio = total ? done / total : 0;
  const width = useSharedValue(ratio);
  useEffect(() => {
    width.set(withTiming(ratio, { duration: ANDROID ? 300 : 460, easing: EASE_OUT }));
  }, [ratio, width]);
  const bar = useAnimatedStyle(() => ({ width: `${width.get() * 100}%` }));
  // Con todo hecho, la barra pasa a verde menta con un fundido.
  const fill = total > 0 && done === total ? PASTELS.menta.strong : theme.tint;
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.surfaceAlt, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: fill, transitionProperty: 'backgroundColor', transitionDuration: 300 }, bar]} />
    </View>
  );
}

function SectionBlock({ section, byId }: { section: Section; byId: Map<string, Notebook> }) {
  return (
    <View>
      <SectionTitle tone={section.tone}>{section.title}</SectionTitle>
      <Group>
        {section.data.map((r, i) => (
          <ReminderRow key={r.id} reminder={r} notebook={byId.get(r.notebookId)} isLast={i === section.data.length - 1} />
        ))}
      </Group>
    </View>
  );
}

function DoneToday({ list, byId }: { list: Reminder[]; byId: Map<string, Notebook> }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <SectionTitle
          right={
            <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
              <Icon name="chevron" size={12} color={theme.textSecondary} weight="semibold" />
            </View>
          }>
          {`Hechos hoy · ${list.length}`}
        </SectionTitle>
      </Pressable>
      {open ? (
        <Group>
          {list.map((r, i) => (
            <ReminderRow key={r.id} reminder={r} notebook={byId.get(r.notebookId)} isLast={i === list.length - 1} />
          ))}
        </Group>
      ) : null}
    </View>
  );
}

export function TodayScreen() {
  const theme = useTheme();
  const now = useNow();
  const layout = useResponsive();
  const reminders = useStore((s) => s.reminders);
  const notebooks = useStore((s) => s.notebooks);

  const byId = useMemo(() => new Map(notebooks.map((n) => [n.id, n])), [notebooks]);
  const { sections, doneToday, total, done } = useMemo(() => todaySections(reminders, now), [reminders, now]);
  const pendingToday = total - done;

  const header = (
    <View style={{ gap: 12, paddingHorizontal: TEXT_INSET }}>
      <Text style={{ fontSize: 15, color: theme.textSecondary }}>
        {greeting(now)} · {formatLongDate(now)}
      </Text>
      {total > 0 ? (
        <View style={{ gap: 8 }}>
          <Progress done={done} total={total} />
          <Text style={{ fontSize: 13, color: theme.textTertiary }}>
            {pendingToday === 0 ? 'Todo hecho por hoy' : `${pendingToday} ${pendingToday === 1 ? 'pendiente' : 'pendientes'} · ${done} ${done === 1 ? 'hecho' : 'hechos'}`}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const empty = <EmptyState title="Nada pendiente" message="Disfruta del día. Cuando quieras, añade un recordatorio con el botón +." />;
  const doneBlock = doneToday.length > 0 ? <DoneToday list={doneToday} byId={byId} /> : null;

  // Tablet grande: lo de hoy a la izquierda y lo que viene a la derecha. El árbol es el mismo en
  // todos los tamaños (solo cambia la dirección), así nada se vuelve a montar al girar la pantalla.
  const wide = layout.size === 'expanded';
  const current = sections.filter((s) => s.key === 'overdue' || s.key === 'today');
  const next = sections.filter((s) => s.key === 'tomorrow' || s.key === 'week');
  const showEmpty = wide ? current.length === 0 : sections.length === 0;

  return (
    <>
      <ScrollView
        onLayout={layout.onLayout}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: layout.pad, paddingTop: 4, paddingBottom: 140, gap: 22 }}>
        <ScreenTitle title="Hoy" />
        <View style={{ maxWidth: wide ? READABLE_WIDTH : undefined }}>{header}</View>
        <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'flex-start' : 'stretch', gap: wide ? 24 : 22 }}>
          {current.length || showEmpty || wide ? (
            <View style={{ flex: wide ? 1 : undefined, gap: 22 }}>
              {current.map((s) => (
                <SectionBlock key={s.key} section={s} byId={byId} />
              ))}
              {showEmpty ? empty : null}
            </View>
          ) : null}
          <View style={{ flex: wide ? 1 : undefined, gap: 22 }}>
            {next.map((s) => (
              <SectionBlock key={s.key} section={s} byId={byId} />
            ))}
            {doneBlock}
          </View>
        </View>
      </ScrollView>
      <AddButton label="Nuevo recordatorio" onPress={() => router.push('/reminder/new')} />
    </>
  );
}
