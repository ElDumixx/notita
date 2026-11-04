import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { router } from 'expo-router';
import { Storage } from 'expo-sqlite/kv-store';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useStore, type State } from '@/store';
import type { Anniversary, Reminder } from '@/store/types';

import { dateInYear, yearsAt } from './anniversaries';
import { respectQuietHours } from './quiet-hours';
import { DAY, MIN, addDays, alertInstant, atTime, endOfDay, formatDay, formatLongDate, formatTime, nextOccurrence, startOfDay } from './dates';

export { respectQuietHours };

/** Hay avisos locales (en la web no: Safari no los permite con la app cerrada). */
export const notificationsSupported = true;

const CHANNEL_ID = 'recordatorios';
const DIGEST_CHANNEL_ID = 'resumen';
const ANNIVERSARY_CHANNEL_ID = 'aniversarios';
const CATEGORY_ID = 'recordatorio';
/** Ventana en la que varios avisos se juntan en una sola notificación. */
const GROUP_WINDOW = 10 * MIN;
/** iOS admite 64 notificaciones pendientes; dejamos margen. */
const MAX_SCHEDULED = 56;
/** Tope total (recordatorios, resúmenes y aniversarios): se quedan las más próximas. */
const MAX_PENDING = 60;
const HORIZON = 45 * DAY;
const SNOOZE_MINUTES = 10;

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recordatorios',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 160, 110, 160],
      lightColor: '#8C7CF0',
    });
    Notifications.setNotificationChannelAsync(DIGEST_CHANNEL_ID, {
      name: 'Resumen diario',
      importance: AndroidImportance.DEFAULT,
    });
    Notifications.setNotificationChannelAsync(ANNIVERSARY_CHANNEL_ID, {
      name: 'Cumpleaños y aniversarios',
      importance: AndroidImportance.HIGH,
      lightColor: '#EE8FB3',
    });
  }
  Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: 'done', buttonTitle: 'Hecho', options: { opensAppToForeground: false } },
    { identifier: 'snooze', buttonTitle: `Posponer ${SNOOZE_MINUTES} min`, options: { opensAppToForeground: false } },
  ]);
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermission(): Promise<PermissionState> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<boolean> {
  const current = await getPermission();
  if (current === 'granted') return true;
  if (current === 'denied') return false;
  const res = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return res.granted;
}

export type PlannedAlert = { at: number; reminders: Reminder[] };

/** Calcula los avisos futuros: uno por recordatorio (y por repetición), agrupando los cercanos. */
export function planAlerts(state: Pick<State, 'reminders' | 'settings'>, now = Date.now()): PlannedAlert[] {
  const { settings } = state;
  const items: { at: number; r: Reminder }[] = [];

  for (const r of state.reminders) {
    if (r.completedAt) continue;
    if (r.snoozeUntil && r.snoozeUntil > now) items.push({ at: r.snoozeUntil, r });
    if (r.alert === 'none' || r.dueAt == null) continue;

    const limit = { none: 1, daily: 8, weekly: 5, monthly: 3, yearly: 2 }[r.repeat];
    let due = r.dueAt;
    for (let n = 0; n < limit; ) {
      const raw = alertInstant(due, r.hasTime, r.alert);
      if (raw == null || raw > now + HORIZON) break;
      const at = respectQuietHours(raw, r.important, settings.quietHours);
      if (at > now) {
        items.push({ at, r });
        n++;
      }
      if (r.repeat === 'none') break;
      due = nextOccurrence(due, r.repeat, due);
    }
  }

  items.sort((a, b) => a.at - b.at);
  const groups: PlannedAlert[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (settings.groupNearby && last && item.at - last.at <= GROUP_WINDOW && !last.reminders.some((x) => x.id === item.r.id)) {
      last.reminders.push(item.r);
    } else {
      groups.push({ at: item.at, reminders: [item.r] });
    }
  }
  return groups.slice(0, MAX_SCHEDULED);
}

function describe(r: Reminder, state: Pick<State, 'notebooks'>) {
  const nb = state.notebooks.find((n) => n.id === r.notebookId);
  const when = r.dueAt != null ? (r.hasTime ? formatTime(r.dueAt) : formatDay(r.dueAt)) : '';
  return { nb, when };
}

function contentFor(group: PlannedAlert, state: Pick<State, 'notebooks'>): Notifications.NotificationContentInput {
  const ids = group.reminders.map((r) => r.id);
  if (group.reminders.length === 1) {
    const r = group.reminders[0];
    const { nb, when } = describe(r, state);
    const parts = [nb ? `${nb.emoji} ${nb.name}` : null, when || null, r.notes || null].filter(Boolean);
    return {
      title: r.title,
      body: parts.join(' · '),
      data: { ids, kind: 'reminder' },
      categoryIdentifier: CATEGORY_ID,
      sound: 'default',
    };
  }
  const lines = group.reminders.slice(0, 5).map((r) => {
    const { nb, when } = describe(r, state);
    return `${nb?.emoji ?? '•'} ${r.title}${when ? ` (${when})` : ''}`;
  });
  if (group.reminders.length > 5) lines.push(`y ${group.reminders.length - 5} más`);
  return {
    title: `${group.reminders.length} recordatorios`,
    body: lines.join('\n'),
    data: { ids, kind: 'reminder' },
    categoryIdentifier: CATEGORY_ID,
    sound: 'default',
  };
}

/** Resúmenes diarios para los próximos días con recordatorios (los días vacíos no avisan). */
function planDigests(state: Pick<State, 'reminders' | 'settings'>, now: number) {
  if (!state.settings.digest.enabled) return [];
  const out: { at: number; count: number; titles: string[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(startOfDay(now), i);
    const at = atTime(day, state.settings.digest.at);
    if (at <= now) continue;
    const list = state.reminders.filter((r) => !r.completedAt && r.dueAt != null && r.dueAt >= day && r.dueAt <= endOfDay(day));
    if (list.length) out.push({ at, count: list.length, titles: list.slice(0, 3).map((r) => r.title) });
  }
  return out;
}

/** Avisos de cumpleaños y aniversarios: los de esta celebración y los de la siguiente. */
export function planAnniversaries(state: Pick<State, 'anniversaries'>, now = Date.now()) {
  const out: { at: number; date: number; days: number; a: Anniversary }[] = [];
  const year = new Date(now).getFullYear();
  for (const a of state.anniversaries) {
    for (const y of [year, year + 1]) {
      const date = dateInYear(a, y);
      for (const days of a.notify) {
        const at = atTime(addDays(date, -days), a.notifyAt);
        if (at > now) out.push({ at, date, days, a });
      }
    }
  }
  return out.sort((x, y) => x.at - y.at);
}

function anniversaryContent({ a, date, days }: { a: Anniversary; date: number; days: number }): Notifications.NotificationContentInput {
  const what = a.kind === 'cumple' ? `el cumpleaños de ${a.name}` : a.kind === 'aniversario' ? `el aniversario de ${a.name}` : a.name;
  let title: string;
  if (a.kind === 'otro') title = days === 0 ? `Hoy: ${a.name}` : days === 1 ? `Mañana: ${a.name}` : `${a.name}, en ${days} días`;
  else title = days === 0 ? `¡Hoy es ${what}!` : days === 1 ? `Mañana es ${what}` : `${what.charAt(0).toUpperCase()}${what.slice(1)} es en ${days} días`;
  const n = yearsAt(a, date);
  const years = n == null ? '' : a.kind === 'cumple' ? `cumple ${n} ${n === 1 ? 'año' : 'años'}` : `${n} ${n === 1 ? 'año' : 'años'}`;
  const longDate = formatLongDate(date);
  const body =
    days === 0
      ? [years ? `${years.charAt(0).toUpperCase()}${years.slice(1)}.` : null, a.kind === 'otro' ? '¡A celebrarlo! 🎉' : '¡No te olvides de felicitar! 🎉'].filter(Boolean).join(' ')
      : [`${longDate.charAt(0).toUpperCase()}${longDate.slice(1)}`, years || null].filter(Boolean).join(' · ');
  return { title: `${a.emoji} ${title}`, body, data: { kind: 'anniversary', anniversaryId: a.id }, sound: 'default' };
}

let running: Promise<void> | null = null;
let pending = false;

/** Reprograma todas las notificaciones a partir del estado actual. */
export async function syncNotifications(): Promise<void> {
  if (running) {
    pending = true;
    return running;
  }
  running = (async () => {
    try {
      if ((await getPermission()) !== 'granted') return;
      const state = useStore.getState();
      const now = Date.now();
      await Notifications.cancelAllScheduledNotificationsAsync();
      const plan = planAlerts(state, now);
      // Todo junto y por orden: si hay más de las que admite el sistema, se quedan las más próximas.
      const requests: { at: number; id: string; channelId: string; content: Notifications.NotificationContentInput }[] = [
        ...plan.map((group) => ({ at: group.at, id: `notita-${group.at}-${group.reminders[0].id}`, channelId: CHANNEL_ID, content: contentFor(group, state) })),
        ...planDigests(state, now).map((d) => ({
          at: d.at,
          id: `notita-digest-${d.at}`,
          channelId: DIGEST_CHANNEL_ID,
          content: {
            title: d.count === 1 ? 'Hoy tienes 1 recordatorio' : `Hoy tienes ${d.count} recordatorios`,
            body: d.titles.join(' · '),
            data: { kind: 'digest' },
          },
        })),
        ...planAnniversaries(state, now).map((item) => ({
          at: item.at,
          id: `notita-aniv-${item.at}-${item.a.id}`,
          channelId: ANNIVERSARY_CHANNEL_ID,
          content: anniversaryContent(item),
        })),
      ]
        .sort((x, y) => x.at - y.at)
        .slice(0, MAX_PENDING);
      if (__DEV__) console.log(`[notita] ${requests.length} avisos programados`, requests.map((r) => `${new Date(r.at).toLocaleString('es-ES')} → ${r.content.title}`));
      for (const r of requests) {
        await Notifications.scheduleNotificationAsync({
          identifier: r.id,
          content: r.content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: r.channelId },
        });
      }
    } catch (e) {
      console.warn('[notita] No se pudieron programar las notificaciones', e);
    }
  })();
  await running;
  running = null;
  if (pending) {
    pending = false;
    return syncNotifications();
  }
}

const HANDLED_KEY = 'notita-handled-responses';

function alreadyHandled(key: string) {
  const list: string[] = JSON.parse(Storage.getItemSync(HANDLED_KEY) ?? '[]');
  if (list.includes(key)) return true;
  Storage.setItemSync(HANDLED_KEY, JSON.stringify([...list.slice(-30), key]));
  return false;
}

/**
 * Procesa la respuesta a una notificación. Devuelve la ruta a abrir (si procede).
 * Es idempotente: una misma respuesta no se aplica dos veces.
 */
export function handleResponse(response: Notifications.NotificationResponse): string | null {
  const request = response.notification.request;
  const key = `${request.identifier}:${response.actionIdentifier}`;
  if (alreadyHandled(key)) return null;
  const data = request.content.data as { ids?: string[]; kind?: string } | undefined;
  const ids = data?.ids ?? [];
  const store = useStore.getState();
  if (data?.kind === 'anniversary') return '/calendario?modo=aniversarios';

  if (response.actionIdentifier === 'done') {
    for (const id of ids) {
      const r = store.reminders.find((x) => x.id === id);
      if (r && !r.completedAt) store.toggleComplete(id);
    }
    Notifications.dismissNotificationAsync(request.identifier);
    return null;
  }
  if (response.actionIdentifier === 'snooze') {
    for (const id of ids) store.snooze(id, SNOOZE_MINUTES);
    Notifications.dismissNotificationAsync(request.identifier);
    return null;
  }
  if (ids.length === 1 && store.reminders.some((r) => r.id === ids[0])) return `/reminder/${ids[0]}`;
  return '/';
}

/** Abre la pantalla que corresponde al tocar una notificación (también si abrió la app). */
export function useNotificationNavigation() {
  useEffect(() => {
    const open = (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      const path = handleResponse(r);
      if (path && path !== '/') router.push(path as never);
    };
    Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
