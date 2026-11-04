'use no memo';
// El widget de Android se construye llamando a estas funciones fuera de React: sin React Compiler.

import type { WidgetInfo } from 'react-native-android-widget';

import { useStore } from '@/store';
import type { WidgetKind } from '@/store/types';

import { AnniversaryWidget } from './anniversary-widget';
import { PostitWidget } from './postit-widget';
import { SpikeWidget } from './spike-widget';

export const WIDGET_NAME = 'Postit';
export const ANNIVERSARY_WIDGET = 'Aniversarios';
export const SPIKE_WIDGET = 'Importantes';
export const WIDGET_NAMES = [WIDGET_NAME, ANNIVERSARY_WIDGET, SPIKE_WIDGET] as const;

/** Tipo de diseño que usa cada widget de Android. */
export function kindForWidget(widgetName: string): WidgetKind {
  return widgetName === SPIKE_WIDGET ? 'aguja' : 'postit';
}

/** Diseño elegido para ese widget; si no hay (o se borró), el primero de su tipo. */
export function designForWidget(widgetId: number, kind: WidgetKind = 'postit') {
  const { designs, widgetBindings } = useStore.getState();
  const bound = designs.find((d) => d.id === widgetBindings[String(widgetId)]);
  return bound?.kind === kind ? bound : (designs.find((d) => d.kind === kind) ?? designs[0]);
}

export function renderPostitWidget(info: WidgetInfo) {
  const state = useStore.getState();
  return <PostitWidget design={designForWidget(info.widgetId)} state={state} width={info.width} height={info.height} />;
}

/** Dibuja cualquiera de los widgets de Notita según su nombre. */
export function renderWidget(info: WidgetInfo) {
  const state = useStore.getState();
  if (info.widgetName === ANNIVERSARY_WIDGET) return <AnniversaryWidget state={state} width={info.width} height={info.height} />;
  if (info.widgetName === SPIKE_WIDGET) return <SpikeWidget design={designForWidget(info.widgetId, 'aguja')} state={state} width={info.width} height={info.height} />;
  return renderPostitWidget(info);
}
