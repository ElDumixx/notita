import { addDays, endOfDay, isOverdue, startOfDay } from '@/lib/dates';

import type { Reminder, WidgetSource } from './types';

/** Orden natural: con fecha primero (por fecha), luego sin fecha (por creación). */
export function byDue(a: Reminder, b: Reminder) {
  if (a.dueAt == null && b.dueAt == null) return a.createdAt - b.createdAt;
  if (a.dueAt == null) return 1;
  if (b.dueAt == null) return -1;
  // Los de "todo el día" van antes que los de hora concreta del mismo día.
  if (startOfDay(a.dueAt) === startOfDay(b.dueAt) && a.hasTime !== b.hasTime) return a.hasTime ? 1 : -1;
  return a.dueAt - b.dueAt || a.createdAt - b.createdAt;
}

export const isPending = (r: Reminder) => !r.completedAt;

export type Section = { key: string; title: string; data: Reminder[]; tone?: 'danger' };

/** Secciones de la pestaña Hoy. */
export function todaySections(reminders: Reminder[], now = Date.now()): { sections: Section[]; doneToday: Reminder[]; total: number; done: number } {
  const today0 = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowEnd = endOfDay(addDays(now, 1));
  const weekEnd = endOfDay(addDays(now, 7));

  const pending = reminders.filter(isPending).sort(byDue);
  const overdue = pending.filter((r) => r.dueAt != null && isOverdue(r.dueAt, r.hasTime, now) && r.dueAt < today0);
  const today = pending.filter((r) => r.dueAt != null && r.dueAt >= today0 && r.dueAt <= todayEnd);
  const tomorrow = pending.filter((r) => r.dueAt != null && r.dueAt > todayEnd && r.dueAt <= tomorrowEnd);
  const week = pending.filter((r) => r.dueAt != null && r.dueAt > tomorrowEnd && r.dueAt <= weekEnd);
  const doneToday = reminders.filter((r) => r.completedAt && r.completedAt >= today0).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const sections: Section[] = [
    { key: 'overdue', title: 'Atrasados', data: overdue, tone: 'danger' as const },
    { key: 'today', title: 'Hoy', data: today },
    { key: 'tomorrow', title: 'Mañana', data: tomorrow },
    { key: 'week', title: 'Próximos 7 días', data: week },
  ].filter((s) => s.data.length > 0);

  const total = overdue.length + today.length + doneToday.length;
  return { sections, doneToday, total, done: doneToday.length };
}

export type SmartList = 'todos' | 'programados' | 'importantes' | 'hechos';

export const SMART_LISTS: { key: SmartList; title: string; sf: string; md: string }[] = [
  { key: 'todos', title: 'Todos', sf: 'tray.full', md: 'inbox' },
  { key: 'programados', title: 'Programados', sf: 'calendar', md: 'calendar_month' },
  { key: 'importantes', title: 'Importantes', sf: 'star', md: 'star' },
  { key: 'hechos', title: 'Hechos', sf: 'checkmark.circle', md: 'task_alt' },
];

export function isSmartList(id: string): id is SmartList {
  return SMART_LISTS.some((l) => l.key === id);
}

export function filterSmart(reminders: Reminder[], key: SmartList) {
  switch (key) {
    case 'todos':
      return reminders.filter(isPending).sort(byDue);
    case 'programados':
      return reminders.filter((r) => isPending(r) && r.dueAt != null).sort(byDue);
    case 'importantes':
      return reminders.filter((r) => isPending(r) && r.important).sort(byDue);
    case 'hechos':
      return reminders.filter((r) => r.completedAt).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  }
}

/** Recordatorios que muestra un widget según su fuente (misma lógica que el widget de iOS). */
export function remindersForSource(reminders: Reminder[], source: WidgetSource, now = Date.now()) {
  const pending = reminders.filter(isPending);
  const todayEnd = endOfDay(now);
  if (source === 'hoy') return pending.filter((r) => r.dueAt != null && r.dueAt <= todayEnd).sort(byDue);
  if (source === 'proximos') return pending.filter((r) => r.dueAt != null).sort(byDue);
  if (source === 'importantes') return pending.filter((r) => r.important).sort(byDue);
  if (source === 'todos') return pending.sort(byDue);
  const id = source.slice('libreta:'.length);
  return pending.filter((r) => r.notebookId === id).sort(byDue);
}
