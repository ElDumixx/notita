import type { AlertOffset, RepeatRule } from '@/store/types';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts: number) {
  return startOfDay(ts) + DAY - 1;
}

export function addDays(ts: number, days: number) {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function startOfMonth(ts: number) {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addMonths(ts: number, months: number) {
  const d = new Date(startOfMonth(ts));
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

export function isSameMonth(a: number, b: number) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getMonth() === y.getMonth() && x.getFullYear() === y.getFullYear();
}

/** Semana que empieza en lunes, como en los calendarios en español. */
export const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** "Noviembre 2026" */
export function formatMonthYear(ts: number) {
  const d = new Date(ts);
  const month = MONTHS[d.getMonth()];
  return `${month[0].toUpperCase()}${month.slice(1)} ${d.getFullYear()}`;
}

/** "mar" (día de la semana abreviado). */
export function formatWeekdayShort(ts: number) {
  return DAYS_SHORT[new Date(ts).getDay()];
}

export function atTime(ts: number, minutesOfDay: number) {
  const d = new Date(ts);
  d.setHours(Math.floor(minutesOfDay / 60), minutesOfDay % 60, 0, 0);
  return d.getTime();
}

export function minutesOfDay(ts: number) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

export function dayDiff(ts: number, now = Date.now()) {
  return Math.round((startOfDay(ts) - startOfDay(now)) / DAY);
}

export function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatMinutes(m: number) {
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** "martes, 3 de noviembre" */
export function formatLongDate(ts: number) {
  const d = new Date(ts);
  return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "Hoy", "Mañana", "Ayer", "jueves", "lun 10 nov" */
export function formatDay(ts: number, now = Date.now()) {
  const diff = dayDiff(ts, now);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  const d = new Date(ts);
  if (diff > 1 && diff < 7) return DAYS[d.getDay()];
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

export function formatDue(dueAt: number, hasTime: boolean, now = Date.now()) {
  const day = formatDay(dueAt, now);
  return hasTime ? `${day} · ${formatTime(dueAt)}` : day;
}

export function isOverdue(dueAt: number | null, hasTime: boolean, now = Date.now()) {
  if (dueAt == null) return false;
  return hasTime ? dueAt < now : endOfDay(dueAt) < now;
}

/** Siguiente repetición estrictamente posterior a `after`. */
export function nextOccurrence(dueAt: number, rule: RepeatRule, after = Date.now()): number {
  if (rule === 'none') return dueAt;
  let next = dueAt;
  let guard = 0;
  do {
    const d = new Date(next);
    if (rule === 'daily') d.setDate(d.getDate() + 1);
    if (rule === 'weekly') d.setDate(d.getDate() + 7);
    if (rule === 'monthly') d.setMonth(d.getMonth() + 1);
    if (rule === 'yearly') d.setFullYear(d.getFullYear() + 1);
    next = d.getTime();
    guard++;
  } while (next <= after && guard < 1000);
  return next;
}

export const ALERT_OFFSETS: Record<AlertOffset, { label: string; short: string; ms: number }> = {
  none: { label: 'Sin aviso', short: 'Sin aviso', ms: 0 },
  atTime: { label: 'A la hora', short: 'A la hora', ms: 0 },
  m5: { label: '5 minutos antes', short: '5 min', ms: 5 * MIN },
  m15: { label: '15 minutos antes', short: '15 min', ms: 15 * MIN },
  m30: { label: '30 minutos antes', short: '30 min', ms: 30 * MIN },
  h1: { label: '1 hora antes', short: '1 h', ms: HOUR },
  d1: { label: '1 día antes', short: '1 día', ms: DAY },
};

export const REPEAT_LABELS: Record<RepeatRule, string> = {
  none: 'No',
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

/** Hora a la que avisan los recordatorios de "todo el día". */
export const ALL_DAY_ALERT_MINUTES = 9 * 60;

/** Momento del aviso (o null si no hay que avisar). */
export function alertInstant(dueAt: number | null, hasTime: boolean, alert: AlertOffset): number | null {
  if (dueAt == null || alert === 'none') return null;
  const base = hasTime ? dueAt : atTime(dueAt, ALL_DAY_ALERT_MINUTES);
  return base - ALERT_OFFSETS[alert].ms;
}

export type DatePreset = 'hoy' | 'manana' | 'finde' | 'semana';

export const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'manana', label: 'Mañana' },
  { key: 'finde', label: 'Finde' },
  { key: 'semana', label: 'Próx. semana' },
];

/** Día (a medianoche) correspondiente a un atajo de fecha. */
export function presetDay(key: DatePreset, now = Date.now()) {
  const today = startOfDay(now);
  const dow = new Date(today).getDay();
  if (key === 'hoy') return today;
  if (key === 'manana') return addDays(today, 1);
  if (key === 'finde') return addDays(today, (6 - dow + 7) % 7);
  return addDays(today, ((8 - dow) % 7) || 7);
}

export const TIME_PRESETS = [9 * 60, 13 * 60, 18 * 60, 21 * 60];

export function greeting(now = Date.now()) {
  const h = new Date(now).getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}
