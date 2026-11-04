/** Cumpleaños y aniversarios: fechas que vuelven cada año. */
import type { Anniversary, AnniversaryKind } from '@/store/types';
import type { PastelKey } from '@/theme/palette';

import { dayDiff, formatLongDate, startOfDay } from './dates';

export const KINDS: Record<AnniversaryKind, { label: string; emoji: string; color: PastelKey; placeholder: string }> = {
  cumple: { label: 'Cumpleaños', emoji: '🎂', color: 'rosa', placeholder: '¿De quién es el cumpleaños?' },
  aniversario: { label: 'Aniversario', emoji: '💍', color: 'lavanda', placeholder: '¿De quién es el aniversario?' },
  otro: { label: 'Otra fecha', emoji: '🎉', color: 'melocoton', placeholder: '¿Qué se celebra?' },
};

export const KIND_KEYS = Object.keys(KINDS) as AnniversaryKind[];

export const ANNIVERSARY_EMOJIS = ['🎂', '🎁', '🎈', '🥳', '🎉', '💍', '❤️', '🌹', '🍾', '👶', '🐾', '⭐️'];

/** Avisos que se pueden elegir (días de antelación). */
export const NOTIFY_OPTIONS = [
  { days: 0, label: 'El mismo día' },
  { days: 1, label: '1 día antes' },
  { days: 3, label: '3 días antes' },
  { days: 7, label: '1 semana antes' },
  { days: 14, label: '2 semanas antes' },
];

export const DEFAULT_NOTIFY = [7, 1, 0];

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Medianoche del aniversario en un año dado. El 29 de febrero se celebra el 28 en los años no bisiestos. */
export function dateInYear(a: Pick<Anniversary, 'month' | 'day'>, year: number) {
  const day = a.month === 1 && a.day === 29 && !isLeap(year) ? 28 : a.day;
  return new Date(year, a.month, day).getTime();
}

/** Próxima celebración (hoy incluido). */
export function nextDate(a: Pick<Anniversary, 'month' | 'day'>, now = Date.now()) {
  const year = new Date(now).getFullYear();
  const thisYear = dateInYear(a, year);
  return thisYear >= startOfDay(now) ? thisYear : dateInYear(a, year + 1);
}

export function daysUntil(a: Pick<Anniversary, 'month' | 'day'>, now = Date.now()) {
  return dayDiff(nextDate(a, now), now);
}

/** Años que se cumplen en una celebración (null si no se sabe el año). */
export function yearsAt(a: Pick<Anniversary, 'year'>, date: number) {
  if (a.year == null) return null;
  const n = new Date(date).getFullYear() - a.year;
  return n > 0 ? n : null;
}

/** "Cumpleaños de Ana", "Aniversario de Ana y Luis" o el nombre tal cual. */
export function anniversaryTitle(a: Pick<Anniversary, 'kind' | 'name'>) {
  if (a.kind === 'cumple') return `Cumpleaños de ${a.name}`;
  if (a.kind === 'aniversario') return `Aniversario de ${a.name}`;
  return a.name;
}

/** "Cumple 31 años", "10 años" o "" si no se sabe el año. */
export function yearsLabel(a: Pick<Anniversary, 'kind' | 'year'>, date: number) {
  const n = yearsAt(a, date);
  if (n == null) return '';
  return a.kind === 'cumple' ? `Cumple ${n} ${n === 1 ? 'año' : 'años'}` : `${n} ${n === 1 ? 'año' : 'años'}`;
}

/** "¡Hoy!", "Mañana", "En 5 días", "En 2 meses". */
export function countdown(days: number) {
  if (days <= 0) return '¡Hoy!';
  if (days === 1) return 'Mañana';
  if (days < 60) return `En ${days} días`;
  return `En ${Math.floor(days / 30.4)} meses`;
}

/** Versión corta para listas estrechas: "Hoy", "Mañana", "12 días", "2 meses". */
export function shortCountdown(days: number) {
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days < 60) return `${days} días`;
  return `${Math.floor(days / 30.4)} meses`;
}

/** "12 de noviembre" (sin el día de la semana). */
export function dayMonth(a: Pick<Anniversary, 'month' | 'day'>) {
  return formatLongDate(dateInYear(a, 2024)).split(', ')[1];
}

/** Ordenados por la próxima celebración. */
export function upcoming(list: Anniversary[], now = Date.now()) {
  return list
    .map((a) => ({ a, date: nextDate(a, now) }))
    .sort((x, y) => x.date - y.date || x.a.name.localeCompare(y.a.name, 'es'));
}

export type AnniversaryOccurrence = { anniversary: Anniversary; at: number };

/** Celebraciones entre dos instantes (para el calendario y la agenda). */
export function anniversariesBetween(list: Anniversary[], from: number, to: number): AnniversaryOccurrence[] {
  const out: AnniversaryOccurrence[] = [];
  const y0 = new Date(from).getFullYear();
  const y1 = new Date(to).getFullYear();
  for (const a of list) {
    for (let y = y0; y <= y1; y++) {
      const at = dateInYear(a, y);
      if (at >= startOfDay(from) && at <= to) out.push({ anniversary: a, at });
    }
  }
  return out.sort((x, y) => x.at - y.at);
}
