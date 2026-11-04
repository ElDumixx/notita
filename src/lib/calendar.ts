/** Cálculos del calendario y la agenda: rejilla del mes y apariciones de cada recordatorio. */
import { byDue } from '@/store/selectors';
import type { Reminder } from '@/store/types';

import { addDays, nextOccurrence, startOfDay, startOfMonth } from './dates';

export type Occurrence = {
  reminder: Reminder;
  /** Momento de esta aparición (los repetitivos aparecen varias veces). */
  at: number;
  /** true = repetición futura calculada (no es la fecha guardada del recordatorio). */
  projected: boolean;
};

/** Los 42 días (6 semanas desde el lunes) de la rejilla de un mes: la altura nunca cambia. */
export function monthGrid(month: number): number[] {
  const first = startOfMonth(month);
  const offset = (new Date(first).getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * Apariciones entre `from` y `to` (incluidos). Los pendientes que se repiten se proyectan en
 * cada día que les toca; los hechos solo aparecen en su fecha.
 */
export function occurrencesBetween(reminders: Reminder[], from: number, to: number): Occurrence[] {
  const out: Occurrence[] = [];
  for (const r of reminders) {
    if (r.dueAt == null) continue;
    if (r.completedAt || r.repeat === 'none') {
      if (r.dueAt >= from && r.dueAt <= to) out.push({ reminder: r, at: r.dueAt, projected: false });
      continue;
    }
    let at = r.dueAt;
    for (let guard = 0; at <= to && guard < 500; guard++) {
      if (at >= from) out.push({ reminder: r, at, projected: at !== r.dueAt });
      at = nextOccurrence(at, r.repeat, at);
    }
  }
  return out.sort((a, b) => a.at - b.at || byDue(a.reminder, b.reminder));
}

/** Agrupa por día (clave: medianoche de ese día), conservando el orden. */
export function groupByDay(list: Occurrence[]): Map<number, Occurrence[]> {
  const days = new Map<number, Occurrence[]>();
  for (const o of list) {
    const key = startOfDay(o.at);
    const day = days.get(key);
    if (day) day.push(o);
    else days.set(key, [o]);
  }
  return days;
}
