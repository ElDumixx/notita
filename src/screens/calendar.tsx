import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AddButton } from '@/components/add-button';
import { AnniversaryRow } from '@/components/anniversary-row';
import { EmptyState } from '@/components/empty-state';
import { MonthCalendar } from '@/components/month-calendar';
import { ReminderRow } from '@/components/reminder-row';
import { Button, Group, SectionTitle, Segmented, TEXT_INSET } from '@/components/ui';
import { useHeaderScroll } from '@/components/screen-header';
import { ScreenTitle } from '@/components/screen-title';
import { useNow } from '@/hooks/use-now';
import { useResponsive } from '@/hooks/use-responsive';
import { anniversariesBetween, type AnniversaryOccurrence } from '@/lib/anniversaries';
import { groupByDay, monthGrid, occurrencesBetween, type Occurrence } from '@/lib/calendar';
import { addDays, endOfDay, formatLongDate, formatMonthYear, formatTime, formatWeekdayShort, isOverdue, isSameMonth, startOfDay, startOfMonth } from '@/lib/dates';
import { useStore } from '@/store';
import { byDue } from '@/store/selectors';
import type { Notebook, Reminder } from '@/store/types';
import { notebookColors, useTheme } from '@/theme';
import { PASTELS } from '@/theme/palette';

import { AnniversariesView } from './anniversaries';

type Mode = 'mes' | 'agenda' | 'aniversarios';
const MODES: { key: Mode; label: string }[] = [
  { key: 'mes', label: 'Mes' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'aniversarios', label: 'Aniversarios' },
];

/** La agenda muestra un mes y se amplía de 30 en 30 días a petición (lista ligera). */
const AGENDA_STEP = 30;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function OccurrenceRows({ items, byId }: { items: Occurrence[]; byId: Map<string, Notebook> }) {
  return (
    <Group>
      {items.map((o, i) => (
        <ReminderRow
          key={`${o.reminder.id}-${o.at}`}
          reminder={o.reminder}
          notebook={byId.get(o.reminder.notebookId)}
          when={o.reminder.hasTime ? formatTime(o.at) : 'Todo el día'}
          projected={o.projected}
          isLast={i === items.length - 1}
        />
      ))}
    </Group>
  );
}

function AnniversaryRows({ items }: { items: AnniversaryOccurrence[] }) {
  return (
    <Group>
      {items.map((o, i) => (
        <AnniversaryRow key={o.anniversary.id} anniversary={o.anniversary} date={o.at} showDate={false} isLast={i === items.length - 1} />
      ))}
    </Group>
  );
}

type DayProps = { day: number; today: number; items: Occurrence[]; anniversaries: AnniversaryOccurrence[]; byId: Map<string, Notebook> };

function DayPanel({ day, today, items, anniversaries, byId }: DayProps) {
  const theme = useTheme();
  const label = day === today ? 'Hoy' : day === addDays(today, 1) ? 'Mañana' : day === addDays(today, -1) ? 'Ayer' : null;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, paddingHorizontal: TEXT_INSET }}>
        <Text accessibilityRole="header" style={{ flexShrink: 1, fontSize: 18, fontWeight: '700', color: theme.text }}>
          {capitalize(formatLongDate(day))}
        </Text>
        {label ? <Text style={{ fontSize: 14, fontWeight: '600', color: theme.tint }}>{label}</Text> : null}
      </View>
      {anniversaries.length ? <AnniversaryRows items={anniversaries} /> : null}
      {items.length ? <OccurrenceRows items={items} byId={byId} /> : null}
      {!items.length && !anniversaries.length ? (
        <Text style={{ fontSize: 15, color: theme.textSecondary, paddingHorizontal: TEXT_INSET }}>Nada este día.</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button kind="soft" icon="add" title="Recordatorio" onPress={() => router.push(`/reminder/new?date=${day}`)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button kind="soft" icon="sparkles" title="Fecha especial" onPress={() => router.push(`/anniversary/new?date=${day}`)} />
        </View>
      </View>
    </View>
  );
}

function AgendaDay({ day, today, items, anniversaries, byId }: DayProps) {
  const theme = useTheme();
  const isToday = day === today;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View accessible accessibilityLabel={formatLongDate(day)} style={{ width: 44, alignItems: 'center', gap: 2, paddingTop: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: isToday ? theme.tint : theme.textSecondary }}>
          {formatWeekdayShort(day)}
        </Text>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isToday ? theme.tint : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: isToday ? theme.onTint : theme.text, fontVariant: ['tabular-nums'] }}>{new Date(day).getDate()}</Text>
        </View>
      </View>
      <View style={{ flex: 1, gap: 10 }}>
        {anniversaries.length ? <AnniversaryRows items={anniversaries} /> : null}
        {items.length ? <OccurrenceRows items={items} byId={byId} /> : null}
      </View>
    </View>
  );
}

export function CalendarScreen() {
  const theme = useTheme();
  const now = useNow();
  const today = startOfDay(now);
  const layout = useResponsive();
  const headerScroll = useHeaderScroll();
  const reminders = useStore((s) => s.reminders);
  const notebooks = useStore((s) => s.notebooks);
  const anniversaries = useStore((s) => s.anniversaries);
  // El widget y los avisos de aniversarios abren directamente esa vista (?modo=aniversarios).
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const [mode, setMode] = useState<Mode>(() => MODES.find((m) => m.key === modo)?.key ?? 'mes');
  // Si llega otro ?modo= con la pantalla ya abierta, se cambia de vista (sin efectos: durante el render).
  const [lastModo, setLastModo] = useState(modo);
  if (modo !== lastModo) {
    setLastModo(modo);
    const m = MODES.find((x) => x.key === modo);
    if (m) setMode(m.key);
  }
  const [month, setMonth] = useState(() => startOfMonth(Date.now()));
  const [selected, setSelected] = useState(() => startOfDay(Date.now()));
  const [horizon, setHorizon] = useState(AGENDA_STEP);

  const byId = new Map(notebooks.map((n) => [n.id, n]));
  const colorOf = (r: Reminder) => {
    const nb = byId.get(r.notebookId);
    return nb ? notebookColors(nb.color, theme).strong : PASTELS.lavanda.strong;
  };

  // Mes: un punto por recordatorio pendiente en cada día de la rejilla.
  const grid = monthGrid(month);
  const gridEnd = endOfDay(grid[grid.length - 1]);
  const markers = new Map<number, string[]>();
  // Los aniversarios van primero (su color) y después un punto por recordatorio pendiente.
  for (const o of anniversariesBetween(anniversaries, grid[0], gridEnd)) {
    markers.set(o.at, [...(markers.get(o.at) ?? []), PASTELS[o.anniversary.color].strong]);
  }
  for (const [day, items] of groupByDay(occurrencesBetween(reminders, grid[0], gridEnd))) {
    const colors = items.filter((o) => !o.reminder.completedAt).map((o) => colorOf(o.reminder));
    if (colors.length) markers.set(day, [...(markers.get(day) ?? []), ...colors]);
  }
  const dayItems = occurrencesBetween(reminders, selected, endOfDay(selected));
  const dayAnniversaries = anniversariesBetween(anniversaries, selected, endOfDay(selected));

  // Agenda: lo atrasado arriba y después, día a día, lo que viene.
  const pending = reminders.filter((r) => !r.completedAt);
  const overdue = pending.filter((r) => r.dueAt != null && r.dueAt < today && isOverdue(r.dueAt, r.hasTime, now)).sort(byDue);
  const agendaEnd = endOfDay(addDays(today, horizon - 1));
  const agendaAnniversaries = new Map<number, AnniversaryOccurrence[]>();
  for (const o of anniversariesBetween(anniversaries, today, agendaEnd)) agendaAnniversaries.set(o.at, [...(agendaAnniversaries.get(o.at) ?? []), o]);
  const agendaItems = groupByDay(occurrencesBetween(pending, today, agendaEnd));
  const agenda = [...new Set([...agendaItems.keys(), ...agendaAnniversaries.keys()])]
    .sort((a, b) => a - b)
    .map((day) => [day, agendaItems.get(day) ?? [], agendaAnniversaries.get(day) ?? []] as const);

  const changeMonth = (m: number) => {
    setMonth(m);
    // Al cambiar de mes se selecciona hoy (si es el mes actual) o el día 1.
    if (!isSameMonth(selected, m)) setSelected(isSameMonth(m, today) ? today : m);
  };

  // Con sitio (iPad, tablets, horizontal), el mes y el día seleccionado van lado a lado.
  const wide = layout.twoPane;
  const calendarWidth = wide ? Math.max(340, Math.min(520, Math.floor((layout.inner - 24) * 0.5))) : layout.inner;

  const calendar = (
    <MonthCalendar month={month} selected={selected} today={today} markers={markers} onSelect={setSelected} onMonthChange={changeMonth} width={calendarWidth} />
  );
  const dayPanel = <DayPanel day={selected} today={today} items={dayItems} anniversaries={dayAnniversaries} byId={byId} />;

  const agendaView = (
    <View style={{ gap: 18 }}>
      {overdue.length ? (
        <View>
          <SectionTitle tone="danger">Atrasados</SectionTitle>
          <Group>
            {overdue.map((r, i) => (
              <ReminderRow key={r.id} reminder={r} notebook={byId.get(r.notebookId)} isLast={i === overdue.length - 1} />
            ))}
          </Group>
        </View>
      ) : null}
      {agenda.map(([day, items, anns], i) => {
        const m = startOfMonth(day);
        const newMonth = i === 0 || startOfMonth(agenda[i - 1][0]) !== m;
        return (
          <View key={day} style={{ gap: 12 }}>
            {newMonth ? <SectionTitle>{formatMonthYear(m)}</SectionTitle> : null}
            <AgendaDay day={day} today={today} items={items} anniversaries={anns} byId={byId} />
          </View>
        );
      })}
      {agenda.length === 0 && overdue.length === 0 ? (
        <EmptyState title="Agenda despejada" message={`No hay nada programado en los próximos ${horizon} días.`} />
      ) : null}
      {horizon < 365 ? <Button kind="soft" title={`Ver ${AGENDA_STEP} días más`} onPress={() => setHorizon((h) => h + AGENDA_STEP)} /> : null}
    </View>
  );

  return (
    <>
      <ScrollView
        {...headerScroll}
        onLayout={layout.onLayout}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: layout.pad, paddingTop: 4, paddingBottom: 140, gap: 20 }}>
        <ScreenTitle title="Calendario" />
        <View style={{ maxWidth: layout.size === 'compact' ? undefined : 420 }}>
          <Segmented options={MODES} value={mode} onChange={setMode} />
        </View>

        {mode === 'aniversarios' ? (
          <AnniversariesView width={layout.inner} />
        ) : mode === 'agenda' ? (
          agendaView
        ) : wide ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
            <View style={{ width: calendarWidth }}>{calendar}</View>
            <View style={{ flex: 1 }}>{dayPanel}</View>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {calendar}
            {dayPanel}
          </View>
        )}
      </ScrollView>
      {mode === 'aniversarios' ? (
        <AddButton label="Nueva fecha especial" onPress={() => router.push('/anniversary/new')} />
      ) : (
        <AddButton label="Nuevo recordatorio" onPress={() => router.push(`/reminder/new?date=${mode === 'mes' ? selected : today}`)} />
      )}
    </>
  );
}
