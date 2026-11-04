import { AppState } from 'react-native';

import { useStore } from '@/store';

import { syncNotifications } from './notifications';
import { applyWidgetActions, syncWidgets } from './widget-sync';

function debounce(fn: () => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

const notifySoon = debounce(() => void syncNotifications(), 500);
const widgetsSoon = debounce(() => void syncWidgets().catch((e) => console.warn('[notita] No se pudieron actualizar los widgets', e)), 300);

/**
 * Mantiene notificaciones y widgets al día con el estado. Se llama una vez al arrancar la app.
 * Devuelve una función para detenerlo.
 */
export function startSync() {
  applyWidgetActions();
  notifySoon();
  widgetsSoon();

  const unsubscribe = useStore.subscribe((s, prev) => {
    const alertsChanged =
      s.settings.defaultAlert !== prev.settings.defaultAlert ||
      s.settings.groupNearby !== prev.settings.groupNearby ||
      s.settings.quietHours !== prev.settings.quietHours ||
      s.settings.digest !== prev.settings.digest;
    const anniversariesChanged = s.anniversaries !== prev.anniversaries;
    if (s.reminders !== prev.reminders || s.notebooks !== prev.notebooks || anniversariesChanged || alertsChanged) notifySoon();
    if (s.reminders !== prev.reminders || s.notebooks !== prev.notebooks || s.designs !== prev.designs || anniversariesChanged) widgetsSoon();
  });

  // Al volver a la app: aplica lo hecho desde el widget y refresca (p. ej. tras medianoche).
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      applyWidgetActions();
      notifySoon();
      widgetsSoon();
    }
  });

  return () => {
    unsubscribe();
    sub.remove();
  };
}
