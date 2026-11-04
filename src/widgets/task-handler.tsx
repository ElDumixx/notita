import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { syncNotifications } from '@/lib/notifications';
import { syncWidgets } from '@/lib/widget-sync';
import { rehydrateStore, useStore } from '@/store';

import { renderWidget } from './render';

/** Se ejecuta en segundo plano cuando Android pide pintar o pulsan el widget. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  try {
    await handle(props);
  } catch (e) {
    console.warn('[notita] Error en el widget', props.widgetAction, e);
  }
}

async function handle(props: WidgetTaskHandlerProps) {
  // Puede que la app haya guardado cambios desde otro proceso: relee el almacenamiento.
  await rehydrateStore();

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(renderWidget(props.widgetInfo));
      break;

    case 'WIDGET_DELETED':
      useStore.getState().bindWidget(props.widgetInfo.widgetId, null);
      break;

    case 'WIDGET_CLICK':
      if (props.clickAction === 'COMPLETE') {
        const id = String(props.clickActionData?.id ?? '');
        const store = useStore.getState();
        const r = store.reminders.find((x) => x.id === id);
        if (r && !r.completedAt) store.toggleComplete(id);
        props.renderWidget(renderWidget(props.widgetInfo));
        // Actualiza el resto de widgets y las notificaciones pendientes.
        await Promise.all([syncWidgets(), syncNotifications()]);
      }
      break;
  }
}
