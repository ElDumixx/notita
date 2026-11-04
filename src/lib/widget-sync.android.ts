import { requestWidgetUpdate } from 'react-native-android-widget';

import { renderWidget, WIDGET_NAMES } from '@/widgets/render';

export async function syncWidgets(): Promise<void> {
  await Promise.all(WIDGET_NAMES.map((widgetName) => requestWidgetUpdate({ widgetName, renderWidget })));
}

// En Android el widget actualiza el estado directamente (ver widgets/task-handler.tsx).
export function applyWidgetActions(): void {}
