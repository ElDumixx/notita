import type { Settings } from '@/store/types';

import { addDays, atTime, minutesOfDay, startOfDay } from './dates';

function inQuietHours(ts: number, q: Settings['quietHours']) {
  if (!q.enabled || q.start === q.end) return false;
  const m = minutesOfDay(ts);
  return q.start < q.end ? m >= q.start && m < q.end : m >= q.start || m < q.end;
}

/** Mueve un aviso al final del silencio nocturno (los importantes no se mueven). */
export function respectQuietHours(ts: number, important: boolean, q: Settings['quietHours']) {
  if (important || !inQuietHours(ts, q)) return ts;
  const m = minutesOfDay(ts);
  const day = q.start > q.end && m >= q.start ? addDays(startOfDay(ts), 1) : startOfDay(ts);
  return atTime(day, q.end);
}
