/** Contenido de los widgets «Aniversarios» e «Importantes» (app, Android e iOS usan lo mismo). */
import type { State } from '@/store';
import { byDue, isPending } from '@/store/selectors';
import type { AnniversaryKind } from '@/store/types';
import { PASTELS, type PastelKey } from '@/theme/palette';

import { countdown, daysUntil, KINDS, shortCountdown, upcoming, yearsLabel } from './anniversaries';
import { dayDiff } from './dates';
import type { SpikeNote } from './spike-art';
import { compactWhen } from './widget-data';

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

export type AnniversaryItem = {
  id: string;
  kind: AnniversaryKind;
  name: string;
  emoji: string;
  color: PastelKey;
  days: number;
  /** "¡Hoy!", "Mañana", "En 5 días". */
  countdown: string;
  /** "Hoy", "Mañana", "5 días" (listas). */
  short: string;
  /** "Cumple 31 años · 12 nov" */
  detail: string;
};

export function anniversaryItems(state: Pick<State, 'anniversaries'>, now = Date.now()): AnniversaryItem[] {
  return upcoming(state.anniversaries, now).map(({ a, date }) => {
    const days = daysUntil(a, now);
    const years = yearsLabel(a, date);
    return {
      id: a.id,
      kind: a.kind,
      name: a.name,
      emoji: a.emoji,
      color: a.color,
      days,
      countdown: countdown(days),
      short: shortCountdown(days),
      detail: [years || KINDS[a.kind].label, `${a.day} ${MONTHS_SHORT[a.month]}`].join(' · '),
    };
  });
}

export type ImportantItem = SpikeNote & {
  title: string;
  /** "★ Trabajo" */
  label: string;
  /** "★ 💼" (cuando no cabe el nombre de la libreta). */
  shortLabel: string;
  when: string;
  overdue: boolean;
  ink: string;
};

/** Recordatorios importantes pendientes, en orden: el primero es el pósit de delante. */
export function importantItems(state: Pick<State, 'reminders' | 'notebooks'>, now = Date.now()): ImportantItem[] {
  const notebooks = new Map(state.notebooks.map((n) => [n.id, n]));
  return state.reminders
    .filter((r) => isPending(r) && r.important)
    .sort(byDue)
    .map((r) => {
      const nb = notebooks.get(r.notebookId);
      const p = PASTELS[nb?.color ?? 'limon'];
      return {
        id: r.id,
        title: r.title,
        label: nb ? `★ ${nb.name}` : '★ Importante',
        shortLabel: nb ? `★ ${nb.emoji}` : '★',
        when: compactWhen(r.dueAt, r.hasTime, now),
        overdue: r.dueAt != null && dayDiff(r.dueAt, now) < 0,
        paper: p.paper,
        fold: p.fold,
        ink: p.ink,
      };
    });
}

export const EMPTY_IMPORTANT = 'No hay recordatorios importantes';
export const EMPTY_ANNIVERSARIES = { title: 'Sin fechas especiales', hint: 'Añade cumpleaños y aniversarios en el Calendario de Notita.' };
