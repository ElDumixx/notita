import { addDays, atTime, startOfDay } from '@/lib/dates';
import { newId } from '@/lib/ids';
import type { PastelKey } from '@/theme/palette';

import type { Notebook, NotebookKind, Reminder, Settings, WidgetDesign } from './types';

export const NOTEBOOK_TEMPLATES: Record<NotebookKind, { name: string; emoji: string; color: PastelKey }> = {
  personal: { name: 'Personal', emoji: '🌼', color: 'limon' },
  trabajo: { name: 'Trabajo', emoji: '💼', color: 'cielo' },
  compras: { name: 'Compras', emoji: '🛒', color: 'menta' },
  estudios: { name: 'Estudios', emoji: '📚', color: 'lavanda' },
  salud: { name: 'Salud', emoji: '💊', color: 'rosa' },
  hogar: { name: 'Hogar', emoji: '🏠', color: 'melocoton' },
  ideas: { name: 'Ideas', emoji: '💡', color: 'salvia' },
  viajes: { name: 'Viajes', emoji: '✈️', color: 'arena' },
};

export const NOTEBOOK_KINDS = Object.keys(NOTEBOOK_TEMPLATES) as NotebookKind[];

export const EMOJIS = [
  '🌼', '💼', '🛒', '📚', '💊', '🏠',
  '💡', '✈️', '🎂', '🎁', '🐾', '🌱',
  '🏋️', '🎵', '🎨', '💰', '🧺', '🍳',
  '🚗', '📞', '❤️', '⭐️', '📌', '🗓️',
];

export const DEFAULT_SETTINGS: Settings = {
  defaultAlert: 'atTime',
  groupNearby: true,
  quietHours: { enabled: true, start: 22 * 60 + 30, end: 8 * 60 },
  digest: { enabled: false, at: 8 * 60 + 30 },
  theme: 'system',
  glass: { enabled: true, transparency: 0.55 },
  haptics: true,
  appIcon: 'original',
};

export function makeDesign(partial: Partial<WidgetDesign> = {}): WidgetDesign {
  return {
    id: newId('w'),
    name: 'Pósit clásico',
    source: 'hoy',
    board: 'blanco',
    shape: 'doblado',
    paper: 'rayas',
    color: 'limon',
    font: 'comic',
    ink: 'auto',
    showTime: true,
    showHeader: true,
    glass: 0.6,
    createdAt: Date.now(),
    ...partial,
  };
}

export function makeReminder(partial: Partial<Reminder> & { notebookId: string; title: string }): Reminder {
  const now = Date.now();
  return {
    id: newId('r'),
    notes: '',
    dueAt: null,
    hasTime: false,
    repeat: 'none',
    alert: 'none',
    important: false,
    completedAt: null,
    snoozeUntil: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/** Datos de bienvenida: tres libretas y recordatorios que explican la app (se pueden borrar). */
export function seedData() {
  const now = Date.now();
  const nb = (kind: NotebookKind): Notebook => ({ id: newId('n'), kind, createdAt: now, ...NOTEBOOK_TEMPLATES[kind] });
  const personal = nb('personal');
  const trabajo = nb('trabajo');
  const compras = nb('compras');
  const today = startOfDay(now);
  const evening = atTime(today, 19 * 60);
  const reminders: Reminder[] = [
    makeReminder({ notebookId: personal.id, title: 'Desliza a la izquierda para eliminar 👈', dueAt: today, hasTime: false }),
    makeReminder({ notebookId: personal.id, title: 'Mantén pulsado para ver más opciones', dueAt: today, hasTime: false }),
    makeReminder({
      notebookId: personal.id,
      title: 'Crea tu pósit en la pestaña Widgets',
      notes: 'Elige fondo, forma, color y tipo de letra.',
      dueAt: evening > now ? evening : addDays(evening, 1),
      hasTime: true,
    }),
    makeReminder({ notebookId: compras.id, title: 'Pan y fruta', dueAt: addDays(today, 1), hasTime: false }),
    makeReminder({ notebookId: trabajo.id, title: 'Revisar correos importantes', dueAt: atTime(addDays(today, 1), 9 * 60 + 30), hasTime: true, important: true }),
  ];
  return {
    notebooks: [personal, trabajo, compras],
    reminders,
    designs: [makeDesign()],
  };
}
